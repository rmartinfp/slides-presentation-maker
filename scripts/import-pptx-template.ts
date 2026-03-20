/**
 * Import a Google Slides presentation as a template by downloading
 * the PPTX file and parsing it directly (ZIP/XML).
 *
 * This approach extracts REAL theme colors, fonts, and positions
 * that the Google Slides API doesn't export.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx GOOGLE_ACCESS_TOKEN=xxx \
 *   npx tsx scripts/import-pptx-template.ts <google-slides-id>
 */

import * as fs from 'fs';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

// ---- Config ----
const SUPABASE_URL = 'https://okzaoakyasaohohktntd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN || '';
const CANVAS_W = 1920;
const CANVAS_H = 1080;

if (!SUPABASE_KEY || !ACCESS_TOKEN) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY and GOOGLE_ACCESS_TOKEN env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function genId() { return Math.random().toString(36).substring(2, 11); }

// ---- Theme Color Extraction ----
interface ThemeColors {
  dk1: string; lt1: string; dk2: string; lt2: string;
  accent1: string; accent2: string; accent3: string;
  accent4: string; accent5: string; accent6: string;
}

function parseColorFromXml(colorEl: string): string {
  // srgbClr val="RRGGBB"
  const srgb = colorEl.match(/srgbClr\s+val="([A-Fa-f0-9]{6})"/);
  if (srgb) return `#${srgb[1]}`;

  // sysClr lastClr="RRGGBB"
  const sys = colorEl.match(/sysClr[^>]+lastClr="([A-Fa-f0-9]{6})"/);
  if (sys) return `#${sys[1]}`;

  return '#000000';
}

function extractThemeColors(themeXml: string): ThemeColors {
  const colors: Record<string, string> = {};
  const schemes = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

  for (const scheme of schemes) {
    // Match <a:dk1>...</a:dk1> etc
    const regex = new RegExp(`<a:${scheme}>(.*?)</a:${scheme}>`, 's');
    const match = themeXml.match(regex);
    if (match) {
      colors[scheme] = parseColorFromXml(match[1]);
    } else {
      colors[scheme] = scheme.startsWith('lt') ? '#FFFFFF' : '#000000';
    }
  }

  return colors as unknown as ThemeColors;
}

// ---- Font Extraction ----
function extractThemeFonts(themeXml: string): { titleFont: string; bodyFont: string } {
  // <a:majorFont><a:latin typeface="FontName"/></a:majorFont>
  const major = themeXml.match(/<a:majorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"[\s\S]*?<\/a:majorFont>/);
  const minor = themeXml.match(/<a:minorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"[\s\S]*?<\/a:minorFont>/);

  return {
    titleFont: major?.[1] || 'Arial',
    bodyFont: minor?.[1] || 'Arial',
  };
}

// ---- Google Fonts from slide rels (Slidesgo stores them in Final Pages) ----
async function extractGoogleFontsFromRels(zip: JSZip): Promise<string[]> {
  const fonts = new Set<string>();
  const relsPattern = /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/;

  for (const [path, file] of Object.entries(zip.files)) {
    if (!relsPattern.test(path)) continue;
    const content = await file.async('string');
    const matches = content.matchAll(/Target="https:\/\/fonts\.google\.com\/specimen\/([^"]+)"/g);
    for (const m of matches) {
      let fontName = decodeURIComponent(m[1].replace(/\+/g, ' '));
      // Strip URL query params (e.g. "Instrument Serif?preview.layout=grid")
      fontName = fontName.split('?')[0].trim();
      if (fontName) fonts.add(fontName);
    }
  }
  return Array.from(fonts);
}

// ---- Clean font name utility ----
function cleanFontName(name: string): string {
  // Strip URL query params that sometimes leak into font names
  return name.split('?')[0].trim();
}

// ---- Slide Parsing ----
interface ParsedElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  content: string;
  x: number; y: number; width: number; height: number;
  rotation: number; opacity: number;
  locked: boolean; visible: boolean; zIndex: number;
  style: Record<string, any>;
}

interface ParsedSlide {
  id: string;
  elements: ParsedElement[];
  background: { type: string; value: string };
  notes: string;
}

// EMU to pixels conversion (updated per-presentation)
let slideWidthEmu = 9144000;
let slideHeightEmu = 5143500;

function emuToPxX(emu: number) { return Math.round((emu / slideWidthEmu) * CANVAS_W); }
function emuToPxY(emu: number) { return Math.round((emu / slideHeightEmu) * CANVAS_H); }

function resolveSchemeColor(ref: string, themeColors: ThemeColors): string {
  const map: Record<string, string> = {
    dk1: themeColors.dk1, lt1: themeColors.lt1,
    dk2: themeColors.dk2, lt2: themeColors.lt2,
    accent1: themeColors.accent1, accent2: themeColors.accent2,
    accent3: themeColors.accent3, accent4: themeColors.accent4,
    accent5: themeColors.accent5, accent6: themeColors.accent6,
    tx1: themeColors.dk1, tx2: themeColors.dk2,
    bg1: themeColors.lt1, bg2: themeColors.lt2,
  };
  return map[ref] || '#000000';
}

