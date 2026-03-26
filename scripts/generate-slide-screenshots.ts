#!/usr/bin/env npx tsx
/**
 * Generate PNG screenshots for each slide of templates that don't have them.
 * Uses Puppeteer to render each slide and uploads to Supabase storage.
 *
 * Usage: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/generate-slide-screenshots.ts
 */

import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okzaoakyasaohohktntd.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = 'presentation-assets';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function main() {
  // Get templates without image layouts (new imports)
  const { data: templates, error } = await supabase
    .from('templates')
    .select('id, name, preview_slides, theme, layouts')
    .eq('is_active', true);

  if (error) { console.error('Failed to fetch templates:', error.message); return; }

  // Filter templates that need screenshots
  const needScreenshots = (templates || []).filter(t => {
    const layouts = t.layouts || [];
    if (layouts.length === 0) return true;
    // If first layout is NOT an http URL, it needs screenshots
    return typeof layouts[0] === 'string' && !layouts[0].startsWith('http');
  });

  if (needScreenshots.length === 0) {
    console.log('All templates have screenshots. Nothing to do.');
    return;
  }

  console.log(`${needScreenshots.length} templates need screenshots:`);
  needScreenshots.forEach(t => console.log(`  - ${t.name}`));

  // Launch browser
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  for (const template of needScreenshots) {
    console.log(`\n=== ${template.name} ===`);
    const slides = template.preview_slides || [];
    if (slides.length === 0) { console.log('  No slides, skipping'); continue; }

    const palette = template.theme?.tokens?.palette || { bg: '#ffffff', text: '#000000' };
    const imageUrls: string[] = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      console.log(`  Slide ${i + 1}/${slides.length}...`);

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Build HTML for the slide
      const bgColor = slide.background?.value || palette.bg || '#ffffff';
      const bgType = slide.background?.type || 'solid';
      let bgCss = '';
      if (bgType === 'solid') bgCss = `background-color: ${bgColor};`;
      else if (bgType === 'gradient') bgCss = `background: ${bgColor};`;
      else if (bgType === 'image') bgCss = `background-image: url(${bgColor}); background-size: cover; background-position: center;`;

      const elements = (slide.elements || [])
        .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0));

      let elementsHtml = '';
      for (const el of elements) {
        const s = el.style || {};
        const fontFamily = s.fontFamily ? `${s.fontFamily}, sans-serif` : 'sans-serif';
        const fontSize = (s.fontSize || 12) * 2.666;

        if (el.type === 'text') {
          const content = el.content?.startsWith('<') ? el.content : `<p>${el.content || ''}</p>`;
          elementsHtml += `<div style="
            position:absolute; left:${el.x}px; top:${el.y}px; width:${el.width}px; height:${el.height}px;
            font-family:${fontFamily}; font-size:${fontSize}px; font-weight:${s.fontWeight || 'normal'};
            color:${s.color || '#000'}; text-align:${s.textAlign || 'left'};
            line-height:${s.lineHeight || 1.4}; letter-spacing:${s.letterSpacing || 0}px;
            opacity:${el.opacity ?? 1}; overflow:hidden; padding:8px; box-sizing:border-box;
            ${s.verticalAlign === 'center' ? 'display:flex;flex-direction:column;justify-content:center;' : ''}
            ${s.verticalAlign === 'bottom' ? 'display:flex;flex-direction:column;justify-content:flex-end;' : ''}
          ">${content}</div>`;
        } else if (el.type === 'image' && el.content) {
          elementsHtml += `<div style="
            position:absolute; left:${el.x}px; top:${el.y}px; width:${el.width}px; height:${el.height}px;
            opacity:${el.opacity ?? 1}; overflow:hidden; border-radius:${s.borderRadius || 0}px;
          "><img src="${el.content}" style="width:100%;height:100%;object-fit:${s.objectFit || 'cover'};object-position:${s.objectPosition || 'center'};" /></div>`;
        } else if (el.type === 'shape' && el.content?.startsWith('<svg')) {
          elementsHtml += `<div style="
            position:absolute; left:${el.x}px; top:${el.y}px; width:${el.width}px; height:${el.height}px;
            opacity:${el.opacity ?? 1};
            ${s.flipH ? 'transform:scaleX(-1);' : ''}${s.flipV ? 'transform:scaleY(-1);' : ''}
          ">${el.content}</div>`;
        } else if (el.type === 'shape') {
          elementsHtml += `<div style="
            position:absolute; left:${el.x}px; top:${el.y}px; width:${el.width}px; height:${el.height}px;
            opacity:${el.opacity ?? 1}; background:${s.shapeFill || s.backgroundColor || 'transparent'};
            border-radius:${s.borderRadius || 0}px;
          "></div>`;
        }
      }

      // Load fonts
      const fonts = new Set<string>();
      elements.forEach((el: any) => { if (el.style?.fontFamily) fonts.add(el.style.fontFamily); });
      const fontLinks = Array.from(fonts).map(f =>
        `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />`
      ).join('\n');

      const html = `<!DOCTYPE html><html><head>
        <meta charset="utf-8" />
        ${fontLinks}
        <style>* { margin:0; padding:0; box-sizing:border-box; } p { margin:0; }</style>
      </head><body>
        <div style="width:1920px;height:1080px;position:relative;overflow:hidden;${bgCss}">
          ${elementsHtml}
        </div>
      </body></html>`;

      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      // Extra wait for fonts/images
      await new Promise(r => setTimeout(r, 1500));

      const screenshot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      await page.close();

      // Upload to Supabase
      const filename = `screenshots/${template.id}/slide-${String(i + 1).padStart(2, '0')}.png`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filename, screenshot, {
        contentType: 'image/png',
        upsert: true,
      });

      if (uploadError) {
        console.log(`  ✗ Upload failed: ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
      imageUrls.push(urlData.publicUrl);
      console.log(`  ✓ Slide ${i + 1}`);
    }

    // Update template with screenshot URLs as layouts
    if (imageUrls.length > 0) {
      const { error: updateError } = await supabase
        .from('templates')
        .update({
          layouts: imageUrls,
          thumbnail_url: imageUrls[0], // Cover as thumbnail
        })
        .eq('id', template.id);

      if (updateError) {
        console.log(`  ✗ Failed to update template: ${updateError.message}`);
      } else {
        console.log(`  ✓ Updated with ${imageUrls.length} screenshots`);
      }
    }
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
