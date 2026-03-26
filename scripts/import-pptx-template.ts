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
import sharp from 'sharp';

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

  // CRITICAL: Only read from the PRIMARY color scheme inside <a:themeElements>,
  // NOT from <a:extraClrSchemeLst> which contains alternate schemes with same tag names.
  // The primary scheme is the FIRST <a:clrScheme> inside <a:themeElements>.
  const themeElements = themeXml.match(/<a:themeElements>([\s\S]*?)<\/a:themeElements>/);
  const primaryScheme = themeElements
    ? themeElements[1].match(/<a:clrScheme[^>]*>([\s\S]*?)<\/a:clrScheme>/)
    : null;
  const searchXml = primaryScheme ? primaryScheme[1] : themeXml;

  for (const scheme of schemes) {
    const regex = new RegExp(`<a:${scheme}>(.*?)</a:${scheme}>`, 's');
    const match = searchXml.match(regex);
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
// Map PPTX font names to valid Google Fonts names
// PPTX often uses weight suffixes (e.g. "Playfair Medium") that don't exist as separate Google Font families
const FONT_NAME_MAP: Record<string, string> = {
  'Playfair Medium': 'Playfair Display',
  'Playfair Bold': 'Playfair Display',
  'Playfair Regular': 'Playfair Display',
  'Playfair SemiBold': 'Playfair Display',
  'Playfair Light': 'Playfair Display',
  'Playfair ExtraBold': 'Playfair Display',
  'Playfair Black': 'Playfair Display',
  'Inter Tight SemiBold': 'Inter Tight',
  'Inter Tight Bold': 'Inter Tight',
  'Inter Tight Medium': 'Inter Tight',
  'Inter Tight Light': 'Inter Tight',
  'Inter Tight ExtraBold': 'Inter Tight',
  'Bricolage Grotesque SemiBold': 'Bricolage Grotesque',
  'Bricolage Grotesque Bold': 'Bricolage Grotesque',
  'Bricolage Grotesque Medium': 'Bricolage Grotesque',
  'Bricolage Grotesque Light': 'Bricolage Grotesque',
  'Montserrat Medium': 'Montserrat',
  'Montserrat Bold': 'Montserrat',
  'Montserrat SemiBold': 'Montserrat',
  'Montserrat Light': 'Montserrat',
  'Lato Medium': 'Lato',
  'Lato Bold': 'Lato',
  'Lato SemiBold': 'Lato',
  'Lato Light': 'Lato',
  'Poppins Medium': 'Poppins',
  'Poppins Bold': 'Poppins',
  'Poppins SemiBold': 'Poppins',
  'Poppins Light': 'Poppins',
  'Raleway Medium': 'Raleway',
  'Raleway Bold': 'Raleway',
  'Raleway SemiBold': 'Raleway',
  'Open Sans Medium': 'Open Sans',
  'Open Sans Bold': 'Open Sans',
  'Open Sans SemiBold': 'Open Sans',
  'Open Sans Light': 'Open Sans',
  'Roboto Medium': 'Roboto',
  'Roboto Bold': 'Roboto',
  'Roboto Light': 'Roboto',
  'Roboto Thin': 'Roboto',
  'Source Sans Pro Medium': 'Source Sans 3',
  'Source Sans Pro Bold': 'Source Sans 3',
  'Source Sans Pro Light': 'Source Sans 3',
  'Nunito SemiBold': 'Nunito',
  'Nunito Bold': 'Nunito',
  'Nunito Medium': 'Nunito',
  'Nunito Light': 'Nunito',
  'Work Sans Medium': 'Work Sans',
  'Work Sans Bold': 'Work Sans',
  'Work Sans SemiBold': 'Work Sans',
  'DM Sans Medium': 'DM Sans',
  'DM Sans Bold': 'DM Sans',
  'Josefin Sans Medium': 'Josefin Sans',
  'Josefin Sans Bold': 'Josefin Sans',
  'Josefin Sans SemiBold': 'Josefin Sans',
  'Josefin Sans Light': 'Josefin Sans',
};

// Weight suffixes that PPTX appends to font family names
const WEIGHT_SUFFIXES = ['ExtraBold', 'SemiBold', 'Bold', 'Medium', 'Regular', 'Light', 'Thin', 'Black', 'ExtraLight', 'Heavy'];

function cleanFontName(name: string): string {
  // Strip URL query params that sometimes leak into font names
  let clean = name.split('?')[0].trim();
  // Check direct mapping first
  if (FONT_NAME_MAP[clean]) return FONT_NAME_MAP[clean];
  // Try stripping weight suffix as fallback (e.g. "CustomFont Bold" -> "CustomFont")
  for (const suffix of WEIGHT_SUFFIXES) {
    if (clean.endsWith(` ${suffix}`)) {
      const base = clean.slice(0, -(suffix.length + 1));
      if (base.length > 1) return FONT_NAME_MAP[clean] || base;
    }
  }
  return clean;
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

/**
 * Extract alpha/opacity from a color XML block.
 * OOXML uses <a:alpha val="50000"/> (0-100000 scale = 0%-100%) or
 * <a:alphaModFix amt="50000"/> for transparency on fills.
 * Returns a number 0-1 (1 = fully opaque, 0 = fully transparent).
 */
function parseAlphaFromXml(xml: string): number {
  // <a:alpha val="50000"/> — direct alpha (50000 = 50%)
  const alpha = xml.match(/<a:alpha\s+val="(\d+)"/);
  if (alpha) return parseInt(alpha[1]) / 100000;

  // <a:alphaModFix amt="50000"/> — alpha modification fixed (50000 = 50%)
  const alphaModFix = xml.match(/<a:alphaModFix\s+amt="(\d+)"/);
  if (alphaModFix) return parseInt(alphaModFix[1]) / 100000;

  return 1; // fully opaque by default
}

/**
 * Extract element-level opacity from <a:alphaModFix amt="X"> at the spPr level.
 * Used for connectors and shapes where <a:alpha> inside colors/shadows must be ignored.
 * Only checks for <a:alphaModFix> (element-level modifier), NOT <a:alpha> (color-level).
 */
function parseAlphaModFixFromSpPr(xml: string): number {
  const alphaModFix = xml.match(/<a:alphaModFix\s+amt="(\d+)"/);
  if (alphaModFix) return parseInt(alphaModFix[1]) / 100000;
  return 1;
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
  layoutPlaceholderColors?: Map<string, string>,
  masterDefaults?: { titleBold: boolean; titleItalic: boolean; titleSz: number | null; bodySz: number | null; titleColor: string | null; bodyColor: string | null },
): ParsedElement | null {
  // Extract position (support negative offsets)
  const off = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
  const ext = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
  if (!off || !ext) return null;

  const x = emuToPxX(parseInt(off[1]));
  const y = emuToPxY(parseInt(off[2]));
  const width = emuToPxX(parseInt(ext[1]));
  const height = emuToPxY(parseInt(ext[2]));

  if (width < 5 || height < 5) return null;

  // Extract rotation and flip from xfrm
  const rotMatch = spXml.match(/<a:xfrm[^>]*\brot="(-?\d+)"/);
  const rotation = rotMatch ? Math.round(parseInt(rotMatch[1]) / 60000) : 0;
  const flipH = /<a:xfrm[^>]*\bflipH="1"/.test(spXml);
  const flipV = /<a:xfrm[^>]*\bflipV="1"/.test(spXml);

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
  let firstInlineFont: string | null = null; // Track first inline font for mixed-font detection
  let mixedFonts = false; // True when different runs use different explicit fonts
  let hasExplicitFont = false; // Some runs have explicit font-family
  let hasInheritedFont = false; // Some runs have NO font (use container/inherited)
  let firstColor: string | null = null;
  let firstAlign: string | null = null;
  let firstBold = false;
  let firstItalic = false;

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
      // Track inline fonts for mixed-font detection (inherited check is after text extraction below)
      if (fontFamily) {
        if (!firstInlineFont) firstInlineFont = fontFamily;
        else if (firstInlineFont !== fontFamily) mixedFonts = true;
        hasExplicitFont = true;
      }
      if (!firstColor && color) firstColor = color;
      // Bold from run OR inherited from paragraph default
      const runBold = isBold(rPrXml) || paragraphBold;
      const runItalic = isItalic(rPrXml) || paragraphItalic;
      if (!firstBold && runBold) firstBold = true;
      if (!firstItalic && runItalic) firstItalic = true;

      // Extract text
      const textMatch = rXml.match(/<a:t>([\s\S]*?)<\/a:t>/);
      if (!textMatch) continue;
      let text = textMatch[1]
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      // Track runs with text but NO explicit font → uses inherited/container font
      if (!fontFamily && text.trim()) hasInheritedFont = true;

      // Apply formatting
      const styles: string[] = [];
      if (color) styles.push(`color:${color}`);
      if (fontFamily) styles.push(`font-family:${fontFamily}, sans-serif`);
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

  // Font size inheritance: idx-specific first, then master defaults.
  // CRITICAL: Do NOT fall back to type-based lookup for size — different idx values
  // of the same type (e.g., subTitle idx=1 vs idx=5) have different sizes.
  // Type-based lookup would return idx=1's size for idx=5, which is wrong.
  if (!firstFontSize && layoutPlaceholderSizes) {
    // 1) Try idx-specific first (most precise)
    if (phIdx) {
      const layoutSize = layoutPlaceholderSizes.get(`idx:${phIdx}`);
      if (layoutSize) firstFontSize = Math.round(layoutSize / 100);
    }
    // 2) Only use type-based if NO idx was specified at all
    if (!firstFontSize && !phIdx && phType) {
      const typeKeys = [`type:${phType}`];
      if (phType === 'ctrTitle') typeKeys.push('type:title');
      else if (phType === 'title') typeKeys.push('type:ctrTitle');
      for (const key of typeKeys) {
        const layoutSize = layoutPlaceholderSizes.get(key);
        if (layoutSize) { firstFontSize = Math.round(layoutSize / 100); break; }
      }
    }
  }
  // 3) Fall back to master txStyles sz
  if (!firstFontSize && masterDefaults) {
    const isTitle = phType === 'ctrTitle' || phType === 'title';
    const masterSz = isTitle ? masterDefaults.titleSz : masterDefaults.bodySz;
    if (masterSz) firstFontSize = Math.round(masterSz / 100);
  }

  // Inherit bold: idx-only lookup (same reason as font size — different idx = different bold)
  if (!firstBold && layoutPlaceholderBold) {
    if (phIdx && layoutPlaceholderBold.get(`idx:${phIdx}`)) {
      firstBold = true;
    } else if (!phIdx && phType && layoutPlaceholderBold.get(`type:${phType}`)) {
      firstBold = true;
    }
  }
  if (!firstBold && masterDefaults && (phType === 'ctrTitle' || phType === 'title')) {
    if (masterDefaults.titleBold) firstBold = true;
  }
  if (!firstItalic && masterDefaults && (phType === 'ctrTitle' || phType === 'title')) {
    if (masterDefaults.titleItalic) firstItalic = true;
  }

  // If all runs use the SAME explicit font (no mixing, no inherited), use it as container.
  // If fonts are mixed OR some runs are inherited, let placeholder/theme define container.
  // This ensures "Meow Script" on decorative letters doesn't become the container font.
  if (!firstFontFamily && firstInlineFont && !mixedFonts && !hasInheritedFont) {
    firstFontFamily = firstInlineFont;
  }

  // Inherit font family: idx-only from layout, then master/theme defaults
  // CRITICAL: never fall back to type — idx=5 (Manrope) ≠ idx=1 (should be Manjari)
  if (!firstFontFamily || firstFontFamily === 'Arial') {
    if (phIdx && layoutPlaceholderFonts) {
      const layoutFont = layoutPlaceholderFonts.get(`idx:${phIdx}`);
      if (layoutFont && layoutFont !== 'Arial') firstFontFamily = layoutFont;
    }
    if ((!firstFontFamily || firstFontFamily === 'Arial') && !phIdx && phType && layoutPlaceholderFonts) {
      const layoutFont = layoutPlaceholderFonts.get(`type:${phType}`);
      if (layoutFont && layoutFont !== 'Arial') firstFontFamily = layoutFont;
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
      fontStyle: firstItalic ? 'italic' : 'normal',
      color: firstColor || (() => {
        // Inherit text color: run → layout placeholder → master placeholder → theme dk1
        const isTitle = phType === 'ctrTitle' || phType === 'title';
        // 1. Layout placeholder color (from lstStyle lvl1pPr defRPr)
        if (layoutPlaceholderColors) {
          // Try idx-based first (most specific)
          if (phIdx) {
            const layoutColor = layoutPlaceholderColors.get(`idx:${phIdx}`);
            if (layoutColor) return layoutColor;
          }
          // Type-based fallback ONLY for title/ctrTitle without idx
          // (section header "01" uses type:title without idx in some layouts)
          // Don't use type-based for subTitle — it mixes body text with subtitle headers
          if (!phIdx && isTitle) {
            const layoutColor = layoutPlaceholderColors.get(`type:${phType}`);
            if (layoutColor) return layoutColor;
          }
        }
        // 2. Master placeholder color
        if (masterDefaults) {
          const masterColor = isTitle ? masterDefaults.titleColor : masterDefaults.bodyColor;
          if (masterColor) return masterColor;
        }
        // 3. Theme fallback
        return themeColors.dk1;
      })(),
      textAlign: firstAlign || 'left',
      verticalAlign: verticalAlign,
      lineHeight: lineHeight || 1.4,
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

  const x = emuToPxX(parseInt(off[1]));
  const y = emuToPxY(parseInt(off[2]));
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
    borderWidth = w ? Math.max(1, Math.round(parseInt(w[1]) / 12700 * 2.666)) : 1;
  }

  // Extract image-level alpha ONLY from <a:alphaModFix amt="X"> inside <a:blip>.
  // CRITICAL: Do NOT use parseAlphaFromXml(picXml) — it finds <a:alpha> from shadow effects
  // (e.g. <a:outerShdw><a:srgbClr val="000000"><a:alpha val="50000"/>) and misuses it as image opacity.
  // Real image opacity is always <a:alphaModFix amt="X"> directly inside <a:blip>.
  const blipMatch = picXml.match(/<a:blip[^>]*>([\s\S]*?)<\/a:blip>/);
  let imageAlpha = 1;
  if (blipMatch) {
    const amtMatch = blipMatch[1].match(/<a:alphaModFix\s+amt="(\d+)"/);
    if (amtMatch) imageAlpha = parseInt(amtMatch[1]) / 100000;
  }

  // Parse srcRect (crop) from blipFill — values are in 1/1000 percent
  // e.g. t="50709" means crop 50.709% from top
  const srcRectMatch = picXml.match(/<a:srcRect([^/]*)\/?>/);
  let srcRectTop = 0, srcRectRight = 0, srcRectBottom = 0, srcRectLeft = 0;
  if (srcRectMatch) {
    const tM = srcRectMatch[1].match(/\bt="(\d+)"/);
    const bM = srcRectMatch[1].match(/\bb="(\d+)"/);
    const lM = srcRectMatch[1].match(/\bl="(\d+)"/);
    const rM = srcRectMatch[1].match(/\br="(\d+)"/);
    if (tM) srcRectTop = parseInt(tM[1]) / 1000;
    if (bM) srcRectBottom = parseInt(bM[1]) / 1000;
    if (lM) srcRectLeft = parseInt(lM[1]) / 1000;
    if (rM) srcRectRight = parseInt(rM[1]) / 1000;
  }
  const hasCrop = srcRectTop > 0 || srcRectRight > 0 || srcRectBottom > 0 || srcRectLeft > 0;

  return {
    element: {
      id: genId(),
      type: 'image',
      content: '',
      x, y, width, height,
      rotation,
      opacity: imageAlpha,
      locked: false,
      visible: true,
      zIndex: 0,
      style: {
        objectFit: 'cover',
        borderRadius,
        borderColor,
        borderWidth: borderWidth || undefined,
        ...(hasCrop ? { srcRectTop, srcRectRight, srcRectBottom, srcRectLeft } : {}),
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

  const x = emuToPxX(parseInt(off[1]));
  const y = emuToPxY(parseInt(off[2]));
  const width = emuToPxX(parseInt(ext[1]));
  const height = emuToPxY(parseInt(ext[2]));

  if (width < 5 || height < 5) return null;

  // Extract rotation and flip from xfrm
  const rotMatch = spXml.match(/<a:xfrm[^>]*\brot="(-?\d+)"/);
  const rotation = rotMatch ? Math.round(parseInt(rotMatch[1]) / 60000) : 0;
  const flipH = /<a:xfrm[^>]*\bflipH="1"/.test(spXml);
  const flipV = /<a:xfrm[^>]*\bflipV="1"/.test(spXml);

  // Determine shape type
  const prstGeom = spXml.match(/<a:prstGeom\s+prst="(\w+)"/);
  const custGeom = spXml.match(/<a:custGeom>([\s\S]*?)<\/a:custGeom>/);
  const geomType = prstGeom?.[1] || (custGeom ? 'custom' : 'rect');

  const shapeMap: Record<string, string> = {
    rect: 'rectangle', roundRect: 'rectangle', ellipse: 'circle',
    triangle: 'triangle', rightArrow: 'arrow-right',
  };

  // Extract <p:spPr> section for fill detection — avoids confusing shape fill with text fill from <p:txBody>
  // Handle <p:spPr> with or without attributes (e.g. bwMode="auto")
  const spPrMatch = spXml.match(/<p:spPr(?:\s[^>]*)?>[\s\S]*?<\/p:spPr>/);
  const spPrXml = spPrMatch ? spPrMatch[0].replace(/<p:spPr(?:\s[^>]*)?>/, '').replace(/<\/p:spPr>$/, '') : '';
  // Strip <a:ln> (outline) from spPr to avoid confusing body fill with outline fill
  // CRITICAL: must NOT match <a:lnTo> (path command in custGeom) — only <a:ln> or <a:ln w="...">
  const spPrNoLn = spPrXml.replace(/<a:ln(?:\s+\w+="[^"]*")*\s*>[\s\S]*?<\/a:ln>/g, '');

  // Get BODY fill (solid or gradient) from shape properties only
  const solidFill = spPrNoLn.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
  const fill = solidFill ? parseColorFromShapeXml(solidFill[1], themeColors) : null;
  // Extract fill-level alpha/opacity (e.g. semi-transparent rectangles from Google Slides)
  const fillAlpha = solidFill ? parseAlphaFromXml(solidFill[1]) : 1;
  let gradientFill: string | null = null;
  let gradientAlpha = 1;
  if (!solidFill) {
    const gradFill = spPrNoLn.match(/<a:gradFill>([\s\S]*?)<\/a:gradFill>/);
    if (gradFill) {
      gradientFill = parseGradientFill(gradFill[1], themeColors);
      // Per-stop alpha is already baked into gradient colors (#RRGGBBAA).
      // Only use alphaModFix for element-level opacity (rare, e.g. overlay shapes).
      const alphaModFix = gradFill[1].match(/<a:alphaModFix\s+amt="(\d+)"/);
      gradientAlpha = alphaModFix ? parseInt(alphaModFix[1]) / 100000 : 1;
    }
  }
  const bodyNoFill = spPrNoLn.includes('<a:noFill/>');

  // Get OUTLINE properties from spPr XML (NOT full spXml, to avoid matching <a:lnTo> in custGeom paths)
  // CRITICAL: use spPrXml and the same ln-stripping-safe regex that won't match <a:lnTo>
  const ln = spPrXml.match(/<a:ln(?:\s+\w+="[^"]*")*\s*>([\s\S]*?)<\/a:ln>/);
  let stroke: string | null = null;
  let strokeWidth = 0;
  let strokeDash: string | null = null;
  let hasOutline = false;
  if (ln) {
    const lnNoFill = ln[1].includes('<a:noFill/>');
    if (!lnNoFill) {
      hasOutline = true;
      stroke = parseColorFromShapeXml(ln[1], themeColors);
      if (!stroke) stroke = themeColors.dk1;
      const w = ln[0].match(/\bw="(\d+)"/);
      strokeWidth = w ? Math.max(1, Math.round(parseInt(w[1]) / 12700 * 2.666)) : 1;
      strokeDash = parseDashStyle(ln[1]);
    }
  }

  // Skip only if truly invisible: no body fill AND no outline AND no custom geometry AND not a special preset.
  // Custom geometry shapes (icons, vectors) inherit fill from group/theme — always keep them.
  const isSpecialPreset = geomType && !shapeMap[geomType] && geomType !== 'rect';
  const noFill = bodyNoFill || (!fill && !solidFill && !gradientFill);
  if (noFill && !hasOutline && !custGeom && !isSpecialPreset) return null;

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

  // Convert known preset geometries that aren't in our basic shapeMap to SVG paths
  if (!svgPath && isSpecialPreset) {
    const w = parseInt(ext[1]);
    const h = parseInt(ext[2]);
    const presetSvgPaths: Record<string, (w: number, h: number) => string> = {
      // 4-pointed concave star (plaque)
      plaque: (w, h) => `M ${w/2} 0 Q ${w/2} ${h/2} ${w} ${h/2} Q ${w/2} ${h/2} ${w/2} ${h} Q ${w/2} ${h/2} 0 ${h/2} Q ${w/2} ${h/2} ${w/2} 0 Z`,
      // 4-pointed star
      star4: (w, h) => `M ${w/2} 0 L ${w*0.62} ${h*0.38} L ${w} ${h/2} L ${w*0.62} ${h*0.62} L ${w/2} ${h} L ${w*0.38} ${h*0.62} L 0 ${h/2} L ${w*0.38} ${h*0.38} Z`,
      // Diamond
      diamond: (w, h) => `M ${w/2} 0 L ${w} ${h/2} L ${w/2} ${h} L 0 ${h/2} Z`,
      // Cross/plus
      plus: (w, h) => `M ${w*0.3} 0 L ${w*0.7} 0 L ${w*0.7} ${h*0.3} L ${w} ${h*0.3} L ${w} ${h*0.7} L ${w*0.7} ${h*0.7} L ${w*0.7} ${h} L ${w*0.3} ${h} L ${w*0.3} ${h*0.7} L 0 ${h*0.7} L 0 ${h*0.3} L ${w*0.3} ${h*0.3} Z`,
      // Pentagon
      pentagon: (w, h) => `M ${w/2} 0 L ${w} ${h*0.38} L ${w*0.81} ${h} L ${w*0.19} ${h} L 0 ${h*0.38} Z`,
      // Hexagon
      hexagon: (w, h) => `M ${w*0.25} 0 L ${w*0.75} 0 L ${w} ${h/2} L ${w*0.75} ${h} L ${w*0.25} ${h} L 0 ${h/2} Z`,
      // Parallelogram
      parallelogram: (w, h) => `M ${w*0.25} 0 L ${w} 0 L ${w*0.75} ${h} L 0 ${h} Z`,
      // Trapezoid
      trapezoid: (w, h) => `M ${w*0.2} 0 L ${w*0.8} 0 L ${w} ${h} L 0 ${h} Z`,
    };
    const pathFn = presetSvgPaths[geomType];
    if (pathFn) {
      svgPath = pathFn(w, h);
      svgViewBox = `0 0 ${w} ${h}`;
    }
  }

  // Use fill alpha as element opacity (handles semi-transparent shapes from Google Slides)
  const elementOpacity = solidFill ? fillAlpha : (gradientFill ? gradientAlpha : 1);

  return {
    id: genId(),
    type: 'shape',
    content: svgPath || '',
    x, y, width, height,
    rotation,
    opacity: elementOpacity,
    locked: false,
    visible: true,
    zIndex: 0,
    style: {
      shapeType: svgPath ? 'custom' : (shapeMap[geomType] || 'rectangle'),
      // CustGeom fill logic:
      // - Has explicit fill → use it
      // - No fill + has outline → transparent (stroke-only shape like hand-drawn ovals)
      // - No fill + no outline → inherit dk1 from theme (icon parts that inherit from group)
      shapeFill: noFill
        ? (custGeom && !hasOutline ? themeColors.dk1 : 'transparent')
        : (fill || themeColors.accent1),
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
      flipH: flipH || undefined,
      flipV: flipV || undefined,
    },
  };
}

function parseGradientFill(gradXml: string, themeColors: ThemeColors): string | null {
  // Extract gradient stops: <a:gs pos="0"><a:srgbClr val="..."><a:alpha val="65000"/></a:srgbClr></a:gs>
  const stops: { pos: number; color: string }[] = [];
  const gsMatches = gradXml.matchAll(/<a:gs\s+pos="(\d+)">([\s\S]*?)<\/a:gs>/g);
  for (const gs of gsMatches) {
    const pos = parseInt(gs[1]) / 1000; // OOXML pos is in thousandths of percent
    const color = parseColorFromShapeXml(gs[2], themeColors);
    if (!color) continue;

    // Parse per-stop alpha — <a:alpha val="65000"/> means 65% opacity
    const stopAlpha = parseAlphaFromXml(gs[2]);
    let colorWithAlpha = color;
    if (stopAlpha < 1) {
      // Append alpha as 2 hex digits: #RRGGBBAA (CSS Color Level 4)
      const alphaHex = Math.round(stopAlpha * 255).toString(16).padStart(2, '0');
      colorWithAlpha = `${color}${alphaHex}`;
    }
    stops.push({ pos, color: colorWithAlpha });
  }
  if (stops.length < 2) return null;

  // Determine direction from <a:lin ang="..."/> (in 60000ths of degree)
  // OOXML angles: 0°=left→right, 90°=top→bottom. CSS: 0°=bottom→top, 90°=left→right.
  // Conversion: CSS = (OOXML + 90) % 360
  const linMatch = gradXml.match(/<a:lin\s+ang="(\d+)"/);
  const ooAngle = linMatch ? Math.round(parseInt(linMatch[1]) / 60000) : 90; // default: top→bottom
  const angle = (ooAngle + 90) % 360;

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

function parseSlideBackground(slideXml: string, relsMap: Map<string, string>, themeColors: ThemeColors): { type: string; value: string } | null {
  // Extract <p:bg> section first
  const bgSection = slideXml.match(/<p:bg>([\s\S]*?)<\/p:bg>/);
  if (!bgSection) return null; // No <p:bg> → caller must check parent (layout → master)

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

  return null;
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

// ---- Image upload & EMF/WMF conversion ----
const imageCache = new Map<string, string>();

function isEmfWmf(contentType: string): boolean {
  return contentType.includes('emf') || contentType.includes('wmf')
    || contentType.includes('x-emf') || contentType.includes('x-wmf');
}

// Auto-detect available conversion tools (checked once, cached)
let _conversionTool: string | null | undefined;
function getConversionTool(): string | null {
  if (_conversionTool !== undefined) return _conversionTool;
  const { execSync } = require('child_process');
  const tools = ['magick', 'convert', 'inkscape', 'libreoffice', 'sips'];
  for (const tool of tools) {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
      _conversionTool = tool;
      console.log(`  EMF converter found: ${tool}`);
      return _conversionTool;
    } catch { /* not found */ }
  }
  _conversionTool = null;
  console.warn(`  No EMF converter found (tried: ${tools.join(', ')})`);
  return null;
}

/**
 * Try to convert EMF/WMF to PNG using available system tool.
 * Returns PNG buffer or null if conversion fails.
 */
async function convertEmfToPng(emfData: Buffer): Promise<Buffer | null> {
  const tool = getConversionTool();
  if (!tool) return null;

  const { execSync } = require('child_process');
  const tmpDir = require('os').tmpdir();
  const tmpEmf = `${tmpDir}/slideai_${genId()}.emf`;
  const tmpPng = `${tmpDir}/slideai_${genId()}.png`;

  try {
    fs.writeFileSync(tmpEmf, emfData);

    let cmd: string;
    switch (tool) {
      case 'magick':
        cmd = `magick "${tmpEmf}" -density 192 "${tmpPng}"`;
        break;
      case 'convert':
        cmd = `convert "${tmpEmf}" -density 192 "${tmpPng}"`;
        break;
      case 'inkscape':
        cmd = `inkscape "${tmpEmf}" --export-type=png --export-filename="${tmpPng}" --export-dpi=192`;
        break;
      case 'libreoffice':
        cmd = `libreoffice --headless --convert-to png "${tmpEmf}" --outdir "${tmpDir}"`;
        break;
      case 'sips':
        // macOS sips doesn't support EMF directly, try anyway
        cmd = `sips -s format png "${tmpEmf}" --out "${tmpPng}"`;
        break;
      default:
        return null;
    }

    execSync(cmd, { stdio: 'ignore', timeout: 15000 });

    // LibreOffice creates output with original name but .png extension
    let pngPath = tmpPng;
    if (tool === 'libreoffice') {
      const libreOutputName = tmpEmf.replace(/\.emf$/i, '.png');
      if (fs.existsSync(libreOutputName)) pngPath = libreOutputName;
    }

    if (fs.existsSync(pngPath)) {
      const pngData = fs.readFileSync(pngPath);
      // Cleanup
      try { fs.unlinkSync(tmpEmf); } catch {}
      try { fs.unlinkSync(pngPath); } catch {}
      console.log(`  Converted EMF → PNG (${(pngData.length / 1024).toFixed(0)}KB) via ${tool}`);
      return pngData;
    }
    return null;
  } catch (err: any) {
    console.warn(`  EMF conversion failed (${tool}): ${err.message || err}`);
    try { fs.unlinkSync(tmpEmf); } catch {}
    try { fs.unlinkSync(tmpPng); } catch {}
    return null;
  }
}

/**
 * Find a browser-compatible alternative for an EMF/WMF image in the ZIP.
 * OOXML often stores both EMF + PNG/JPG for the same image.
 * Returns { data: Buffer, contentType: string } or null.
 */
async function findAlternativeImage(zip: JSZip, emfPath: string): Promise<{ data: Buffer; contentType: string } | null> {
  const baseName = emfPath.replace(/\.\w+$/, '');
  // Try browser-compatible formats (prefer PNG for quality)
  for (const ext of ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp']) {
    const altPath = baseName + ext;
    const altFile = zip.files[altPath];
    if (altFile) {
      const data = await altFile.async('nodebuffer');
      const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : ext === '.svg' ? 'image/svg+xml'
        : `image/${ext.slice(1)}`;
      console.log(`  Found alternative: ${altPath} (${(data.length / 1024).toFixed(0)}KB)`);
      return { data, contentType: mimeType };
    }
  }
  return null;
}

async function uploadImage(data: Buffer, contentType: string): Promise<string> {
  // EMF/WMF: try to convert — NEVER upload raw EMF (browsers can't render it)
  if (isEmfWmf(contentType)) {
    const pngData = await convertEmfToPng(data);
    if (pngData) {
      return uploadImage(pngData, 'image/png');
    }
    console.warn(`  Could not convert EMF/WMF — no browser-compatible alternative`);
    return '';
  }

  // Compress large PNGs: check for transparency first — JPG destroys alpha channel
  if (contentType.includes('png') && data.length > 500 * 1024) {
    try {
      const meta = await sharp(data).metadata();
      const hasAlpha = meta.channels === 4;
      if (hasAlpha) {
        // Check if alpha channel is actually used (not all-opaque)
        const { data: raw, info } = await sharp(data).raw().toBuffer({ resolveWithObject: true });
        let hasTransparency = false;
        for (let i = 3; i < raw.length; i += info.channels) {
          if (raw[i] < 250) { hasTransparency = true; break; }
        }
        if (hasTransparency) {
          // Keep as PNG but compress with lower effort/quality
          const pngData = await sharp(data).png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer();
          console.log(`  Compressed PNG (transparent) ${(data.length / 1024).toFixed(0)}KB → PNG ${(pngData.length / 1024).toFixed(0)}KB`);
          return uploadImage(pngData, 'image/png');
        }
      }
      // No real transparency — safe to convert to JPG
      const jpgData = await sharp(data).jpeg({ quality: 85 }).toBuffer();
      console.log(`  Compressed PNG ${(data.length / 1024).toFixed(0)}KB → JPG ${(jpgData.length / 1024).toFixed(0)}KB`);
      return uploadImage(jpgData, 'image/jpeg');
    } catch { /* fall through to upload as PNG */ }
  }

  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
    : contentType.includes('png') ? 'png'
    : contentType.includes('svg') ? 'svg'
    : contentType.includes('gif') ? 'gif'
    : contentType.includes('webp') ? 'webp'
    : 'png';
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

/**
 * Resolve an image reference from the PPTX ZIP and upload it.
 * Handles EMF/WMF by:
 * 1. Looking for browser-compatible alternatives (PNG/JPG/SVG) with the same base name
 * 2. Converting EMF using available system tools
 * Returns the public URL or empty string.
 */
async function resolveAndUploadImage(
  zip: JSZip,
  imageRef: string,
  baseDir: string, // e.g., 'ppt/slides/' or 'ppt/slideLayouts/'
): Promise<string> {
  // Normalize path
  let normalizedPath: string;
  if (imageRef.startsWith('../')) {
    normalizedPath = baseDir.replace(/[^/]+\/$/, '') + imageRef.replace('../', '');
    // Fix double slashes or bad paths
    normalizedPath = normalizedPath.replace(/\/+/g, '/');
    // Resolve: 'ppt/slides/../media/image1.png' → 'ppt/media/image1.png'
    const parts = normalizedPath.split('/');
    const resolved: string[] = [];
    for (const p of parts) {
      if (p === '..') resolved.pop();
      else resolved.push(p);
    }
    normalizedPath = resolved.join('/');
  } else if (imageRef.startsWith('/')) {
    normalizedPath = imageRef.slice(1);
  } else {
    normalizedPath = `${baseDir}${imageRef}`;
  }

  // Check cache first
  const cached = imageCache.get(normalizedPath);
  if (cached) return cached;

  // Find the actual file in the ZIP
  let imgFile = zip.files[normalizedPath];
  let resolvedPath = normalizedPath;

  if (!imgFile) {
    const baseName = normalizedPath.replace(/\.\w+$/, '');
    for (const ext of ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.emf', '.wmf']) {
      const tryPath = baseName + ext;
      if (zip.files[tryPath]) {
        imgFile = zip.files[tryPath];
        resolvedPath = tryPath;
        break;
      }
    }
  }

  if (!imgFile) {
    console.warn(`  Image not found: ${normalizedPath}`);
    return '';
  }

  // Detect format
  const ext = resolvedPath.match(/\.(\w+)$/)?.[1]?.toLowerCase() || 'png';
  const isVector = ext === 'emf' || ext === 'wmf';

  if (isVector) {
    // Strategy 1: Look for a browser-compatible alternative with the same base name
    const alt = await findAlternativeImage(zip, resolvedPath);
    if (alt) {
      const url = await uploadImage(alt.data, alt.contentType);
      if (url) { imageCache.set(normalizedPath, url); return url; }
    }

    // Strategy 2: Convert EMF using available system tools
    const emfData = await imgFile.async('nodebuffer');
    const url = await uploadImage(emfData, `image/${ext}`);
    if (url) { imageCache.set(normalizedPath, url); return url; }
    return '';
  }

  // Standard image — upload directly
  const imgData = await imgFile.async('nodebuffer');
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'svg' ? 'image/svg+xml'
    : `image/${ext}`;
  const url = await uploadImage(imgData, mimeType);
  if (url) imageCache.set(normalizedPath, url);
  return url;
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

  // Read actual slide dimensions from presentation.xml (critical for local files)
  const presentationXmlFile = zip.files['ppt/presentation.xml'];
  if (presentationXmlFile) {
    const presXml = await presentationXmlFile.async('string');
    // Handle either attribute order: cx="..." cy="..." or cy="..." cx="..."
    const cxMatch = presXml.match(/<p:sldSz[^>]+cx="(\d+)"/);
    const cyMatch = presXml.match(/<p:sldSz[^>]+cy="(\d+)"/);
    if (cxMatch && cyMatch) {
      slideWidthEmu = parseInt(cxMatch[1]);
      slideHeightEmu = parseInt(cyMatch[1]);
      console.log(`Slide size: ${slideWidthEmu} x ${slideHeightEmu} EMU (${(slideWidthEmu/914400).toFixed(1)}" x ${(slideHeightEmu/914400).toFixed(1)}")`);
    }
  }

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

  // Extract fonts, sizes, and bold from the slide master (highest authority after layout)
  // This covers: 1) master placeholder defRPr, 2) txStyles (titleStyle/bodyStyle)
  // Master fonts are used for ALL elements that don't have explicit overrides
  let masterTitleBold = false;
  let masterTitleItalic = false;
  let masterBodyBold = false;
  let masterTitleSz: number | null = null;
  let masterBodySz: number | null = null;
  let masterTitleColor: string | null = null;
  let masterBodyColor: string | null = null;
  if (primaryMasterId) {
    const primaryMasterFile = zip.files[`ppt/slideMasters/${primaryMasterId}`];
    if (primaryMasterFile) {
      const masterXml = await primaryMasterFile.async('string');

      // 1) Read title placeholder from master — only lvl1pPr
      const titlePh = [...masterXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)]
        .find(m => m[1].includes('type="title"') || m[1].includes('type="ctrTitle"'));
      if (titlePh) {
        // Extract lvl1pPr defRPr specifically (primary paragraph level)
        const lstStyle = titlePh[1].match(/<a:lstStyle>([\s\S]*?)<\/a:lstStyle>/);
        const lvl1 = lstStyle ? lstStyle[1].match(/<a:lvl1pPr[^>]*>([\s\S]*?)<\/a:lvl1pPr>/) : null;
        const defRPrSources = lvl1
          ? [...lvl1[1].matchAll(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/g)]
          : [...titlePh[1].matchAll(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/g)].slice(0, 1);
        for (const d of defRPrSources) {
          const attrs = d[1] + (d[2] || '');
          const font = attrs.match(/<a:latin\s+typeface="([^"]+)"/)?.[1];
          if (font && font !== 'Arial') {
            themeFonts.titleFont = cleanFontName(font);
          }
          if (!masterTitleSz) {
            const sz = attrs.match(/\bsz="(\d+)"/)?.[1];
            if (sz) masterTitleSz = parseInt(sz);
          }
          if (!masterTitleBold && /\bb="1"/.test(attrs)) masterTitleBold = true;
          if (!masterTitleItalic && /\bi="1"/.test(attrs)) masterTitleItalic = true;
          if (!masterTitleColor) {
            const sf = attrs.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
            if (sf) masterTitleColor = parseColorFromShapeXml(sf[1], themeColors);
          }
        }
      }

      // 2) Read body placeholder from master — only lvl1pPr
      const bodyPh = [...masterXml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)]
        .find(m => m[1].includes('type="body"'));
      if (bodyPh) {
        const lstStyle = bodyPh[1].match(/<a:lstStyle>([\s\S]*?)<\/a:lstStyle>/);
        const lvl1 = lstStyle ? lstStyle[1].match(/<a:lvl1pPr[^>]*>([\s\S]*?)<\/a:lvl1pPr>/) : null;
        const defRPrSources = lvl1
          ? [...lvl1[1].matchAll(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/g)]
          : [...bodyPh[1].matchAll(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/g)].slice(0, 1);
        for (const d of defRPrSources) {
          const attrs = d[1] + (d[2] || '');
          const font = attrs.match(/<a:latin\s+typeface="([^"]+)"/)?.[1];
          if (font && font !== 'Arial') {
            themeFonts.bodyFont = cleanFontName(font);
          }
          if (!masterBodySz) {
            const sz = attrs.match(/\bsz="(\d+)"/)?.[1];
            if (sz) masterBodySz = parseInt(sz);
          }
          if (!masterBodyBold && /\bb="1"/.test(attrs)) masterBodyBold = true;
          if (!masterBodyColor) {
            const sf = attrs.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
            if (sf) masterBodyColor = parseColorFromShapeXml(sf[1], themeColors);
          }
        }
      }

      // 3) Read txStyles (titleStyle/bodyStyle) — final fallback for sz/font
      // IMPORTANT: Only use lvl1pPr (primary paragraph level), not deeper levels
      const titleStyle = masterXml.match(/<p:titleStyle>([\s\S]*?)<\/p:titleStyle>/);
      if (titleStyle) {
        const lvl1 = titleStyle[1].match(/<a:lvl1pPr[^>]*>([\s\S]*?)<\/a:lvl1pPr>/);
        if (lvl1) {
          const defRPr = lvl1[1].match(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
          if (defRPr) {
            const attrs = defRPr[1] + (defRPr[2] || '');
            const font = attrs.match(/<a:latin\s+typeface="([^"]+)"/)?.[1];
            if (font && font !== 'Arial') themeFonts.titleFont = cleanFontName(font);
            if (!masterTitleSz) { const sz = attrs.match(/\bsz="(\d+)"/)?.[1]; if (sz) masterTitleSz = parseInt(sz); }
            if (!masterTitleBold && /\bb="1"/.test(attrs)) masterTitleBold = true;
            if (!masterTitleItalic && /\bi="1"/.test(attrs)) masterTitleItalic = true;
            if (!masterTitleColor) {
              const sf = attrs.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
              if (sf) masterTitleColor = parseColorFromShapeXml(sf[1], themeColors);
            }
          }
        }
      }
      const bodyStyle = masterXml.match(/<p:bodyStyle>([\s\S]*?)<\/p:bodyStyle>/);
      if (bodyStyle) {
        const lvl1 = bodyStyle[1].match(/<a:lvl1pPr[^>]*>([\s\S]*?)<\/a:lvl1pPr>/);
        if (lvl1) {
          const defRPr = lvl1[1].match(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
          if (defRPr) {
            const attrs = defRPr[1] + (defRPr[2] || '');
            const font = attrs.match(/<a:latin\s+typeface="([^"]+)"/)?.[1];
            if (font && font !== 'Arial') themeFonts.bodyFont = cleanFontName(font);
            if (!masterBodySz) { const sz = attrs.match(/\bsz="(\d+)"/)?.[1]; if (sz) masterBodySz = parseInt(sz); }
            if (!masterBodyBold && /\bb="1"/.test(attrs)) masterBodyBold = true;
            if (!masterBodyColor) {
              const sf = attrs.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/);
              if (sf) masterBodyColor = parseColorFromShapeXml(sf[1], themeColors);
            }
          }
        }
      }

      console.log(`  Master fonts: ${themeFonts.titleFont} / ${themeFonts.bodyFont}`);
      if (masterTitleBold) console.log(`  Master title bold: true`);
      if (masterTitleItalic) console.log(`  Master title italic: true`);
      if (masterTitleSz) console.log(`  Master title sz: ${masterTitleSz}`);
      if (masterBodySz) console.log(`  Master body sz: ${masterBodySz}`);
      if (masterTitleColor) console.log(`  Master title color: ${masterTitleColor}`);
      if (masterBodyColor) console.log(`  Master body color: ${masterBodyColor}`);
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

  // Group transform types and helpers (used by both layout and slide group extraction)
  type Transform = { toX: (cx: number) => number; toY: (cy: number) => number; toW: (cw: number) => number; toH: (ch: number) => number };

  // Apply group transform to dimensions. Use the transformed value directly —
  // even for very small shapes. The group transform IS the intended size.
  function safeWidth(childW: number, transform: Transform): number {
    return Math.max(1, emuToPxX(transform.toW(childW)));
  }
  function safeHeight(childH: number, transform: Transform): number {
    return Math.max(1, emuToPxY(transform.toH(childH)));
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
    const layoutPlaceholderColors = new Map<string, string>();
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
        // CRITICAL: Only use lvl1pPr (first paragraph level) for the primary font size.
        // Deeper levels (lvl2+) are for indented/sub-content and have different sizes.
        // If lvl1 has no sz, we must fall through to master defaults — NOT use lvl2+ sizes.
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

          // Extract lstStyle and find lvl1pPr defRPr specifically
          const lstStyle = pm[1].match(/<a:lstStyle>([\s\S]*?)<\/a:lstStyle>/);
          let lvl1DefRPr: string | null = null;
          if (lstStyle) {
            // Match lvl1pPr specifically — this is the primary paragraph level
            const lvl1 = lstStyle[1].match(/<a:lvl1pPr[^>]*>([\s\S]*?)<\/a:lvl1pPr>/);
            if (lvl1) {
              const defRPr = lvl1[1].match(/<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
              if (defRPr) lvl1DefRPr = defRPr[1] + (defRPr[2] || '');
            }
          }

          // Also check top-level defRPr outside lstStyle (some layouts use this)
          const topDefRPr = pm[1].match(/<p:txBody>[\s\S]*?<a:defRPr([^>]*?)(?:\/>|>([\s\S]*?)<\/a:defRPr>)/);
          const topAttrs = topDefRPr ? (topDefRPr[1] + (topDefRPr[2] || '')) : '';

          // Use lvl1 first, then top-level as fallback
          const effectiveAttrs = lvl1DefRPr || topAttrs;

          for (const key of keys) {
            if (effectiveAttrs) {
              if (!layoutPlaceholderSizes.has(key)) {
                const szMatch = effectiveAttrs.match(/\bsz="(\d+)"/);
                if (szMatch) layoutPlaceholderSizes.set(key, parseInt(szMatch[1]));
              }
              if (!layoutPlaceholderBold.has(key)) {
                if (/\bb="1"/.test(effectiveAttrs)) layoutPlaceholderBold.set(key, true);
              }
              if (!layoutPlaceholderFonts.has(key)) {
                const fontMatch = effectiveAttrs.match(/<a:latin\s+typeface="([^"]+)"/);
                if (fontMatch) layoutPlaceholderFonts.set(key, cleanFontName(fontMatch[1]));
              }
              if (!layoutPlaceholderColors.has(key)) {
                const colorVal = parseColorFromShapeXml(effectiveAttrs, themeColors);
                if (colorVal) layoutPlaceholderColors.set(key, colorVal);
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

    // Heuristic final page detection (branding text, resource pages)
    // NOTE: Do NOT use elementCount — decorative Slidesgo templates have 200-500+ elements on normal slides.
    // The secondary master check already handles real "final pages" (icon packs, alt color schemes).
    const hasFreepikBranding = (plainText.includes('freepik') && !plainText.includes('@freepik'))
      || plainText.includes('slidesgo') || plainText.includes('flaticon');
    const isFinalPageHeuristic = hasFreepikBranding
      || plainText.includes('fonts & colors') || plainText.includes('fonts used')
      || plainText.includes('contents of this template')
      || plainText.includes('contents of this presentation')
      || plainText.includes('icon pack');

    // Detect real "Thank You" / closing slides BEFORE final page check.
    // Thanks slides often have Slidesgo/Freepik credits which trigger branding filter.
    // Must detect Thanks FIRST to protect it from being filtered.
    // Threshold 80: decorative templates (Welcome to Middle School) have 30-60+ elements per slide.
    const isThanksSlide = elementCount <= 80
      && (/thank\s*you/i.test(plainText) || /\bthanks\b/i.test(plainText))
      && !plainText.includes('instructions for use')
      && !plainText.includes('instructions (')
      && !plainText.includes('you can delete');

    // Final page detection — but NEVER filter a Thanks slide
    const isFinalPage = !isThanksSlide && (isSecondaryMaster || isFinalPageHeuristic);

    // Heuristic for instruction/resource pages that leak through master filter
    // NOTE: Do NOT use elementCount alone — decorative templates have 30-60+ elements on normal slides.
    const isInstructionPage = plainText.includes('instructions for use')
      || plainText.includes('instructions (')
      || plainText.includes('you can delete this slide')
      || plainText.includes('freepik premium');

    // Skip TITLE_ONLY slides (just a title, no content structure)
    // Layout names can be "TITLE_ONLY", "Title only 1", "Title only 2", etc.
    const isTitleOnly = layoutName === 'TITLE_ONLY'
      || layoutName.startsWith('TITLE_ONLY')
      || layoutName.toLowerCase().startsWith('title only');

    // NEVER filter the cover slide (layout TITLE) — it's the presentation cover
    const isCoverSlide = layoutName === 'TITLE';

    // Pre-detect TOC slides BEFORE filtering so they don't get discarded
    // Headings: "table of contents", "contents", "index", "agenda", "overview", "outline"
    // Items: 01-09, "1.", roman numerals I/II/III, or single letters A/B/C
    const preTextCount = (slideXml.match(/<a:t>/g) || []).length;
    const hasTocHeadingPre = plainText.includes('table of contents')
      || /\btable\b.*\bof\b.*\bcontents?\b/i.test(plainText)
      || /\b(index|agenda|overview|outline|contents)\b/i.test(plainText);
    const hasNumberedItemsPre = /\b0[1-9]\b/.test(plainText)
      || /\b\d{1,2}\.\s/.test(plainText)
      || /\b[IVX]{1,4}\b/.test(plainText)
      || /\b[A-H]\.\s/.test(plainText);
    const isTocPreDetect = hasTocHeadingPre && preTextCount >= 3 && hasNumberedItemsPre;

    if (isCoverSlide) {
      console.log(`  Keeping COVER slide (${elementCount} elements, layout: ${layoutName})`);
    } else if (isThanksSlide) {
      console.log(`  Keeping "Thank You" slide (${elementCount} elements)`);
    } else if (((isFinalPage || isInstructionPage)) || (isTitleOnly && !isTocPreDetect)) {
      console.log(`  Skipping: ${isTitleOnly ? 'title-only layout' : isSecondaryMaster ? 'secondary master' : isInstructionPage ? 'instruction page' : 'final page'} (${elementCount} elements, layout: ${layoutName})`);
      continue;
    }

    // Parse background — first from slide, then inherit from layout, then master
    let background: { type: string; value: string } = parseSlideBackground(slideXml, relsMap, themeColors) || { type: 'solid', value: themeColors.lt1 };
    const slideHasOwnBg = parseSlideBackground(slideXml, relsMap, themeColors) !== null;

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

        // Inherit background from layout if slide doesn't have its own <p:bg>
        if (!slideHasOwnBg) {
          const layoutBg = parseSlideBackground(layoutXml, layoutRelsMap, themeColors);
          if (layoutBg) {
            background = layoutBg;
            // If layout bg is an image reference, resolve and upload it
            if (background.type === 'image' && background.value.startsWith('../')) {
              const imgPath = 'ppt/' + background.value.replace('../', '');
              const imgFile = zip.files[imgPath];
              if (imgFile) {
                const imgData = await imgFile.async('nodebuffer');
                const imgExt = imgPath.split('.').pop()?.toLowerCase() || 'png';
                const uploadName = `imported/${genId()}.${imgExt}`;
                const { error: uploadErr } = await supabase.storage.from('presentation-assets').upload(uploadName, imgData, {
                  contentType: `image/${imgExt === 'jpg' ? 'jpeg' : imgExt}`,
                  cacheControl: '31536000', upsert: false,
                });
                if (!uploadErr) {
                  const { data: publicData } = supabase.storage.from('presentation-assets').getPublicUrl(uploadName);
                  background.value = publicData.publicUrl;
                  console.log(`  Layout background image uploaded`);
                }
              }
            }
          }
        }

        // Fallback to MASTER slide background if neither slide nor layout has explicit <p:bg>
        const layoutHasBg = parseSlideBackground(layoutXml, layoutRelsMap, themeColors) !== null;
        if (!slideHasOwnBg && !layoutHasBg) {
          // Find master via layout rels
          const layoutRelsPath2 = layoutPath.replace('slideLayouts/', 'slideLayouts/_rels/') + '.rels';
          if (zip.files[layoutRelsPath2]) {
            const lRelsXml = await zip.file(layoutRelsPath2)!.async('string');
            const masterMatch = lRelsXml.match(/Target="([^"]*slideMaster[^"]*)"/);
            if (masterMatch) {
              const masterRelative = masterMatch[1];
              const masterPath = 'ppt/' + masterRelative.replace(/^\.\.\//g, '');
              const masterFile = zip.files[masterPath];
              if (masterFile) {
                const masterXml = await masterFile.async('string');
                const masterBg = parseSlideBackground(masterXml, new Map(), themeColors);
                if (masterBg) {
                  background = masterBg;
                  console.log(`  Master slide background: ${background.type} = ${background.value.substring(0, 30)}`);
                }
              }
            }
          }
        }

        // Extract ALL non-placeholder elements from layout IN XML ORDER (preserves z-ordering)
        // This handles shapes, images, AND connectors interleaved correctly
        const layoutXmlNoGroups = stripBalancedTags(layoutXml, 'p:grpSp');
        const layoutElementMatches = layoutXmlNoGroups.matchAll(/<p:(sp|pic|cxnSp)>([\s\S]*?)<\/p:\1>/g);
        for (const m of layoutElementMatches) {
          const tagType = m[1]; // 'sp', 'pic', or 'cxnSp'
          const content = m[2];

          // Skip placeholders
          if (content.includes('<p:ph')) continue;

          if (tagType === 'cxnSp') {
            // Connector line from layout (decorative borders, curves)
            const off = content.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
            const ext = content.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
            if (off && ext) {
              const srgb = content.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
              const scheme = content.match(/<a:schemeClr\s+val="(\w+)"/);
              let lineColor = themeColors.dk1;
              if (srgb) lineColor = `#${srgb[1]}`;
              else if (scheme) lineColor = resolveSchemeColor(scheme[1], themeColors);
              const lnW = content.match(/<a:ln[^>]+w="(\d+)"/);
              const strokeWidth = lnW ? Math.max(1, Math.round(parseInt(lnW[1]) / 12700 * 2.666)) : 1;
              const cxnW = emuToPxX(parseInt(ext[1]));
              const cxnH = emuToPxY(parseInt(ext[2]));
              const isVertical = cxnH > cxnW * 2 || cxnW === 0;
              const finalW = isVertical ? Math.max(cxnW, 4) : Math.max(cxnW, 2);
              const finalH = isVertical ? Math.max(cxnH, 2) : Math.max(cxnH, 4);
              const headEnd = content.match(/<a:headEnd[^>]*type="(\w+)"/);
              const tailEnd = content.match(/<a:tailEnd[^>]*type="(\w+)"/);
              // Check for curved connector (custGeom or curvedConnector preset)
              const isCurved = content.includes('curvedConnector') || content.includes('<a:custGeom>');
              let svgPath: string | null = null;
              let svgViewBox: string | null = null;
              if (isCurved) {
                const custGeom = content.match(/<a:custGeom>([\s\S]*?)<\/a:custGeom>/);
                if (custGeom) {
                  const rawW = parseInt(ext[1]);
                  const rawH = parseInt(ext[2]);
                  const result = custGeomToSvgPath(custGeom[1], rawW, rawH);
                  if (result) { svgPath = result.path; svgViewBox = result.viewBox; }
                }
                // Fallback: generate SVG for preset curvedConnector (no custGeom)
                if (!svgPath && content.includes('curvedConnector')) {
                  const rawW = parseInt(ext[1]);
                  const rawH = parseInt(ext[2]);
                  // curvedConnector3: S-curve from (0,0) to (w,h) via cubic bezier
                  svgPath = `M 0 0 C ${rawW / 2} 0, ${rawW / 2} ${rawH}, ${rawW} ${rawH}`;
                  svgViewBox = `0 0 ${rawW} ${rawH}`;
                }
              }
              // Extract flip from <a:xfrm flipH="1" flipV="1">
              const xfrmFlip = content.match(/<a:xfrm[^>]*>/);
              const flipH = xfrmFlip ? /flipH="1"/.test(xfrmFlip[0]) : false;
              const flipV = xfrmFlip ? /flipV="1"/.test(xfrmFlip[0]) : false;
              elements.push({
                id: genId(), type: 'shape', content: svgPath || '',
                x: emuToPxX(parseInt(off[1])), y: emuToPxY(parseInt(off[2])),
                width: svgPath ? cxnW : finalW, height: svgPath ? cxnH : finalH,
                rotation: 0, opacity: parseAlphaModFixFromSpPr(content), locked: true, visible: true, zIndex: zIndex++,
                style: {
                  shapeType: svgPath ? 'custom' : 'line',
                  shapeFill: svgPath ? 'transparent' : lineColor,
                  shapeStroke: lineColor, shapeStrokeWidth: strokeWidth,
                  shapeStrokeDash: parseDashStyle(content) || undefined,
                  lineHeadEnd: headEnd?.[1] || undefined, lineTailEnd: tailEnd?.[1] || undefined,
                  ...(svgPath ? { svgViewBox } : {}),
                  ...(flipH ? { flipH: true } : {}),
                  ...(flipV ? { flipV: true } : {}),
                },
              });
              console.log(`  Layout connector imported`);
            }
            continue;
          }

          if (tagType === 'pic') {
            // Image element
            const result = parseImageFromSpTree(content, layoutRelsMap, themeColors);
            if (result && result.imageRef) {
              result.element.zIndex = zIndex++;
              const url = await resolveAndUploadImage(zip, result.imageRef, 'ppt/slideLayouts/');
              result.element.content = url;

              // NEVER promote layout images to background. Layout images are always
              // decorative (notebook pages, textures, borders). The real background
              // comes from <p:bg> in slide/layout/master. Promoting layout images
              // hides the real background (e.g., green behind notebook page).
              if (url) {
                result.element.locked = true;
                elements.push(result.element);
                console.log(`  Layout decoration image uploaded`);
              }
            }
          } else {
            // Shape element — skip text boxes with real content
            if (content.includes('<p:txBody>') && content.includes('<a:t>')) {
              const textContent = (content.match(/<a:t>([\s\S]*?)<\/a:t>/g) || [])
                .map(t => t.replace(/<\/?a:t>/g, '').replace(/[""''"\s]/g, ''))
                .join('');
              if (textContent.length > 0) continue;
            }

            const shapeEl = parseShapeFromSpTree(content, themeColors);
            if (shapeEl) {
              shapeEl.locked = true;
              shapeEl.zIndex = zIndex++;
              elements.push(shapeEl);
            }
          }
        }

        // Extract groups from layout (decorative elements like toggles, dot patterns)
        // RECURSIVE: handles nested groups (group inside group) with cumulative transforms
        async function extractGroupShapes(
          grpXml: string,
          parentTransform?: Transform,
          parentGroupId?: string,
        ): Promise<void> {
          // Parse this group's transform
          const grpSpPr = grpXml.match(/<p:grpSpPr>([\s\S]*?)<\/p:grpSpPr>/);
          if (!grpSpPr) return;
          const grpOff = grpSpPr[1].match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const grpExt = grpSpPr[1].match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          const chOff = grpSpPr[1].match(/<a:chOff\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const chExt = grpSpPr[1].match(/<a:chExt\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (!grpOff || !grpExt) return;

          // Assign a unique groupId for all children of this group
          const groupId = parentGroupId || `grp-${genId()}`;

          let gx = parseInt(grpOff[1]), gy = parseInt(grpOff[2]);
          let gw = parseInt(grpExt[1]), gh = parseInt(grpExt[2]);
          // Apply parent transform to this group's position/size
          if (parentTransform) {
            const newGx = parentTransform.toX(gx);
            const newGy = parentTransform.toY(gy);
            gw = parentTransform.toW(gw);
            gh = parentTransform.toH(gh);
            gx = newGx;
            gy = newGy;
          }
          const cox = chOff ? parseInt(chOff[1]) : parseInt(grpOff[1]);
          const coy = chOff ? parseInt(chOff[2]) : parseInt(grpOff[2]);
          const cow = chExt ? parseInt(chExt[1]) : parseInt(grpExt[1]);
          const coh = chExt ? parseInt(chExt[2]) : parseInt(grpExt[2]);
          const scaleGX = cow > 0 ? gw / cow : 1;
          const scaleGY = coh > 0 ? gh / coh : 1;

          const transform: Transform = {
            toX: (cx: number) => gx + (cx - cox) * scaleGX,
            toY: (cy: number) => gy + (cy - coy) * scaleGY,
            toW: (cw: number) => cw * scaleGX,
            toH: (ch: number) => ch * scaleGY,
          };

          // Process direct child elements (strip nested groups to avoid double-processing)
          const grpXmlNoSubGroups = stripBalancedTags(grpXml, 'p:grpSp');

          // Shapes
          const grpSpMatches = grpXmlNoSubGroups.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g);
          for (const sm of grpSpMatches) {
            const shapeEl = parseShapeFromSpTree(sm[1], themeColors);
            if (shapeEl) {
              const childOff = sm[1].match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
              const childExt = sm[1].match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
              if (childOff && childExt) {
                shapeEl.x = emuToPxX(transform.toX(parseInt(childOff[1])));
                shapeEl.y = emuToPxY(transform.toY(parseInt(childOff[2])));
                shapeEl.width = safeWidth(parseInt(childExt[1]), transform);
                shapeEl.height = safeHeight(parseInt(childExt[2]), transform);
              }
              shapeEl.locked = true;
              shapeEl.groupId = groupId;
              shapeEl.zIndex = zIndex++;
              elements.push(shapeEl);
            }
          }

          // Images inside layout groups (watercolor decorations, illustrations, etc.)
          for (const pm of grpXmlNoSubGroups.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)) {
            const result = parseImageFromSpTree(pm[1], layoutRelsMap, themeColors);
            if (result && result.imageRef) {
              const cOff = pm[1].match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
              const cExt = pm[1].match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
              if (cOff && cExt) {
                result.element.x = emuToPxX(transform.toX(parseInt(cOff[1])));
                result.element.y = emuToPxY(transform.toY(parseInt(cOff[2])));
                result.element.width = safeWidth(parseInt(cExt[1]), transform);
                result.element.height = safeHeight(parseInt(cExt[2]), transform);
              }
              const url = await resolveAndUploadImage(zip, result.imageRef, 'ppt/slideLayouts/');
              if (url) {
                result.element.content = url;
                result.element.locked = true;
                result.element.groupId = groupId;
                result.element.zIndex = zIndex++;
                elements.push(result.element);
                console.log(`  Layout group image uploaded`);
              }
            }
          }

          // Recursively process nested groups (share same groupId)
          const nestedGroups = extractBalancedTags(grpXml, 'p:grpSp');
          for (const nestedGrp of nestedGroups) {
            await extractGroupShapes(nestedGrp, transform, groupId);
          }
        }

        // Start recursive extraction from top-level layout groups
        const layoutGrpContents = extractBalancedTags(layoutXml, 'p:grpSp');
        for (const grpXml of layoutGrpContents) {
          await extractGroupShapes(grpXml);
        }
      }
    }

    // Parse ALL slide elements in their XML document order (preserves PPTX z-layering).
    // The spTree children appear as <p:sp>, <p:pic>, <p:grpSp>, <p:cxnSp> interleaved.
    // We process them in order so z-index matches the original draw order (first = bottom, last = top).

    // Match all top-level elements in order using their start positions
    const slideXmlNoGroups = stripBalancedTags(slideXml, 'p:grpSp');

    // Collect all top-level element positions to sort by XML order
    interface XmlElement { pos: number; type: 'sp' | 'pic' | 'grpSp' | 'cxnSp'; content: string }
    const xmlElements: XmlElement[] = [];

    // Standalone shapes and texts (from XML without groups)
    for (const m of slideXmlNoGroups.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
      xmlElements.push({ pos: slideXml.indexOf(m[0]), type: 'sp', content: m[1] });
    }
    // Standalone pics
    for (const m of slideXmlNoGroups.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)) {
      xmlElements.push({ pos: slideXml.indexOf(m[0]), type: 'pic', content: m[1] });
    }
    // Top-level groups (use balanced extraction)
    const grpContents = extractBalancedTags(slideXml, 'p:grpSp');
    for (const grpXml of grpContents) {
      xmlElements.push({ pos: slideXml.indexOf(grpXml.substring(0, 50)), type: 'grpSp', content: grpXml });
    }
    // Standalone connectors
    for (const m of slideXmlNoGroups.matchAll(/<p:cxnSp>([\s\S]*?)<\/p:cxnSp>/g)) {
      xmlElements.push({ pos: slideXml.indexOf(m[0]), type: 'cxnSp', content: m[1] });
    }

    // Sort by XML position (draw order: first = bottom, last = top)
    xmlElements.sort((a, b) => a.pos - b.pos);

    // Process each element in order
    for (const xmlEl of xmlElements) {
      if (xmlEl.type === 'sp') {
        const spXml = xmlEl.content;
        // Skip image/media placeholders
        if (/<p:ph[^>]*type="pic"/.test(spXml) || /<p:ph[^>]*type="media"/.test(spXml)) continue;

        // Try as text first
        const textEl = parseTextFromSpTree(spXml, themeColors, themeFonts, layoutPlaceholderSizes, layoutPlaceholderFonts, layoutPlaceholderBold, layoutPlaceholderColors, { titleBold: masterTitleBold, titleItalic: masterTitleItalic, titleSz: masterTitleSz, bodySz: masterBodySz, titleColor: masterTitleColor, bodyColor: masterBodyColor });
        if (textEl) { textEl.zIndex = zIndex++; elements.push(textEl); continue; }

        // Try as shape
        const shapeEl = parseShapeFromSpTree(spXml, themeColors);
        if (shapeEl) { shapeEl.zIndex = zIndex++; elements.push(shapeEl); }

      } else if (xmlEl.type === 'pic') {
        const result = parseImageFromSpTree(xmlEl.content, relsMap, themeColors);
        if (result) {
          result.element.zIndex = zIndex++;
          if (result.imageRef) {
            result.element.content = await resolveAndUploadImage(zip, result.imageRef, 'ppt/slides/');
          }
          if (result.element.content) elements.push(result.element);
        }

      } else if (xmlEl.type === 'grpSp') {
        await extractSlideGroupShapes(xmlEl.content);

      } else if (xmlEl.type === 'cxnSp') {
        const cxnXml = xmlEl.content;
        const off = cxnXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
        const ext = cxnXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        if (off && ext) {
          const srgb = cxnXml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
          const scheme = cxnXml.match(/<a:schemeClr\s+val="(\w+)"/);
          let lineColor = themeColors.dk1;
          if (srgb) lineColor = `#${srgb[1]}`;
          else if (scheme) lineColor = resolveSchemeColor(scheme[1], themeColors);
          const lnW = cxnXml.match(/<a:ln[^>]+w="(\d+)"/);
          const strokeWidth = lnW ? Math.max(1, Math.round(parseInt(lnW[1]) / 12700 * 2.666)) : 1;
          const cxnW = emuToPxX(parseInt(ext[1]));
          const cxnH = emuToPxY(parseInt(ext[2]));
          // Detect vertical vs horizontal: if height >> width (or width=0), it's vertical
          const isVertical = cxnH > cxnW * 2 || cxnW === 0;
          // Ensure minimum dimension so the line is visible
          const finalW = isVertical ? Math.max(cxnW, 4) : Math.max(cxnW, 2);
          const finalH = isVertical ? Math.max(cxnH, 2) : Math.max(cxnH, 4);
          // Parse head/tail end markers (oval = dot endpoint)
          const headEnd = cxnXml.match(/<a:headEnd[^>]*type="(\w+)"/);
          const tailEnd = cxnXml.match(/<a:tailEnd[^>]*type="(\w+)"/);
          // Center the element if we expanded width for vertical lines
          const adjustedX = isVertical && cxnW === 0 ? emuToPxX(parseInt(off[1])) - 2 : emuToPxX(parseInt(off[1]));
          elements.push({
            id: genId(), type: 'shape', content: '',
            x: adjustedX, y: emuToPxY(parseInt(off[2])),
            width: finalW, height: finalH,
            rotation: 0, opacity: parseAlphaModFixFromSpPr(cxnXml), locked: false, visible: true, zIndex: zIndex++,
            style: { shapeType: 'line', shapeFill: lineColor, shapeStroke: lineColor, shapeStrokeWidth: strokeWidth, shapeStrokeDash: parseDashStyle(cxnXml) || undefined, lineHeadEnd: headEnd?.[1] || undefined, lineTailEnd: tailEnd?.[1] || undefined },
          });
        }
      }
    }

    // Group shapes: <p:grpSp>...</p:grpSp>
    // RECURSIVE: handles nested groups with cumulative coordinate transforms.
    async function extractSlideGroupShapes(
      grpXml: string,
      parentTransform?: Transform,
      parentGroupId?: string,
    ): Promise<void> {
      const grpSpPr = grpXml.match(/<p:grpSpPr>([\s\S]*?)<\/p:grpSpPr>/);
      if (!grpSpPr) return;
      const grpOff = grpSpPr[1].match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
      const grpExt = grpSpPr[1].match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
      const chOffM = grpSpPr[1].match(/<a:chOff\s+x="(-?\d+)"\s+y="(-?\d+)"/);
      const chExtM = grpSpPr[1].match(/<a:chExt\s+cx="(\d+)"\s+cy="(\d+)"/);
      if (!grpOff || !grpExt) return;

      const groupId = parentGroupId || `grp-${genId()}`;

      let gx = parseInt(grpOff[1]), gy = parseInt(grpOff[2]);
      let gw = parseInt(grpExt[1]), gh = parseInt(grpExt[2]);
      if (parentTransform) {
        const newGx = parentTransform.toX(gx);
        const newGy = parentTransform.toY(gy);
        gw = parentTransform.toW(gw);
        gh = parentTransform.toH(gh);
        gx = newGx; gy = newGy;
      }
      const cox = chOffM ? parseInt(chOffM[1]) : parseInt(grpOff[1]);
      const coy = chOffM ? parseInt(chOffM[2]) : parseInt(grpOff[2]);
      const cow = chExtM ? parseInt(chExtM[1]) : parseInt(grpExt[1]);
      const coh = chExtM ? parseInt(chExtM[2]) : parseInt(grpExt[2]);
      const scaleGX = cow > 0 ? gw / cow : 1;
      const scaleGY = coh > 0 ? gh / coh : 1;

      const transform: Transform = {
        toX: (cx: number) => gx + (cx - cox) * scaleGX,
        toY: (cy: number) => gy + (cy - coy) * scaleGY,
        toW: (cw: number) => cw * scaleGX,
        toH: (ch: number) => ch * scaleGY,
      };

      // Direct child shapes only (strip nested groups)
      const noSubGroups = stripBalancedTags(grpXml, 'p:grpSp');

      // Shapes
      for (const sm of noSubGroups.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)) {
        const spXml = sm[1];
        const shapeEl = parseShapeFromSpTree(spXml, themeColors);
        if (shapeEl) {
          const cOff = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const cExt = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (cOff && cExt) {
            shapeEl.x = emuToPxX(transform.toX(parseInt(cOff[1])));
            shapeEl.y = emuToPxY(transform.toY(parseInt(cOff[2])));
            shapeEl.width = safeWidth(parseInt(cExt[1]), transform);
            shapeEl.height = safeHeight(parseInt(cExt[2]), transform);
          }
          // Lock small decorative shapes from groups (dots, toggles, icons)
          // These are design elements, not user-editable content
          if (Math.min(shapeEl.width, shapeEl.height) < 20) shapeEl.locked = true;
          shapeEl.groupId = groupId;
          shapeEl.zIndex = zIndex++;
          elements.push(shapeEl);
          continue;
        }
        const textEl = parseTextFromSpTree(spXml, themeColors, themeFonts, layoutPlaceholderSizes, layoutPlaceholderFonts, layoutPlaceholderBold, layoutPlaceholderColors, { titleBold: masterTitleBold, titleItalic: masterTitleItalic, titleSz: masterTitleSz, bodySz: masterBodySz, titleColor: masterTitleColor, bodyColor: masterBodyColor });
        if (textEl) {
          const cOff = spXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const cExt = spXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (cOff && cExt) {
            textEl.x = emuToPxX(transform.toX(parseInt(cOff[1])));
            textEl.y = emuToPxY(transform.toY(parseInt(cOff[2])));
            textEl.width = safeWidth(parseInt(cExt[1]), transform);
            textEl.height = safeHeight(parseInt(cExt[2]), transform);
          }
          textEl.groupId = groupId;
          textEl.zIndex = zIndex++;
          elements.push(textEl);
        }
      }

      // Images
      for (const pm of noSubGroups.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)) {
        const result = parseImageFromSpTree(pm[1], relsMap, themeColors);
        if (result) {
          const cOff = pm[1].match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
          const cExt = pm[1].match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
          if (cOff && cExt) {
            result.element.x = emuToPxX(transform.toX(parseInt(cOff[1])));
            result.element.y = emuToPxY(transform.toY(parseInt(cOff[2])));
            result.element.width = safeWidth(parseInt(cExt[1]), transform);
            result.element.height = safeHeight(parseInt(cExt[2]), transform);
          }
          result.element.zIndex = zIndex++;
          result.element.groupId = groupId;
          if (result.imageRef) {
            result.element.content = await resolveAndUploadImage(zip, result.imageRef, 'ppt/slides/');
          }
          if (result.element.content) elements.push(result.element);
        }
      }

      // Connectors
      for (const cm of noSubGroups.matchAll(/<p:cxnSp>([\s\S]*?)<\/p:cxnSp>/g)) {
        const cxnXml = cm[1];
        const cOff = cxnXml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
        const cExt = cxnXml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        if (!cOff || !cExt) continue;
        const cx = emuToPxX(transform.toX(parseInt(cOff[1])));
        const cy = emuToPxY(transform.toY(parseInt(cOff[2])));
        const cw = safeWidth(parseInt(cExt[1]), transform);
        const ch = Math.max(2, safeHeight(parseInt(cExt[2]), transform));
        const srgb = cxnXml.match(/<a:srgbClr\s+val="([A-Fa-f0-9]{6})"/);
        const scheme = cxnXml.match(/<a:schemeClr\s+val="(\w+)"/);
        let lineColor = themeColors.dk1;
        if (srgb) lineColor = `#${srgb[1]}`;
        else if (scheme) lineColor = resolveSchemeColor(scheme[1], themeColors);
        const lnW = cxnXml.match(/<a:ln[^>]+w="(\d+)"/);
        const strokeWidth = lnW ? Math.max(1, Math.round(parseInt(lnW[1]) / 12700 * 2.666)) : 1;
        // Detect vertical vs horizontal
        const isVerticalGrp = ch > cw * 2 || cw === 0;
        const grpFinalW = isVerticalGrp ? Math.max(cw, 4) : Math.max(cw, 2);
        const grpFinalH = isVerticalGrp ? Math.max(ch, 2) : Math.max(ch, 4);
        const headEndGrp = cxnXml.match(/<a:headEnd[^>]*type="(\w+)"/);
        const tailEndGrp = cxnXml.match(/<a:tailEnd[^>]*type="(\w+)"/);
        elements.push({
          id: genId(), type: 'shape', content: '',
          x: isVerticalGrp && cw === 0 ? cx - 2 : cx, y: cy, width: grpFinalW, height: grpFinalH,
          rotation: 0, opacity: parseAlphaModFixFromSpPr(cxnXml), locked: false, visible: true, zIndex: zIndex++,
          style: { shapeType: 'line', shapeFill: lineColor, shapeStroke: lineColor, shapeStrokeWidth: strokeWidth, shapeStrokeDash: parseDashStyle(cxnXml) || undefined, lineHeadEnd: headEndGrp?.[1] || undefined, lineTailEnd: tailEndGrp?.[1] || undefined },
        });
      }

      // Recurse into nested groups
      for (const nestedGrp of extractBalancedTags(grpXml, 'p:grpSp')) {
        await extractSlideGroupShapes(nestedGrp, transform, groupId);
      }
    }

    // (Groups and connectors are now handled inside the XML-order loop above)

    // Also handle background images from rels
    if (background.type === 'image' && !background.value.startsWith('http')) {
      const bgUrl = await resolveAndUploadImage(zip, background.value, 'ppt/slides/');
      if (bgUrl) {
        background.value = bgUrl;
      }
    }

    // Detect TOC (Table of Contents) slides
    // TOC can appear in ANY layout (TITLE_ONLY, BLANK_*, CUSTOM, etc.)
    // Check BOTH raw XML plainText AND parsed text elements (placeholders may not be in XML text)
    const textCount = elements.filter(e => e.type === 'text').length;
    const parsedPlainText = (elements.filter(e => e.type === 'text') as any[])
      .map(e => (e.content || '').replace(/<[^>]+>/g, '').toLowerCase().trim()).join(' ');
    const combinedText = plainText + ' ' + parsedPlainText;
    const hasTocHeading = combinedText.includes('table of contents')
      || /\btable\b.*\bof\b.*\bcontents?\b/i.test(combinedText)
      || /\b(index|agenda|overview|outline|contents)\b/i.test(combinedText);
    const hasNumberedItems = /\b0[1-9]\b/.test(combinedText)
      || /\b\d{1,2}\.\s/.test(combinedText)
      || /\b[IVX]{1,4}\b/.test(combinedText)
      || /\b[A-H]\.\s/.test(combinedText);
    const isTocSlide = hasTocHeading && textCount >= 3 && hasNumberedItems;

    // Detect "Thank You" / closing slides — check actual text elements
    // Normalize whitespace: "Thank             you" → "thank you"
    const allTexts = (elements.filter(e => e.type === 'text') as any[])
      .map(e => e.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').toLowerCase().trim())
      .join(' ');
    const isClosingSlide = /\bthank\s*you\b/i.test(allTexts) || allTexts.includes('thanks')
      || /\bthank\s*you\b/i.test(plainText);

    // Classify slide type from layout name
    const slideTypeMap: Record<string, string> = {
      'TITLE': 'cover',
      'SECTION_HEADER': 'section',
      'TITLE_AND_TWO_COLUMNS': 'two-column',
      'CAPTION_ONLY': 'image',
      'BLANK': 'blank',
    };
    // Detect section headers by content: big number (01-09) + few text elements
    const textEls = elements.filter(e => e.type === 'text');
    const hasBigNumber = textEls.some(t => {
      const plain = t.content?.replace(/<[^>]+>/g, '').trim();
      return (t.style?.fontSize || 0) >= 60 && /^0[1-9]$/.test(plain || '');
    });
    const isSectionByContent = hasBigNumber && textEls.length <= 4;

    const slideType = isTocSlide ? 'toc'
      : isClosingSlide ? 'closing'
      : isTitleOnly ? 'title-only'
      : isSectionByContent ? 'section'
      : slideTypeMap[layoutName] ||
      (layoutName.includes('CUSTOM') && elements.length <= 5 ? 'content' : 'content');

    // Keep extraction order for z-index — it follows the PPTX XML draw order.
    // Layout elements come first (background decorations), then slide elements
    // in their original XML order (bottom to top).
    const reordered = elements;
    let z = 1;
    for (const el of reordered) el.zIndex = z++;

    const nTexts = reordered.filter(e => e.type === 'text').length;
    const nShapes = reordered.filter(e => e.type === 'shape').length;
    const nImages = reordered.filter(e => e.type === 'image').length;
    console.log(`  → ${layoutName} (${slideType}) ${reordered.length} elements (${nTexts} text, ${nShapes} shapes, ${nImages} images)`);

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

  // Derive palette.bg from the most common ACTUAL slide background (not lt1, which can be wrong)
  // Korean Aesthetic template has lt1=#664B34 (dark brown) but slides are #F3F3F3 (light gray)
  const bgCounts = new Map<string, number>();
  for (const slide of parsedSlides) {
    const bgValue = (slide as any).background?.value;
    if (bgValue && typeof bgValue === 'string' && bgValue.startsWith('#')) {
      bgCounts.set(bgValue, (bgCounts.get(bgValue) || 0) + 1);
    }
  }
  const actualBg = bgCounts.size > 0
    ? [...bgCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : themeColors.lt1;
  if (actualBg !== themeColors.lt1) {
    console.log(`  palette.bg: using actual slide bg ${actualBg} (lt1=${themeColors.lt1} differs)`);
  }

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
          bg: actualBg,
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
      bg: actualBg,
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