function parseColorFromShapeXml(xml: string, themeColors: ThemeColors): string | null {
  // Direct RGB: <a:srgbClr val="RRGGBB"/>
  const srgb = xml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
  if (srgb) return `#${srgb[1]}`;

  // Scheme color: <a:schemeClr val="dk1"/>
  const scheme = xml.match(/<a:schemeClr\s+val="(\w+)"/);
  if (scheme) return resolveSchemeColor(scheme[1], themeColors);

  return null;
}

function parseFontSize(xml: string): number | null {
  // <a:rPr ... sz="1800" ...> → hundredths of a point → px at 1920 canvas
  // PPTX standard = 960px wide (96 DPI × 10"). Our canvas = 1920px = 2× scale.
  // So: (sz/100) × 1.333 (pt→px) × 2 (scale) = sz/100 × 2.666
  const sz = xml.match(/\bsz="(\d+)"/);
  if (sz) return Math.round(parseInt(sz[1]) / 100 * 2.666);
  return null;
}

function parseFontFamily(xml: string): string | null {
  const latin = xml.match(/<a:latin\s+typeface="([^"]+)"/);
  if (!latin) return null;
  return cleanFontName(latin[1]);
}

function parseAlignment(xml: string): string | null {
  const algn = xml.match(/\balgn="(\w+)"/);
  if (!algn) return null;
  const map: Record<string, string> = { l: 'left', ctr: 'center', r: 'right', just: 'justify' };
  return map[algn[1]] || null;
}

function isBold(xml: string): boolean {
  return /\bb="1"/.test(xml);
}

function isItalic(xml: string): boolean {
  return /\bi="1"/.test(xml);
}

