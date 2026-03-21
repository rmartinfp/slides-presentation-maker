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

const isLocal = process.argv[2] && (process.argv[2].endsWith('.pptx') || process.argv[2].startsWith('/') || process.argv[2].startsWith('.'));
if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}
if (!isLocal && !ACCESS_TOKEN) {
  console.error('Set GOOGLE_ACCESS_TOKEN env var (not needed for local .pptx files)');
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
  // <a:rPr ... sz="1800" ...> → hundredths of a point
  // Store as points (same as Google Slides / PowerPoint UI)
  // Canvas rendering scales these proportionally to the canvas size
  const sz = xml.match(/\bsz="(\d+)"/);
  if (sz) return Math.round(parseInt(sz[1]) / 100);
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
  layoutPlaceholderSizes?: Map<string, number>,
  layoutPlaceholderFonts?: Map<string, string>,
  layoutPlaceholderBold?: Map<string, boolean>,
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
  const phIdx = phMatch ? (phMatch[1].match(/idx="(\d+)"/) || [])[1] : null;

  // Check if it has text
  const txBody = spXml.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);
  if (!txBody) return null;

  const txContent = txBody[1];

  // Extract vertical alignment from bodyPr anchor attribute
  const anchorMatch = txContent.match(/<a:bodyPr[^>]*\banchor="(\w+)"/);
  const verticalAlign = anchorMatch
    ? (anchorMatch[1] === 't' ? 'top' : anchorMatch[1] === 'ctr' ? 'center' : anchorMatch[1] === 'b' ? 'bottom' : undefined)
    : undefined;

  // Extract line spacing from bodyPr or first paragraph
  let lineHeight: number | null = null;
  const lnSpc = txContent.match(/<a:lnSpc>[\s\S]*?<a:spcPct\s+val="(\d+)"[\s\S]*?<\/a:lnSpc>/);
  if (lnSpc) {
    lineHeight = parseInt(lnSpc[1]) / 100000; // e.g. 150000 → 1.5
  }

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

    // Check paragraph-level default run properties for bold/italic inheritance
    const pDefRPr = pXml.match(/<a:pPr[^>]*>[\s\S]*?<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
    const pDefBold = pDefRPr ? isBold(pDefRPr[1] + (pDefRPr[2] || '')) : false;
    const pDefItalic = pDefRPr ? isItalic(pDefRPr[1] + (pDefRPr[2] || '')) : false;
    // Also check endParaRPr (end paragraph run properties) — often defines the style for the whole paragraph
    const endParaRPr = pXml.match(/<a:endParaRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:endParaRPr>)/);
    const endBold = endParaRPr ? isBold(endParaRPr[1] + (endParaRPr[2] || '')) : false;
    const endItalic = endParaRPr ? isItalic(endParaRPr[1] + (endParaRPr[2] || '')) : false;
    const paragraphBold = pDefBold || endBold;
    const paragraphItalic = pDefItalic || endItalic;

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
      // Bold from run OR inherited from paragraph default
      const runBold = isBold(rPrXml) || paragraphBold;
      const runItalic = isItalic(rPrXml) || paragraphItalic;
      if (!firstBold && runBold) firstBold = true;

      // Extract text
      const textMatch = rXml.match(/<a:t>([\s\S]*?)<\/a:t>/);
      if (!textMatch) continue;
      let text = textMatch[1]
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      // Apply formatting
      const styles: string[] = [];
      if (color) styles.push(`color:${color}`);
      if (fontFamily) styles.push(`font-family:${fontFamily}`);
      if (fontSize) styles.push(`font-size:${Math.round(fontSize * 2.666)}px`);

      if (runBold) text = `<strong>${text}</strong>`;
      if (runItalic) text = `<em>${text}</em>`;

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

  // Inherit font size from layout/master placeholder if not set
  // Build lookup keys: idx first (most specific), then type, then type equivalents
  const phLookupKeys: string[] = [];
  if (phIdx) phLookupKeys.push(`idx:${phIdx}`);
  if (phType) {
    phLookupKeys.push(`type:${phType}`);
    if (phType === 'ctrTitle') phLookupKeys.push('type:title');
    else if (phType === 'title') phLookupKeys.push('type:ctrTitle');
  }

  if (!firstFontSize && phLookupKeys.length && layoutPlaceholderSizes) {
    for (const key of phLookupKeys) {
      const layoutSize = layoutPlaceholderSizes.get(key);
      if (layoutSize) { firstFontSize = Math.round(layoutSize / 100); break; }
    }
  }

  // Inherit bold from layout/master placeholder if not set
  if (!firstBold && phLookupKeys.length && layoutPlaceholderBold) {
    for (const key of phLookupKeys) {
      if (layoutPlaceholderBold.get(key)) { firstBold = true; break; }
    }
  }

  // Inherit font family: 1) from layout/master placeholder (by idx then type), 2) from theme
  if (!firstFontFamily || firstFontFamily === 'Arial') {
    if (phLookupKeys.length && layoutPlaceholderFonts) {
      for (const key of phLookupKeys) {
        const layoutFont = layoutPlaceholderFonts.get(key);
        if (layoutFont && layoutFont !== 'Arial') { firstFontFamily = layoutFont; break; }
      }
    }
    // Fall back to theme fonts
    if (!firstFontFamily || firstFontFamily === 'Arial') {
      if (phType === 'ctrTitle' || phType === 'title' || phType === 'sldNum') {
        firstFontFamily = defaultFonts.titleFont;
      } else if (phType === 'body' || phType === 'subTitle' || phType === 'dt' || phType === 'ftr') {
        firstFontFamily = defaultFonts.bodyFont;
      } else {
        firstFontFamily = (firstFontSize && firstFontSize >= 48) ? defaultFonts.titleFont : defaultFonts.bodyFont;
      }
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
      fontSize: firstFontSize || 12,
      fontWeight: firstBold ? 'bold' : 'normal',
      color: firstColor || themeColors.dk1,
      textAlign: firstAlign || 'left',
      verticalAlign: verticalAlign,
      lineHeight: lineHeight || undefined,
    },
  };
}

