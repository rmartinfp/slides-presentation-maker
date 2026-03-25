#!/usr/bin/env npx tsx
/**
 * Seed cinematic templates into Supabase.
 *
 * Builds all templates from cinematic-template-builder.ts,
 * creates PresentationTheme objects from presets, and inserts into DB.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-cinematic-templates.ts
 */

import { createClient } from '@supabase/supabase-js';

// ── Inline imports (can't use @/ aliases in scripts) ──

// We need to duplicate the builder logic here since scripts can't use Vite aliases.
// Instead, we'll import dynamically with tsx.

const SUPABASE_URL = 'https://okzaoakyasaohohktntd.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Template definitions (inline to avoid Vite alias issues) ──

interface SlideElement {
  id: string;
  type: string;
  content: string;
  x: number; y: number; width: number; height: number;
  rotation: number; opacity: number;
  locked: boolean; visible: boolean;
  zIndex: number;
  style: Record<string, any>;
}

interface Slide {
  id: string;
  elements: SlideElement[];
  background: { type: string; value: string };
  videoBackground?: { url: string; type: string; opacity: number; filter?: string; transform?: string };
  animationConfig?: Record<string, any>;
}

let _idC = 0;
function gid(): string { return `ct-${Date.now().toString(36)}-${(++_idC).toString(36)}`; }

function txt(id: string, content: string, x: number, y: number, w: number, h: number, opts: any = {}): SlideElement {
  return {
    id, type: 'text', content, x, y, width: w, height: h,
    rotation: 0, opacity: opts.opacity ?? 1, locked: false, visible: true,
    zIndex: opts.zIndex ?? 10,
    style: {
      fontSize: opts.fontSize ?? 24, fontWeight: opts.fontWeight ?? '400',
      color: opts.color ?? '#F0F0F0', fontFamily: opts.fontFamily,
      textAlign: opts.textAlign ?? 'left', verticalAlign: opts.verticalAlign ?? 'top',
      lineHeight: opts.lineHeight ?? 1.2, letterSpacing: opts.letterSpacing,
      textShadow: opts.textShadow, textGradient: opts.textGradient,
      glowColor: opts.glowColor, glowSize: opts.glowSize,
    },
  };
}

function shp(id: string, x: number, y: number, w: number, h: number, opts: any = {}): SlideElement {
  return {
    id, type: 'shape', content: '', x, y, width: w, height: h,
    rotation: 0, opacity: opts.opacity ?? 1, locked: false, visible: true,
    zIndex: opts.zIndex ?? 5,
    style: {
      shapeType: 'rectangle',
      shapeFill: opts.fill ?? 'rgba(255,255,255,0.06)',
      borderRadius: opts.borderRadius ?? 0,
      glassmorphism: opts.glass ?? false,
      glassBlur: opts.glassBlur,
      glassOpacity: opts.glassOpacity,
      glassBorder: opts.glassBorder,
      boxShadow: opts.boxShadow,
    },
  };
}

// Easing curves
const E = {
  expoOut: [0.16, 1, 0.3, 1],
  cinematic: [0.77, 0, 0.175, 1],
  quintOut: [0.22, 1, 0.36, 1],
  backOut: [0.34, 1.3, 0.64, 1],
  smooth: [0.25, 0.1, 0.25, 1],
};

function animCfg(overrides: Record<string, any> = {}, opts: any = {}): Record<string, any> {
  return {
    transition: opts.transition ?? 'fade-through-black',
    transitionDuration: opts.transitionDuration ?? 0.4,
    overlays: opts.overlays ?? { vignette: true, vignetteIntensity: 0.4, filmGrain: true, filmGrainOpacity: 0.03, scrim: 'bottom', scrimOpacity: 0.55 },
    defaultTextAnimation: { type: 'blur-in', delay: 0.3, duration: 0.8, easing: E.expoOut },
    defaultImageAnimation: { type: 'fade-in', delay: 0.5, duration: 0.8, easing: E.quintOut },
    defaultShapeAnimation: { type: 'fade-in', delay: 0.2, duration: 0.6, easing: E.expoOut },
    elementOverrides: overrides,
  };
}

