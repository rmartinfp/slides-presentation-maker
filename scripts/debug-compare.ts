/**
 * Debug comparison tool: PPTX XML vs Supabase stored data.
 * Shows every element side-by-side to identify import discrepancies.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/debug-compare.ts "/path/to/template.pptx" [slideNum]
 *
 * If slideNum is omitted, compares ALL slides.
 */

import * as fs from 'fs';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okzaoakyasaohohktntd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CANVAS_W = 1920;
const CANVAS_H = 1080;

interface PptxElement {
  type: 'text' | 'image' | 'shape' | 'connector' | 'group';
  source: 'slide' | 'layout' | 'master';
  x: number; y: number; w: number; h: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  geom?: string;
  placeholder?: string;
  locked?: boolean;
  borderRadius?: number;
}

async function main() {
  const pptxPath = process.argv[2];
  const targetSlide = process.argv[3] ? parseInt(process.argv[3]) : null;

  if (!pptxPath || !SUPABASE_KEY) {
    console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/debug-compare.ts "/path/to/file.pptx" [slideNum]');
    process.exit(1);
  }

  const title = pptxPath.split('/').pop()!.replace(/\.pptx$/i, '');
  console.log(`\n📊 Comparing: ${title}\n`);

  // 1. Load PPTX
  const pptxBuffer = fs.readFileSync(pptxPath);
  const zip = await JSZip.loadAsync(pptxBuffer);

  // Read slide dimensions
  const presXml = await zip.file('ppt/presentation.xml')!.async('string');
  const sldSz = presXml.match(/<p:sldSz\s+cx="(\d+)"\s+cy="(\d+)"/);
  const slideW = sldSz ? parseInt(sldSz[1]) : 9144000;
  const slideH = sldSz ? parseInt(sldSz[2]) : 5143500;
  const emuToX = (emu: number) => Math.round(emu / slideW * CANVAS_W);
  const emuToY = (emu: number) => Math.round(emu / slideH * CANVAS_H);

  // 2. Query Supabase
  const { data: templates } = await supabase.from('templates').select('preview_slides').eq('name', title).single();
  if (!templates) {
    console.error(`❌ Template "${title}" not found in Supabase`);
    process.exit(1);
  }
  const dbSlides = templates.preview_slides as any[];

  // 3. Parse PPTX slides
  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));

  console.log(`PPTX: ${slideFiles.length} slides, DB: ${dbSlides.length} slides`);
  console.log(`Slide dimensions: ${slideW} x ${slideH} EMU → ${CANVAS_W} x ${CANVAS_H} px\n`);

  // For each slide in DB, extract and compare
  // We need to map DB slide index to PPTX slide (some PPTX slides are filtered)
  // For now, iterate DB slides and show their data

  for (let dbIdx = 0; dbIdx < dbSlides.length; dbIdx++) {
    if (targetSlide !== null && dbIdx + 1 !== targetSlide) continue;

    const dbSlide = dbSlides[dbIdx];
    const elements = dbSlide.elements || [];

    console.log(`${'═'.repeat(70)}`);
    console.log(`SLIDE ${dbIdx + 1} — ${elements.length} elements (layout: ${dbSlide.layout || '?'})`);
    console.log(`Background: ${JSON.stringify(dbSlide.background)}`);
    console.log(`${'═'.repeat(70)}`);

    // Categorize elements
    const images = elements.filter((e: any) => e.type === 'image');
    const shapes = elements.filter((e: any) => e.type === 'shape');
    const texts = elements.filter((e: any) => e.type === 'text');

    if (images.length) {
      console.log(`\n  📷 IMAGES (${images.length}):`);
      for (const el of images) {
        const locked = el.locked ? '🔒' : '✏️';
        const url = (el.content || '').substring(0, 60);
        console.log(`    ${locked} (${el.x},${el.y}) ${el.width}×${el.height} ${url}...`);
      }
    }

    if (shapes.length) {
      console.log(`\n  🔷 SHAPES (${shapes.length}):`);
      for (const el of shapes) {
        const locked = el.locked ? '🔒' : '✏️';
        const s = el.style || {};
        const type = s.shapeType || 'rect';
        const fill = s.shapeFill || '-';
        const stroke = s.shapeStroke && s.shapeStroke !== 'transparent' ? `stroke=${s.shapeStroke} w=${s.shapeStrokeWidth}` : '';
        const svg = s.svgPath ? `SVG(${s.svgPath.length}chars)` : '';
        const br = s.borderRadius ? `br=${s.borderRadius}` : '';
        const gradient = s.shapeGradient ? 'GRADIENT' : '';
        console.log(`    ${locked} (${el.x},${el.y}) ${el.width}×${el.height} ${type} fill=${fill} ${stroke} ${svg} ${br} ${gradient}`.trimEnd());
      }
    }

    if (texts.length) {
      console.log(`\n  📝 TEXTS (${texts.length}):`);
      for (const el of texts) {
        const locked = el.locked ? '🔒' : '✏️';
        const s = el.style || {};
        const content = (el.content || '').replace(/<[^>]+>/g, '').trim().substring(0, 50);
        const font = s.fontFamily ? s.fontFamily.split(',')[0] : '-';
        const weight = s.fontWeight === 'bold' ? 'B' : '';
        const align = s.textAlign || 'left';
        const vAlign = s.verticalAlign || '';
        const lh = s.lineHeight || '-';
        console.log(`    ${locked} (${el.x},${el.y}) ${el.width}×${el.height} sz=${s.fontSize || '-'}pt ${weight} font=${font} align=${align} ${vAlign} lh=${lh}`);
        console.log(`       "${content}"`);
      }
    }

    console.log('');
  }

  // Also show what the PPTX has for comparison
  if (targetSlide !== null) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`RAW PPTX ANALYSIS — looking for matching slide content`);
    console.log(`${'═'.repeat(70)}\n`);

    for (const slideFile of slideFiles) {
      const slideXml = await zip.file(slideFile)!.async('string');
      const slideNum = parseInt(slideFile.match(/\d+/)![0]);

      // Quick text extraction to match with DB slide
      const allText = slideXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();

      // Find the DB slide's text to match
      const dbSlide = dbSlides[targetSlide - 1];
      const dbText = (dbSlide.elements || [])
        .filter((e: any) => e.type === 'text')
        .map((e: any) => (e.content || '').replace(/<[^>]+>/g, '').trim().toLowerCase())
        .join(' ');

      // Check if any DB text appears in this PPTX slide
      const dbWords = dbText.split(/\s+/).filter((w: string) => w.length > 4).slice(0, 5);
      const matchCount = dbWords.filter((w: string) => allText.includes(w)).length;

      if (matchCount < 2) continue;

      console.log(`  📄 PPTX slide${slideNum}.xml matches DB slide ${targetSlide}`);

      // Get layout reference
      const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
      if (zip.files[relsFile]) {
        const relsXml = await zip.file(relsFile)!.async('string');
        const layoutRef = relsXml.match(/Target="\.\.\/slideLayouts\/(slideLayout\d+\.xml)"/);
        if (layoutRef) {
          console.log(`  Layout: ${layoutRef[1]}`);

          // Show layout shapes/groups
          const layoutFile = zip.files[`ppt/slideLayouts/${layoutRef[1]}`];
          if (layoutFile) {
            const layoutXml = await layoutFile.async('string');
            const grpCount = (layoutXml.match(/<p:grpSp>/g) || []).length;
            const spCount = (layoutXml.match(/<p:sp>/g) || []).length;
            const picCount = (layoutXml.match(/<p:pic>/g) || []).length;
            const phCount = (layoutXml.match(/<p:ph/g) || []).length;
            console.log(`  Layout elements: ${grpCount} groups, ${spCount} shapes (${phCount} PH), ${picCount} pics`);

            // Show non-PH shapes in layout
            const shapes = [...layoutXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)];
            let nonPhIdx = 0;
            for (const [, spXml] of shapes) {
              if (spXml.includes('<p:ph')) continue;
              const off = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
              const ext = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
              if (!off || !ext) continue;
              const x = emuToX(parseInt(off[1]));
              const y = emuToY(parseInt(off[2]));
              const w = emuToX(parseInt(ext[1]));
              const h = emuToY(parseInt(ext[2]));
              const geom = spXml.match(/prstGeom.*?prst="(\w+)"/)?.[1] || (spXml.includes('<a:custGeom>') ? 'custom' : 'none');
              const fill = spXml.match(/<a:solidFill>[\s\S]*?val="([^"]+)"/)?.[1] || '-';
              const hasLn = spXml.includes('<a:ln');
              const lnFill = spXml.match(/<a:ln[\s\S]*?<a:solidFill>[\s\S]*?val="([^"]+)"/)?.[1];
              const lnW = spXml.match(/<a:ln[^>]*w="(\d+)"/)?.[1];
              console.log(`    Layout shape ${nonPhIdx}: (${x},${y}) ${w}×${h} ${geom} fill=${fill} ${hasLn ? `ln=${lnFill || '?'} w=${lnW || '?'}` : ''}`);
              nonPhIdx++;
            }

            // Show groups in layout
            const grpMatches = [...layoutXml.matchAll(/<p:grpSp>([\s\S]*?)<\/p:grpSp>/g)];
            for (let gi = 0; gi < grpMatches.length; gi++) {
              const grpXml = grpMatches[gi][1];
              const grpOff = grpXml.match(/<p:grpSpPr>[\s\S]*?<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
              const grpExt = grpXml.match(/<p:grpSpPr>[\s\S]*?<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
              if (!grpOff || !grpExt) continue;
              const gx = emuToX(parseInt(grpOff[1]));
              const gy = emuToY(parseInt(grpOff[2]));
              const gw = emuToX(parseInt(grpExt[1]));
              const gh = emuToY(parseInt(grpExt[2]));
              const childCount = (grpXml.match(/<p:sp>/g) || []).length;
              console.log(`    Layout group ${gi}: (${gx},${gy}) ${gw}×${gh} — ${childCount} children`);
            }
          }
        }
      }

      // Show slide-level elements
      console.log(`\n  Slide-level elements:`);
      const slideNoGroups = slideXml.replace(/<p:grpSp>[\s\S]*?<\/p:grpSp>/g, '');
      const slideShapes = [...slideNoGroups.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)];
      for (const [, spXml] of slideShapes) {
        const off = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
        const ext = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        if (!off || !ext) continue;
        const x = emuToX(parseInt(off[1]));
        const y = emuToY(parseInt(off[2]));
        const w = emuToX(parseInt(ext[1]));
        const h = emuToY(parseInt(ext[2]));
        const isPh = spXml.includes('<p:ph');
        const phType = spXml.match(/<p:ph[^>]*type="(\w+)"/)?.[1] || '';
        const phIdx = spXml.match(/<p:ph[^>]*idx="(\d+)"/)?.[1] || '';
        const texts = [...spXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1]).join(' ').substring(0, 40);
        const sz = [...spXml.matchAll(/sz="(\d+)"/g)].map(m => m[1]);
        const geom = spXml.match(/prstGeom.*?prst="(\w+)"/)?.[1] || (spXml.includes('<a:custGeom>') ? 'custom' : 'none');
        const fill = spXml.match(/<a:solidFill>[\s\S]*?val="([^"]+)"/)?.[1] || '-';

        if (isPh) {
          console.log(`    PH ${phType}:${phIdx} (${x},${y}) ${w}×${h} sz=[${sz.join(',')}] "${texts}"`);
        } else {
          console.log(`    Shape (${x},${y}) ${w}×${h} ${geom} fill=${fill} sz=[${sz.join(',')}] "${texts}"`);
        }
      }

      // Show slide pics
      const slidePics = [...slideNoGroups.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)];
      for (const [, picXml] of slidePics) {
        const off = picXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
        const ext = picXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        if (!off || !ext) continue;
        const x = emuToX(parseInt(off[1]));
        const y = emuToY(parseInt(off[2]));
        const w = emuToX(parseInt(ext[1]));
        const h = emuToY(parseInt(ext[2]));
        const embed = picXml.match(/r:embed="(rId\d+)"/)?.[1] || '?';
        console.log(`    Pic (${x},${y}) ${w}×${h} ref=${embed}`);
      }

      // Show slide groups
      const grpMatches = [...slideXml.matchAll(/<p:grpSp>([\s\S]*?)<\/p:grpSp>/g)];
      for (let gi = 0; gi < grpMatches.length; gi++) {
        const grpXml = grpMatches[gi][1];
        const grpOff = grpXml.match(/<p:grpSpPr>[\s\S]*?<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
        const grpExt = grpXml.match(/<p:grpSpPr>[\s\S]*?<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        if (!grpOff || !grpExt) continue;
        const gx = emuToX(parseInt(grpOff[1]));
        const gy = emuToY(parseInt(grpOff[2]));
        const gw = emuToX(parseInt(grpExt[1]));
        const gh = emuToY(parseInt(grpExt[2]));
        const childSp = (grpXml.match(/<p:sp>/g) || []).length;
        const childPic = (grpXml.match(/<p:pic>/g) || []).length;
        console.log(`    Group ${gi}: (${gx},${gy}) ${gw}×${gh} — ${childSp} sp + ${childPic} pic`);
      }

      break; // Only show first matching PPTX slide
    }
  }
}

main().catch(console.error);
