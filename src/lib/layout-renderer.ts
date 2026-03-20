/**
 * Layout Renderer — Converts a LayoutDefinition + Theme + Content into SlideElement[]
 *
 * This is the merge point: layout library provides structure,
 * theme provides visuals, AI provides content.
 */

import { SlideElement, SlideBackground, ThemeTokens } from '@/types/presentation';
import { LayoutDefinition, LayoutElement } from './layout-library';
import { generateId } from './slide-utils';

export interface SlideContent {
  title?: string;
  subtitle?: string | string[];     // Can be multiple for comparison layouts
  body?: string | string[];          // Can be multiple for multi-column
  stats?: { value: string; label: string }[];
  bullets?: string[];
  quote?: string;
  quoteAuthor?: string;
  labels?: string[];
  sectionNumber?: string;
  imageUrl?: string;
}

/**
 * Render a layout with content and theme into positioned SlideElement[].
 */
export function renderLayout(
  layout: LayoutDefinition,
  content: SlideContent,
  theme: ThemeTokens,
  background?: SlideBackground,
): { elements: SlideElement[]; background: SlideBackground } {
  const { palette, typography } = theme;
  const bodySize = typography.bodySize || 24;
  const elements: SlideElement[] = [];
  let zIndex = 1;

  for (const el of layout.elements) {
    const rendered = renderElement(el, content, palette, typography, bodySize, zIndex);
    if (rendered) {
      elements.push(rendered);
      zIndex++;
    }
  }

  const bg: SlideBackground = background || { type: 'solid', value: palette.bg };

  return { elements, background: bg };
}

function renderElement(
  el: LayoutElement,
  content: SlideContent,
  palette: ThemeTokens['palette'],
  typography: ThemeTokens['typography'],
  bodySize: number,
  zIndex: number,
): SlideElement | null {
  const fontSize = Math.round(bodySize * el.style.fontSizeRatio);
  const isTitle = el.role === 'title' || el.role === 'section-number';
  const fontFamily = isTitle ? typography.titleFont : typography.bodyFont;
  const color = el.style.opacity && el.style.opacity < 1
    ? palette.text // Will use opacity on the element
    : palette.text;

  const baseStyle: SlideElement['style'] = {
    fontFamily,
    fontSize,
    fontWeight: el.style.fontWeight || 'normal',
    textAlign: el.style.textAlign || 'left',
    color,
    opacity: el.style.opacity,
  };

  switch (el.role) {
    case 'title': {
      const text = content.title || '';
      if (!text) return null;
      return makeTextElement(el, `<p>${text}</p>`, baseStyle, zIndex);
    }

    case 'subtitle': {
      const subs = Array.isArray(content.subtitle) ? content.subtitle : [content.subtitle || ''];
      const text = subs[el.index ?? 0] || '';
      if (!text) return null;
      return makeTextElement(el, `<p>${text}</p>`, baseStyle, zIndex);
    }

    case 'body': {
      const bodies = Array.isArray(content.body) ? content.body : [content.body || ''];
      const text = bodies[el.index ?? 0] || '';
      if (!text) return null;
      return makeTextElement(el, `<p>${text}</p>`, baseStyle, zIndex);
    }

    case 'bullet-item': {
      const bullet = content.bullets?.[el.index ?? 0];
      if (!bullet) return null;
      return makeTextElement(el, `<p>${bullet}</p>`, baseStyle, zIndex);
    }

    case 'stat-value': {
      const stat = content.stats?.[el.index ?? 0];
      if (!stat) return null;
      return makeTextElement(el, `<p>${stat.value}</p>`, {
        ...baseStyle,
        color: palette.primary,
      }, zIndex);
    }

    case 'stat-label': {
      const stat = content.stats?.[el.index ?? 0];
      if (!stat) return null;
      return makeTextElement(el, `<p>${stat.label}</p>`, baseStyle, zIndex);
    }

    case 'section-number': {
      const num = content.sectionNumber || '';
      if (!num) return null;
      return makeTextElement(el, `<p>${num}</p>`, {
        ...baseStyle,
        color: palette.primary,
      }, zIndex);
    }

    case 'quote': {
      const text = content.quote || '';
      if (!text) return null;
      return makeTextElement(el, `<p>"${text}"</p>`, {
        ...baseStyle,
        fontStyle: 'italic',
      }, zIndex);
    }

    case 'quote-author': {
      const text = content.quoteAuthor || '';
      if (!text) return null;
      return makeTextElement(el, `<p>— ${text}</p>`, baseStyle, zIndex);
    }

    case 'label': {
      const labels = content.labels || [];
      const text = labels[el.index ?? 0] || '';
      if (!text) return null;
      return makeTextElement(el, `<p>${text}</p>`, baseStyle, zIndex);
    }

    case 'divider': {
      return {
        id: generateId(),
        type: 'shape',
        content: '',
        x: el.x, y: el.y, width: el.width, height: Math.max(el.height, 2),
        rotation: 0, opacity: 0.2, locked: false, visible: true, zIndex,
        style: {
          shapeType: 'rectangle',
          shapeFill: palette.text,
          borderRadius: 0,
        },
      };
    }

    case 'image': {
      const url = content.imageUrl || '';
      if (!url) return null;
      return {
        id: generateId(),
        type: 'image',
        content: url,
        x: el.x, y: el.y, width: el.width, height: el.height,
        rotation: 0, opacity: el.style.opacity ?? 1, locked: false, visible: true, zIndex,
        style: { objectFit: 'cover', borderRadius: 8 },
      };
    }

    default:
      return null;
  }
}

function makeTextElement(
  el: LayoutElement,
  content: string,
  style: SlideElement['style'],
  zIndex: number,
): SlideElement {
  return {
    id: generateId(),
    type: 'text',
    content,
    x: el.x, y: el.y, width: el.width, height: el.height,
    rotation: 0, opacity: style.opacity ?? 1, locked: false, visible: true, zIndex,
    style: {
      ...style,
    },
  };
}