const NEXUS_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4';
const ABSTRACT_VIDEOS = [
  'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4',
  'https://videos.pexels.com/video-files/6981411/6981411-uhd_2560_1440_25fps.mp4',
  'https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4',
  'https://videos.pexels.com/video-files/4625518/4625518-uhd_2560_1440_30fps.mp4',
];
const MINIMAL_VIDEOS = [
  'https://videos.pexels.com/video-files/5377700/5377700-uhd_2560_1440_25fps.mp4',
  'https://videos.pexels.com/video-files/4812197/4812197-uhd_2560_1440_25fps.mp4',
  'https://videos.pexels.com/video-files/4625502/4625502-uhd_2560_1440_30fps.mp4',
];

// ════════════════════════════════════════════════════════════
// QUALITY STANDARD: Every slide = video (80-100%) + text only.
// NO glass cards, NO accent shapes, NO decorative elements.
// Structure: logo(top-left) + number(top-right) + divider + label + heading + body
// ════════════════════════════════════════════════════════════

/** Standard slide skeleton: logo + number + divider — shared by all slides */
function skeleton(slideNum: string, font: string): SlideElement[] {
  return [
    txt(gid(), '{{logo}}', 96, 38, 200, 28, { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: font, letterSpacing: 1, zIndex: 20, textShadow: 'none' }),
    txt(gid(), slideNum, 1790, 38, 40, 28, { fontSize: 16, color: '#80838e', fontFamily: font, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
    shp(gid(), 96, 82, 1728, 1, { fill: 'rgba(255,255,255,0.15)', zIndex: 5 }),
  ];
}

/** Standard animation config for cinematic slides */
function cineAnim(overrides: Record<string, any> = {}, opts: any = {}): Record<string, any> {
  return animCfg(overrides, {
    transition: 'fade-through-black',
    transitionDuration: 0.35,
    overlays: { vignette: true, vignetteIntensity: 0.25, filmGrain: true, filmGrainOpacity: 0.025, scrim: 'bottom' as const, scrimOpacity: 0.35 },
    ...opts,
  });
}

// ════════════════════════════════════════════
// TEMPLATE: NEXUS (SaaS Pitch — 5 slides)
// ════════════════════════════════════════════

function buildNexus(): Slide[] {
  const f = 'Inter';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const slides: Slide[] = [];

  // ─── S1: TITLE — Massive heading bottom-left, metadata top-right, full video ───
  {
    const tl1 = gid(), tl2 = gid(), ml = gid(), mv = gid(), ml2 = gid(), mv2 = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('', f),
      // Metadata row (top-right, small gray labels + white values)
      txt(ml, '{{meta_label_1}}', 1100, 36, 140, 16, { fontSize: 10, color: sub, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(mv, '{{meta_value_1}}', 1100, 52, 180, 16, { fontSize: 10, fontWeight: '500', color: fg, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(ml2, '{{meta_label_2}}', 1340, 36, 140, 16, { fontSize: 10, color: sub, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(mv2, '{{meta_value_2}}', 1340, 52, 180, 16, { fontSize: 10, fontWeight: '500', color: fg, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      // Title — MASSIVE, bottom-left, 2 lines
      txt(tl1, '{{title_line1}}', 96, 700, 1500, 160, {
        fontSize: 110, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 0.92, letterSpacing: -2, zIndex: 15,
      }),
      txt(tl2, '{{title_line2}}', 96, 860, 1500, 140, {
        fontSize: 110, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 0.92, letterSpacing: -2, zIndex: 15,
      }),
    ], background: bg,
    videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.9, filter: 'brightness(0.7)' },
    animationConfig: cineAnim({
      [tl1]: { type: 'slide-up', delay: 0.3, duration: 0.7, easing: E.expoOut },
      [tl2]: { type: 'slide-up', delay: 0.4, duration: 0.7, easing: E.expoOut },
      [ml]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
      [mv]: { type: 'blur-in', delay: 0.12, duration: 0.6, easing: E.expoOut },
    }) });
  }

  // ─── S2: PROBLEM + STATS — Heading upper, 3 massive stat columns bottom ───
  {
    const lab = gid(), head = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('02', f),
      txt(lab, '{{problem_label}}', 96, 120, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{problem_statement}}', 96, 170, 1600, 300, {
        fontSize: 46, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15,
      }),
      // 3 stat columns — massive numbers
      txt(s1v, '{{stat1_value}}', 96, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 96, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 700, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 700, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{stat3_value}}', 1300, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s3l, '{{stat3_label}}', 1300, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[1], type: 'mp4', opacity: 0.85, filter: 'brightness(0.65)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [s1v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut },
      [s1l]: { type: 'fade-in', delay: 0.7, duration: 0.5, easing: E.quintOut },
      [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut },
      [s2l]: { type: 'fade-in', delay: 0.8, duration: 0.5, easing: E.quintOut },
      [s3v]: { type: 'slide-up', delay: 0.8, duration: 0.6, easing: E.expoOut },
      [s3l]: { type: 'fade-in', delay: 0.9, duration: 0.5, easing: E.quintOut },
    }) });
  }

  // ─── S3: CONTENT — Label + heading left, body below, video half-opacity ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('03', f),
      txt(lab, '{{content_label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{content_heading}}', 96, 310, 1200, 320, {
        fontSize: 48, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15,
      }),
      txt(body, '{{content_body}}', 96, 680, 760, 200, {
        fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.7, filter: 'brightness(0.55) saturate(0.9)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut },
    }) });
  }

  // ─── S4: CENTERED HEADING — Big text vertically centered, body below ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('04', f),
      txt(lab, '{{centered_label}}', 96, 290, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{centered_heading}}', 96, 330, 1200, 360, {
        fontSize: 58, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.04, letterSpacing: -1, zIndex: 15,
      }),
      txt(body, '{{centered_body}}', 96, 740, 780, 160, {
        fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[3], type: 'mp4', opacity: 0.8, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 1.0, duration: 0.8, easing: E.expoOut },
    }) });
  }

  // ─── S5: CLOSING — Label + heading bottom-left, video prominent ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('05', f),
      txt(lab, '{{closing_label}}', 96, 660, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{closing_heading}}', 96, 700, 1100, 240, {
        fontSize: 58, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.04, letterSpacing: -1, zIndex: 15,
      }),
      txt(body, '{{closing_body}}', 96, 940, 680, 80, {
        fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: { type: 'solid', value: '#0a0a12' },
    videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.85, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut },
    }) });
  }

  return slides;
}

