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

// ============ Template: Nexus (SaaS/Tech Pitch) ============
// Dark purple, gradient headlines, liquid glass cards, Geist Sans + General Sans.
// Inspired by modern SaaS landing pages (linear.app, vercel.com style).

const NEXUS_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4';

export function buildNexusTemplate(): {
  name: string;
  category: string;
  description: string;
  presetId: string;
  slides: Slide[];
} {
  const fontHeading = 'General Sans';
  const fontBody = 'Geist Sans';
  const colorFg = '#F2F2F3';
  const colorSub = '#9CA0AE';
  const colorAccent = '#7C3AED';
  const colorGlass = 'rgba(255,255,255,0.04)';
  const colorBorder = 'rgba(255,255,255,0.08)';
  const bgColor = '#0a0512';
  const bg: SlideBackground = { type: 'solid', value: bgColor };
  const videos = getVideosForSlides('abstract-dark', 10);

  const nexusOverlays = (): SlideOverlays => ({
    vignette: true, vignetteIntensity: 0.4,
    filmGrain: true, filmGrainOpacity: 0.03,
    scrim: 'bottom', scrimOpacity: 0.55,
  });

  const slides: Slide[] = [];

  // ─── Slide 1: Hero — Giant single word + subtext + glass CTA ───
  {
    const wordId = genId();
    const subId = genId();
    const ctaBoxId = genId();
    const ctaTextId = genId();
    const dividerLineId = genId();
    const navLabelId = genId();

    slides.push({
      id: genId(),
      elements: [
        // Top nav label
        textElement(navLabelId, '{{brand_name}}', 80, 50, 300, 30, {
          fontSize: 16, fontWeight: '600', color: colorFg, fontFamily: fontBody, letterSpacing: 0.5, zIndex: 20,
        }),
        // Divider under nav
        shapeElement(dividerLineId, 0, 95, 1920, 1, { fill: colorBorder, zIndex: 5 }),
        // Giant headline word — centered
        textElement(wordId, '{{hero_word}}', 160, 260, 1600, 350, {
          fontSize: 200, fontWeight: '400', fontFamily: fontHeading, color: colorFg,
          textAlign: 'center', lineHeight: 1.0, letterSpacing: -5, zIndex: 15,
        }),
        // Subtext
        textElement(subId, '{{hero_subtitle}}', 560, 640, 800, 80, {
          fontSize: 18, color: colorSub, fontFamily: fontBody,
          textAlign: 'center', lineHeight: 1.7, zIndex: 15,
        }),
        // CTA glass pill
        shapeElement(ctaBoxId, 760, 760, 400, 60, {
          fill: colorGlass, borderRadius: 30, opacity: 0.9, zIndex: 14,
        }),
        textElement(ctaTextId, '{{hero_cta}}', 760, 770, 400, 40, {
          fontSize: 15, fontWeight: '500', color: colorFg, fontFamily: fontBody,
          textAlign: 'center', zIndex: 16,
        }),
      ],
      background: bg,
      videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.25, filter: 'brightness(0.4) saturate(0.8)' },
      animationConfig: slideAnimConfig({
        [navLabelId]: { type: 'fade-in', delay: 0.05, duration: 0.4, easing: CINEMATIC_EASINGS.smooth },
        [dividerLineId]: { type: 'fade-in', delay: 0.1, duration: 0.4, easing: CINEMATIC_EASINGS.smooth },
        [wordId]: { type: 'blur-in', delay: 0.2, duration: 1.2, easing: CINEMATIC_EASINGS.expoOut },
        [subId]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
        [ctaBoxId]: { type: 'scale-up', delay: 1.1, duration: 0.6, easing: CINEMATIC_EASINGS.backOut },
        [ctaTextId]: { type: 'fade-in', delay: 1.2, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
      }, { overlays: nexusOverlays() }),
    });
  }

  // ─── Slide 2: Problem/Statement — Big italic quote centered ───
  {
    const quoteId = genId();
    const accentDotId = genId();

    slides.push({
      id: genId(),
      elements: [
        // Accent dot
        shapeElement(accentDotId, 935, 280, 50, 50, {
          fill: colorAccent, borderRadius: 25, opacity: 0.3, zIndex: 5,
        }),
        // Statement text
        textElement(quoteId, '{{statement}}', 200, 340, 1520, 300, {
          fontSize: 48, fontWeight: '500', fontFamily: fontHeading, color: colorFg,
          textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[1] ? { url: videos[1].url, type: 'mp4', opacity: 0.2, filter: 'brightness(0.35) saturate(0.7)' } : undefined,
      animationConfig: slideAnimConfig({
        [accentDotId]: { type: 'scale-up', delay: 0.1, duration: 0.6, easing: CINEMATIC_EASINGS.backOut },
        [quoteId]: { type: 'word-by-word', delay: 0.2, duration: 0.5, easing: CINEMATIC_EASINGS.expoOut, stagger: 0.04 },
      }, { overlays: { ...nexusOverlays(), scrim: 'radial' } }),
    });
  }

  // ─── Slide 3: Content — Label + Title + Body + Glass card ───
  {
    const labelId = genId();
    const titleId = genId();
    const bodyId = genId();
    const glassCardId = genId();
    const cardTextId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(labelId, '{{label}}', 96, 140, 400, 25, {
          fontSize: 11, fontWeight: '600', color: colorAccent, fontFamily: fontBody,
          letterSpacing: 3, zIndex: 15,
        }),
        textElement(titleId, '{{title}}', 96, 200, 1100, 140, {
          fontSize: 48, fontWeight: '600', fontFamily: fontHeading, color: colorFg,
          lineHeight: 1.08, letterSpacing: -1.2, zIndex: 15,
        }),
        textElement(bodyId, '{{body}}', 96, 400, 820, 200, {
          fontSize: 17, color: colorSub, fontFamily: fontBody, lineHeight: 1.75, zIndex: 15,
        }),
        // Glass highlight card
        shapeElement(glassCardId, 1050, 200, 780, 400, {
          fill: colorGlass, borderRadius: 20, zIndex: 8,
        }),
        textElement(cardTextId, '{{card_highlight}}', 1090, 240, 700, 320, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, lineHeight: 1.7, zIndex: 12,
        }),
      ],
      background: bg,
      videoBackground: videos[2] ? { url: videos[2].url, type: 'mp4', opacity: 0.15, filter: 'brightness(0.35)' } : undefined,
      animationConfig: slideAnimConfig({
        [labelId]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [titleId]: { type: 'blur-in', delay: 0.2, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
        [bodyId]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
        [glassCardId]: { type: 'glass-reveal', delay: 0.3, duration: 0.7, easing: CINEMATIC_EASINGS.quintOut },
        [cardTextId]: { type: 'blur-in', delay: 0.7, duration: 0.7, easing: CINEMATIC_EASINGS.expoOut },
      }),
    });
  }

  // ─── Slide 4: Stats — 3 big numbers with glass dividers ───
  {
    const headerId = genId();
    const s1ValId = genId(); const s1LabId = genId();
    const s2ValId = genId(); const s2LabId = genId();
    const s3ValId = genId(); const s3LabId = genId();
    const div1Id = genId(); const div2Id = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(headerId, '{{stats_header}}', 96, 150, 600, 35, {
          fontSize: 12, fontWeight: '600', color: colorAccent, fontFamily: fontBody, letterSpacing: 3, zIndex: 15,
        }),
        // Stat 1
        textElement(s1ValId, '{{stat1_value}}', 96, 380, 500, 140, {
          fontSize: 88, fontWeight: '700', fontFamily: fontHeading, color: colorFg, lineHeight: 1, zIndex: 15,
        }),
        textElement(s1LabId, '{{stat1_label}}', 96, 530, 400, 40, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, zIndex: 15,
        }),
        shapeElement(div1Id, 620, 370, 1, 200, { fill: colorBorder, zIndex: 5 }),
        // Stat 2
        textElement(s2ValId, '{{stat2_value}}', 700, 380, 500, 140, {
          fontSize: 88, fontWeight: '700', fontFamily: fontHeading, color: colorFg, lineHeight: 1, zIndex: 15,
        }),
        textElement(s2LabId, '{{stat2_label}}', 700, 530, 400, 40, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, zIndex: 15,
        }),
        shapeElement(div2Id, 1220, 370, 1, 200, { fill: colorBorder, zIndex: 5 }),
        // Stat 3
        textElement(s3ValId, '{{stat3_value}}', 1300, 380, 500, 140, {
          fontSize: 88, fontWeight: '700', fontFamily: fontHeading, color: colorFg, lineHeight: 1, zIndex: 15,
        }),
        textElement(s3LabId, '{{stat3_label}}', 1300, 530, 400, 40, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[3] ? { url: videos[3].url, type: 'mp4', opacity: 0.15, filter: 'brightness(0.3)' } : undefined,
      animationConfig: slideAnimConfig({
        [headerId]: { type: 'blur-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [s1ValId]: { type: 'scale-up', delay: 0.25, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [s1LabId]: { type: 'blur-in', delay: 0.45, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [div1Id]: { type: 'fade-in', delay: 0.2, duration: 0.5, easing: CINEMATIC_EASINGS.smooth },
        [s2ValId]: { type: 'scale-up', delay: 0.4, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [s2LabId]: { type: 'blur-in', delay: 0.6, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [div2Id]: { type: 'fade-in', delay: 0.35, duration: 0.5, easing: CINEMATIC_EASINGS.smooth },
        [s3ValId]: { type: 'scale-up', delay: 0.55, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [s3LabId]: { type: 'blur-in', delay: 0.75, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
      }),
    });
  }

  // ─── Slide 5: Features — 3 glass cards grid ───
  {
    const titleId = genId();
    const card1Id = genId(); const c1TitleId = genId(); const c1DescId = genId();
    const card2Id = genId(); const c2TitleId = genId(); const c2DescId = genId();
    const card3Id = genId(); const c3TitleId = genId(); const c3DescId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{features_title}}', 96, 120, 800, 60, {
          fontSize: 12, fontWeight: '600', color: colorAccent, fontFamily: fontBody, letterSpacing: 3, zIndex: 15,
        }),
        // Card 1
        shapeElement(card1Id, 96, 240, 560, 360, { fill: colorGlass, borderRadius: 20, zIndex: 8 }),
        textElement(c1TitleId, '{{feat1_title}}', 136, 280, 480, 50, {
          fontSize: 22, fontWeight: '600', fontFamily: fontHeading, color: colorFg, zIndex: 12,
        }),
        textElement(c1DescId, '{{feat1_desc}}', 136, 345, 480, 200, {
          fontSize: 14, color: colorSub, fontFamily: fontBody, lineHeight: 1.7, zIndex: 12,
        }),
        // Card 2
        shapeElement(card2Id, 680, 240, 560, 360, { fill: colorGlass, borderRadius: 20, zIndex: 8 }),
        textElement(c2TitleId, '{{feat2_title}}', 720, 280, 480, 50, {
          fontSize: 22, fontWeight: '600', fontFamily: fontHeading, color: colorFg, zIndex: 12,
        }),
        textElement(c2DescId, '{{feat2_desc}}', 720, 345, 480, 200, {
          fontSize: 14, color: colorSub, fontFamily: fontBody, lineHeight: 1.7, zIndex: 12,
        }),
        // Card 3
        shapeElement(card3Id, 1264, 240, 560, 360, { fill: colorGlass, borderRadius: 20, zIndex: 8 }),
        textElement(c3TitleId, '{{feat3_title}}', 1304, 280, 480, 50, {
          fontSize: 22, fontWeight: '600', fontFamily: fontHeading, color: colorFg, zIndex: 12,
        }),
        textElement(c3DescId, '{{feat3_desc}}', 1304, 345, 480, 200, {
          fontSize: 14, color: colorSub, fontFamily: fontBody, lineHeight: 1.7, zIndex: 12,
        }),
      ],
      background: bg,
      videoBackground: videos[4] ? { url: videos[4].url, type: 'mp4', opacity: 0.12, filter: 'brightness(0.3)' } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'blur-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [card1Id]: { type: 'glass-reveal', delay: 0.2, duration: 0.7, easing: CINEMATIC_EASINGS.quintOut },
        [c1TitleId]: { type: 'blur-in', delay: 0.35, duration: 0.6, easing: CINEMATIC_EASINGS.expoOut },
        [c1DescId]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [card2Id]: { type: 'glass-reveal', delay: 0.35, duration: 0.7, easing: CINEMATIC_EASINGS.quintOut },
        [c2TitleId]: { type: 'blur-in', delay: 0.5, duration: 0.6, easing: CINEMATIC_EASINGS.expoOut },
        [c2DescId]: { type: 'fade-in', delay: 0.65, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [card3Id]: { type: 'glass-reveal', delay: 0.5, duration: 0.7, easing: CINEMATIC_EASINGS.quintOut },
        [c3TitleId]: { type: 'blur-in', delay: 0.65, duration: 0.6, easing: CINEMATIC_EASINGS.expoOut },
        [c3DescId]: { type: 'fade-in', delay: 0.8, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
      }),
    });
  }

  // ─── Slide 6: Split — Image left, text right ───
  {
    const imgId = genId();
    const titleId = genId();
    const bodyId = genId();
    const glassAccentId = genId();

    slides.push({
      id: genId(),
      elements: [
        { id: imgId, type: 'image' as const, content: '{{image}}',
          x: 60, y: 60, width: 880, height: 960, rotation: 0, opacity: 1,
          locked: false, visible: true, zIndex: 8, style: { objectFit: 'cover' as const, borderRadius: 24 } },
        // Accent glass line
        shapeElement(glassAccentId, 1000, 260, 4, 500, { fill: colorAccent, opacity: 0.25, zIndex: 5 }),
        textElement(titleId, '{{title}}', 1060, 280, 780, 160, {
          fontSize: 42, fontWeight: '600', fontFamily: fontHeading, color: colorFg,
          lineHeight: 1.1, letterSpacing: -1, zIndex: 15,
        }),
        textElement(bodyId, '{{body}}', 1060, 480, 760, 280, {
          fontSize: 16, color: colorSub, fontFamily: fontBody, lineHeight: 1.75, zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[5] ? { url: videos[5].url, type: 'mp4', opacity: 0.1, filter: 'brightness(0.25)' } : undefined,
      animationConfig: slideAnimConfig({
        [imgId]: { type: 'scale-up', delay: 0.2, duration: 0.9, easing: CINEMATIC_EASINGS.quintOut },
        [glassAccentId]: { type: 'slide-up', delay: 0.15, duration: 0.7, easing: CINEMATIC_EASINGS.expoOut },
        [titleId]: { type: 'blur-in', delay: 0.3, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
        [bodyId]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
      }),
    });
  }

  // ─── Slide 7: Social Proof / Brands ───
  {
    const titleId = genId();
    const subId = genId();
    const brand1Id = genId(); const brand2Id = genId(); const brand3Id = genId();
    const brand4Id = genId(); const brand5Id = genId(); const brand6Id = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{social_proof_title}}', 200, 300, 1520, 60, {
          fontSize: 13, fontWeight: '600', color: colorSub, fontFamily: fontBody,
          textAlign: 'center', letterSpacing: 3, zIndex: 15,
        }),
        textElement(subId, '{{social_proof_subtitle}}', 400, 370, 1120, 50, {
          fontSize: 36, fontWeight: '600', fontFamily: fontHeading, color: colorFg,
          textAlign: 'center', lineHeight: 1.15, zIndex: 15,
        }),
        // Brand logos as glass pills — row centered
        shapeElement(brand1Id, 210, 520, 200, 60, { fill: colorGlass, borderRadius: 12, zIndex: 8 }),
        shapeElement(brand2Id, 450, 520, 200, 60, { fill: colorGlass, borderRadius: 12, zIndex: 8 }),
        shapeElement(brand3Id, 690, 520, 200, 60, { fill: colorGlass, borderRadius: 12, zIndex: 8 }),
        shapeElement(brand4Id, 930, 520, 200, 60, { fill: colorGlass, borderRadius: 12, zIndex: 8 }),
        shapeElement(brand5Id, 1170, 520, 200, 60, { fill: colorGlass, borderRadius: 12, zIndex: 8 }),
        shapeElement(brand6Id, 1410, 520, 200, 60, { fill: colorGlass, borderRadius: 12, zIndex: 8 }),
      ],
      background: bg,
      videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.18, filter: 'brightness(0.35) saturate(0.7)' },
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [subId]: { type: 'blur-in', delay: 0.3, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
        [brand1Id]: { type: 'scale-up', delay: 0.5, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [brand2Id]: { type: 'scale-up', delay: 0.6, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [brand3Id]: { type: 'scale-up', delay: 0.7, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [brand4Id]: { type: 'scale-up', delay: 0.8, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [brand5Id]: { type: 'scale-up', delay: 0.9, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [brand6Id]: { type: 'scale-up', delay: 1.0, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
      }, { overlays: { ...nexusOverlays(), scrim: 'radial' } }),
    });
  }

  // ─── Slide 8: Closing CTA ───
  {
    const titleId = genId();
    const subId = genId();
    const ctaBoxId = genId();
    const ctaTextId = genId();
    const glowId = genId();

    slides.push({
      id: genId(),
      elements: [
        // Purple glow behind title
        shapeElement(glowId, 660, 280, 600, 200, {
          fill: colorAccent, borderRadius: 300, opacity: 0.12, zIndex: 3,
        }),
        textElement(titleId, '{{closing_title}}', 260, 320, 1400, 200, {
          fontSize: 72, fontWeight: '600', fontFamily: fontHeading, color: colorFg,
          textAlign: 'center', lineHeight: 1.05, letterSpacing: -2, zIndex: 15,
        }),
        textElement(subId, '{{closing_subtitle}}', 510, 540, 900, 60, {
          fontSize: 17, color: colorSub, fontFamily: fontBody,
          textAlign: 'center', lineHeight: 1.6, zIndex: 15,
        }),
        shapeElement(ctaBoxId, 760, 650, 400, 60, {
          fill: colorAccent, borderRadius: 30, opacity: 0.9, zIndex: 14,
        }),
        textElement(ctaTextId, '{{closing_cta}}', 760, 660, 400, 40, {
          fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: fontBody,
          textAlign: 'center', zIndex: 16,
        }),
      ],
      background: bg,
      videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.25, filter: 'brightness(0.35)' },
      animationConfig: slideAnimConfig({
        [glowId]: { type: 'fade-in', delay: 0.1, duration: 1.0, easing: CINEMATIC_EASINGS.smooth },
        [titleId]: { type: 'blur-in', delay: 0.2, duration: 1.2, easing: CINEMATIC_EASINGS.quintOut },
        [subId]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
        [ctaBoxId]: { type: 'scale-up', delay: 1.1, duration: 0.6, easing: CINEMATIC_EASINGS.backOut },
        [ctaTextId]: { type: 'fade-in', delay: 1.2, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
      }, { overlays: { ...nexusOverlays(), scrim: 'radial' } }),
    });
  }

  return {
    name: 'Nexus',
    category: 'SaaS / Tech',
    description: 'Dark purple SaaS style with gradient headlines, liquid glass cards, and bold typography.',
    presetId: 'nexus',
    slides,
  };
}

// ============ Template: Prysma (Product Growth / Data-Driven) ============
// Same dark purple palette but optimized for data-heavy presentations.
// More glass cards, metric-focused layouts, testimonial slide.

export function buildPrysmaTemplate(): {
  name: string;
  category: string;
  description: string;
  presetId: string;
  slides: Slide[];
} {
  const fontHeading = 'General Sans';
  const fontBody = 'Geist Sans';
  const colorFg = '#F2F2F3';
  const colorSub = '#9CA0AE';
  const colorAccent = '#7C3AED';
  const colorGlass = 'rgba(255,255,255,0.04)';
  const colorBorder = 'rgba(255,255,255,0.08)';
  const bg: SlideBackground = { type: 'solid', value: '#0a0512' };
  const videos = getVideosForSlides('abstract-dark', 10);

  const prysmaOverlays = (): SlideOverlays => ({
    vignette: true, vignetteIntensity: 0.35,
    filmGrain: true, filmGrainOpacity: 0.03,
    scrim: 'bottom', scrimOpacity: 0.5,
  });

  const slides: Slide[] = [];

  // ─── Slide 1: Hero — Headline + subtitle, bottom-aligned ───
  {
    const titleId = genId();
    const subId = genId();
    const lineId = genId();
    const tagId = genId();

    slides.push({
      id: genId(),
      elements: [
        // Tag pill at top
        shapeElement(tagId, 80, 50, 140, 32, { fill: colorAccent, borderRadius: 16, opacity: 0.7, zIndex: 14 }),
        textElement(genId(), '{{tag}}', 80, 55, 140, 22, {
          fontSize: 10, fontWeight: '600', color: '#FFFFFF', fontFamily: fontBody,
          textAlign: 'center', letterSpacing: 1.5, zIndex: 16,
        }),
        shapeElement(lineId, 0, 100, 1920, 1, { fill: colorBorder, zIndex: 5 }),
        textElement(titleId, '{{title}}', 96, 550, 1200, 220, {
          fontSize: 72, fontWeight: '600', fontFamily: fontHeading, color: colorFg,
          lineHeight: 1.05, letterSpacing: -2, zIndex: 15,
        }),
        textElement(subId, '{{subtitle}}', 96, 800, 700, 70, {
          fontSize: 17, color: colorSub, fontFamily: fontBody, lineHeight: 1.7, zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.2, filter: 'brightness(0.35) saturate(0.8)' },
      animationConfig: slideAnimConfig({
        [tagId]: { type: 'scale-up', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [lineId]: { type: 'fade-in', delay: 0.15, duration: 0.4, easing: CINEMATIC_EASINGS.smooth },
        [titleId]: { type: 'clip-reveal', delay: 0.3, duration: 0.9, easing: CINEMATIC_EASINGS.cinematic },
        [subId]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
      }, { overlays: prysmaOverlays() }),
    });
  }

  // ─── Slide 2: Key Metrics Dashboard — 4 glass cards in a 2×2 grid ───
  {
    const headerId = genId();
    const c1Id = genId(); const c1ValId = genId(); const c1LabId = genId();
    const c2Id = genId(); const c2ValId = genId(); const c2LabId = genId();
    const c3Id = genId(); const c3ValId = genId(); const c3LabId = genId();
    const c4Id = genId(); const c4ValId = genId(); const c4LabId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(headerId, '{{metrics_header}}', 96, 100, 600, 35, {
          fontSize: 12, fontWeight: '600', color: colorAccent, fontFamily: fontBody, letterSpacing: 3, zIndex: 15,
        }),
        // Row 1
        shapeElement(c1Id, 96, 200, 860, 340, { fill: colorGlass, borderRadius: 20, zIndex: 8 }),
        textElement(c1ValId, '{{m1_value}}', 140, 250, 770, 120, {
          fontSize: 72, fontWeight: '700', fontFamily: fontHeading, color: colorFg, lineHeight: 1, zIndex: 12,
        }),
        textElement(c1LabId, '{{m1_label}}', 140, 390, 770, 40, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, zIndex: 12,
        }),
        shapeElement(c2Id, 980, 200, 860, 340, { fill: colorGlass, borderRadius: 20, zIndex: 8 }),
        textElement(c2ValId, '{{m2_value}}', 1024, 250, 770, 120, {
          fontSize: 72, fontWeight: '700', fontFamily: fontHeading, color: colorFg, lineHeight: 1, zIndex: 12,
        }),
        textElement(c2LabId, '{{m2_label}}', 1024, 390, 770, 40, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, zIndex: 12,
        }),
        // Row 2
        shapeElement(c3Id, 96, 564, 860, 340, { fill: colorGlass, borderRadius: 20, zIndex: 8 }),
        textElement(c3ValId, '{{m3_value}}', 140, 614, 770, 120, {
          fontSize: 72, fontWeight: '700', fontFamily: fontHeading, color: colorFg, lineHeight: 1, zIndex: 12,
        }),
        textElement(c3LabId, '{{m3_label}}', 140, 754, 770, 40, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, zIndex: 12,
        }),
        shapeElement(c4Id, 980, 564, 860, 340, { fill: colorGlass, borderRadius: 20, zIndex: 8 }),
        textElement(c4ValId, '{{m4_value}}', 1024, 614, 770, 120, {
          fontSize: 72, fontWeight: '700', fontFamily: fontHeading, color: colorFg, lineHeight: 1, zIndex: 12,
        }),
        textElement(c4LabId, '{{m4_label}}', 1024, 754, 770, 40, {
          fontSize: 15, color: colorSub, fontFamily: fontBody, zIndex: 12,
        }),
      ],
      background: bg,
      videoBackground: videos[1] ? { url: videos[1].url, type: 'mp4', opacity: 0.1, filter: 'brightness(0.25)' } : undefined,
      animationConfig: slideAnimConfig({
        [headerId]: { type: 'blur-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [c1Id]: { type: 'glass-reveal', delay: 0.2, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [c1ValId]: { type: 'scale-up', delay: 0.35, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [c1LabId]: { type: 'fade-in', delay: 0.5, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [c2Id]: { type: 'glass-reveal', delay: 0.3, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [c2ValId]: { type: 'scale-up', delay: 0.45, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [c2LabId]: { type: 'fade-in', delay: 0.6, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [c3Id]: { type: 'glass-reveal', delay: 0.4, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [c3ValId]: { type: 'scale-up', delay: 0.55, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [c3LabId]: { type: 'fade-in', delay: 0.7, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [c4Id]: { type: 'glass-reveal', delay: 0.5, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [c4ValId]: { type: 'scale-up', delay: 0.65, duration: 0.7, easing: CINEMATIC_EASINGS.backOut },
        [c4LabId]: { type: 'fade-in', delay: 0.8, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
      }),
    });
  }

  // ─── Slide 3: Content — Problem/Solution ───
  {
    const labelId = genId();
    const titleId = genId();
    const bodyId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(labelId, '{{label}}', 96, 160, 400, 25, {
          fontSize: 11, fontWeight: '600', color: colorAccent, fontFamily: fontBody, letterSpacing: 3, zIndex: 15,
        }),
        textElement(titleId, '{{title}}', 96, 230, 1100, 140, {
          fontSize: 48, fontWeight: '600', fontFamily: fontHeading, color: colorFg,
          lineHeight: 1.08, letterSpacing: -1.2, zIndex: 15,
        }),
        textElement(bodyId, '{{body}}', 96, 430, 900, 300, {
          fontSize: 17, color: colorSub, fontFamily: fontBody, lineHeight: 1.8, zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[2] ? { url: videos[2].url, type: 'mp4', opacity: 0.15, filter: 'brightness(0.35)' } : undefined,
      animationConfig: slideAnimConfig({
        [labelId]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [titleId]: { type: 'blur-in', delay: 0.2, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
        [bodyId]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: CINEMATIC_EASINGS.expoOut },
      }),
    });
  }

  // ─── Slide 4: Testimonial — Big quote in glass card ───
  {
    const glassId = genId();
    const quoteId = genId();
    const authorId = genId();
    const roleId = genId();
    const quoteMarkId = genId();

    slides.push({
      id: genId(),
      elements: [
        shapeElement(glassId, 260, 200, 1400, 580, { fill: colorGlass, borderRadius: 32, zIndex: 8 }),
        // Quote mark
        textElement(quoteMarkId, '"', 320, 230, 100, 120, {
          fontSize: 120, fontWeight: '400', fontFamily: fontHeading, color: colorAccent,
          opacity: 0.3, zIndex: 12,
        }),
        textElement(quoteId, '{{testimonial_quote}}', 340, 340, 1240, 220, {
          fontSize: 32, fontWeight: '500', fontFamily: fontHeading, color: colorFg,
          textAlign: 'center', lineHeight: 1.35, zIndex: 12,
        }),
        textElement(authorId, '{{testimonial_author}}', 660, 600, 600, 30, {
          fontSize: 16, fontWeight: '600', color: colorFg, fontFamily: fontBody,
          textAlign: 'center', zIndex: 12,
        }),
        textElement(roleId, '{{testimonial_role}}', 660, 635, 600, 25, {
          fontSize: 13, color: colorSub, fontFamily: fontBody,
          textAlign: 'center', zIndex: 12,
        }),
      ],
      background: bg,
      videoBackground: videos[3] ? { url: videos[3].url, type: 'mp4', opacity: 0.15, filter: 'brightness(0.3)' } : undefined,
      animationConfig: slideAnimConfig({
        [glassId]: { type: 'glass-reveal', delay: 0.15, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
        [quoteMarkId]: { type: 'scale-up', delay: 0.2, duration: 0.6, easing: CINEMATIC_EASINGS.backOut },
        [quoteId]: { type: 'blur-in', delay: 0.35, duration: 0.9, easing: CINEMATIC_EASINGS.expoOut },
        [authorId]: { type: 'blur-in', delay: 0.8, duration: 0.6, easing: CINEMATIC_EASINGS.quintOut },
        [roleId]: { type: 'fade-in', delay: 0.95, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
      }, { overlays: { ...prysmaOverlays(), scrim: 'radial' } }),
    });
  }

  // ─── Slide 5: Timeline / Process — 4 steps horizontal ───
  {
    const titleId = genId();
    const s1NumId = genId(); const s1TxtId = genId();
    const s2NumId = genId(); const s2TxtId = genId();
    const s3NumId = genId(); const s3TxtId = genId();
    const s4NumId = genId(); const s4TxtId = genId();
    const lineId = genId();

    slides.push({
      id: genId(),
      elements: [
        textElement(titleId, '{{process_title}}', 96, 140, 800, 50, {
          fontSize: 12, fontWeight: '600', color: colorAccent, fontFamily: fontBody, letterSpacing: 3, zIndex: 15,
        }),
        // Horizontal line connecting steps
        shapeElement(lineId, 96, 440, 1728, 2, { fill: colorBorder, zIndex: 5 }),
        // Step 1
        textElement(s1NumId, '01', 140, 370, 60, 40, {
          fontSize: 28, fontWeight: '700', fontFamily: fontHeading, color: colorAccent, zIndex: 15,
        }),
        textElement(s1TxtId, '{{step1}}', 96, 480, 380, 120, {
          fontSize: 16, color: colorSub, fontFamily: fontBody, lineHeight: 1.6, zIndex: 15,
        }),
        // Step 2
        textElement(s2NumId, '02', 596, 370, 60, 40, {
          fontSize: 28, fontWeight: '700', fontFamily: fontHeading, color: colorAccent, zIndex: 15,
        }),
        textElement(s2TxtId, '{{step2}}', 556, 480, 380, 120, {
          fontSize: 16, color: colorSub, fontFamily: fontBody, lineHeight: 1.6, zIndex: 15,
        }),
        // Step 3
        textElement(s3NumId, '03', 1056, 370, 60, 40, {
          fontSize: 28, fontWeight: '700', fontFamily: fontHeading, color: colorAccent, zIndex: 15,
        }),
        textElement(s3TxtId, '{{step3}}', 1016, 480, 380, 120, {
          fontSize: 16, color: colorSub, fontFamily: fontBody, lineHeight: 1.6, zIndex: 15,
        }),
        // Step 4
        textElement(s4NumId, '04', 1516, 370, 60, 40, {
          fontSize: 28, fontWeight: '700', fontFamily: fontHeading, color: colorAccent, zIndex: 15,
        }),
        textElement(s4TxtId, '{{step4}}', 1476, 480, 380, 120, {
          fontSize: 16, color: colorSub, fontFamily: fontBody, lineHeight: 1.6, zIndex: 15,
        }),
      ],
      background: bg,
      videoBackground: videos[4] ? { url: videos[4].url, type: 'mp4', opacity: 0.1, filter: 'brightness(0.25)' } : undefined,
      animationConfig: slideAnimConfig({
        [titleId]: { type: 'blur-in', delay: 0.1, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
        [lineId]: { type: 'fade-in', delay: 0.15, duration: 0.6, easing: CINEMATIC_EASINGS.smooth },
        [s1NumId]: { type: 'scale-up', delay: 0.25, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [s1TxtId]: { type: 'blur-in', delay: 0.4, duration: 0.6, easing: CINEMATIC_EASINGS.expoOut },
        [s2NumId]: { type: 'scale-up', delay: 0.4, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [s2TxtId]: { type: 'blur-in', delay: 0.55, duration: 0.6, easing: CINEMATIC_EASINGS.expoOut },
        [s3NumId]: { type: 'scale-up', delay: 0.55, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [s3TxtId]: { type: 'blur-in', delay: 0.7, duration: 0.6, easing: CINEMATIC_EASINGS.expoOut },
        [s4NumId]: { type: 'scale-up', delay: 0.7, duration: 0.5, easing: CINEMATIC_EASINGS.backOut },
        [s4TxtId]: { type: 'blur-in', delay: 0.85, duration: 0.6, easing: CINEMATIC_EASINGS.expoOut },
      }),
    });
  }

  // ─── Slide 6: Closing CTA ───
  {
    const titleId = genId();
    const subId = genId();
    const ctaId = genId();
    const ctaTextId = genId();
    const glowId = genId();

    slides.push({
      id: genId(),
      elements: [
        shapeElement(glowId, 660, 300, 600, 180, {
          fill: colorAccent, borderRadius: 300, opacity: 0.1, zIndex: 3,
        }),
        textElement(titleId, '{{closing_title}}', 260, 340, 1400, 180, {
          fontSize: 64, fontWeight: '600', fontFamily: fontHeading, color: colorFg,
          textAlign: 'center', lineHeight: 1.08, letterSpacing: -1.5, zIndex: 15,
        }),
        textElement(subId, '{{closing_subtitle}}', 460, 550, 1000, 50, {
          fontSize: 17, color: colorSub, fontFamily: fontBody,
          textAlign: 'center', lineHeight: 1.6, zIndex: 15,
        }),
        shapeElement(ctaId, 760, 650, 400, 60, {
          fill: colorAccent, borderRadius: 30, opacity: 0.9, zIndex: 14,
        }),
        textElement(ctaTextId, '{{closing_cta}}', 760, 660, 400, 40, {
          fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: fontBody,
          textAlign: 'center', zIndex: 16,
        }),
      ],
      background: bg,
      videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.22, filter: 'brightness(0.35)' },
      animationConfig: slideAnimConfig({
        [glowId]: { type: 'fade-in', delay: 0.1, duration: 1.0, easing: CINEMATIC_EASINGS.smooth },
        [titleId]: { type: 'blur-in', delay: 0.2, duration: 1.0, easing: CINEMATIC_EASINGS.quintOut },
        [subId]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: CINEMATIC_EASINGS.quintOut },
        [ctaId]: { type: 'scale-up', delay: 1.0, duration: 0.6, easing: CINEMATIC_EASINGS.backOut },
        [ctaTextId]: { type: 'fade-in', delay: 1.1, duration: 0.5, easing: CINEMATIC_EASINGS.quintOut },
      }, { overlays: { ...prysmaOverlays(), scrim: 'radial' } }),
    });
  }

  return {
    name: 'Prysma',
    category: 'Growth / Data',
    description: 'Data-driven dark purple theme with dashboard-style metrics, glass cards, and testimonial layouts.',
    presetId: 'nexus',
    slides,
  };
}

/** Get all available cinematic template builders */
export const CINEMATIC_TEMPLATE_BUILDERS = [
  { id: 'velorah', name: 'Velorah', builder: buildVelorahTemplate },
  { id: 'keynote-minimal', name: 'Keynote Minimal', builder: buildKeynoteMinimalTemplate },
  { id: 'nexus', name: 'Nexus', builder: buildNexusTemplate },
  { id: 'prysma', name: 'Prysma', builder: buildPrysmaTemplate },
] as const;