function parseImageFromSpTree(
  picXml: string,
  relsMap: Map<string, string>,
  themeColors?: ThemeColors,
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

  // Extract rotation
  const rotMatch = picXml.match(/<a:xfrm[^>]*\brot="(-?\d+)"/);
  const rotation = rotMatch ? Math.round(parseInt(rotMatch[1]) / 60000) : 0;

  // Extract border radius from geometry preset
  let borderRadius = 0;
  const prstGeom = picXml.match(/<a:prstGeom\s+prst="(\w+)"/);
  if (prstGeom?.[1] === 'roundRect' || prstGeom?.[1] === 'ellipse') {
    borderRadius = prstGeom[1] === 'ellipse' ? 9999 : 12; // default
    const adj = picXml.match(/<a:gd\s+name="adj"\s+fmla="val\s+(\d+)"/);
    if (adj) {
      // OOXML adj value is in 1/100000 of the shape size — convert to approx px
      const adjVal = parseInt(adj[1]) / 100000;
      const minDim = Math.min(width, height);
      borderRadius = Math.round(adjVal * minDim);
    }
  }

  // Extract border (outline) from <a:ln>
  let borderColor: string | undefined;
  let borderWidth = 0;
  const ln = picXml.match(/<a:ln[^>]*>([\s\S]*?)<\/a:ln>/);
  if (ln && themeColors) {
    const lnFill = ln[1].match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
    borderColor = lnFill ? (parseColorFromShapeXml(lnFill[1], themeColors) || undefined) : undefined;
    const w = ln[0].match(/\bw="(\d+)"/);
    borderWidth = w ? Math.max(1, Math.round(parseInt(w[1]) / 12700)) : 1;
  }

  return {
    element: {
      id: genId(),
      type: 'image',
      content: '',
      x, y, width, height,
      rotation,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: 0,
      style: {
        objectFit: 'cover',
        borderRadius,
        borderColor,
        borderWidth: borderWidth || undefined,
      },
    },
    imageRef,
  };
}

/**
 * Convert OOXML custGeom path commands to SVG path data.
 * Preserves original coordinate space for maximum precision.
 * Returns both the SVG path and the viewBox dimensions.
 */