// ════════════════════════════════════════════
// TEMPLATE: PRYSMA (Growth/Data — 5 slides)
// Different layouts: centered heading, two-column stats, right-aligned
// ════════════════════════════════════════════

function buildPrysma(): Slide[] {
  const f = 'Inter';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const slides: Slide[] = [];

  // ─── S1: CENTERED TITLE — Single powerful line, centered on video ───
  {
    const head = gid(), sub2 = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('', f),
      txt(head, '{{title}}', 96, 400, 1728, 220, {
        fontSize: 88, fontWeight: '400', fontFamily: f, color: fg,
        textAlign: 'center', lineHeight: 1.0, letterSpacing: -2, zIndex: 15,
      }),
      txt(sub2, '{{subtitle}}', 560, 640, 800, 50, {
        fontSize: 16, color: sub, fontFamily: f, textAlign: 'center', lineHeight: 1.6, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.85, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({
      [head]: { type: 'blur-in', delay: 0.2, duration: 1.2, easing: E.expoOut },
      [sub2]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: E.expoOut },
    }) });
  }

  // ─── S2: TWO-COLUMN STATS — Heading left, 2 stat columns right ───
  {
    const lab = gid(), head = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('02', f),
      txt(lab, '{{stats_label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{stats_heading}}', 96, 310, 900, 320, {
        fontSize: 46, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15,
      }),
      // Stats on the right side
      txt(s1v, '{{stat1_value}}', 1100, 310, 700, 140, { fontSize: 96, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 1100, 460, 700, 35, { fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 1100, 560, 700, 140, { fontSize: 96, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 1100, 710, 700, 35, { fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[0], type: 'mp4', opacity: 0.75, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [s1v]: { type: 'slide-up', delay: 0.5, duration: 0.6, easing: E.expoOut },
      [s1l]: { type: 'fade-in', delay: 0.65, duration: 0.5, easing: E.quintOut },
      [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut },
      [s2l]: { type: 'fade-in', delay: 0.85, duration: 0.5, easing: E.quintOut },
    }) });
  }

  // ─── S3: FULL-WIDTH STATEMENT — Big text, no body, centered ───
  {
    const head = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('03', f),
      txt(head, '{{statement}}', 96, 340, 1728, 360, {
        fontSize: 54, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.08, letterSpacing: -0.5, zIndex: 15,
      }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.8, filter: 'brightness(0.6) saturate(0.85)' },
    animationConfig: cineAnim({
      [head]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
    }) });
  }

  // ─── S4: LABEL + HEADING + BODY — Standard content layout ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('04', f),
      txt(lab, '{{content_label}}', 96, 250, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{content_heading}}', 96, 300, 1200, 320, {
        fontSize: 48, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15,
      }),
      txt(body, '{{content_body}}', 96, 680, 780, 200, {
        fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[3], type: 'mp4', opacity: 0.75, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut },
    }) });
  }

  // ─── S5: CLOSING — Bottom-left heading, vision statement ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('05', f),
      txt(lab, '{{closing_label}}', 96, 640, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{closing_heading}}', 96, 680, 1100, 240, {
        fontSize: 56, fontWeight: '400', fontFamily: f, color: fg,
        lineHeight: 1.04, letterSpacing: -1, zIndex: 15,
      }),
      txt(body, '{{closing_body}}', 96, 930, 700, 80, {
        fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: { type: 'solid', value: '#0a0a12' },
    videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.85, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut },
    }) });
  }

  return slides;
}

