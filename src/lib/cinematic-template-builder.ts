/**
 * Cinematic Template Builder
 *
 * Creates complete cinematic templates with positioned elements,
 * video backgrounds, and animation configs.
 *
 * Templates use the same Slide[]/SlideElement[] structure as classic templates
 * but with videoBackground and animationConfig per slide.
 */

import { Slide, SlideElement, SlideBackground } from '@/types/presentation';
import {
  SlideAnimationConfig, SlideOverlays, ElementAnimationConfig,
  CINEMATIC_EASINGS, VideoCategory,
} from '@/types/cinematic';
import { getVideosForSlides } from '@/lib/video-pool';

// ============ Helpers ============

let _idCounter = 0;
function genId(): string {
  return `ct-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

function textElement(
  id: string,
  content: string,
  x: number, y: number, w: number, h: number,
  opts: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
    lineHeight?: number;
    letterSpacing?: number;
    opacity?: number;
    zIndex?: number;
  } = {},
): SlideElement {
  return {
    id,
    type: 'text',
    content,
    x, y, width: w, height: h,
    rotation: 0,
    opacity: opts.opacity ?? 1,
    locked: false,
    visible: true,
    zIndex: opts.zIndex ?? 10,
    style: {
      fontSize: opts.fontSize ?? 24,
      fontWeight: opts.fontWeight ?? '400',
      color: opts.color ?? '#F0F0F0',
      fontFamily: opts.fontFamily,
      textAlign: opts.textAlign ?? 'left',
      verticalAlign: opts.verticalAlign ?? 'top',
      lineHeight: opts.lineHeight ?? 1.2,
      letterSpacing: opts.letterSpacing,
    },
  };
}

function shapeElement(
  id: string,
  x: number, y: number, w: number, h: number,
  opts: {
    fill?: string;
    borderRadius?: number;
    opacity?: number;
    zIndex?: number;
  } = {},
): SlideElement {
  return {
    id,
    type: 'shape',
    content: '',
    x, y, width: w, height: h,
    rotation: 0,
    opacity: opts.opacity ?? 1,
    locked: false,
    visible: true,
    zIndex: opts.zIndex ?? 5,
    style: {
      shapeType: 'rectangle',
      shapeFill: opts.fill ?? 'rgba(255,255,255,0.06)',
      borderRadius: opts.borderRadius ?? 0,
    },
  };
}

function defaultOverlays(scrim: SlideOverlays['scrim'] = 'bottom'): SlideOverlays {
  return {
    vignette: true,
    vignetteIntensity: 0.35,
    filmGrain: true,
    filmGrainOpacity: 0.04,
    scrim,
    scrimOpacity: 0.5,
  };
}

function slideAnimConfig(
  overrides: Record<string, ElementAnimationConfig> = {},
  opts: Partial<SlideAnimationConfig> = {},
): SlideAnimationConfig {
  return {
    transition: opts.transition ?? 'fade-through-black',
    transitionDuration: opts.transitionDuration ?? 0.4,
    autoAdvanceDuration: opts.autoAdvanceDuration,
    overlays: opts.overlays ?? defaultOverlays(),
    kenBurns: opts.kenBurns,
    defaultTextAnimation: opts.defaultTextAnimation ?? {
      type: 'blur-in',
      delay: 0.3,
      duration: 0.8,
      easing: CINEMATIC_EASINGS.expoOut,
    },
    defaultImageAnimation: opts.defaultImageAnimation ?? {
      type: 'fade-in',
      delay: 0.5,
      duration: 0.8,
      easing: CINEMATIC_EASINGS.quintOut,
    },
    defaultShapeAnimation: opts.defaultShapeAnimation ?? {
      type: 'fade-in',
      delay: 0.2,
      duration: 0.6,
      easing: CINEMATIC_EASINGS.expoOut,
    },
    elementOverrides: overrides,
  };
}

// ============ Template: Velorah (from user's prompt example) ============
// Dark cinematic hero-style. Instrument Serif + Inter. Glassmorphism accents.

export function buildVelorahTemplate(videoCategory: VideoCategory = 'abstract-dark'): {
  name: string;
  category: string;
  description: string;
  presetId: string;
  slides: Slide[];
} {
  const videos = getVideosForSlides(videoCategory, 10);
  const fontDisplay = 'Instrument Serif';
  const fontBody = 'Inter';
  const colorWhite = '#F0F0F0';
  const colorMuted = '#9ca3af';
  const colorAccent = '#8238DC';
  const colorDark = '#0d1a26';

  const bg: SlideBackground = { type: 'solid', value: colorDark };

  const slides: Slide[] = [];

  // ─── Slide 1: Hero ───
  {
    const titleId = genId();
    const subtitleId = genId();
    const ctaId = genId();
    const lineId = genId();

    slides.push({
      id: genId(),
      elements: [
        // Thin decorative line
        shapeElement(lineId, 96, 100, 1728, 1, { fill: 'rgba(255,255,255,0.08)', zIndex: 5 }),
        // Main title — large, bottom-aligned
        textElement(titleId, '{{title}}', 96, 500, 1400, 280, {
          fontSize: 96,
          fontWeight: '400',
          fontFamily: fontDisplay,
          color: colorWhite,
          lineHeight: 0.95,
          letterSpacing: -2.5,
          zIndex: 15,
        }),
        // Subtitle
        textElement(subtitleId, '{{subtitle}}', 96, 800, 800, 80, {
          fontSize: 18,
          color: colorMuted,
          fontFamily: fontBody,
          lineHeight: 1.6,
          zIndex: 15,
        }),
        // CTA pill
        shapeElement(ctaId, 96, 920, 200, 50, {
          fill: 'rgba(255,255,255,0.05)',
          borderRadius: 25,
          opacity: 0.8,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[0] ? { url: videos[0].url, type: 'mp4', opacity: 0.35, filter: 'brightness(0.5) saturate(0.85)' } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'clip-reveal', delay: 0.3, duration: 0.9, easing: CINEMATIC_EASINGS.cinematic },
        [subtitleId]: { type: 'blur-in', delay: 0.8, duration: 0.9, easing: CINEMATIC_EASINGS.expoOut },
        [ctaId]: { type: 'fade-in', delay: 1.2, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [lineId]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.smooth },
      }, { overlays: defaultOverlays('bottom') }),
    });
  }

  // ─── Slide 2: Statement ───
  {
    const quoteId = genId();
    const authorId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(quoteId, '{{statement}}', 160, 300, 1600, 300, {
          fontSize: 56,
          fontWeight: '400',
          fontFamily: fontDisplay,
          color: colorWhite,
          textAlign: 'center',
          verticalAlign: 'center',
          lineHeight: 1.15,
          letterSpacing: -1,
          zIndex: 15,
        }),
        textElement(authorId, '{{author}}', 660, 650, 600, 40, {
          fontSize: 14,
          color: colorMuted,
          fontFamily: fontBody,
          textAlign: 'center',
          letterSpacing: 2,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[1] ? { url: videos[1].url, type: 'mp4', opacity: 0.25, filter: 'brightness(0.4) saturate(0.7)' } : undefined,
      animationConfig: slideAnimConfig({
        [quoteId]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: CINEMATIC_EASINGS.expoOut, stagger: 0.04 },
        [authorId]: { type: 'blur-in', delay: 0.8, duration: 0.7, easing: CINEMATIC_EASINGS.quintOut },
      }, { overlays: defaultOverlays('radial') }),
    });
  }

  // ─── Slide 3: Content (Title + Body) ───
  {
    const labelId = genId();
    const titleId = genId();
    const bodyId = genId();
    const lineId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(labelId, '{{label}}', 96, 160, 300, 30, {
          fontSize: 11,
          fontWeight: '500',
          color: colorMuted,
          fontFamily: fontBody,
          letterSpacing: 3,
          zIndex: 15,
        }),
        shapeElement(lineId, 96, 200, 1728, 1, { fill: 'rgba(255,255,255,0.08)', zIndex: 5 }),
        textElement(titleId, '{{title}}', 96, 240, 1200, 180, {
          fontSize: 52,
          fontWeight: '600',
          fontFamily: fontDisplay,
          color: colorWhite,
          lineHeight: 1.05,
          letterSpacing: -1.5,
          zIndex: 15,
        }),
        textElement(bodyId, '{{body}}', 96, 480, 900, 200, {
          fontSize: 18,
          color: colorMuted,
          fontFamily: fontBody,
          lineHeight: 1.7,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[2] ? { url: videos[2].url, type: 'mp4', opacity: 0.2, filter: 'brightness(0.4) saturate(0.8)' } : undefined,
      animationConfig: slideAnimConfig({
        [labelId]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [lineId]: { type: 'fade-in', delay: 0.15, duration: 0.5, easing: CINEMATIC_EASINGS.smooth },
        [titleId]: { type: 'clip-reveal', delay: 0.25, duration: 0.8, easing: CINEMATIC_EASINGS.cinematic },
        [bodyId]: { type: 'blur-in', delay: 0.7, duration: 0.9, easing: CINEMATIC_EASINGS.expoOut },
      }),
    });
  }

  // ─── Slide 4: Stats (3 big numbers) ───
  {
    const titleId = genId();
    const stat1Id = genId();
    const stat1LabelId = genId();
    const stat2Id = genId();
    const stat2LabelId = genId();
    const stat3Id = genId();
    const stat3LabelId = genId();
    const divider1Id = genId();
    const divider2Id = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{title}}', 96, 160, 800, 60, {
          fontSize: 14,
          fontWeight: '500',
          color: colorMuted,
          fontFamily: fontBody,
          letterSpacing: 3,
          zIndex: 15,
        }),
        // Stat 1
        textElement(stat1Id, '{{stat1_value}}', 96, 380, 500, 120, {
          fontSize: 80,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorAccent,
          lineHeight: 1,
          zIndex: 15,
        }),
        textElement(stat1LabelId, '{{stat1_label}}', 96, 510, 400, 40, {
          fontSize: 16,
          color: colorMuted,
          fontFamily: fontBody,
          zIndex: 15,
        }),
        // Divider
        shapeElement(divider1Id, 616, 380, 1, 170, { fill: 'rgba(255,255,255,0.1)', zIndex: 5 }),
        // Stat 2
        textElement(stat2Id, '{{stat2_value}}', 696, 380, 500, 120, {
          fontSize: 80,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorAccent,
          lineHeight: 1,
          zIndex: 15,
        }),
        textElement(stat2LabelId, '{{stat2_label}}', 696, 510, 400, 40, {
          fontSize: 16,
          color: colorMuted,
          fontFamily: fontBody,
          zIndex: 15,
        }),
        // Divider
        shapeElement(divider2Id, 1216, 380, 1, 170, { fill: 'rgba(255,255,255,0.1)', zIndex: 5 }),
        // Stat 3
        textElement(stat3Id, '{{stat3_value}}', 1296, 380, 500, 120, {
          fontSize: 80,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorAccent,
          lineHeight: 1,
          zIndex: 15,
        }),
        textElement(stat3LabelId, '{{stat3_label}}', 1296, 510, 400, 40, {
          fontSize: 16,
          color: colorMuted,
          fontFamily: fontBody,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[3] ? { url: videos[3].url, type: 'mp4', opacity: 0.2, filter: 'brightness(0.35) saturate(0.7)' } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [stat1Id]: { type: 'scale-up', delay: 0.3, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [stat1LabelId]: { type: 'blur-in', delay: 0.5, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [stat2Id]: { type: 'scale-up', delay: 0.45, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [stat2LabelId]: { type: 'blur-in', delay: 0.65, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [stat3Id]: { type: 'scale-up', delay: 0.6, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [stat3LabelId]: { type: 'blur-in', delay: 0.8, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [divider1Id]: { type: 'fade-in', delay: 0.25, duration: 0.5, easing: CINEMATIC_EASINGS.smooth },
        [divider2Id]: { type: 'fade-in', delay: 0.4, duration: 0.5, easing: CINEMATIC_EASINGS.smooth },
      }),
    });
  }

  // ─── Slide 5: Split (Text left, Image right) ───
  {
    const titleId = genId();
    const bodyId = genId();
    const imageId = genId();
    const glassBgId = genId();

    slides.push({
      id: genId(),
      elements: [
        // Glass background for text zone
        shapeElement(glassBgId, 60, 60, 880, 960, {
          fill: 'rgba(255,255,255,0.04)',
          borderRadius: 24,
          zIndex: 3,
        }),
        textElement(titleId, '{{title}}', 120, 200, 760, 160, {
          fontSize: 44,
          fontWeight: '600',
          fontFamily: fontDisplay,
          color: colorWhite,
          lineHeight: 1.1,
          letterSpacing: -1,
          zIndex: 15,
        }),
        textElement(bodyId, '{{body}}', 120, 400, 760, 300, {
          fontSize: 17,
          color: colorMuted,
          fontFamily: fontBody,
          lineHeight: 1.7,
          zIndex: 15,
        }),
        // Image placeholder
        {
          id: imageId,
          type: 'image' as const,
          content: '{{image}}',
          x: 1000, y: 60, width: 860, height: 960,
          rotation: 0, opacity: 1, locked: false, visible: true, zIndex: 8,
          style: { objectFit: 'cover' as const, borderRadius: 24 },
        },
      ],
      background: bg,
      videoBackground: videos[4] ? { url: videos[4].url, type: 'mp4', opacity: 0.15, filter: 'brightness(0.3)' } : undefined,
      animationConfig: slideAnimConfig({
        [glassBgId]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.smooth },
        [titleId]: { type: 'clip-reveal', delay: 0.25, duration: 0.8, easing: CINEMATIC_EASINGS.cinematic },
        [bodyId]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
        [imageId]: { type: 'scale-up', delay: 0.3, duration: 0.9, easing: CINEMATIC_EASINGS.quintOut },
      }),
    });
  }

  // ─── Slide 6: Content (Alternative layout — right-aligned) ───
  {
    const titleId = genId();
    const bodyId = genId();
    const accentLineId = genId();

    slides.push({
      id: genId(),
      elements: [
        // Accent line
        shapeElement(accentLineId, 1750, 200, 4, 680, { fill: colorAccent, opacity: 0.4, zIndex: 5 }),
        textElement(titleId, '{{title}}', 500, 250, 1200, 160, {
          fontSize: 48,
          fontWeight: '600',
          fontFamily: fontDisplay,
          color: colorWhite,
          textAlign: 'right',
          lineHeight: 1.1,
          letterSpacing: -1.2,
          zIndex: 15,
        }),
        textElement(bodyId, '{{body}}', 700, 460, 1000, 250, {
          fontSize: 17,
          color: colorMuted,
          fontFamily: fontBody,
          textAlign: 'right',
          lineHeight: 1.7,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[5] ? { url: videos[5].url, type: 'mp4', opacity: 0.2, filter: 'brightness(0.4) saturate(0.8)' } : undefined,
      animationConfig: slideAnimConfig({
        [accentLineId]: { type: 'slide-up', delay: 0.1, duration: 0.7, easing: CINEMATIC_EASINGS.expoOut },
        [titleId]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: CINEMATIC_EASINGS.expoOut, stagger: 0.04 },
        [bodyId]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
      }),
    });
  }

  // ─── Slide 7: Section divider ───
  {
    const titleId = genId();
    const numberId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(numberId, '{{section_number}}', 860, 350, 200, 60, {
          fontSize: 14,
          fontWeight: '500',
          color: colorAccent,
          fontFamily: fontBody,
          textAlign: 'center',
          letterSpacing: 4,
          zIndex: 15,
        }),
        textElement(titleId, '{{section_title}}', 260, 420, 1400, 200, {
          fontSize: 80,
          fontWeight: '400',
          fontFamily: fontDisplay,
          color: colorWhite,
          textAlign: 'center',
          lineHeight: 0.95,
          letterSpacing: -2,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[6] ? { url: videos[6].url, type: 'mp4', opacity: 0.3, filter: 'brightness(0.45) saturate(0.9)' } : undefined,
      animationConfig: slideAnimConfig({
        [numberId]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [titleId]: { type: 'clip-reveal', delay: 0.25, duration: 0.9, easing: CINEMATIC_EASINGS.cinematic },
      }, { overlays: defaultOverlays('radial') }),
    });
  }

  // ─── Slide 8: Closing / CTA ───
  {
    const titleId = genId();
    const subtitleId = genId();
    const ctaId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{closing_title}}', 260, 350, 1400, 200, {
          fontSize: 88,
          fontWeight: '400',
          fontFamily: fontDisplay,
          color: colorWhite,
          textAlign: 'center',
          lineHeight: 0.95,
          letterSpacing: -2.5,
          zIndex: 15,
        }),
        textElement(subtitleId, '{{closing_subtitle}}', 510, 580, 900, 60, {
          fontSize: 18,
          color: colorMuted,
          fontFamily: fontBody,
          textAlign: 'center',
          lineHeight: 1.5,
          zIndex: 15,
        }),
        // CTA pill
        shapeElement(ctaId, 810, 680, 300, 55, {
          fill: 'rgba(255,255,255,0.06)',
          borderRadius: 28,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[7] ? { url: videos[7].url, type: 'mp4', opacity: 0.3, filter: 'brightness(0.45)' } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'blur-in', delay: 0.3, duration: 1.2, easing: CINEMATIC_EASINGS.quintOut },
        [subtitleId]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
        [ctaId]: { type: 'scale-up', delay: 1.2, duration: 0.6, easing: CINEMATIC_EASINGS.backOut },
      }, { overlays: defaultOverlays('radial') }),
    });
  }

  return {
    name: 'Velorah',
    category: 'Modern',
    description: 'Dark cinematic hero layouts with glassmorphism accents and bold typography.',
    presetId: 'midnight',
    slides,
  };
}

// ============ Template: Keynote Minimal ============
// Ultra-clean, editorial. Playfair Display + Inter. Minimal overlays.

export function buildKeynoteMinimalTemplate(videoCategory: VideoCategory = 'minimal'): {
  name: string;
  category: string;
  description: string;
  presetId: string;
  slides: Slide[];
} {
  const videos = getVideosForSlides(videoCategory, 8);
  const fontDisplay = 'Playfair Display';
  const fontBody = 'Inter';
  const colorWhite = '#f5f5f5';
  const colorMuted = '#737373';
  const colorAccent = '#d4a574';
  const bg: SlideBackground = { type: 'solid', value: '#111111' };

  const slides: Slide[] = [];

  // ─── Slide 1: Hero ───
  {
    const titleId = genId();
    const authorId = genId();
    const dateId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{title}}', 96, 380, 1200, 260, {
          fontSize: 72,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorWhite,
          lineHeight: 1.05,
          zIndex: 15,
        }),
        textElement(authorId, '{{author}}', 96, 680, 500, 30, {
          fontSize: 14,
          color: colorMuted,
          fontFamily: fontBody,
          letterSpacing: 1.5,
          zIndex: 15,
        }),
        textElement(dateId, '{{date}}', 96, 720, 500, 30, {
          fontSize: 13,
          color: colorMuted,
          fontFamily: fontBody,
          opacity: 0.6,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[0] ? { url: videos[0].url, type: 'mp4', opacity: 0.1, filter: 'brightness(0.5)' } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'fade-in', delay: 0.3, duration: 1.2, easing: CINEMATIC_EASINGS.quintOut },
        [authorId]: { type: 'fade-in', delay: 0.8, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
        [dateId]: { type: 'fade-in', delay: 1.0, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
      }, {
        transition: 'fade-cross',
        transitionDuration: 0.5,
        overlays: { vignette: true, vignetteIntensity: 0.25, filmGrain: false, filmGrainOpacity: 0, scrim: 'bottom', scrimOpacity: 0.3 },
      }),
    });
  }

  // ─── Slide 2: Content ───
  {
    const titleId = genId();
    const bodyId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{title}}', 96, 200, 1000, 120, {
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorWhite,
          lineHeight: 1.1,
          zIndex: 15,
        }),
        textElement(bodyId, '{{body}}', 96, 380, 850, 350, {
          fontSize: 18,
          color: colorMuted,
          fontFamily: fontBody,
          lineHeight: 1.8,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[1] ? { url: videos[1].url, type: 'mp4', opacity: 0.08 } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'fade-in', delay: 0.2, duration: 0.9, easing: CINEMATIC_EASINGS.quintOut },
        [bodyId]: { type: 'fade-in', delay: 0.5, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
      }, { transition: 'fade-cross', transitionDuration: 0.5 }),
    });
  }

  // ─── Slide 3: Quote/Statement ───
  {
    const quoteId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(quoteId, '{{quote}}', 200, 320, 1520, 350, {
          fontSize: 48,
          fontWeight: '400',
          fontFamily: fontDisplay,
          color: colorWhite,
          textAlign: 'center',
          verticalAlign: 'center',
          lineHeight: 1.2,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[2] ? { url: videos[2].url, type: 'mp4', opacity: 0.1 } : undefined,
      animationConfig: slideAnimConfig({
        [quoteId]: { type: 'fade-in', delay: 0.3, duration: 1.5, easing: CINEMATIC_EASINGS.quintOut },
      }, { transition: 'fade-cross', transitionDuration: 0.6, overlays: { vignette: true, vignetteIntensity: 0.2, filmGrain: false, filmGrainOpacity: 0, scrim: 'radial', scrimOpacity: 0.3 } }),
    });
  }

  // ─── Slide 4: Stats ───
  {
    const stat1Id = genId();
    const stat1LabelId = genId();
    const stat2Id = genId();
    const stat2LabelId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(stat1Id, '{{stat1_value}}', 200, 340, 660, 130, {
          fontSize: 72,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorAccent,
          textAlign: 'center',
          lineHeight: 1,
          zIndex: 15,
        }),
        textElement(stat1LabelId, '{{stat1_label}}', 200, 480, 660, 40, {
          fontSize: 16,
          color: colorMuted,
          fontFamily: fontBody,
          textAlign: 'center',
          zIndex: 15,
        }),
        textElement(stat2Id, '{{stat2_value}}', 1060, 340, 660, 130, {
          fontSize: 72,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorAccent,
          textAlign: 'center',
          lineHeight: 1,
          zIndex: 15,
        }),
        textElement(stat2LabelId, '{{stat2_label}}', 1060, 480, 660, 40, {
          fontSize: 16,
          color: colorMuted,
          fontFamily: fontBody,
          textAlign: 'center',
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[3] ? { url: videos[3].url, type: 'mp4', opacity: 0.08 } : undefined,
      animationConfig: slideAnimConfig({
        [stat1Id]: { type: 'fade-in', delay: 0.3, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
        [stat1LabelId]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [stat2Id]: { type: 'fade-in', delay: 0.5, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
        [stat2LabelId]: { type: 'fade-in', delay: 0.7, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
      }, { transition: 'fade-cross', transitionDuration: 0.5 }),
    });
  }

  // ─── Slide 5: Closing ───
  {
    const titleId = genId();
    const contactId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{closing_title}}', 300, 370, 1320, 180, {
          fontSize: 64,
          fontWeight: '700',
          fontFamily: fontDisplay,
          color: colorWhite,
          textAlign: 'center',
          lineHeight: 1.1,
          zIndex: 15,
        }),
        textElement(contactId, '{{contact}}', 560, 580, 800, 40, {
          fontSize: 16,
          color: colorMuted,
          fontFamily: fontBody,
          textAlign: 'center',
          letterSpacing: 1,
          zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[4] ? { url: videos[4].url, type: 'mp4', opacity: 0.1 } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'fade-in', delay: 0.3, duration: 1.2, easing: CINEMATIC_EASINGS.quintOut },
        [contactId]: { type: 'fade-in', delay: 0.8, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
      }, { transition: 'fade-cross', transitionDuration: 0.6 }),
    });
  }

  return {
    name: 'Keynote Minimal',
    category: 'Speaking',
    description: 'Ultra-clean editorial style with serif typography and understated elegance.',
    presetId: 'editorial',
    slides,
  };
}

/** Get all available cinematic template builders */
export const CINEMATIC_TEMPLATE_BUILDERS = [
  { id: 'velorah', name: 'Velorah', builder: buildVelorahTemplate },
  { id: 'keynote-minimal', name: 'Keynote Minimal', builder: buildKeynoteMinimalTemplate },
] as const;
