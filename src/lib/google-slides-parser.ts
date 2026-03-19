import {
  GoogleSlidesPresentation,
  GoogleSlide,
  GooglePageElement,
  GoogleShape,
  GoogleTextElement,
} from './google-slides-types';
import { SlideElement, Slide, SlideBackground, ElementStyle } from '@/types/presentation';
import { emuToX, emuToY, emuToWidth, emuToHeight, magnitudeToFontPx, rgbaToHex } from './emu-converter';
import { generateId } from './slide-utils';

/**
 * Parse a Google Slides API response into our internal Slide[] format.
 */
export function parseGoogleSlides(gsPresentation: GoogleSlidesPresentation): {
  title: string;
  slides: Slide[];
  imageUrls: string[]; // URLs that need to be downloaded and re-hosted
} {
  const imageUrls: string[] = [];
  const slides: Slide[] = [];

  for (const gsSlide of gsPresentation.slides) {
    const slide = parseSlide(gsSlide, imageUrls);
    slides.push(slide);
  }

  return {
    title: gsPresentation.title,
    slides,
    imageUrls,
  };
}

function parseSlide(gsSlide: GoogleSlide, imageUrls: string[]): Slide {
  const elements: SlideElement[] = [];
  let zIndex = 1;

  // Parse background
  const background = parseBackground(gsSlide);

  // Parse page elements
  if (gsSlide.pageElements) {
    for (const pe of gsSlide.pageElements) {
      const parsed = parsePageElement(pe, zIndex, imageUrls);
      if (parsed) {
        elements.push(...parsed);
        zIndex += parsed.length;
      }
    }
  }

  return {
    id: generateId(),
    elements,
    background,
    notes: '',
  };
}

function parseBackground(gsSlide: GoogleSlide): SlideBackground {
  const bgFill = gsSlide.pageProperties?.pageBackgroundFill;
  if (!bgFill) return { type: 'solid', value: '#FFFFFF' };

  if (bgFill.solidFill?.color?.rgbColor) {
    return {
      type: 'solid',
      value: rgbaToHex(bgFill.solidFill.color.rgbColor),
    };
  }

  if (bgFill.stretchedPictureFill?.contentUrl) {
    return {
      type: 'image',
      value: bgFill.stretchedPictureFill.contentUrl,
    };
  }

  return { type: 'solid', value: '#FFFFFF' };
}

function parsePageElement(
  pe: GooglePageElement,
  startZIndex: number,
  imageUrls: string[],
): SlideElement[] | null {
  // Compute position from transform
  const transform = pe.transform;
  const sizeW = pe.size.width.magnitude;
  const sizeH = pe.size.height.magnitude;
  const unit = pe.size.width.unit;

  let x = 0, y = 0, width = 0, height = 0;

  if (unit === 'EMU') {
    const scaleX = transform?.scaleX ?? 1;
    const scaleY = transform?.scaleY ?? 1;
    const translateX = transform?.translateX ?? 0;
    const translateY = transform?.translateY ?? 0;

    width = emuToWidth(sizeW * Math.abs(scaleX));
    height = emuToHeight(sizeH * Math.abs(scaleY));
    x = emuToX(translateX);
    y = emuToY(translateY);
  } else {
    // PT-based
    const scaleX = transform?.scaleX ?? 1;
    const scaleY = transform?.scaleY ?? 1;
    const translateX = transform?.translateX ?? 0;
    const translateY = transform?.translateY ?? 0;

    // Convert PT to our px coordinate system (rough approximation)
    const ptToPx = 1920 / 720; // 720pt = 10" at 72 DPI
    width = Math.round(sizeW * Math.abs(scaleX) * ptToPx);
    height = Math.round(sizeH * Math.abs(scaleY) * ptToPx);
    x = Math.round(translateX * ptToPx);
    y = Math.round(translateY * ptToPx);
  }

  // Handle element groups
  if (pe.elementGroup?.children) {
    const results: SlideElement[] = [];
    let z = startZIndex;
    for (const child of pe.elementGroup.children) {
      const parsed = parsePageElement(child, z, imageUrls);
      if (parsed) {
        results.push(...parsed);
        z += parsed.length;
      }
    }
    return results;
  }

  // Shape (text box or shape)
  if (pe.shape) {
    return [parseShape(pe.shape, x, y, width, height, startZIndex)];
  }

  // Image
  if (pe.image) {
    const url = pe.image.contentUrl || pe.image.sourceUrl || '';
    if (url) imageUrls.push(url);

    return [{
      id: generateId(),
      type: 'image',
      content: url,
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex: startZIndex,
      style: {
        objectFit: 'cover',
        borderRadius: 0,
      },
    }];
  }

  return null;
}

