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
      const fill = (st.shapeFill || st.backgroundColor || '#6366f1').replace('#', '');
      const shapeType = st.shapeType || 'rectangle';

      // Map our shapes to pptxgenjs shapes
      let pptxShape: string = 'rect';
      if (shapeType === 'circle') pptxShape = 'ellipse';
      else if (shapeType === 'triangle') pptxShape = 'triangle';
      else if (shapeType === 'arrow-right') pptxShape = 'rightArrow';
      else if (shapeType === 'line') pptxShape = 'line';

      s.addShape(pptxShape as PptxGenJS.ShapeType, {
        x,
        y,
        w,
        h,
        fill: { type: 'solid', color: fill },
        rotate: element.rotation || undefined,
      });
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
