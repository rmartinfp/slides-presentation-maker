import PptxGenJS from 'pptxgenjs';
import JSZip from 'jszip';
import { Presentation, Slide, SlideElement, PresentationTheme, ChartData, TableData } from '@/types/presentation';

// Conversion constants: 1920px canvas → LAYOUT_WIDE (13.33" × 7.5")
const SLIDE_W = 13.33;
const SLIDE_H = 7.5;
const PX_TO_INCH = SLIDE_W / 1920;   // ~0.00694
const PX_TO_INCH_Y = SLIDE_H / 1080; // ~0.00694

export async function exportToPptx(presentation: Presentation): Promise<void> {
  const pptx = new PptxGenJS();
  const { theme } = presentation;

  pptx.author = 'SlideAI';
  pptx.title = presentation.title;
  pptx.layout = 'LAYOUT_WIDE';

  // Pre-download all video URLs as base64 so they embed inside the PPTX file
  const videoCache = new Map<string, string>();
  for (const slide of presentation.slides) {
    const videoUrls: string[] = [];
    if (slide.videoBackground?.url && slide.videoBackground.type === 'mp4') {
      videoUrls.push(slide.videoBackground.url);
    }
    for (const el of slide.elements || []) {
      if (el.type === 'video' && el.content) videoUrls.push(el.content);
    }
    for (const url of videoUrls) {
      if (videoCache.has(url)) continue;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        videoCache.set(url, base64);
      } catch (e) {
        console.warn('Failed to download video for PPTX embed:', url, e);
      }
    }
  }

  // Collect all unique font families used in the presentation
  const usedFonts = new Set<string>();
  for (const slide of presentation.slides) {
    for (const el of slide.elements || []) {
      if (el.type === 'text' && el.style?.fontFamily) {
        const fontName = el.style.fontFamily.split(',')[0].trim().replace(/["']/g, '');
        if (fontName && fontName !== 'Arial' && fontName !== 'sans-serif') {
          usedFonts.add(fontName);
        }
      }
    }
  }
  // Also add theme fonts
  const { titleFont, bodyFont } = theme.tokens.typography;
  if (titleFont && titleFont !== 'Arial') usedFonts.add(titleFont.split(',')[0].trim());
  if (bodyFont && bodyFont !== 'Arial') usedFonts.add(bodyFont.split(',')[0].trim());

  for (const slide of presentation.slides) {
    addSlide(pptx, slide, theme, videoCache);
  }

  // Generate PPTX as blob, then post-process to embed fonts
  const pptxBlob = await pptx.write({ outputType: 'blob' }) as Blob;
  const finalBlob = await embedFontsInPptx(pptxBlob, usedFonts);

  // Download
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(presentation.title)}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Font embedding into PPTX ZIP ──

interface FontVariant {
  style: 'regular' | 'bold' | 'italic' | 'boldItalic';
  data: ArrayBuffer;
}

async function downloadGoogleFont(fontName: string): Promise<FontVariant[]> {
  const variants: FontVariant[] = [];
  const weights: Array<{ weight: string; style: 'regular' | 'bold' }> = [
    { weight: '400', style: 'regular' },
    { weight: '700', style: 'bold' },
  ];

  for (const { weight, style } of weights) {
    try {
      // Google Fonts CSS2 API returns @font-face with TTF URL
      const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@${weight}&display=swap`;
      const cssRes = await fetch(cssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!cssRes.ok) continue;
      const css = await cssRes.text();
      // Extract TTF URL from css
      const urlMatch = css.match(/src:\s*url\(([^)]+\.ttf)\)/);
      if (!urlMatch) continue;
      const ttfRes = await fetch(urlMatch[1]);
      if (!ttfRes.ok) continue;
      const data = await ttfRes.arrayBuffer();
      variants.push({ style, data });
    } catch {
      // Skip failed variants
    }
  }

  return variants;
}

async function embedFontsInPptx(pptxBlob: Blob, fontNames: Set<string>): Promise<Blob> {
  if (fontNames.size === 0) return pptxBlob;

  // Download all font TTF files
  const fontMap = new Map<string, FontVariant[]>();
  const downloads = Array.from(fontNames).map(async (name) => {
    const variants = await downloadGoogleFont(name);
    if (variants.length > 0) fontMap.set(name, variants);
  });
  await Promise.all(downloads);

  if (fontMap.size === 0) return pptxBlob;

  // Open PPTX as ZIP
  const zip = await JSZip.loadAsync(pptxBlob);

  // 1. Add font files to ppt/fonts/
  const fontRels: Array<{ fontName: string; style: string; rId: string; path: string }> = [];
  let rIdCounter = 200; // Start high to avoid collisions with existing rIds

  for (const [fontName, variants] of fontMap) {
    const safeName = fontName.replace(/\s+/g, '');
    for (const variant of variants) {
      const fileName = `${safeName}-${variant.style}.fntdata`;
      const filePath = `ppt/fonts/${fileName}`;
      zip.file(filePath, variant.data);
      const rId = `rId${rIdCounter++}`;
      fontRels.push({ fontName, style: variant.style, rId, path: `fonts/${fileName}` });
    }
  }

  // 2. Update [Content_Types].xml — add fntdata extension
  const contentTypesXml = await zip.file('[Content_Types].xml')?.async('string');
  if (contentTypesXml && !contentTypesXml.includes('fntdata')) {
    const updated = contentTypesXml.replace(
      '<Types ',
      '<Types '
    ).replace(
      /<\/Types>/,
      '<Default ContentType="application/x-fontdata" Extension="fntdata"/></Types>'
    );
    zip.file('[Content_Types].xml', updated);
  }

  // 3. Update ppt/_rels/presentation.xml.rels — add font relationships
  const presRelsPath = 'ppt/_rels/presentation.xml.rels';
  let presRels = await zip.file(presRelsPath)?.async('string') || '';
  if (presRels) {
    const newRels = fontRels.map(f =>
      `<Relationship Id="${f.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="${f.path}"/>`
    ).join('');
    presRels = presRels.replace('</Relationships>', newRels + '</Relationships>');
    zip.file(presRelsPath, presRels);
  }

  // 4. Update ppt/presentation.xml — add embeddedFontLst + enable embedding
  let presXml = await zip.file('ppt/presentation.xml')?.async('string') || '';
  if (presXml) {
    // Enable font embedding attributes
    presXml = presXml.replace(
      /<p:presentation /,
      '<p:presentation embedTrueTypeFonts="1" saveSubsetFonts="1" '
    );

    // Build embeddedFontLst XML
    const fontEntries: string[] = [];
    const groupedByFont = new Map<string, typeof fontRels>();
    for (const rel of fontRels) {
      if (!groupedByFont.has(rel.fontName)) groupedByFont.set(rel.fontName, []);
      groupedByFont.get(rel.fontName)!.push(rel);
    }

    for (const [fontName, rels] of groupedByFont) {
      let entry = `<p:embeddedFont><p:font typeface="${fontName}"/>`;
      for (const rel of rels) {
        entry += `<p:${rel.style} r:id="${rel.rId}"/>`;
      }
      entry += '</p:embeddedFont>';
      fontEntries.push(entry);
    }

    const embeddedFontLst = `<p:embeddedFontLst>${fontEntries.join('')}</p:embeddedFontLst>`;

    // Insert after <p:sldSz.../> or before </p:presentation>
    if (presXml.includes('</p:sldSz>')) {
      presXml = presXml.replace('</p:sldSz>', '</p:sldSz>' + embeddedFontLst);
    } else {
      presXml = presXml.replace('</p:presentation>', embeddedFontLst + '</p:presentation>');
    }

    zip.file('ppt/presentation.xml', presXml);
  }

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function addSlide(pptx: PptxGenJS, slide: Slide, theme: PresentationTheme, videoCache: Map<string, string>): void {
  const { palette } = theme.tokens;
  const s = pptx.addSlide();

  // ── Background ──
  if (slide.background) {
    switch (slide.background.type) {
      case 'solid':
        s.background = { color: hexClean(slide.background.value) };
        break;
      case 'gradient': {
        // Try to parse CSS gradient colors for a basic 2-stop linear
        const gradMatch = slide.background.value.match(/#([0-9A-Fa-f]{3,8})/g);
        if (gradMatch && gradMatch.length >= 2) {
          s.background = { color: hexClean(gradMatch[0]) };
          // pptxgenjs doesn't support true gradients on background,
          // use first color as best approximation
        } else {
          s.background = { color: hexClean(palette.bg) };
        }
        break;
      }
      case 'image':
        s.background = { path: slide.background.value };
        break;
    }
  } else {
    s.background = { color: hexClean(palette.bg) };
  }

  // ── Video Background (as full-slide media element — PPTX doesn't support native video bg) ──
  if (slide.videoBackground?.url && slide.videoBackground.type === 'mp4') {
    try {
      const vbData = videoCache.get(slide.videoBackground.url);
      if (vbData) {
        s.addMedia({ type: 'video', data: vbData, x: 0, y: 0, w: '100%', h: '100%' });
      } else {
        s.addMedia({ type: 'video', path: slide.videoBackground.url, x: 0, y: 0, w: '100%', h: '100%' });
      }
    } catch (e) {
      console.warn('Failed to add video to PPTX slide:', e);
    }
  }

  // ── Speaker Notes ──
  if (slide.notes) {
    s.addNotes(slide.notes);
  }

  // ── Elements (sorted by zIndex) ──
  const sortedElements = [...(slide.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const element of sortedElements) {
    try {
      addElement(s, element, theme, videoCache);
    } catch (err) {
      console.warn(`PPTX export: failed to export element ${element.id} (${element.type}):`, err);
    }
  }
}

function addElement(s: PptxGenJS.Slide, el: SlideElement, theme: PresentationTheme, videoCache: Map<string, string>): void {
  const x = el.x * PX_TO_INCH;
  const y = el.y * PX_TO_INCH_Y;
  const w = el.width * PX_TO_INCH;
  const h = el.height * PX_TO_INCH_Y;
  const st = el.style;
  const rotate = el.rotation || undefined;

  switch (el.type) {
    // ── TEXT ──
    case 'text': {
      const fontSize = st.fontSize || 14;

      // Strip HTML tags for PPTX
      const plainText = el.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .trim();

      if (!plainText) break;

      const textOpts: Record<string, any> = {
        x, y, w, h,
        fontSize,
        fontFace: st.fontFamily?.split(',')[0]?.trim() || 'Arial',
        color: hexClean(st.color || '#000000'),
        bold: st.fontWeight === 'bold' || st.fontWeight === '700',
        italic: st.fontStyle === 'italic',
        underline: st.textDecoration === 'underline' ? { style: 'sng' } : undefined,
        align: st.textAlign || 'left',
        valign: 'top',
        lineSpacingMultiple: st.lineHeight || 1.2,
        margin: [0.04, 0.06, 0.04, 0.06], // ~8px padding at LAYOUT_WIDE scale
        rotate,
        transparency: el.opacity < 1 ? Math.round((1 - el.opacity) * 100) : undefined,
      };

      // Background fill for text boxes
      if (st.backgroundColor && st.backgroundColor !== 'transparent') {
        textOpts.fill = { type: 'solid', color: hexClean(st.backgroundColor) };
      }

      // Border
      if (st.borderColor && st.borderWidth) {
        textOpts.line = { color: hexClean(st.borderColor), width: st.borderWidth };
      }

      // Border radius
      if (st.borderRadius) {
        textOpts.rectRadius = Math.min((st.borderRadius as number) * PX_TO_INCH, 0.5);
      }

      s.addText(plainText, textOpts);
      break;
    }

    // ── IMAGE ──
    case 'image': {
      if (!el.content || el.content.startsWith('data:image/svg')) {
        // SVG data URLs: embed as-is
        try {
          s.addImage({ data: el.content, x, y, w, h, rotate });
        } catch { /* skip */ }
        break;
      }

      const imgOpts: Record<string, any> = {
        path: el.content,
        x, y, w, h,
        rotate,
        transparency: el.opacity < 1 ? Math.round((1 - el.opacity) * 100) : undefined,
      };

      // Border radius → rounding
      if (st.borderRadius && (st.borderRadius as number) > 20) {
        imgOpts.rounding = true;
      }

      // Image crop / objectPosition → sizing
      const fit = st.objectFit || 'cover';
      if (fit === 'contain') {
        imgOpts.sizing = { type: 'contain', w, h };
      } else if (fit === 'cover') {
        imgOpts.sizing = { type: 'cover', w, h };
      }
      // For 'fill', default stretch behavior is correct

      try {
        s.addImage(imgOpts);
      } catch {
        // Skip images that fail to load
      }
      break;
    }

    // ── VIDEO ──
    case 'video': {
      if (!el.content) break;
      try {
        const vidData = videoCache.get(el.content);
        if (vidData) {
          s.addMedia({ type: 'video', data: vidData, x, y, w, h });
        } else {
          s.addMedia({ type: 'video', path: el.content, x, y, w, h });
        }
      } catch {
        console.warn('Failed to add video to PPTX, skipping element');
      }
      break;
    }

    // ── SHAPE ──
    case 'shape': {
      const fill = st.shapeFill || st.backgroundColor || '#6366f1';
      const shapeType = st.shapeType || 'rectangle';
      const stroke = st.shapeStroke || 'transparent';
      const strokeWidth = st.shapeStrokeWidth || 0;

      // Custom SVG path → rasterize to image (path stored in style.svgPath or element.content)
      const svgPathExport = st.svgPath || (shapeType === 'custom' && el.content ? el.content : null);
      if (shapeType === 'custom' && svgPathExport) {
        const svgData = svgToBase64(
          svgPathExport as string,
          (st.svgViewBox as string) || '0 0 100 100',
          fill, stroke !== 'transparent' ? stroke : 'none', strokeWidth, w, h,
        );
        if (svgData) {
          try { s.addImage({ data: svgData, x, y, w, h, rotate }); } catch { /* skip */ }
        }
        break;
      }

      // Line shapes
      if (shapeType === 'line') {
        const lineColor = fill !== 'transparent' ? fill : stroke;
        const isVert = el.height > el.width * 2;
        const lineOpts: Record<string, any> = {
          x, y, w, h, rotate,
          line: {
            color: hexClean(lineColor),
            width: Math.max(strokeWidth, 1),
          },
        };

        // Dash style
        if (st.shapeStrokeDash) {
          const dash = st.shapeStrokeDash as string;
          lineOpts.line.dashType = dash.includes('2') ? 'sysDot' : dash.includes('16') ? 'lgDash' : 'dash';
        }

        // Arrow endpoints
        const headEnd = st.lineHeadEnd as string | undefined;
        const tailEnd = st.lineTailEnd as string | undefined;
        if (headEnd && headEnd !== 'none') {
          lineOpts.line.beginArrowType = mapArrowType(headEnd);
        }
        if (tailEnd && tailEnd !== 'none') {
          lineOpts.line.endArrowType = mapArrowType(tailEnd);
        }

        s.addShape('line' as PptxGenJS.ShapeType, lineOpts);
        break;
      }

      // Map shapes
      const pptxShape = mapShapeType(shapeType);

      const shapeOpts: Record<string, any> = {
        x, y, w, h, rotate,
        fill: fill === 'transparent' ? { type: 'none' } : { type: 'solid', color: hexClean(fill) },
      };

      // Opacity
      if (el.opacity < 1) {
        if (shapeOpts.fill.type === 'solid') {
          shapeOpts.fill.transparency = Math.round((1 - el.opacity) * 100);
        }
      }

      // Stroke
      if (stroke !== 'transparent' && strokeWidth > 0) {
        shapeOpts.line = { color: hexClean(stroke), width: strokeWidth };
        if (st.shapeStrokeDash) {
          const dash = st.shapeStrokeDash as string;
          shapeOpts.line.dashType = dash.includes('2') ? 'sysDot' : dash.includes('16') ? 'lgDash' : 'dash';
        }
      }

      // Border radius
      if (shapeType === 'rectangle' && st.borderRadius) {
        shapeOpts.rectRadius = Math.min((st.borderRadius as number) * PX_TO_INCH, 0.5);
      }

      // Shadow
      if (st.boxShadow) {
        const shadow = parseBoxShadow(st.boxShadow as string);
        if (shadow) shapeOpts.shadow = shadow;
      }

      s.addShape(pptxShape as PptxGenJS.ShapeType, shapeOpts);
      break;
    }

    // ── TABLE ──
    case 'table': {
      let tableData: TableData;
      try { tableData = JSON.parse(el.content); } catch { break; }

      const rows = tableData.rows;
      if (!rows.length) break;

      const numCols = rows[0].length;
      const colW = w / numCols;
      const cellFontSize = Math.max(8, Math.round(st.fontSize || 12));

      const pptxRows: PptxGenJS.TableRow[] = rows.map((row, ri) => {
        return row.map((cell) => {
          const cellOpts: Record<string, any> = {
            text: cell.text || '',
            options: {
              fontSize: cellFontSize,
              fontFace: st.fontFamily?.split(',')[0]?.trim() || 'Arial',
              color: hexClean(cell.color || st.color || '#1e293b'),
              bold: cell.bold || (ri === 0 && tableData.headerRow),
              align: cell.align || 'left',
              valign: 'middle',
              margin: [4, 6, 4, 6],
              fill: cell.bg ? { type: 'solid', color: hexClean(cell.bg) } :
                (ri === 0 && tableData.headerRow) ? { type: 'solid', color: 'e2e8f0' } : undefined,
              border: [
                { type: 'solid', color: hexClean(tableData.borderColor || '#e2e8f0'), pt: 0.5 },
                { type: 'solid', color: hexClean(tableData.borderColor || '#e2e8f0'), pt: 0.5 },
                { type: 'solid', color: hexClean(tableData.borderColor || '#e2e8f0'), pt: 0.5 },
                { type: 'solid', color: hexClean(tableData.borderColor || '#e2e8f0'), pt: 0.5 },
              ],
            },
          };
          return cellOpts;
        });
      });

      s.addTable(pptxRows, {
        x, y, w, h,
        colW: Array(numCols).fill(colW),
      });
      break;
    }

    // ── CHART ──
    case 'chart': {
      let chartConfig: ChartData;
      try { chartConfig = JSON.parse(el.content); } catch { break; }

      const { chartType, data, dataKeys, nameKey, colors } = chartConfig;

      // Map chart type to pptxgenjs
      const pptxChartType = chartType === 'bar' ? 'bar' :
        chartType === 'line' ? 'line' :
        chartType === 'area' ? 'area' :
        chartType === 'pie' ? 'pie' :
        chartType === 'doughnut' ? 'doughnut' :
        chartType === 'radar' ? 'radar' :
        chartType === 'scatter' ? 'scatter' : 'bar';

      // Build chart data in pptxgenjs format
      const chartData: any[] = dataKeys.map((key, i) => ({
        name: key,
        labels: data.map(d => String(d[nameKey] || '')),
        values: data.map(d => Number(d[key]) || 0),
      }));

      const chartOpts: Record<string, any> = {
        x, y, w, h,
        showTitle: !!chartConfig.title,
        title: chartConfig.title || '',
        titleFontSize: 12,
        showLegend: chartConfig.showLegend || dataKeys.length > 1,
        legendPos: 'b',
        chartColors: colors?.map(c => hexClean(c)) || ['4F46E5', '9333EA', 'EC4899', 'F59E0B'],
      };

      if (chartType !== 'pie') {
        chartOpts.showCatAxisTitle = false;
        chartOpts.showValAxisTitle = false;
        chartOpts.catAxisLabelFontSize = 9;
        chartOpts.valAxisLabelFontSize = 9;
        chartOpts.showValue = false;
      } else {
        chartOpts.showPercent = true;
        chartOpts.showLabel = true;
        chartOpts.dataLabelFontSize = 9;
      }

      s.addChart(pptxChartType as any, chartData, chartOpts);
      break;
    }
  }
}

// ── Helpers ──

function hexClean(color: string): string {
  if (!color) return '000000';
  return color.replace('#', '').replace(/^([0-9a-f]{3})$/i, (_, c) =>
    c[0] + c[0] + c[1] + c[1] + c[2] + c[2]
  );
}

function mapShapeType(type: string): string {
  const map: Record<string, string> = {
    'rectangle': 'rect',
    'circle': 'ellipse',
    'triangle': 'triangle',
    'star': 'star5',
    'pentagon': 'pentagon',
    'hexagon': 'hexagon',
    'heart': 'heart',
    'arrow-right': 'rightArrow',
    'arrow-left': 'leftArrow',
    'arrow-up': 'upArrow',
    'arrow-down': 'downArrow',
    'diamond': 'diamond',
  };
  return map[type] || 'rect';
}

function mapArrowType(type: string): string {
  if (type === 'arrow' || type === 'triangle') return 'arrow';
  if (type === 'stealth') return 'stealth';
  if (type === 'oval') return 'oval';
  if (type === 'diamond') return 'diamond';
  return 'arrow';
}

function svgToBase64(svgPath: string, viewBox: string, fill: string, stroke: string, strokeWidth: number, w: number, h: number): string | null {
  try {
    const pixelW = Math.round(w * 192);
    const pixelH = Math.round(h * 192);
    const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelW}" height="${pixelH}" viewBox="${viewBox}" preserveAspectRatio="none">
      <path d="${svgPath}" fill="${fill}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svgXml)}`;
  } catch {
    return null;
  }
}

function parseBoxShadow(shadow: string): any | null {
  // Parse "0px 4px 12px rgba(0,0,0,0.15)" style shadows
  const match = shadow.match(/(-?\d+)px\s+(-?\d+)px\s+(-?\d+)px\s+(?:(-?\d+)px\s+)?rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  const [, offsetX, offsetY, blur, , r, g, b, a] = match;
  const color = [r, g, b].map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
  return {
    type: 'outer',
    color,
    blur: Math.round(parseInt(blur) * 0.5),
    offset: Math.round(Math.sqrt(parseInt(offsetX) ** 2 + parseInt(offsetY) ** 2) * 0.5),
    angle: Math.round(Math.atan2(parseInt(offsetY), parseInt(offsetX)) * 180 / Math.PI + 90),
    opacity: parseFloat(a || '1'),
  };
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_áéíóúñüÁÉÍÓÚÑÜ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50) || 'presentation';
}