function parseShape(
  shape: GoogleShape,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
): SlideElement {
  const isTextBox =
    shape.shapeType === 'TEXT_BOX' ||
    (shape.text?.textElements && shape.text.textElements.length > 0);

  if (isTextBox && shape.text) {
    // Parse as text element
    const { content, style } = parseTextContent(shape.text.textElements);

    return {
      id: generateId(),
      type: 'text',
      content,
      x,
      y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      zIndex,
      style,
    };
  }

  // Parse as shape element
  const bgFill = shape.shapeProperties?.shapeBackgroundFill?.solidFill;
  const fill = bgFill?.color?.rgbColor ? rgbaToHex(bgFill.color.rgbColor) : '#6366f1';
  const outline = shape.shapeProperties?.outline;
  const stroke = outline?.outlineFill?.solidFill?.color?.rgbColor
    ? rgbaToHex(outline.outlineFill.solidFill.color.rgbColor)
    : 'transparent';

  const shapeTypeMap: Record<string, string> = {
    RECTANGLE: 'rectangle',
    ROUND_RECTANGLE: 'rectangle',
    ELLIPSE: 'circle',
    TRIANGLE: 'triangle',
    RIGHT_ARROW: 'arrow-right',
    LEFT_ARROW: 'arrow-left',
  };

  return {
    id: generateId(),
    type: 'shape',
    content: '',
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: bgFill?.alpha ?? 1,
    locked: false,
    visible: true,
    zIndex,
    style: {
      shapeType: (shapeTypeMap[shape.shapeType] || 'rectangle') as ElementStyle['shapeType'],
      shapeFill: fill,
      shapeStroke: stroke,
      borderRadius: shape.shapeType === 'ROUND_RECTANGLE' ? 12 : 0,
    },
  };
}

function parseTextContent(textElements: GoogleTextElement[]): {
  content: string;
  style: ElementStyle;
} {
  let html = '';
  let firstStyle: ElementStyle = {};
  let isFirst = true;
  let inParagraph = false;

  for (const te of textElements) {
    if (te.paragraphMarker) {
      if (inParagraph) html += '</p>';
      html += '<p>';
      inParagraph = true;
      continue;
    }

    if (te.textRun) {
      const text = te.textRun.content;
      if (text === '\n') continue;

      const ts = te.textRun.style;
      let styledText = escapeHtml(text);

      // Apply inline formatting
      if (ts?.bold) styledText = `<strong>${styledText}</strong>`;
      if (ts?.italic) styledText = `<em>${styledText}</em>`;
      if (ts?.underline) styledText = `<u>${styledText}</u>`;

      // Apply inline color/font via span
      const spanStyles: string[] = [];
      if (ts?.foregroundColor?.opaqueColor?.rgbColor) {
        spanStyles.push(`color: ${rgbaToHex(ts.foregroundColor.opaqueColor.rgbColor)}`);
      }
      if (ts?.fontFamily) {
        spanStyles.push(`font-family: ${ts.fontFamily}`);
      }
      if (ts?.fontSize) {
        spanStyles.push(`font-size: ${magnitudeToFontPx(ts.fontSize.magnitude, ts.fontSize.unit)}px`);
      }

      if (spanStyles.length > 0) {
        styledText = `<span style="${spanStyles.join('; ')}">${styledText}</span>`;
      }

      html += styledText;

      // Capture first text run's style as element-level defaults
      if (isFirst && ts) {
        isFirst = false;
        firstStyle = {
          fontFamily: ts.fontFamily || 'Arial',
          fontSize: ts.fontSize ? magnitudeToFontPx(ts.fontSize.magnitude, ts.fontSize.unit) : 24,
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

  if (inParagraph) html += '</p>';

  return {
    content: html || 'Text',
    style: firstStyle,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