function custGeomToSvgPath(custGeomXml: string, pathWidth: number, pathHeight: number): { path: string; viewBox: string } | null {
  const paths = custGeomXml.match(/<a:path[^>]*>([\s\S]*?)<\/a:path>/g);
  if (!paths) return null;

  let svgPath = '';
  let vbW = 0;
  let vbH = 0;

  for (const pathXml of paths) {
    // Extract path dimensions — use original coordinate space
    const pw = pathXml.match(/\bw="(\d+)"/)?.[1];
    const ph = pathXml.match(/\bh="(\d+)"/)?.[1];
    const coordW = pw ? parseInt(pw) : pathWidth;
    const coordH = ph ? parseInt(ph) : pathHeight;
    vbW = Math.max(vbW, coordW);
    vbH = Math.max(vbH, coordH);

    // Track current point for arcTo endpoint calculation
    let curX = 0, curY = 0;

    // Parse commands (include arcTo and quadBezTo)
    const commands = pathXml.matchAll(/<a:(moveTo|lnTo|cubicBezTo|quadBezTo|arcTo|close)\s*\/?>([\s\S]*?)(?=<a:(?:moveTo|lnTo|cubicBezTo|quadBezTo|arcTo|close)|<\/a:path>)/g);
    for (const cmd of commands) {
      const type = cmd[1];
      const content = cmd[2] || '';
      const pts = [...content.matchAll(/<a:pt\s+x="(-?\d+)"\s+y="(-?\d+)"/g)]
        .map(p => ({ x: parseInt(p[1]), y: parseInt(p[2]) }));

      if (type === 'moveTo' && pts.length >= 1) {
        svgPath += `M${pts[0].x} ${pts[0].y} `;
        curX = pts[0].x; curY = pts[0].y;
      } else if (type === 'lnTo' && pts.length >= 1) {
        svgPath += `L${pts[0].x} ${pts[0].y} `;
        curX = pts[0].x; curY = pts[0].y;
      } else if (type === 'cubicBezTo' && pts.length >= 3) {
        svgPath += `C${pts[0].x} ${pts[0].y} ${pts[1].x} ${pts[1].y} ${pts[2].x} ${pts[2].y} `;
        curX = pts[2].x; curY = pts[2].y;
      } else if (type === 'quadBezTo' && pts.length >= 2) {
        svgPath += `Q${pts[0].x} ${pts[0].y} ${pts[1].x} ${pts[1].y} `;
        curX = pts[1].x; curY = pts[1].y;
      } else if (type === 'arcTo') {
        // OOXML arcTo: wR, hR (radii), stAng, swAng (in 60000ths of degree)
        const wR = parseInt(content.match(/\bwR="(\d+)"/)?.[1] || '0');
        const hR = parseInt(content.match(/\bhR="(\d+)"/)?.[1] || '0');
        const stAng = parseInt(content.match(/\bstAng="(-?\d+)"/)?.[1] || '0') / 60000 * Math.PI / 180;
        const swAng = parseInt(content.match(/\bswAng="(-?\d+)"/)?.[1] || '0') / 60000 * Math.PI / 180;

        if (wR > 0 && hR > 0 && swAng !== 0) {
          // Center of the arc ellipse relative to current point
          const cx = curX - wR * Math.cos(stAng);
          const cy = curY - hR * Math.sin(stAng);
          // End point
          const endAng = stAng + swAng;
          const endX = Math.round(cx + wR * Math.cos(endAng));
          const endY = Math.round(cy + hR * Math.sin(endAng));
          const largeArc = Math.abs(swAng) > Math.PI ? 1 : 0;
          const sweep = swAng > 0 ? 1 : 0;
          svgPath += `A${wR} ${hR} 0 ${largeArc} ${sweep} ${endX} ${endY} `;
          curX = endX; curY = endY;
        }
      } else if (type === 'close') {
        svgPath += 'Z ';
      }
    }
  }

  if (!svgPath.trim()) return null;

  // Normalize viewBox — if coordinates are huge (EMU-scale), scale down for sanity
  // but keep proportional precision
  if (vbW === 0) vbW = pathWidth;
  if (vbH === 0) vbH = pathHeight;

  return { path: svgPath.trim(), viewBox: `0 0 ${vbW} ${vbH}` };
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

  // Extract rotation from xfrm
  const rotMatch = spXml.match(/<a:xfrm[^>]*\brot="(-?\d+)"/);
  const rotation = rotMatch ? Math.round(parseInt(rotMatch[1]) / 60000) : 0;

  // Determine shape type
  const prstGeom = spXml.match(/<a:prstGeom\s+prst="(\w+)"/);
  const custGeom = spXml.match(/<a:custGeom>([\s\S]*?)<\/a:custGeom>/);
  const geomType = prstGeom?.[1] || (custGeom ? 'custom' : 'rect');

  const shapeMap: Record<string, string> = {
    rect: 'rectangle', roundRect: 'rectangle', ellipse: 'circle',
    triangle: 'triangle', rightArrow: 'arrow-right',
  };

  // Get fill — solid or gradient
  const solidFill = spXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
  const fill = solidFill ? parseColorFromShapeXml(solidFill[1], themeColors) : null;
  let gradientFill: string | null = null;
  if (!solidFill) {
    const gradFill = spXml.match(/<a:gradFill>([\s\S]*?)<\/a:gradFill>/);
    if (gradFill) gradientFill = parseGradientFill(gradFill[1], themeColors);
  }

  // Get outline
  const ln = spXml.match(/<a:ln[^>]*>([\s\S]*?)<\/a:ln>/);
  let stroke: string | null = null;
  let strokeWidth = 0;
  let strokeDash: string | null = null;
  let hasOutline = false;
  if (ln) {
    // Check if line has noFill (explicitly invisible outline)
    const lnNoFill = ln[1].includes('<a:noFill/>');
    if (!lnNoFill) {
      hasOutline = true;
      // Try solidFill first, then schemeClr, then fallback to theme dk1
      stroke = parseColorFromShapeXml(ln[1], themeColors);
      if (!stroke) stroke = themeColors.dk1; // default line color
      const w = ln[0].match(/\bw="(\d+)"/);
      strokeWidth = w ? Math.max(1, Math.round(parseInt(w[1]) / 12700)) : 1;
      strokeDash = parseDashStyle(ln[1]);
    }
  }

  // Skip if no fill AND no outline (truly invisible)
  const noFill = spXml.includes('<a:noFill/>') || (!fill && !solidFill && !gradientFill);
  if (noFill && !hasOutline) return null;

  // Convert custom geometry to SVG path
  let svgPath: string | null = null;
  let svgViewBox: string | null = null;
  if (custGeom) {
    const rawW = parseInt(ext[1]);
    const rawH = parseInt(ext[2]);
    const result = custGeomToSvgPath(custGeom[1], rawW, rawH);
    if (result) {
      svgPath = result.path;
      svgViewBox = result.viewBox;
    }
  }

  return {
    id: genId(),
    type: 'shape',
    content: svgPath || '',
    x, y, width, height,
    rotation,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: 0,
    style: {
      shapeType: svgPath ? 'custom' : (shapeMap[geomType] || 'rectangle'),
      shapeFill: noFill ? 'transparent' : (fill || themeColors.accent1),
      shapeGradient: gradientFill || undefined,
      shapeStroke: stroke || 'transparent',
      shapeStrokeWidth: strokeWidth,
      shapeStrokeDash: strokeDash || undefined,
      borderRadius: geomType === 'roundRect' ? (() => {
        const adj = spXml.match(/<a:gd\s+name="adj"\s+fmla="val\s+(\d+)"/);
        if (adj) {
          const adjVal = parseInt(adj[1]) / 100000;
          return Math.round(adjVal * Math.min(width, height));
        }
        return 12; // default if no adj specified
      })() : 0,
      svgPath: svgPath || undefined,
      svgViewBox: svgViewBox || undefined,
    },
  };
}