// ════════════════════════════════════════════
// TEMPLATE: VIKTORY (Investor Deck — 5 slides)
// ════════════════════════════════════════════
// HLS Mux videos at full opacity. Aeonik font. Pure cinema.

function buildViktory(): Slide[] {
  const f = 'Aeonik';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const slides: Slide[] = [];

  const V1 = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
  const V2 = 'https://stream.mux.com/s8pMcOvMQXc4GD6AX4e1o01xFogFxipmuKltNfSYza0200.m3u8';
  const V3 = 'https://stream.mux.com/Gs3wZfrtz6ZfqZqQ02c02Z7lugV00FGZvRpcqFTel66r3g.m3u8';
  const V4 = 'https://stream.mux.com/PkFsoKeakRLgL01gjf02CRcSbsJ600Z00NvLr9eRZ92pLbA.m3u8';
  const V5 = 'https://stream.mux.com/BuGGTsiXq1T00WUb8qfURrHkTCbhrkfFLSv4uAOZzdhw.m3u8';

  // ─── S1: TITLE — Metadata bar + massive two-line title bottom-left ───
  {
    const tl1 = gid(), tl2 = gid(), ml1 = gid(), mv1 = gid(), ml2 = gid(), mv2 = gid(), ml3 = gid(), mv3 = gid(), ml4 = gid(), mv4 = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('', f),
      // 4 metadata columns (top-right)
      txt(ml1, '{{meta1_label}}', 920, 36, 120, 14, { fontSize: 10, color: sub, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(mv1, '{{meta1_value}}', 920, 52, 160, 16, { fontSize: 10, fontWeight: '500', color: fg, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(ml2, '{{meta2_label}}', 1100, 36, 120, 14, { fontSize: 10, color: sub, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(mv2, '{{meta2_value}}', 1100, 52, 160, 16, { fontSize: 10, fontWeight: '500', color: fg, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(ml3, '{{meta3_label}}', 1300, 36, 120, 14, { fontSize: 10, color: sub, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(mv3, '{{meta3_value}}', 1300, 52, 160, 16, { fontSize: 10, fontWeight: '500', color: fg, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(ml4, '{{meta4_label}}', 1500, 36, 180, 14, { fontSize: 10, color: sub, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      txt(mv4, '{{meta4_value}}', 1500, 52, 220, 16, { fontSize: 10, fontWeight: '500', color: fg, fontFamily: f, zIndex: 20, textShadow: 'none' }),
      // Two-line title at bottom — MASSIVE
      txt(tl1, '{{title_line1}}', 96, 720, 1500, 150, { fontSize: 110, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.92, letterSpacing: -2, zIndex: 15 }),
      txt(tl2, '{{title_line2}}', 96, 870, 1500, 130, { fontSize: 110, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.92, letterSpacing: -2, zIndex: 15 }),
    ], background: bg,
    videoBackground: { url: V1, type: 'hls', opacity: 1.0 },
    animationConfig: cineAnim({
      [ml1]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
      [tl1]: { type: 'slide-up', delay: 0.3, duration: 0.7, easing: E.expoOut },
      [tl2]: { type: 'slide-up', delay: 0.4, duration: 0.7, easing: E.expoOut },
    }) });
  }

  // ─── S2: PROBLEM + STATS — Heading top, 3 massive stat columns bottom ───
  {
    const lab = gid(), head = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('02', f),
      txt(lab, '{{problem_label}}', 96, 130, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{problem_statement}}', 96, 180, 1600, 300, { fontSize: 46, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15 }),
      txt(s1v, '{{stat1_value}}', 96, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 96, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 700, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 700, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{stat3_value}}', 1300, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s3l, '{{stat3_label}}', 1300, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: f, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    videoBackground: { url: V2, type: 'hls', opacity: 1.0 },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [s1v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut },
      [s1l]: { type: 'fade-in', delay: 0.7, duration: 0.5, easing: E.quintOut },
      [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut },
      [s2l]: { type: 'fade-in', delay: 0.8, duration: 0.5, easing: E.quintOut },
      [s3v]: { type: 'slide-up', delay: 0.8, duration: 0.6, easing: E.expoOut },
      [s3l]: { type: 'fade-in', delay: 0.9, duration: 0.5, easing: E.quintOut },
    }) });
  }

  // ─── S3: CONTENT — Label + heading + body, video flipped ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('03', f),
      txt(lab, '{{content_label}}', 96, 250, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{content_heading}}', 96, 300, 1200, 340, { fontSize: 48, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15 }),
      txt(body, '{{content_body}}', 96, 690, 780, 200, { fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    videoBackground: { url: V3, type: 'hls', opacity: 0.5, transform: 'scale(-1, -1)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut },
    }) });
  }

  // ─── S4: CENTERED TEXT — Big heading fills the space ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('04', f),
      txt(lab, '{{scalability_label}}', 96, 240, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{scalability_heading}}', 96, 290, 1300, 380, { fontSize: 58, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 1.04, letterSpacing: -1, zIndex: 15 }),
      txt(body, '{{scalability_body}}', 96, 720, 800, 160, { fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    videoBackground: { url: V4, type: 'hls', opacity: 1.0 },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 1.0, duration: 0.8, easing: E.expoOut },
    }) });
  }

  // ─── S5: VISION — Bottom-aligned heading + body ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('05', f),
      txt(lab, '{{vision_label}}', 96, 650, 500, 22, { fontSize: 13, color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{vision_heading}}', 96, 690, 1000, 240, { fontSize: 58, fontWeight: '400', fontFamily: f, color: fg, lineHeight: 1.04, letterSpacing: -1, zIndex: 15 }),
      txt(body, '{{vision_body}}', 96, 930, 700, 80, { fontSize: 15, color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: { type: 'solid', value: '#131318' },
    videoBackground: { url: V5, type: 'hls', opacity: 0.8 },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut },
    }) });
  }

  return slides;
}

