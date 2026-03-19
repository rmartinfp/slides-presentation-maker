/**
 * Script to import a Google Slides presentation as a template.
 * Run with: npx tsx scripts/import-template.ts
 *
 * Reads /tmp/gslides_presentation.json, parses it, re-hosts images,
 * and saves to Supabase templates table.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Supabase config
const SUPABASE_URL = 'https://okzaoakyasaohohktntd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- EMU conversion (Google Slides coords → 1920x1080 px) ----
const SLIDES_W = 9144000;
const SLIDES_H = 6858000;
const CANVAS_W = 1920;
const CANVAS_H = 1080;

function emuToX(emu: number) { return Math.round((emu / SLIDES_W) * CANVAS_W); }
function emuToY(emu: number) { return Math.round((emu / SLIDES_H) * CANVAS_H); }
function emuToW(emu: number) { return Math.round((emu / SLIDES_W) * CANVAS_W); }
function emuToH(emu: number) { return Math.round((emu / SLIDES_H) * CANVAS_H); }
function magToFontPx(mag: number) { return Math.round(mag * 1.333); }
function rgbaToHex(c: any): string {
  if (!c) return '#000000';
  const r = Math.round((c.red ?? 0) * 255);
  const g = Math.round((c.green ?? 0) * 255);
  const b = Math.round((c.blue ?? 0) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function genId() { return Math.random().toString(36).substring(2, 11); }

// ---- Image download + upload ----
const imageCache = new Map<string, string>();
const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN || '';

async function reHostImage(url: string): Promise<string> {
  if (!url) return '';
  if (imageCache.has(url)) return imageCache.get(url)!;

  try {
    const headers: Record<string, string> = {};
    if (url.includes('googleusercontent.com') || url.includes('googleapis.com')) {
      if (ACCESS_TOKEN) headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(`  Failed to download image: ${res.status} ${url.slice(0, 80)}`);
      return url;
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const ext = contentType.includes('jpeg') ? 'jpg' : contentType.includes('png') ? 'png' : 'png';
    const buffer = await res.arrayBuffer();
    const fileName = `imported/${genId()}.${ext}`;

    const { error } = await supabase.storage
      .from('presentation-assets')
      .upload(fileName, buffer, { contentType, cacheControl: '3600' });

    if (error) {
      console.warn(`  Upload error: ${error.message}`);
      return url;
    }

    const { data } = supabase.storage.from('presentation-assets').getPublicUrl(fileName);
    imageCache.set(url, data.publicUrl);
    console.log(`  Uploaded: ${fileName}`);
    return data.publicUrl;
  } catch (e: any) {
    console.warn(`  Error: ${e.message}`);
    return url;
  }
}

// ---- Parse elements ----
interface SlideElement {
  id: string;
  type: string;
  content: string;
  x: number; y: number; width: number; height: number;
  rotation: number; opacity: number;
  locked: boolean; visible: boolean; zIndex: number;
  style: Record<string, any>;
}

function getTransform(pe: any) {
  const t = pe.transform || {};
  const sW = pe.size?.width?.magnitude || 0;
  const sH = pe.size?.height?.magnitude || 0;
  const unit = pe.size?.width?.unit || 'EMU';

  const scaleX = t.scaleX ?? 1;
  const scaleY = t.scaleY ?? 1;
  const tx = t.translateX ?? 0;
  const ty = t.translateY ?? 0;

  if (unit === 'EMU') {
    return {
      x: emuToX(tx),
      y: emuToY(ty),
      width: emuToW(sW * Math.abs(scaleX)),
      height: emuToH(sH * Math.abs(scaleY)),
    };
  }
  const ptToPx = CANVAS_W / 720;
  return {
    x: Math.round(tx * ptToPx),
    y: Math.round(ty * ptToPx),
    width: Math.round(sW * Math.abs(scaleX) * ptToPx),
    height: Math.round(sH * Math.abs(scaleY) * ptToPx),
  };
}

function parseTextRuns(textElements: any[]): { content: string; style: Record<string, any> } {
  let html = '';
  let firstStyle: Record<string, any> = {};
  let isFirst = true;
  let inP = false;

  for (const te of textElements) {
    if (te.paragraphMarker) {
      if (inP) html += '</p>';
      html += '<p>';
      inP = true;
      continue;
    }
    if (te.textRun) {
      let text = te.textRun.content || '';
      if (text === '\n') continue;
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const ts = te.textRun.style || {};
      if (ts.bold) text = `<strong>${text}</strong>`;
      if (ts.italic) text = `<em>${text}</em>`;
      if (ts.underline) text = `<u>${text}</u>`;

      const spans: string[] = [];
      if (ts.foregroundColor?.opaqueColor?.rgbColor) {
        spans.push(`color:${rgbaToHex(ts.foregroundColor.opaqueColor.rgbColor)}`);
      }
      if (ts.fontFamily) spans.push(`font-family:${ts.fontFamily}`);
      if (ts.fontSize) spans.push(`font-size:${magToFontPx(ts.fontSize.magnitude)}px`);
      if (spans.length) text = `<span style="${spans.join(';')}">${text}</span>`;

      html += text;

      if (isFirst && ts) {
        isFirst = false;
        firstStyle = {
          fontFamily: ts.fontFamily || 'Arial',
          fontSize: ts.fontSize ? magToFontPx(ts.fontSize.magnitude) : 24,
          fontWeight: ts.bold ? 'bold' : 'normal',
          fontStyle: ts.italic ? 'italic' : 'normal',
          color: ts.foregroundColor?.opaqueColor?.rgbColor
            ? rgbaToHex(ts.foregroundColor.opaqueColor.rgbColor)
            : '#000000',
          textAlign: 'left',
        };
      }
    }
  }
  if (inP) html += '</p>';
  return { content: html || '', style: firstStyle };
}

async function parsePageElement(pe: any, z: number): Promise<SlideElement[]> {
  const { x, y, width, height } = getTransform(pe);

  // Groups
  if (pe.elementGroup?.children) {
    const results: SlideElement[] = [];
    let zi = z;
    for (const child of pe.elementGroup.children) {
      const parsed = await parsePageElement(child, zi);
      results.push(...parsed);
      zi += parsed.length;
    }
    return results;
  }

  // Image
  if (pe.image) {
    const url = pe.image.contentUrl || pe.image.sourceUrl || '';
    const rehosted = await reHostImage(url);
    return [{
      id: genId(), type: 'image', content: rehosted,
      x, y, width, height, rotation: 0, opacity: 1,
      locked: false, visible: true, zIndex: z,
      style: { objectFit: 'cover', borderRadius: 0 },
    }];
  }

  // Shape
  if (pe.shape) {
    const shape = pe.shape;
    const isText = shape.shapeType === 'TEXT_BOX' || shape.text?.textElements?.length > 0;

    if (isText && shape.text) {
      const { content, style } = parseTextRuns(shape.text.textElements);
      if (!content || content === '<p></p>') return [];
      return [{
        id: genId(), type: 'text', content,
        x, y, width, height, rotation: 0, opacity: 1,
        locked: false, visible: true, zIndex: z,
        style,
      }];
    }

    // Non-text shape
    const bgFill = shape.shapeProperties?.shapeBackgroundFill?.solidFill;
    const fill = bgFill?.color?.rgbColor ? rgbaToHex(bgFill.color.rgbColor) : '#6366f1';
    const shapeMap: Record<string, string> = {
      RECTANGLE: 'rectangle', ROUND_RECTANGLE: 'rectangle',
      ELLIPSE: 'circle', TRIANGLE: 'triangle',
      RIGHT_ARROW: 'arrow-right',
    };

    return [{
      id: genId(), type: 'shape', content: '',
      x, y, width, height, rotation: 0, opacity: bgFill?.alpha ?? 1,
      locked: false, visible: true, zIndex: z,
      style: {
        shapeType: shapeMap[shape.shapeType] || 'rectangle',
        shapeFill: fill,
        borderRadius: shape.shapeType === 'ROUND_RECTANGLE' ? 12 : 0,
      },
    }];
  }

  return [];
}

function parseBg(slide: any): { type: string; value: string } {
  const bg = slide.pageProperties?.pageBackgroundFill;
  if (bg?.solidFill?.color?.rgbColor) {
    return { type: 'solid', value: rgbaToHex(bg.solidFill.color.rgbColor) };
  }
  if (bg?.stretchedPictureFill?.contentUrl) {
    return { type: 'image', value: bg.stretchedPictureFill.contentUrl };
  }
  return { type: 'solid', value: '#FFFFFF' };
}

// ---- Main ----
async function main() {
  const inputFile = process.argv[2] || '/tmp/gslides_presentation.json';
  console.log(`Reading ${inputFile}...`);
  const raw = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

  console.log(`Parsing "${raw.title}" — ${raw.slides.length} slides`);

  const slides: any[] = [];

  for (let i = 0; i < raw.slides.length; i++) {
    const gs = raw.slides[i];
    console.log(`Slide ${i + 1}/${raw.slides.length}...`);

    const elements: SlideElement[] = [];
    let z = 1;
    for (const pe of gs.pageElements || []) {
      const parsed = await parsePageElement(pe, z);
      elements.push(...parsed);
      z += parsed.length;
    }

    const background = parseBg(gs);
    // Re-host background images
    if (background.type === 'image') {
      background.value = await reHostImage(background.value);
    }

    slides.push({
      id: genId(),
      elements,
      background,
      notes: '',
    });
  }

  console.log(`Parsed ${slides.length} slides, ${imageCache.size} images re-hosted`);

  // Extract theme from first slide text elements
  const firstText = slides[0]?.elements?.find((e: any) => e.type === 'text');
  const titleFont = firstText?.style?.fontFamily || 'Inter';
  const titleColor = firstText?.style?.color || '#000000';

  const slug = raw.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 50);

  // Match actual DB schema: id, name, slug, category, description, thumbnail_url,
  // preview_slides, theme, layouts, fonts, colors, is_premium, is_active, sort_order
  const bgColor = slides[0]?.background?.value || '#FFFFFF';
  const template = {
    name: raw.title,
    slug: `${slug}-${genId()}`,
    category: 'Imported',
    description: `Imported from Google Slides (${raw.slides.length} slides)`,
    thumbnail_url: slides[0]?.elements?.find((e: any) => e.type === 'image')?.content || null,
    preview_slides: slides,  // Store all parsed slides with elements
    theme: {
      id: slug,
      name: raw.title,
      category: 'Imported',
      tokens: {
        palette: { primary: titleColor, secondary: '#666666', accent: '#6366f1', bg: bgColor, text: titleColor },
        typography: { titleFont, bodyFont: 'Inter', titleSize: 42, bodySize: 24 },
        radii: '16px',
        shadows: 'lg',
      },
      previewColors: [titleColor, '#666666', '#6366f1', bgColor],
    },
    layouts: slides.map((_: any, i: number) => `slide-${i + 1}`),
    fonts: [titleFont, 'Inter'],
    colors: { primary: titleColor, secondary: '#666666', accent: '#6366f1', bg: bgColor, text: titleColor },
    is_premium: false,
    is_active: true,
    sort_order: 0,
  };

  console.log('Saving to Supabase...');
  const { data, error } = await supabase.from('templates').insert(template).select('id').single();

  if (error) {
    console.error('Error saving template:', error.message);
    process.exit(1);
  }

  console.log(`Template saved! ID: ${data.id}`);
  console.log('Done.');
}

main().catch(console.error);