function parseGradientFill(gradXml: string, themeColors: ThemeColors): string | null {
  // Extract gradient stops: <a:gs pos="0"><a:srgbClr val="..."/></a:gs>
  const stops: { pos: number; color: string }[] = [];
  const gsMatches = gradXml.matchAll(/<a:gs\s+pos="(\d+)">([\s\S]*?)<\/a:gs>/g);
  for (const gs of gsMatches) {
    const pos = parseInt(gs[1]) / 1000; // OOXML pos is in thousandths of percent
    const color = parseColorFromShapeXml(gs[2], themeColors);
    if (color) stops.push({ pos, color });
  }
  if (stops.length < 2) return null;

  // Determine direction from <a:lin ang="..."/> (in 60000ths of degree)
  const linMatch = gradXml.match(/<a:lin\s+ang="(\d+)"/);
  const angle = linMatch ? Math.round(parseInt(linMatch[1]) / 60000) : 180;

  const cssStops = stops.map(s => `${s.color} ${s.pos}%`).join(', ');
  return `linear-gradient(${angle}deg, ${cssStops})`;
}

function parseDashStyle(xml: string): string | null {
  // <a:prstDash val="dash"/> or <a:prstDash val="dot"/> etc.
  const dash = xml.match(/<a:prstDash\s+val="(\w+)"/);
  if (!dash) return null;
  const map: Record<string, string> = {
    dash: '8 4',
    dot: '2 4',
    dashDot: '8 4 2 4',
    lgDash: '16 6',
    lgDashDot: '16 6 2 6',
    lgDashDotDot: '16 6 2 6 2 6',
    sysDash: '6 2',
    sysDot: '2 2',
    sysDashDot: '6 2 2 2',
    sysDashDotDot: '6 2 2 2 2 2',
  };
  return map[dash[1]] || null;
}

function parseSlideBackground(slideXml: string, relsMap: Map<string, string>, themeColors: ThemeColors): { type: string; value: string } {
  // Extract <p:bg> section first
  const bgSection = slideXml.match(/<p:bg>([\s\S]*?)<\/p:bg>/);
  if (!bgSection) return { type: 'solid', value: themeColors.lt1 };

  const bgXml = bgSection[1];

  // Gradient fill background
  const gradFill = bgXml.match(/<a:gradFill>([\s\S]*?)<\/a:gradFill>/);
  if (gradFill) {
    const gradient = parseGradientFill(gradFill[1], themeColors);
    if (gradient) return { type: 'gradient', value: gradient };
  }

  // Solid fill background
  const solidFill = bgXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
  if (solidFill) {
    const color = parseColorFromShapeXml(solidFill[1], themeColors);
    if (color) return { type: 'solid', value: color };
  }

  // Image background: blipFill
  const bgBlip = bgXml.match(/r:embed="(rId\d+)"/);
  if (bgBlip) {
    const ref = relsMap.get(bgBlip[1]);
    if (ref) return { type: 'image', value: ref };
  }

  return { type: 'solid', value: themeColors.lt1 };
}

// ---- Balanced tag utilities ----
/** Strip all top-level occurrences of a tag, handling nested same-name tags correctly */
function stripBalancedTags(xml: string, tagName: string): string {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  let result = '';
  let i = 0;
  while (i < xml.length) {
    const openIdx = xml.indexOf(openTag, i);
    if (openIdx === -1) { result += xml.slice(i); break; }
    result += xml.slice(i, openIdx);
    // Find matching close tag (track nesting depth)
    let depth = 1;
    let j = openIdx + openTag.length;
    while (j < xml.length && depth > 0) {
      const nextOpen = xml.indexOf(openTag, j);
      const nextClose = xml.indexOf(closeTag, j);
      if (nextClose === -1) break; // malformed XML
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        j = nextOpen + openTag.length;
      } else {
        depth--;
        j = nextClose + closeTag.length;
      }
    }
    i = j;
  }
  return result;
}