// ══════════════════════════════
// THEME BUILDERS
// ══════════════════════════════

function viktoryTheme() {
  return {
    id: 'midnight', name: 'Viktory', category: 'Cinematic',
    tokens: {
      palette: { primary: '#8238DC', secondary: '#80838e', accent: '#8238DC', bg: '#000000', text: '#FFFFFF' },
      typography: { titleFont: 'Aeonik', bodyFont: 'Aeonik', titleSize: 56, bodySize: 16 },
      radii: '0px', shadows: 'none',
    },
    previewColors: ['#8238DC', '#80838e', '#000000'],
  };
}

function nexusTheme() {
  return {
    id: 'nexus', name: 'Nexus', category: 'Cinematic',
    tokens: {
      palette: { primary: '#7C3AED', secondary: '#9CA0AE', accent: '#7C3AED', bg: '#0a0512', text: '#F2F2F3' },
      typography: { titleFont: 'General Sans', bodyFont: 'Geist Sans', titleSize: 48, bodySize: 17 },
      radii: '20px', shadows: 'lg',
    },
    previewColors: ['#7C3AED', '#9CA0AE', '#0a0512'],
  };
}

// ══════════════════════════════
// MAIN SEED
// ══════════════════════════════

const TEMPLATES = [
  {
    name: 'Nexus',
    slug: 'nexus',
    category: 'SaaS / Tech',
    description: 'Dark purple SaaS style with gradient headlines, liquid glass cards, and bold typography.',
    preset_id: 'nexus',
    slides: buildNexus(),
    theme: nexusTheme(),
    tags: ['saas', 'tech', 'startup', 'pitch'],
    sort_order: 1,
  },
  {
    name: 'Prysma',
    slug: 'prysma',
    category: 'Growth / Data',
    description: 'Data-driven dark purple theme with dashboard metrics, glass cards, and testimonial layouts.',
    preset_id: 'nexus',
    slides: buildPrysma(),
    theme: nexusTheme(),
    tags: ['data', 'growth', 'analytics', 'quarterly'],
    sort_order: 2,
  },
  {
    name: 'Viktory',
    slug: 'viktory',
    category: 'Investor Deck',
    description: 'Pure black investor presentation with HLS video backgrounds, Aeonik font, and cinematic stat cards.',
    preset_id: 'midnight',
    slides: buildViktory(),
    theme: viktoryTheme(),
    tags: ['investor', 'pitch', 'startup', 'ai', 'enterprise'],
    sort_order: 3,
  },
];

async function main() {
  console.log(`Seeding ${TEMPLATES.length} cinematic templates...`);

  // Clear existing
  const { error: delErr } = await supabase.from('cinematic_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) console.warn('Warning clearing old templates:', delErr.message);

  for (const tmpl of TEMPLATES) {
    console.log(`  → ${tmpl.name} (${tmpl.slides.length} slides)...`);

    const { error } = await supabase.from('cinematic_templates').insert({
      name: tmpl.name,
      slug: tmpl.slug,
      category: tmpl.category,
      description: tmpl.description,
      preset_id: tmpl.preset_id,
      slides: tmpl.slides,
      theme: tmpl.theme,
      tags: tmpl.tags,
      is_active: true,
      sort_order: tmpl.sort_order,
    });

    if (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    } else {
      console.log(`  ✓ Done`);
    }
  }

  console.log('\nAll done!');
}

main().catch(console.error);