function parseTextFromSpTree(
  spXml: string,
  themeColors: ThemeColors,
  defaultFonts: { titleFont: string; bodyFont: string },
  layoutPlaceholderSizes?: Map<string, number>, // phType → fontSize in hundredths of pt
): ParsedElement | null {
  // Extract position (support negative offsets)
  const off = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
  const ext = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
  if (!off || !ext) return null;

  const x = emuToPxX(Math.max(0, parseInt(off[1])));
  const y = emuToPxY(Math.max(0, parseInt(off[2])));
  const width = emuToPxX(parseInt(ext[1]));
  const height = emuToPxY(parseInt(ext[2]));

  if (width < 5 || height < 5) return null;

  // Extract rotation from xfrm
  const rotMatch = spXml.match(/<a:xfrm[^>]*\brot="(-?\d+)"/);
  const rotation = rotMatch ? Math.round(parseInt(rotMatch[1]) / 60000) : 0;

  // Check if it's a placeholder — get type and idx for layout inheritance
  const phMatch = spXml.match(/<p:ph([^/]*)\/?>/);
  const phType = phMatch ? (phMatch[1].match(/type="(\w+)"/) || [])[1] : null;

  // Check if it has text
  const txBody = spXml.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);
  if (!txBody) return null;

  const txContent = txBody[1];

  // Extract vertical alignment from bodyPr anchor attribute
  const anchorMatch = txContent.match(/<a:bodyPr[^>]*\banchor="(\w+)"/);
  const verticalAlign = anchorMatch
    ? (anchorMatch[1] === 't' ? 'top' : anchorMatch[1] === 'ctr' ? 'center' : anchorMatch[1] === 'b' ? 'bottom' : undefined)
    : undefined;

  // Parse paragraphs
  const paragraphs = txContent.match(/<a:p>([\s\S]*?)<\/a:p>/g) || [];
  let html = '';
  let firstFontSize: number | null = null;
  let firstFontFamily: string | null = null;
  let firstColor: string | null = null;
  let firstAlign: string | null = null;
  let firstBold = false;

  for (const pXml of paragraphs) {
    const align = parseAlignment(pXml);
    if (align && !firstAlign) firstAlign = align;

    const runs = pXml.match(/<a:r>([\s\S]*?)<\/a:r>/g) || [];
    let pContent = '';

    for (const rXml of runs) {
      // Get run properties
      const rPr = rXml.match(/<a:rPr([\s\S]*?)(?:\/>|>([\s\S]*?)<\/a:rPr>)/);
      const rPrXml = rPr ? (rPr[1] + (rPr[2] || '')) : '';

      const fontSize = parseFontSize(rPrXml);
      const fontFamily = parseFontFamily(rPrXml);

      // Parse color from solidFill within rPr
      const solidFill = rPrXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
      const color = solidFill ? parseColorFromShapeXml(solidFill[1], themeColors) : null;

      if (!firstFontSize && fontSize) firstFontSize = fontSize;
      if (!firstFontFamily && fontFamily) firstFontFamily = fontFamily;
      if (!firstColor && color) firstColor = color;
      if (!firstBold && isBold(rPrXml)) firstBold = true;

      // Extract text
      const textMatch = rXml.match(/<a:t>([\s\S]*?)<\/a:t>/);
      if (!textMatch) continue;
      let text = textMatch[1]
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      // Apply formatting
      const styles: string[] = [];
      if (color) styles.push(`color:${color}`);
      if (fontFamily) styles.push(`font-family:${fontFamily}`);
      if (fontSize) styles.push(`font-size:${fontSize}px`);

      if (isBold(rPrXml)) text = `<strong>${text}</strong>`;
      if (isItalic(rPrXml)) text = `<em>${text}</em>`;

      if (styles.length) {
        text = `<span style="${styles.join(';')}">${text}</span>`;
      }

      pContent += text;
    }

    if (pContent) {
      html += `<p>${pContent}</p>`;
    }
  }

  if (!html.replace(/<[^>]+>/g, '').trim()) return null;

  // Also check for default paragraph-level style
  const defRPr = txContent.match(/<a:defRPr([\s\S]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
  if (defRPr) {
    const defXml = defRPr[1] + (defRPr[2] || '');
    if (!firstFontSize) firstFontSize = parseFontSize(defXml);
    if (!firstFontFamily) firstFontFamily = parseFontFamily(defXml);
    if (!firstColor) {
      const sf = defXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
      if (sf) firstColor = parseColorFromShapeXml(sf[1], themeColors);
    }
  }

  // Inherit font size from layout placeholder if not set
  if (!firstFontSize && phType && layoutPlaceholderSizes) {
    const layoutSize = layoutPlaceholderSizes.get(phType);
    if (layoutSize) firstFontSize = Math.round(layoutSize / 100 * 2.666);
  }

  // Inherit font family from theme based on placeholder type
  // ALL text elements without an explicit font (or with generic 'Arial') should
  // inherit from theme fonts: titleFont for title/section placeholders, bodyFont otherwise
  if (!firstFontFamily || firstFontFamily === 'Arial') {
    if (phType === 'ctrTitle' || phType === 'title' || phType === 'sldNum') {
      firstFontFamily = defaultFonts.titleFont;
    } else if (phType === 'body' || phType === 'subTitle' || phType === 'dt' || phType === 'ftr') {
      firstFontFamily = defaultFonts.bodyFont;
    } else {
      // No placeholder type — infer from position/size: large text = title font, rest = body
      firstFontFamily = (firstFontSize && firstFontSize >= 48) ? defaultFonts.titleFont : defaultFonts.bodyFont;
    }
  }
  // Clean the font name in case it has query params
  if (firstFontFamily) firstFontFamily = cleanFontName(firstFontFamily);

  // Inherit alignment from placeholder type
  if (!firstAlign && (phType === 'ctrTitle' || phType === 'title')) {
    firstAlign = 'center';
  }

  return {
    id: genId(),
    type: 'text',
    content: html,
    x, y, width, height,
    rotation,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    style: {
      fontFamily: firstFontFamily || defaultFonts.bodyFont,
      fontSize: firstFontSize || 24,
      fontWeight: firstBold ? 'bold' : 'normal',
      color: firstColor || themeColors.dk1,
      textAlign: firstAlign || 'left',
      verticalAlign: verticalAlign,
    },
  };
}

function parseImageFromSpTree(
  picXml: string,
  relsMap: Map<string, string>,
): { element: ParsedElement; imageRef: string | null } | null {
  const off = picXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
  const ext = picXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
  if (!off || !ext) return null;

  const x = emuToPxX(Math.max(0, parseInt(off[1])));
  const y = emuToPxY(Math.max(0, parseInt(off[2])));
  const width = emuToPxX(parseInt(ext[1]));
  const height = emuToPxY(parseInt(ext[2]));

  // Get image reference: r:embed="rIdX"
  const embed = picXml.match(/r:embed="(rId\d+)"/);
  const imageRef = embed ? (relsMap.get(embed[1]) || null) : null;

  return {
    element: {
      id: genId(),
      type: 'image',
      content: '', // Will be filled with uploaded URL
      x, y, width, height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 0,
      style: { objectFit: 'cover', borderRadius: 0 },
    },
    imageRef,
  };
}

/**
 * Convert OOXML custGeom path commands to SVG path data.
 * OOXML uses <a:moveTo>, <a:lnTo>, <a:cubicBezTo>, <a:close> with <a:pt x="" y=""/> points.
 */
function custGeomToSvgPath(custGeomXml: string, pathWidth: number, pathHeight: number): string | null {
  const paths = custGeomXml.match(/<a:path[^>]*>([\s\S]*?)<\/a:path>/g);
  if (!paths) return null;

  let svgPath = '';
  for (const pathXml of paths) {
    // Extract path dimensions (used for coordinate scaling)
    const pw = pathXml.match(/w="(\d+)"/)?.[1];
    const ph = pathXml.match(/h="(\d+)"/)?.[1];
    const coordW = pw ? parseInt(pw) : pathWidth;
    const coordH = ph ? parseInt(ph) : pathHeight;

    // Scale factor from path coords to viewBox
    const sx = coordW > 0 ? 100 / coordW : 1;
    const sy = coordH > 0 ? 100 / coordH : 1;

    // Parse commands
    const commands = pathXml.matchAll(/<a:(moveTo|lnTo|cubicBezTo|close)\/?>([\s\S]*?)(?=<a:(?:moveTo|lnTo|cubicBezTo|close)|<\/a:path>)/g);
    for (const cmd of commands) {
      const type = cmd[1];
      const content = cmd[2] || '';
      const pts = [...content.matchAll(/<a:pt\s+x="(\d+)"\s+y="(\d+)"/g)]
        .map(p => ({ x: Math.round(parseInt(p[1]) * sx), y: Math.round(parseInt(p[2]) * sy) }));

      if (type === 'moveTo' && pts.length >= 1) {
        svgPath += `M${pts[0].x} ${pts[0].y} `;
      } else if (type === 'lnTo' && pts.length >= 1) {
        svgPath += `L${pts[0].x} ${pts[0].y} `;
      } else if (type === 'cubicBezTo' && pts.length >= 3) {
        svgPath += `C${pts[0].x} ${pts[0].y} ${pts[1].x} ${pts[1].y} ${pts[2].x} ${pts[2].y} `;
      } else if (type === 'close') {
        svgPath += 'Z ';
      }
    }
  }

  return svgPath.trim() || null;
}

function parseShapeFromSpTree(
  spXml: string,
  themeColors: ThemeColors,
): ParsedElement | null {
  const off = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
  const ext = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
  if (!off || !ext) return null;

  const x = emuToPxX(Math.max(0, parseInt(off[1])));
  const y = emuToPxY(Math.max(0, parseInt(off[2])));
  const width = emuToPxX(parseInt(ext[1]));
  const height = emuToPxY(parseInt(ext[2]));

  if (width < 5 || height < 5) return null;

  // Determine shape type
  const prstGeom = spXml.match(/<a:prstGeom\s+prst="(\w+)"/);
  const custGeom = spXml.match(/<a:custGeom>([\s\S]*?)<\/a:custGeom>/);
  const geomType = prstGeom?.[1] || (custGeom ? 'custom' : 'rect');

  const shapeMap: Record<string, string> = {
    rect: 'rectangle', roundRect: 'rectangle', ellipse: 'circle',
    triangle: 'triangle', rightArrow: 'arrow-right',
  };

  // Get fill
  const solidFill = spXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
  const fill = solidFill ? parseColorFromShapeXml(solidFill[1], themeColors) : null;

  // Get outline
  const ln = spXml.match(/<a:ln[^>]*>([\s\S]*?)<\/a:ln>/);
  let stroke: string | null = null;
  let strokeWidth = 0;
  if (ln) {
    const lnFill = ln[1].match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
    stroke = lnFill ? parseColorFromShapeXml(lnFill[1], themeColors) : null;
    const w = ln[0].match(/\bw="(\d+)"/);
    strokeWidth = w ? Math.round(parseInt(w[1]) / 12700) : 1;
  }

  // Skip if no fill AND no stroke (invisible)
  const noFill = spXml.includes('<a:noFill/>') || (!fill && !solidFill);
  if (noFill && !stroke) return null;

  // Convert custom geometry to SVG path
  let svgPath: string | null = null;
  if (custGeom) {
    const rawW = parseInt(ext[1]);
    const rawH = parseInt(ext[2]);
    svgPath = custGeomToSvgPath(custGeom[1], rawW, rawH);
  }

  return {
    id: genId(),
    type: 'shape',
    content: svgPath || '', // SVG path data for custom shapes
    x, y, width, height,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    style: {
      shapeType: svgPath ? 'custom' : (shapeMap[geomType] || 'rectangle'),
      shapeFill: noFill ? 'transparent' : (fill || themeColors.accent1),
      shapeStroke: stroke || 'transparent',
      shapeStrokeWidth: strokeWidth,
      borderRadius: geomType === 'roundRect' ? 12 : 0,
      svgPath: svgPath || undefined, // Store SVG path for rendering
    },
  };
}

function parseSlideBackground(slideXml: string, relsMap: Map<string, string>, themeColors: ThemeColors): { type: string; value: string } {
  // Solid fill background
  const bgSolid = slideXml.match(/<p:bg>[\s\S]*?<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
  if (bgSolid) {
    const color = parseColorFromShapeXml(bgSolid[1], themeColors);
    if (color) return { type: 'solid', value: color };
  }

  // Image background: blipFill
  const bgBlip = slideXml.match(/<p:bg>[\s\S]*?r:embed="(rId\d+)"/);
  if (bgBlip) {
    const ref = relsMap.get(bgBlip[1]);
    if (ref) return { type: 'image', value: ref };
  }

  return { type: 'solid', value: themeColors.lt1 };
}

// ---- Image upload ----
const imageCache = new Map<string, string>();

async function uploadImage(data: Buffer, contentType: string): Promise<string> {
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('png') ? 'png' : 'png';
  const fileName = `imported/${genId()}.${ext}`;

  // Retry upload once on failure
  let lastError: string = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const { error } = await supabase.storage
      .from('presentation-assets')
      .upload(attempt === 0 ? fileName : `imported/${genId()}.${ext}`, data, { contentType, cacheControl: '3600' });

    if (!error) {
      const { data: urlData } = supabase.storage.from('presentation-assets').getPublicUrl(fileName);
      console.log(`  Uploaded: ${fileName} (${(data.length / 1024).toFixed(0)}KB)`);
      return urlData.publicUrl;
    }
    lastError = error.message;
    if (attempt === 0) await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
  }

  console.warn(`  Upload failed: ${lastError}`);
  return '';
}

// ---- Main ----
async function main() {
  const presentationId = process.argv[2];
  if (!presentationId) {
    console.error('Usage: npx tsx scripts/import-pptx-template.ts <google-slides-id>');
    process.exit(1);
  }

  // Step 1: Enable Drive API scope and download PPTX
  console.log(`Downloading PPTX for ${presentationId}...`);

  // Also get title from Slides API
  const metaRes = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}?fields=title,pageSize`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  );
  const meta = await metaRes.json();
  const title = meta.title || 'Untitled';
  console.log(`Title: ${title}`);

  if (meta.pageSize) {
    slideWidthEmu = meta.pageSize.width?.magnitude || slideWidthEmu;
    slideHeightEmu = meta.pageSize.height?.magnitude || slideHeightEmu;
    console.log(`Page size: ${slideWidthEmu} x ${slideHeightEmu} EMU`);
  }

  // Download as PPTX via Drive export
  const pptxRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${presentationId}/export?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
  );

  if (!pptxRes.ok) {
    console.error(`Failed to download PPTX: ${pptxRes.status} ${await pptxRes.text()}`);
    process.exit(1);
  }

  const pptxBuffer = Buffer.from(await pptxRes.arrayBuffer());
  console.log(`Downloaded PPTX: ${(pptxBuffer.length / 1024 / 1024).toFixed(1)}MB`);

  // Step 2: Parse PPTX (ZIP)
  const zip = await JSZip.loadAsync(pptxBuffer);

  // Follow the chain: slide1 → slideLayout → slideMaster → theme
  // to find the correct theme file
  let themeFile = 'ppt/theme/theme1.xml'; // fallback

  const slide1Rels = zip.files['ppt/slides/_rels/slide1.xml.rels'];
  if (slide1Rels) {
    const slide1RelsXml = await slide1Rels.async('string');
    const layoutMatch = slide1RelsXml.match(/Target="\.\.\/slideLayouts\/(slideLayout\d+\.xml)"/);
    if (layoutMatch) {
      const layoutRelsFile = `ppt/slideLayouts/_rels/${layoutMatch[1]}.rels`;
      if (zip.files[layoutRelsFile]) {
        const layoutRelsXml = await zip.file(layoutRelsFile)!.async('string');
        const masterMatch = layoutRelsXml.match(/Target="\.\.\/slideMasters\/(slideMaster\d+\.xml)"/);
        if (masterMatch) {
          const masterRelsFile = `ppt/slideMasters/_rels/${masterMatch[1]}.rels`;
          if (zip.files[masterRelsFile]) {
            const masterRelsXml = await zip.file(masterRelsFile)!.async('string');
            const themeMatch = masterRelsXml.match(/Target="\.\.\/theme\/(theme\d+\.xml)"/);
            if (themeMatch) {
              themeFile = `ppt/theme/${themeMatch[1]}`;
            }
          }
        }
      }
    }
  }
  console.log(`Using theme: ${themeFile}`);

  if (!zip.files[themeFile]) {
    console.error(`Theme file not found: ${themeFile}`);
    process.exit(1);
  }
  const themeXml = await zip.file(themeFile)!.async('string');
  const themeColors = extractThemeColors(themeXml);
  const themeFonts = extractThemeFonts(themeXml);

  // Clean theme font names
  themeFonts.titleFont = cleanFontName(themeFonts.titleFont);
  themeFonts.bodyFont = cleanFontName(themeFonts.bodyFont);

  // Extract real Google Fonts from slide rels (Slidesgo pattern)
  const googleFonts = await extractGoogleFontsFromRels(zip);
  if (googleFonts.length >= 2) {
    themeFonts.titleFont = googleFonts[0];
    themeFonts.bodyFont = googleFonts[1];
  } else if (googleFonts.length === 1) {
    themeFonts.titleFont = googleFonts[0];
    themeFonts.bodyFont = googleFonts[0];
  }

  console.log('Theme colors:', themeColors);
  console.log('Theme fonts:', themeFonts);
  if (googleFonts.length) console.log('Google Fonts:', googleFonts);

  // Find all slide files
  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

  console.log(`Found ${slideFiles.length} slides`);

  // Detect "Final Pages" master — resolve the slide master used by slide 1
  // In Slidesgo templates, the first master is content; the second master is "Final Pages"
  let primaryMasterId: string | null = null;

  // Build a lookup: slideLayout → slideMaster
  const layoutToMaster = new Map<string, string>();
  const layoutRelsFiles = Object.keys(zip.files).filter(f => /^ppt\/slideLayouts\/_rels\/slideLayout\d+\.xml\.rels$/.test(f));
  for (const lrf of layoutRelsFiles) {
    const lrXml = await zip.file(lrf)!.async('string');
    const masterMatch = lrXml.match(/Target="\.\.\/slideMasters\/(slideMaster\d+\.xml)"/);
    if (masterMatch) {
      const layoutFileName = lrf.replace('ppt/slideLayouts/_rels/', '').replace('.rels', '');
      layoutToMaster.set(layoutFileName, masterMatch[1]);
    }
  }

  // Determine which master slide 1 uses — that's the primary (content) master
  if (slide1Rels) {
    const s1RelsXml = await slide1Rels.async('string');
    const s1LayoutMatch = s1RelsXml.match(/Target="\.\.\/slideLayouts\/(slideLayout\d+\.xml)"/);
    if (s1LayoutMatch) {
      primaryMasterId = layoutToMaster.get(s1LayoutMatch[1]) || null;
    }
  }
  console.log(`Primary master: ${primaryMasterId || 'unknown'}`);

  // Helper: resolve slide → slideLayout → slideMaster chain
  async function getSlideMasterId(slideNum: number): Promise<string | null> {
    const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    if (!zip.files[relsFile]) return null;
    const relsXml = await zip.file(relsFile)!.async('string');
    const layoutMatch = relsXml.match(/Target="\.\.\/slideLayouts\/(slideLayout\d+\.xml)"/);
    if (!layoutMatch) return null;
    return layoutToMaster.get(layoutMatch[1]) || null;
  }

  const parsedSlides: ParsedSlide[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const slideFile = slideFiles[i];
    const slideNum = parseInt(slideFile.match(/slide(\d+)/)?.[1] || '0');
    console.log(`Parsing slide ${i + 1}/${slideFiles.length} (${slideFile})...`);

    const slideXml = await zip.file(slideFile)!.async('string');
    const plainText = slideXml.replace(/<[^>]+>/g, '').toLowerCase();
    const elementCount = (slideXml.match(/<p:sp>/g) || []).length + (slideXml.match(/<p:pic>/g) || []).length;

    // Check if slide belongs to the secondary (non-primary) master = "Final Pages"
    const slideMasterId = await getSlideMasterId(slideNum);
    const isSecondaryMaster = primaryMasterId && slideMasterId && slideMasterId !== primaryMasterId;

    // Heuristic final page detection (branding, excessive elements, resource pages)
    const isFinalPageHeuristic = plainText.includes('slidesgo') || plainText.includes('freepik') || plainText.includes('flaticon')
      || elementCount > 50
      || (/\bicons?\b/.test(plainText) && elementCount > 15)
      || plainText.includes('fonts & colors') || plainText.includes('fonts used')
      || plainText.includes('contents of this template')
      || plainText.includes('contents of this presentation');

    const isFinalPage = isSecondaryMaster || isFinalPageHeuristic;

    // Exception: explicitly KEEP "Thank You" / "Thanks" slides even if flagged
    const isThanksSlide = /\bthanks?\b/i.test(plainText) || /\bthank\s+you\b/i.test(plainText);

    if (isFinalPage && !isThanksSlide) {
      console.log(`  Skipping final page (${elementCount} elements, master=${slideMasterId})`);
      continue;
    }
    if (isThanksSlide && isFinalPage) {
      console.log(`  Keeping "Thank You" slide despite final-page match`);
    }

    // Parse relationships for this slide
    const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsMap = new Map<string, string>();
    if (zip.files[relsFile]) {
      const relsXml = await zip.file(relsFile)!.async('string');
      const relMatches = relsXml.matchAll(/Id="(rId\d+)"[^>]+Target="([^"]+)"/g);
      for (const m of relMatches) {
        relsMap.set(m[1], m[2]);
      }
    }

    // Parse background
    let background = parseSlideBackground(slideXml, relsMap, themeColors);

    // Extract layout name and placeholder font sizes for inheritance
    let layoutName = 'unknown';
    const layoutPlaceholderSizes = new Map<string, number>();
    const layoutRef = relsMap.get('rId1'); // Usually rId1 points to layout
    if (layoutRef) {
      const layoutPath = layoutRef.startsWith('../')
        ? 'ppt/' + layoutRef.replace('../', '')
        : layoutRef;
      const layoutFile = zip.files[layoutPath];
      if (layoutFile) {
        const layoutXml = await layoutFile.async('string');
        // Extract layout name
        const nameMatch = layoutXml.match(/<p:cSld\s+name="([^"]*)"/);
        if (nameMatch) layoutName = nameMatch[1];
        // Find placeholders with defRPr sz
        const phMatches = layoutXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
        for (const pm of phMatches) {
          const phTypeMatch = pm[1].match(/<p:ph[^>]*type="(\w+)"/);
          if (phTypeMatch) {
            const defSzMatch = pm[1].match(/<a:defRPr[^>]*\bsz="(\d+)"/);
            if (defSzMatch) {
              layoutPlaceholderSizes.set(phTypeMatch[1], parseInt(defSzMatch[1]));
            }
          }
        }
      }
    }

    // Parse elements — start with layout decorations (images, shapes that aren't placeholders)
    const elements: ParsedElement[] = [];
    let zIndex = 1;

    // Inherit non-placeholder elements from layout (background images, decorative shapes, lines)
    if (layoutRef) {
      const layoutPath = layoutRef.startsWith('../') ? 'ppt/' + layoutRef.replace('../', '') : layoutRef;
      const layoutFile = zip.files[layoutPath];
      if (layoutFile) {
        const layoutXml = await layoutFile.async('string');

        // Build layout rels map for image references
        const layoutFileName = layoutPath.split('/').pop() || '';
        const layoutRelsPath = layoutPath.replace('slideLayouts/', 'slideLayouts/_rels/') + '.rels';
        const layoutRelsMap = new Map<string, string>();
        if (zip.files[layoutRelsPath]) {
          const layoutRelsXml = await zip.file(layoutRelsPath)!.async('string');
          const lRelMatches = layoutRelsXml.matchAll(/Id="(rId\d+)"[^>]+Target="([^"]+)"/g);
          for (const m of lRelMatches) {
            layoutRelsMap.set(m[1], m[2]);
          }
        }

        // Extract pics from layout (background images, decorations)
        const layoutPicMatches = layoutXml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g);
        for (const m of layoutPicMatches) {
          // Skip placeholder images
          if (m[1].includes('<p:ph')) continue;

          const result = parseImageFromSpTree(m[1], layoutRelsMap);
          if (result && result.imageRef) {
            result.element.zIndex = zIndex++;
            let normalizedPath: string;
            if (result.imageRef.startsWith('../')) {
              normalizedPath = 'ppt/' + result.imageRef.replace('../', '');
            } else {
              normalizedPath = `ppt/slideLayouts/${result.imageRef}`;
            }
            let imgFile = zip.files[normalizedPath];
            if (!imgFile) {
              const baseName = normalizedPath.replace(/\.\w+$/, '');
              for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.emf', '.wmf']) {
                imgFile = zip.files[baseName + ext];
                if (imgFile) break;
              }
            }
            if (imgFile) {
              const imgData = await imgFile.async('nodebuffer');
              const ext = normalizedPath.match(/\.(\w+)$/)?.[1] || 'png';
              const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
              const url = await uploadImage(imgData, mimeType);
              result.element.content = url;

              // If full-bleed image, make it the background
              if (result.element.width > CANVAS_W * 0.9 && result.element.height > CANVAS_H * 0.9) {
                background = { type: 'image', value: url };
                console.log(`  Layout bg image uploaded`);
              } else if (url) {
                elements.push(result.element);
                console.log(`  Layout decoration image uploaded`);
              }
            }
          }
        }

        // Extract non-placeholder shapes from layout (decorative lines, shapes)
        const layoutSpMatches = layoutXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
        for (const m of layoutSpMatches) {
          // Skip placeholders
          if (m[1].includes('<p:ph')) continue;
          // Skip text boxes (they're placeholders even without the tag sometimes)
          if (m[1].includes('<p:txBody>') && m[1].includes('<a:t>')) continue;

          const shapeEl = parseShapeFromSpTree(m[1], themeColors);
          if (shapeEl) {
            shapeEl.zIndex = zIndex++;
            elements.push(shapeEl);
          }
        }
      }
    }

    // Find all sp (shapes) and pic (pictures) in the slide itself
    // Text shapes: <p:sp>...</p:sp>
    const spMatches = slideXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
    for (const m of spMatches) {
      const spXml = m[1];

      // Try as text first
      const textEl = parseTextFromSpTree(spXml, themeColors, themeFonts, layoutPlaceholderSizes);
      if (textEl) {
        textEl.zIndex = zIndex++;
        elements.push(textEl);
        continue;
      }

      // Try as shape
      const shapeEl = parseShapeFromSpTree(spXml, themeColors);
      if (shapeEl) {
        shapeEl.zIndex = zIndex++;
        elements.push(shapeEl);
      }
    }

    // Pictures: <p:pic>...</p:pic> (also inside groups <p:grpSp>)
    const picMatches = slideXml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g);
    for (const m of picMatches) {
      const result = parseImageFromSpTree(m[1], relsMap);
      if (result) {
        result.element.zIndex = zIndex++;

        // Upload image from PPTX
        if (result.imageRef) {
          // Resolve relative path: ../media/image1.jpg → ppt/media/image1.jpg
          let normalizedPath: string;
          if (result.imageRef.startsWith('../')) {
            normalizedPath = 'ppt/' + result.imageRef.replace('../', '');
          } else if (result.imageRef.startsWith('/')) {
            normalizedPath = result.imageRef.slice(1);
          } else {
            normalizedPath = `ppt/slides/${result.imageRef}`;
          }

          // Try exact path first, then try other extensions
          let imgFile = zip.files[normalizedPath];
          if (!imgFile) {
            const baseName = normalizedPath.replace(/\.\w+$/, '');
            for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.emf', '.wmf']) {
              imgFile = zip.files[baseName + ext];
              if (imgFile) break;
            }
          }
          if (imgFile) {
            const imgData = await imgFile.async('nodebuffer');
            const ext = normalizedPath.match(/\.(\w+)$/)?.[1] || 'png';
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
            const url = await uploadImage(imgData, mimeType);
            result.element.content = url;

            // If this is a full-bleed image, make it the background
            if (result.element.width > CANVAS_W * 0.9 && result.element.height > CANVAS_H * 0.9) {
              background = { type: 'image', value: url };
              continue; // Don't add as element
            }
          } else {
            console.warn(`  Image not found: ${normalizedPath}`);
          }
        }

        if (result.element.content) {
          elements.push(result.element);
        }
      }
    }

    // Also handle background images from rels
    if (background.type === 'image' && !background.value.startsWith('http')) {
      let normalizedBgPath: string;
      if (background.value.startsWith('../')) {
        normalizedBgPath = 'ppt/' + background.value.replace('../', '');
      } else if (background.value.startsWith('/')) {
        normalizedBgPath = background.value.slice(1);
      } else {
        normalizedBgPath = `ppt/slides/${background.value}`;
      }
      let bgFile = zip.files[normalizedBgPath];
      if (!bgFile) {
        const baseName = normalizedBgPath.replace(/\.\w+$/, '');
        for (const ext of ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']) {
          bgFile = zip.files[baseName + ext];
          if (bgFile) break;
        }
      }
      if (bgFile) {
        const bgData = await bgFile.async('nodebuffer');
        const ext = normalizedBgPath.match(/\.(\w+)$/)?.[1] || 'png';
        background.value = await uploadImage(bgData, `image/${ext}`);
      }
    }

    // Detect TOC (Table of Contents) slides
    const isTocSlide = plainText.includes('table of contents') || plainText.includes('contents')
      && (layoutName === 'TITLE_ONLY' || layoutName.includes('CUSTOM'))
      && texts.length >= 3; // Multiple text elements = TOC items

    // Detect "Thank You" / closing slides
    const isClosingSlide = /\bthanks?\b/i.test(plainText) || /\bthank\s+you\b/i.test(plainText);

    // Classify slide type from layout name
    const slideTypeMap: Record<string, string> = {
      'TITLE': 'cover',
      'SECTION_HEADER': 'section',
      'TITLE_ONLY': 'content',
      'TITLE_AND_TWO_COLUMNS': 'two-column',
      'CAPTION_ONLY': 'image',
      'BLANK': 'blank',
    };
    const slideType = isTocSlide ? 'toc'
      : isClosingSlide ? 'closing'
      : slideTypeMap[layoutName] ||
      (layoutName.includes('CUSTOM') && elements.length <= 5 ? 'content' : 'content');

    // Reorder zIndex: images first, then shapes, then text on top
    let z = 1;
    const images = elements.filter(e => e.type === 'image');
    const shapes = elements.filter(e => e.type === 'shape');
    const texts = elements.filter(e => e.type === 'text');
    for (const el of [...images, ...shapes, ...texts]) {
      el.zIndex = z++;
    }
    const reordered = [...images, ...shapes, ...texts];

    console.log(`  → ${layoutName} (${slideType}) ${reordered.length} elements (${texts.length} text, ${shapes.length} shapes, ${images.length} images)`);

    parsedSlides.push({
      id: genId(),
      elements: reordered,
      background,
      notes: '',
      layout: slideType,
    } as any);
  }

  console.log(`\nParsed ${parsedSlides.length} slides, ${imageCache.size} images uploaded`);

  // Step 3: Save to Supabase
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) + '-' + genId();

  // Get first slide's first image as thumbnail
  const thumbUrl = parsedSlides[0]?.elements?.find(e => e.type === 'image')?.content
    || parsedSlides[0]?.background?.value || null;

  const template = {
    name: title,
    slug,
    category: 'Imported',
    description: `${parsedSlides.length} slides — ${themeFonts.titleFont} / ${themeFonts.bodyFont}`,
    thumbnail_url: thumbUrl,
    preview_slides: parsedSlides,
    theme: {
      id: slug,
      name: title,
      category: 'Imported',
      tokens: {
        palette: {
          primary: themeColors.accent1,
          secondary: themeColors.accent2,
          accent: themeColors.accent3,
          bg: themeColors.lt1,
          text: themeColors.dk1,
        },
        typography: {
          titleFont: themeFonts.titleFont,
          bodyFont: themeFonts.bodyFont,
          titleSize: 42,
          bodySize: 24,
        },
        radii: '16px',
        shadows: 'lg',
      },
      previewColors: [themeColors.accent1, themeColors.accent2, themeColors.accent3, themeColors.lt1],
    },
    layouts: parsedSlides.map((_, i) => `slide-${i + 1}`),
    fonts: [themeFonts.titleFont, themeFonts.bodyFont],
    colors: {
      primary: themeColors.accent1,
      secondary: themeColors.accent2,
      accent: themeColors.accent3,
      bg: themeColors.lt1,
      text: themeColors.dk1,
      ...themeColors,
    },
    is_premium: false,
    is_active: true,
    sort_order: 0,
  };

  // Delete existing template with same name
  await supabase.from('templates').delete().eq('name', title);

  console.log('Saving to Supabase...');
  const { data, error } = await supabase.from('templates').insert(template).select('id').single();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`\nTemplate saved! ID: ${data.id}`);
  console.log(`Theme: dk1=${themeColors.dk1} lt1=${themeColors.lt1} accent1=${themeColors.accent1}`);
  console.log(`Fonts: ${themeFonts.titleFont} / ${themeFonts.bodyFont}`);
  console.log('Done.');
}

main().catch(console.error);