/** Extract all top-level occurrences of a tag (balanced, handles nesting) */
function extractBalancedTags(xml: string, tagName: string): string[] {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const results: string[] = [];
  let i = 0;
  while (i < xml.length) {
    const openIdx = xml.indexOf(openTag, i);
    if (openIdx === -1) break;
    let depth = 1;
    let j = openIdx + openTag.length;
    while (j < xml.length && depth > 0) {
      const nextOpen = xml.indexOf(openTag, j);
      const nextClose = xml.indexOf(closeTag, j);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        j = nextOpen + openTag.length;
      } else {
        depth--;
        j = nextClose + closeTag.length;
      }
    }
    // Inner content (between open and close tags)
    results.push(xml.slice(openIdx + openTag.length, j - closeTag.length));
    i = j;
  }
  return results;
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
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage:\n  npx tsx scripts/import-pptx-template.ts <google-slides-id>\n  npx tsx scripts/import-pptx-template.ts /path/to/file.pptx');
    process.exit(1);
  }

  const isLocalFile = arg.endsWith('.pptx') || arg.endsWith('.pptx"') || arg.startsWith('/') || arg.startsWith('.');
  let title: string;
  let pptxBuffer: Buffer;

  if (isLocalFile) {
    // ---- Local PPTX file ----
    const filePath = arg.replace(/^["']|["']$/g, ''); // strip quotes
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    pptxBuffer = fs.readFileSync(filePath);
    // Derive title from filename
    title = filePath.split('/').pop()!.replace(/\.pptx$/i, '');
    console.log(`Local PPTX: ${filePath} (${(pptxBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
    console.log(`Title: ${title}`);
  } else {
    // ---- Google Slides ID → download PPTX ----
    const presentationId = arg;
    console.log(`Downloading PPTX for ${presentationId}...`);

    const metaRes = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}?fields=title,pageSize`,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
    );
    const meta = await metaRes.json();
    title = meta.title || 'Untitled';
    console.log(`Title: ${title}`);

    if (meta.pageSize) {
      slideWidthEmu = meta.pageSize.width?.magnitude || slideWidthEmu;
      slideHeightEmu = meta.pageSize.height?.magnitude || slideHeightEmu;
      console.log(`Page size: ${slideWidthEmu} x ${slideHeightEmu} EMU`);
    }

    const pptxRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${presentationId}/export?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation`,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } },
    );

    if (!pptxRes.ok) {
      console.error(`Failed to download PPTX: ${pptxRes.status} ${await pptxRes.text()}`);
      process.exit(1);
    }

    pptxBuffer = Buffer.from(await pptxRes.arrayBuffer());
    console.log(`Downloaded PPTX: ${(pptxBuffer.length / 1024 / 1024).toFixed(1)}MB`);
  }

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

  // Master font override moved below after primaryMasterId is resolved

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

  // Override theme fonts with slide master fonts (higher priority than theme)
  // Slidesgo templates often define the real fonts in the master, not the theme
  if (primaryMasterId) {
    const primaryMasterFile = zip.files[`ppt/slideMasters/${primaryMasterId}`];
    if (primaryMasterFile) {
      const masterXml = await primaryMasterFile.async('string');
      const titlePh = [...masterXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)]
        .find(m => m[1].includes('type="title"') || m[1].includes('type="ctrTitle"'));
      if (titlePh) {
        const masterTitleFont = titlePh[1].match(/<a:latin\s+typeface="([^"]+)"/)?.[1];
        if (masterTitleFont && masterTitleFont !== 'Arial') {
          themeFonts.titleFont = cleanFontName(masterTitleFont);
          console.log(`  Master override titleFont: ${themeFonts.titleFont}`);
        }
      }
      const bodyPh = [...masterXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)]
        .find(m => m[1].includes('type="body"'));
      if (bodyPh) {
        const masterBodyFont = bodyPh[1].match(/<a:latin\s+typeface="([^"]+)"/)?.[1];
        if (masterBodyFont && masterBodyFont !== 'Arial') {
          themeFonts.bodyFont = cleanFontName(masterBodyFont);
          console.log(`  Master override bodyFont: ${themeFonts.bodyFont}`);
        }
      }
    }
  }

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

    // Parse relationships for this slide (needed early for layout name extraction)
    const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsMap = new Map<string, string>();
    if (zip.files[relsFile]) {
      const relsXml = await zip.file(relsFile)!.async('string');
      const relMatches = relsXml.matchAll(/Id="(rId\d+)"[^>]+Target="([^"]+)"/g);
      for (const m of relMatches) {
        relsMap.set(m[1], m[2]);
      }
    }

    // Extract layout name and placeholder styles for inheritance
    // Key is "idx:{number}" for idx-based lookup, or "type:{name}" for type-based fallback
    let layoutName = 'unknown';
    const layoutPlaceholderSizes = new Map<string, number>();
    const layoutPlaceholderFonts = new Map<string, string>();
    const layoutPlaceholderBold = new Map<string, boolean>();
    let layoutXml = '';
    const layoutRef = relsMap.get('rId1'); // Usually rId1 points to layout
    let layoutPath = '';
    if (layoutRef) {
      layoutPath = layoutRef.startsWith('../')
        ? 'ppt/' + layoutRef.replace('../', '')
        : layoutRef;
      const layoutFile = zip.files[layoutPath];
      if (layoutFile) {
        layoutXml = await layoutFile.async('string');
        // Extract layout name
        const nameMatch = layoutXml.match(/<p:cSld\s+name="([^"]*)"/);
        if (nameMatch) layoutName = nameMatch[1];
        // Find placeholders with defRPr sz, font, bold
        // Store by BOTH idx (specific) and type (fallback) keys
        const phMatches = layoutXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
        for (const pm of phMatches) {
          const phTag = pm[1].match(/<p:ph([^/]*)\/?>/);
          if (!phTag) continue;
          const phType = phTag[1].match(/type="(\w+)"/)?.[1];
          const phIdx = phTag[1].match(/idx="(\d+)"/)?.[1];
          if (!phType && !phIdx) continue;

          // Keys: idx-based (primary) + type-based (fallback)
          const keys: string[] = [];
          if (phIdx) keys.push(`idx:${phIdx}`);
          if (phType) keys.push(`type:${phType}`);

          // Search ALL defRPr occurrences in lstStyle levels
          const allDefRPr = [...pm[1].matchAll(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/g)];
          for (const defRPr of allDefRPr) {
            const attrs = defRPr[1] + (defRPr[2] || '');
            for (const key of keys) {
              if (!layoutPlaceholderSizes.has(key)) {
                const szMatch = attrs.match(/\bsz="(\d+)"/);
                if (szMatch) layoutPlaceholderSizes.set(key, parseInt(szMatch[1]));
              }
              if (!layoutPlaceholderBold.has(key)) {
                if (/\bb="1"/.test(attrs)) layoutPlaceholderBold.set(key, true);
              }
              if (!layoutPlaceholderFonts.has(key)) {
                const fontMatch = attrs.match(/<a:latin\s+typeface="([^"]+)"/);
                if (fontMatch) layoutPlaceholderFonts.set(key, cleanFontName(fontMatch[1]));
              }
            }
          }
        }
      }
    }

    // Resolve slide master ID early (needed for both inheritance and filtering)
    const slideMasterId = await getSlideMasterId(slideNum);

    // Also check slide master for placeholder styles (deeper inheritance)
    if (slideMasterId) {
      const masterPath = `ppt/slideMasters/${slideMasterId}`;
      const masterFile = zip.files[masterPath];
      if (masterFile) {
        const masterXml = await masterFile.async('string');
        const phMatches = masterXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
        for (const pm of phMatches) {
          const phTypeMatch = pm[1].match(/<p:ph[^>]*type="(\w+)"/);
          if (phTypeMatch) {
            const phType = phTypeMatch[1];
            // Only set if layout didn't already define it
            const defRPr = pm[1].match(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
            if (defRPr) {
              const attrs = defRPr[1] + (defRPr[2] || '');
              if (!layoutPlaceholderSizes.has(phType)) {
                const szMatch = attrs.match(/\bsz="(\d+)"/);
                if (szMatch) layoutPlaceholderSizes.set(phType, parseInt(szMatch[1]));
              }
              if (!layoutPlaceholderBold.has(phType)) {
                const bMatch = attrs.match(/\bb="1"/);
                if (bMatch) layoutPlaceholderBold.set(phType, true);
              }
              if (!layoutPlaceholderFonts.has(phType)) {
                const fontMatch = attrs.match(/<a:latin\s+typeface="([^"]+)"/);
                if (fontMatch) layoutPlaceholderFonts.set(phType, cleanFontName(fontMatch[1]));
              }
            }
          }
        }
      }
    }

    // ---- Filtering logic (needs layoutName from above) ----

    // Check if slide belongs to the secondary (non-primary) master = "Final Pages"
    const isSecondaryMaster = primaryMasterId && slideMasterId && slideMasterId !== primaryMasterId;

    // Heuristic final page detection (branding, excessive elements, resource pages)
    const hasFreepikBranding = (plainText.includes('freepik') && !plainText.includes('@freepik'))
      || plainText.includes('slidesgo') || plainText.includes('flaticon');
    const isFinalPageHeuristic = hasFreepikBranding
      || elementCount > 50
      || (/\bicons?\b/.test(plainText) && elementCount > 15)
      || plainText.includes('fonts & colors') || plainText.includes('fonts used')
      || plainText.includes('contents of this template')
      || plainText.includes('contents of this presentation');

    const isFinalPage = isSecondaryMaster || isFinalPageHeuristic;

    // Detect real "Thank You" slides
    const isThanksSlide = elementCount <= 15
      && (/\bthank\s+you\b/i.test(plainText) || /\bthanks\b/i.test(plainText))
      && !plainText.includes('instructions for use')
      && !plainText.includes('instructions (')
      && !plainText.includes('you can delete');

    // Heuristic for instruction/resource pages that leak through master filter
    const isInstructionPage = plainText.includes('instructions for use')
      || plainText.includes('instructions (')
      || plainText.includes('you can delete this slide')
      || plainText.includes('freepik premium')
      || (elementCount > 25 && !isThanksSlide);

    // Skip TITLE_ONLY slides (just a title, no content structure)
    // Layout names can be "TITLE_ONLY", "Title only 1", "Title only 2", etc.
    const isTitleOnly = layoutName === 'TITLE_ONLY'
      || layoutName.startsWith('TITLE_ONLY')
      || layoutName.toLowerCase().startsWith('title only');

    if (((isFinalPage || isInstructionPage) && !isThanksSlide) || (isTitleOnly && !isThanksSlide)) {
      console.log(`  Skipping: ${isTitleOnly ? 'title-only layout' : isSecondaryMaster ? 'secondary master' : isInstructionPage ? 'instruction page' : 'final page'} (${elementCount} elements, layout: ${layoutName})`);
      continue;
    }
    if (isThanksSlide) {
      console.log(`  Keeping "Thank You" slide (${elementCount} elements)`);
    }

    // Parse background
    let background = parseSlideBackground(slideXml, relsMap, themeColors);

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

          const result = parseImageFromSpTree(m[1], layoutRelsMap, themeColors);
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

        // Extract non-placeholder shapes from layout (decorative lines, shapes, border frames)
        const layoutSpMatches = layoutXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
        for (const m of layoutSpMatches) {
          // Skip placeholders
          if (m[1].includes('<p:ph')) continue;
          // Skip text boxes that have real text content (not empty/residual text)
          if (m[1].includes('<p:txBody>') && m[1].includes('<a:t>')) {
            const textContent = (m[1].match(/<a:t>([\s\S]*?)<\/a:t>/g) || [])
              .map(t => t.replace(/<\/?a:t>/g, '').replace(/[""''"\s]/g, ''))
              .join('');
            if (textContent.length > 0) continue; // has real text — skip (it's a text placeholder)
          }

          const shapeEl = parseShapeFromSpTree(m[1], themeColors);
          if (shapeEl) {
            shapeEl.zIndex = zIndex++;
            elements.push(shapeEl);
          }
        }
      }
    }

    // Find all sp (shapes) and pic (pictures) in the slide itself
    // Strip group shapes first to avoid double-parsing elements inside groups
    const slideXmlNoGroups = stripBalancedTags(slideXml, 'p:grpSp');
    // Text shapes: <p:sp>...</p:sp>
    const spMatches = slideXmlNoGroups.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
    for (const m of spMatches) {
      const spXml = m[1];

      // Try as text first
      const textEl = parseTextFromSpTree(spXml, themeColors, themeFonts, layoutPlaceholderSizes, layoutPlaceholderFonts, layoutPlaceholderBold);
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

    // Pictures: <p:pic>...</p:pic> (groups handled separately above)
    const picMatches = slideXmlNoGroups.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g);
    for (const m of picMatches) {
      const result = parseImageFromSpTree(m[1], relsMap, themeColors);
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

    // Group shapes: <p:grpSp>...</p:grpSp>
    // Groups contain nested shapes, images, and connectors with their own coordinate system.
    // We extract the group's overall position and flatten the children using the group transform.
    // Use balanced tag extraction to handle nested groups correctly.
    const grpContents = extractBalancedTags(slideXml, 'p:grpSp');
    for (const grpXml of grpContents) {

      // Group transform: <a:xfrm> with <a:off> (position on slide) and <a:ext> (size on slide)
      // and <a:chOff> (child origin) and <a:chExt> (child coordinate space)
      const grpOff = grpXml.match(/<p:grpSpPr>[\s\S]*?<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
      const grpExt = grpXml.match(/<p:grpSpPr>[\s\S]*?<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
      const chOff = grpXml.match(/<a:chOff\s+x="(-?\d+)"\s+y="(-?\d+)"/);
      const chExt = grpXml.match(/<a:chExt\s+cx="(\d+)"\s+cy="(\d+)"/);

      if (!grpOff || !grpExt) continue;

      const gx = parseInt(grpOff[1]);
      const gy = parseInt(grpOff[2]);
      const gw = parseInt(grpExt[1]);
      const gh = parseInt(grpExt[2]);
      const cox = chOff ? parseInt(chOff[1]) : gx;
      const coy = chOff ? parseInt(chOff[2]) : gy;
      const cow = chExt ? parseInt(chExt[1]) : gw;
      const coh = chExt ? parseInt(chExt[2]) : gh;

      // Scale factors from child coords to slide coords
      const scaleGX = cow > 0 ? gw / cow : 1;
      const scaleGY = coh > 0 ? gh / coh : 1;

      // Helper: transform child EMU coordinates to slide EMU coordinates
      const toSlideX = (cx: number) => gx + (cx - cox) * scaleGX;
      const toSlideY = (cy: number) => gy + (cy - coy) * scaleGY;
      const toSlideW = (cw: number) => cw * scaleGX;
      const toSlideH = (ch: number) => ch * scaleGY;

      // Extract shapes inside group
      const grpSpMatches = grpXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
      for (const sm of grpSpMatches) {
        const spXml = sm[1];
        // Try as shape (most group children are decorative shapes)
        const shapeEl = parseShapeFromSpTree(spXml, themeColors);
        if (shapeEl) {
          // Re-calculate position using group transform
          const childOff = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const childExt = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (childOff && childExt) {
            shapeEl.x = emuToPxX(Math.max(0, toSlideX(parseInt(childOff[1]))));
            shapeEl.y = emuToPxY(Math.max(0, toSlideY(parseInt(childOff[2]))));
            shapeEl.width = emuToPxX(toSlideW(parseInt(childExt[1])));
            shapeEl.height = emuToPxY(toSlideH(parseInt(childExt[2])));
          }
          shapeEl.zIndex = zIndex++;
          elements.push(shapeEl);
          continue;
        }

        // Try as text
        const textEl = parseTextFromSpTree(spXml, themeColors, themeFonts, layoutPlaceholderSizes, layoutPlaceholderFonts, layoutPlaceholderBold);
        if (textEl) {
          const childOff = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const childExt = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (childOff && childExt) {
            textEl.x = emuToPxX(Math.max(0, toSlideX(parseInt(childOff[1]))));
            textEl.y = emuToPxY(Math.max(0, toSlideY(parseInt(childOff[2]))));
            textEl.width = emuToPxX(toSlideW(parseInt(childExt[1])));
            textEl.height = emuToPxY(toSlideH(parseInt(childExt[2])));
          }
          textEl.zIndex = zIndex++;
          elements.push(textEl);
        }
      }

      // Extract images inside group
      const grpPicMatches = grpXml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g);
      for (const pm of grpPicMatches) {
        const result = parseImageFromSpTree(pm[1], relsMap, themeColors);
        if (result) {
          const childOff = pm[1].match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const childExt = pm[1].match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (childOff && childExt) {
            result.element.x = emuToPxX(Math.max(0, toSlideX(parseInt(childOff[1]))));
            result.element.y = emuToPxY(Math.max(0, toSlideY(parseInt(childOff[2]))));
            result.element.width = emuToPxX(toSlideW(parseInt(childExt[1])));
            result.element.height = emuToPxY(toSlideH(parseInt(childExt[2])));
          }
          result.element.zIndex = zIndex++;

          if (result.imageRef) {
            let normalizedPath: string;
            if (result.imageRef.startsWith('../')) {
              normalizedPath = 'ppt/' + result.imageRef.replace('../', '');
            } else {
              normalizedPath = `ppt/slides/${result.imageRef}`;
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
            }
          }

          if (result.element.content) {
            elements.push(result.element);
          }
        }
      }

      // Extract connectors inside group
      const grpCxnMatches = grpXml.matchAll(/<p:cxnSp>([\s\S]*?)<\/p:cxnSp>/g);
      for (const cm of grpCxnMatches) {
        const cxnXml = cm[1];
        const childOff = cxnXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
        const childExt = cxnXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        if (!childOff || !childExt) continue;

        const cx = emuToPxX(Math.max(0, toSlideX(parseInt(childOff[1]))));
        const cy = emuToPxY(Math.max(0, toSlideY(parseInt(childOff[2]))));
        const cw = emuToPxX(toSlideW(parseInt(childExt[1])));
        const ch = Math.max(emuToPxY(toSlideH(parseInt(childExt[2]))), 2);

        const srgb = cxnXml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
        const scheme = cxnXml.match(/<a:schemeClr\s+val="(\w+)"/);
        let lineColor = themeColors.dk1;
        if (srgb) lineColor = `#${srgb[1]}`;
        else if (scheme) lineColor = resolveSchemeColor(scheme[1], themeColors);

        const lnW = cxnXml.match(/<a:ln\s+w="(\d+)"/);
        const strokeWidth = lnW ? Math.max(1, Math.round(parseInt(lnW[1]) / 12700)) : 1;
        const lineDash = parseDashStyle(cxnXml);

        elements.push({
          id: genId(),
          type: 'shape',
          content: '',
          x: cx, y: cy, width: cw, height: ch,
          rotation: 0, opacity: 1, locked: false, visible: true,
          zIndex: zIndex++,
          style: { shapeType: 'line', shapeFill: lineColor, shapeStroke: lineColor, shapeStrokeWidth: strokeWidth, shapeStrokeDash: lineDash || undefined },
        });
      }
    }

    // Connectors (lines): <p:cxnSp>...</p:cxnSp> (groups handled separately above)
    const cxnMatches = slideXmlNoGroups.matchAll(/<p:cxnSp>([\s\S]*?)<\/p:cxnSp>/g);
    for (const m of cxnMatches) {
      const cxnXml = m[1];
      const off = cxnXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
      const ext = cxnXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
      if (!off || !ext) continue;

      const x = emuToPxX(Math.max(0, parseInt(off[1])));
      const y = emuToPxY(Math.max(0, parseInt(off[2])));
      const width = emuToPxX(parseInt(ext[1]));
      const height = Math.max(emuToPxY(parseInt(ext[2])), 2);

      // Get line color
      const srgb = cxnXml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
      const scheme = cxnXml.match(/<a:schemeClr\s+val="(\w+)"/);
      let lineColor = themeColors.dk1;
      if (srgb) lineColor = `#${srgb[1]}`;
      else if (scheme) lineColor = resolveSchemeColor(scheme[1], themeColors);

      // Get line width and dash pattern
      const lnMatch = cxnXml.match(/<a:ln[^>]*>([\s\S]*?)<\/a:ln>/);
      const lnW = cxnXml.match(/<a:ln\s+w="(\d+)"/);
      const strokeWidth = lnW ? Math.max(1, Math.round(parseInt(lnW[1]) / 12700)) : 1;
      const lineDash = lnMatch ? parseDashStyle(lnMatch[1]) : null;

      elements.push({
        id: genId(),
        type: 'shape',
        content: '',
        x, y, width, height,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: zIndex++,
        style: {
          shapeType: 'line',
          shapeFill: lineColor,
          shapeStroke: lineColor,
          shapeStrokeWidth: strokeWidth,
          shapeStrokeDash: lineDash || undefined,
        },
      });
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
    const textCount = elements.filter(e => e.type === 'text').length;
    const isTocSlide = (plainText.includes('table of contents') || plainText.includes('contents'))
      && (layoutName === 'TITLE_ONLY' || layoutName.includes('CUSTOM') || layoutName.toLowerCase().includes('custom'))
      && textCount >= 3; // Multiple text elements = TOC items

    // Detect "Thank You" / closing slides — check actual text elements
    const allTexts = (elements.filter(e => e.type === 'text') as any[])
      .map(e => e.content.replace(/<[^>]+>/g, '').toLowerCase().trim())
      .join(' ');
    const isClosingSlide = allTexts.includes('thank you') || allTexts.includes('thanks')
      || /\bthank\s+you\b/i.test(plainText);

    // Classify slide type from layout name
    const slideTypeMap: Record<string, string> = {
      'TITLE': 'cover',
      'SECTION_HEADER': 'section',
      'TITLE_AND_TWO_COLUMNS': 'two-column',
      'CAPTION_ONLY': 'image',
      'BLANK': 'blank',
    };
    const slideType = isTocSlide ? 'toc'
      : isClosingSlide ? 'closing'
      : isTitleOnly ? 'title-only'
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

  // Check if template already exists — preserve thumbnail URLs and slide preview images
  const { data: existing } = await supabase.from('templates').select('id, thumbnail_url, layouts').eq('name', title).single();
  if (existing) {
    // Preserve preview thumbnails if they are real URLs (not dummy 'slide-1' strings)
    const hasRealThumbnails = Array.isArray(existing.layouts) && existing.layouts.length > 0
      && typeof existing.layouts[0] === 'string' && existing.layouts[0].startsWith('http');
    if (hasRealThumbnails) {
      template.thumbnail_url = existing.thumbnail_url || template.thumbnail_url;
      template.layouts = existing.layouts;
      console.log(`  Preserved ${existing.layouts.length} preview thumbnails from existing template`);
    }
  }

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
