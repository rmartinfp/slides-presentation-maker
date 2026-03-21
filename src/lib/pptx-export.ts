import PptxGenJS from 'pptxgenjs';
import { Presentation, Slide, SlideElement, PresentationTheme } from '@/types/presentation';

// Conversion constants: 1920px canvas → 10 inches (PPTX LAYOUT_WIDE)
const PX_TO_INCH = 10 / 1920;
const PX_TO_INCH_Y = 7.5 / 1080;

export async function exportToPptx(presentation: Presentation): Promise<void> {
  const pptx = new PptxGenJS();
  const { theme } = presentation;
  const { palette } = theme.tokens;

  pptx.author = 'SlideAI';
  pptx.title = presentation.title;
  pptx.layout = 'LAYOUT_WIDE';

  for (const slide of presentation.slides) {
    addSlide(pptx, slide, theme);
  }

  await pptx.writeFile({ fileName: `${sanitizeFilename(presentation.title)}.pptx` });
}

function addSlide(pptx: PptxGenJS, slide: Slide, theme: PresentationTheme): void {
  const { palette } = theme.tokens;
  const s = pptx.addSlide();

  // Background
  if (slide.background) {
    switch (slide.background.type) {
      case 'solid':
        s.background = { color: slide.background.value.replace('#', '') };
        break;
      case 'gradient':
        // Fallback to palette bg for gradient (PPTX gradient is complex)
        s.background = { color: palette.bg.replace('#', '') };
        break;
      case 'image':
        s.background = { path: slide.background.value };
        break;
    }
  } else {
    s.background = { color: palette.bg.replace('#', '') };
  }

  // Render each element
  const sortedElements = [...(slide.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

  for (const element of sortedElements) {
    addElement(s, element);
  }
}

/**
 * Convert an SVG shape to a base64 PNG for embedding in PPTX.
 * pptxgenjs doesn't support custom SVG paths, so we rasterize them.
 */
function svgToBase64(svgPath: string, viewBox: string, fill: string, stroke: string, strokeWidth: number, w: number, h: number): string | null {
  try {
    // Use 2x resolution for crisp export
    const pixelW = Math.round(w * 192); // inches × 192 dpi
    const pixelH = Math.round(h * 192);
    const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelW}" height="${pixelH}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">
      <path d="${svgPath}" fill="${fill}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svgXml)}`;
  } catch {
    return null;
  }
}

function addElement(s: PptxGenJS.Slide, element: SlideElement): void {
  const x = element.x * PX_TO_INCH;
  const y = element.y * PX_TO_INCH_Y;
  const w = element.width * PX_TO_INCH;
  const h = element.height * PX_TO_INCH_Y;

  switch (element.type) {
    case 'text': {
      const st = element.style;
      // fontSize is stored in points — pptxgenjs expects points directly
      const fontSize = st.fontSize || 14;

      // Strip HTML tags for PPTX (pptxgenjs doesn't support HTML)
      const plainText = element.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>\s*<p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();

      s.addText(plainText, {
        x,
        y,
        w,
        h,
        fontSize,
        fontFace: st.fontFamily?.split(',')[0]?.trim() || 'Arial',
        color: (st.color || '#000000').replace('#', ''),
        bold: st.fontWeight === 'bold' || st.fontWeight === '700',
        italic: st.fontStyle === 'italic',
        underline: st.textDecoration === 'underline' ? { style: 'sng' } : undefined,
        align: st.textAlign || 'left',
        valign: 'top',
        lineSpacingMultiple: st.lineHeight || 1.2,
        rotate: element.rotation || undefined,
      });
      break;
    }

    case 'shape': {
      const st = element.style;
      const fill = (st.shapeFill || st.backgroundColor || '#6366f1');
      const fillHex = fill.replace('#', '');
      const shapeType = st.shapeType || 'rectangle';
      const stroke = st.shapeStroke || 'transparent';
      const strokeWidth = st.shapeStrokeWidth || 0;

      // Custom SVG path — convert to image since pptxgenjs doesn't support custom geometry
      if (shapeType === 'custom' && st.svgPath) {
        const svgData = svgToBase64(
          st.svgPath as string,
          (st.svgViewBox as string) || '0 0 100 100',
          fill,
          stroke !== 'transparent' ? stroke : 'none',
          strokeWidth,
          w, h,
        );
        if (svgData) {
          try {
            s.addImage({ data: svgData, x, y, w, h, rotate: element.rotation || undefined });
          } catch { /* skip on error */ }
        }
        break;
      }

      // Map our shapes to pptxgenjs shapes
      let pptxShape: string = 'rect';
      if (shapeType === 'circle') pptxShape = 'ellipse';
      else if (shapeType === 'triangle') pptxShape = 'triangle';
      else if (shapeType === 'arrow-right') pptxShape = 'rightArrow';
      else if (shapeType === 'line') pptxShape = 'line';

      const shapeOpts: Record<string, any> = {
        x, y, w, h,
        fill: fill === 'transparent' ? undefined : { type: 'solid', color: fillHex },
        rotate: element.rotation || undefined,
      };

      // Add stroke/border if present
      if (stroke !== 'transparent' && strokeWidth > 0) {
        shapeOpts.line = { color: stroke.replace('#', ''), width: strokeWidth };
        if (st.shapeStrokeDash) {
          shapeOpts.line.dashType = st.shapeStrokeDash === '8 4' ? 'dash'
            : st.shapeStrokeDash === '2 4' ? 'dot'
            : st.shapeStrokeDash === '16 6' ? 'lgDash'
            : 'dash';
        }
      }

      // Border radius for rounded rect
      if (shapeType === 'rectangle' && st.borderRadius) {
        shapeOpts.rectRadius = Math.min(st.borderRadius as number * PX_TO_INCH, 0.5);
      }

      s.addShape(pptxShape as PptxGenJS.ShapeType, shapeOpts);
      break;
    }

    case 'image': {
      try {
        s.addImage({
          path: element.content,
          x,
          y,
          w,
          h,
          rotate: element.rotation || undefined,
        });
      } catch {
        // Skip images that can't be loaded
      }
      break;
    }
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50) || 'presentation';
}
