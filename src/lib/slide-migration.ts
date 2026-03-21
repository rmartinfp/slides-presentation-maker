import { Slide, SlideElement, SlideBackground, ThemeTokens } from '@/types/presentation';
import { generateId } from './slide-utils';

/**
 * Convert a legacy slide (title/body/bullets layout-based) to the new
 * element-based format. Positions are in the 1920x1080 coordinate system.
 */
export function migrateSlideToElements(
  slide: Slide,
  themeTokens: ThemeTokens,
): Slide {
  // Already migrated — has elements and no legacy layout
  if (slide.elements?.length && !slide.layout) {
    return slide;
  }

  // If it already has elements, keep them
  if (slide.elements?.length) {
    return {
      ...slide,
      background: slide.background ?? { type: 'solid', value: themeTokens.palette.bg },
    };
  }

  const { palette, typography } = themeTokens;
  const elements: SlideElement[] = [];
  let zIndex = 1;

  const makeEl = (partial: Partial<SlideElement> & Pick<SlideElement, 'type' | 'content' | 'x' | 'y' | 'width' | 'height'>): SlideElement => ({
    id: generateId(),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    zIndex: zIndex++,
    style: {},
    ...partial,
  });

  const layout = slide.layout ?? 'content';

  switch (layout) {
    case 'cover': {
      elements.push(
        makeEl({
          type: 'text',
          content: slide.title || 'Presentation Title',
          x: 160, y: 320, width: 1600, height: 200,
          style: {
            fontFamily: typography.titleFont,
            fontSize: Math.round(typography.titleSize * 1.2),
            fontWeight: 'bold',
            color: palette.primary,
            textAlign: 'center',
          },
        }),
      );
      if (slide.subtitle) {
        elements.push(
          makeEl({
            type: 'text',
            content: slide.subtitle,
            x: 360, y: 540, width: 1200, height: 100,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: typography.bodySize,
              color: palette.text,
              textAlign: 'center',
              opacity: 0.7,
            },
          }),
        );
      }
      break;
    }

    case 'statement': {
      elements.push(
        makeEl({
          type: 'text',
          content: slide.title || '',
          x: 192, y: 280, width: 1536, height: 320,
          style: {
            fontFamily: typography.titleFont,
            fontSize: typography.titleSize,
            fontWeight: 'bold',
            fontStyle: 'italic',
            color: palette.text,
            textAlign: 'center',
          },
        }),
      );
      if (slide.subtitle) {
        elements.push(
          makeEl({
            type: 'text',
            content: slide.subtitle,
            x: 460, y: 640, width: 1000, height: 80,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: Math.round(typography.bodySize * 0.8),
              color: palette.primary,
              textAlign: 'center',
            },
          }),
        );
      }
      break;
    }

    case 'closing': {
      elements.push(
        makeEl({
          type: 'text',
          content: slide.title || 'Thank You',
          x: 160, y: 340, width: 1600, height: 200,
          style: {
            fontFamily: typography.titleFont,
            fontSize: Math.round(typography.titleSize * 1.4),
            fontWeight: 'bold',
            color: palette.primary,
            textAlign: 'center',
          },
        }),
      );
      if (slide.subtitle) {
        elements.push(
          makeEl({
            type: 'text',
            content: slide.subtitle,
            x: 460, y: 560, width: 1000, height: 80,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: typography.bodySize,
              color: palette.text,
              textAlign: 'center',
              opacity: 0.6,
            },
          }),
        );
      }
      if (slide.body) {
        elements.push(
          makeEl({
            type: 'text',
            content: slide.body,
            x: 460, y: 700, width: 1000, height: 60,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: Math.round(typography.bodySize * 0.8),
              color: palette.primary,
              textAlign: 'center',
              opacity: 0.8,
            },
          }),
        );
      }
      break;
    }

    case 'two-column': {
      // Title
      elements.push(
        makeEl({
          type: 'text',
          content: slide.title || '',
          x: 128, y: 80, width: 1664, height: 120,
          style: {
            fontFamily: typography.titleFont,
            fontSize: typography.titleSize,
            fontWeight: 'bold',
            color: palette.primary,
          },
        }),
      );
      // Left body
      if (slide.body) {
        elements.push(
          makeEl({
            type: 'text',
            content: slide.body,
            x: 128, y: 260, width: 800, height: 700,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: typography.bodySize,
              color: palette.text,
              lineHeight: 1.6,
            },
          }),
        );
      }
      // Right bullets
      if (slide.bullets?.length) {
        const bulletsText = slide.bullets.map(b => `\u2022 ${b}`).join('\n');
        elements.push(
          makeEl({
            type: 'text',
            content: bulletsText,
            x: 992, y: 260, width: 800, height: 700,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: Math.round(typography.bodySize * 0.9),
              color: palette.text,
              lineHeight: 1.8,
            },
          }),
        );
      }
      break;
    }

    default: {
      // 'content' layout
      // Title
      elements.push(
        makeEl({
          type: 'text',
          content: slide.title || '',
          x: 128, y: 80, width: 1664, height: 120,
          style: {
            fontFamily: typography.titleFont,
            fontSize: typography.titleSize,
            fontWeight: 'bold',
            color: palette.primary,
          },
        }),
      );

      if (slide.bullets?.length) {
        const bulletsText = slide.bullets.map(b => `\u2022 ${b}`).join('\n');
        elements.push(
          makeEl({
            type: 'text',
            content: bulletsText,
            x: 128, y: 260, width: 1664, height: 700,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: typography.bodySize,
              color: palette.text,
              lineHeight: 1.8,
            },
          }),
        );
      } else if (slide.body) {
        elements.push(
          makeEl({
            type: 'text',
            content: slide.body,
            x: 128, y: 260, width: 1664, height: 700,
            style: {
              fontFamily: typography.bodyFont,
              fontSize: typography.bodySize,
              color: palette.text,
              lineHeight: 1.6,
            },
          }),
        );
      }
      break;
    }
  }

  // Determine background
  let background: SlideBackground;
  if (slide.background && typeof slide.background === 'object' && 'type' in slide.background) {
    background = slide.background as SlideBackground;
  } else if (typeof slide.background === 'string') {
    background = { type: 'solid', value: slide.background };
  } else {
    background = { type: 'solid', value: palette.bg };
  }

  return {
    ...slide,
    elements,
    background,
  };
}

/**
 * Detect and convert old px-based font sizes to pt-based.
 * Old format: fontSize was stored as px (e.g. 120 for a 45pt title).
 * New format: fontSize stored as pt (e.g. 45).
 * Heuristic: if any text element has fontSize > 80, it's likely old px format.
 */
function migrateFontSizes(slide: Slide): Slide {
  if (!slide.elements?.length) return slide;

  const hasOldSizes = slide.elements.some(
    el => el.type === 'text' && el.style?.fontSize && (el.style.fontSize as number) > 80
  );
  if (!hasOldSizes) return slide;

  return {
    ...slide,
    elements: slide.elements.map(el => {
      if (el.type !== 'text' || !el.style?.fontSize) return el;
      const oldPx = el.style.fontSize as number;
      if (oldPx > 80) {
        return {
          ...el,
          style: { ...el.style, fontSize: Math.round(oldPx / 2.666) },
        };
      }
      return el;
    }),
  };
}

/**
 * Migrate an entire array of slides (e.g. loaded from DB).
 */
export function migrateAllSlides(slides: Slide[], themeTokens: ThemeTokens): Slide[] {
  return slides.map(s => migrateFontSizes(migrateSlideToElements(s, themeTokens)));
}
