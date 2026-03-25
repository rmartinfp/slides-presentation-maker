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

// ════════════════════════════════════════════
// TEMPLATE: LUMINA (AI Builder — 5 slides)
// ════════════════════════════════════════════
// Instrument Serif (pre-headline) + Instrument Sans (headline/body).
// Centered hero layout. Gradient headline. Blue accent #3054ff.

function buildLumina(): Slide[] {
  const fSerif = 'Instrument Serif', fSans = 'Instrument Sans';
  const fg = '#FFFFFF', sub = '#80838e', accent = '#3054ff';
  const bg = { type: 'solid', value: '#000000' };
  const slides: Slide[] = [];

  const VL = 'https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8';

  // ─── S1: HERO — Pre-headline serif + massive gradient "Build Faster" + subtitle + CTA ───
  {
    const preH = gid(), mainH = gid(), subT = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('', fSans),
      // Pre-headline — serif italic style
      txt(preH, '{{pre_headline}}', 460, 240, 1000, 60, {
        fontSize: 38, fontWeight: '400', fontFamily: fSerif, color: fg,
        textAlign: 'center', lineHeight: 1.1, zIndex: 15, textShadow: 'none',
      }),
      // Main headline — MASSIVE gradient text
      txt(mainH, '{{main_headline}}', 260, 320, 1400, 200, {
        fontSize: 120, fontWeight: '600', fontFamily: fSans, color: fg,
        textAlign: 'center', lineHeight: 0.9, letterSpacing: -3,
        textGradient: 'linear-gradient(180deg, #FFFFFF 30%, #b4c0ff 100%)',
        zIndex: 15,
      }),
      // Subheadline
      txt(subT, '{{sub_headline}}', 510, 550, 900, 80, {
        fontSize: 17, fontWeight: '400', fontFamily: fSans, color: fg,
        textAlign: 'center', lineHeight: 1.65, opacity: 0.7,
        zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: VL, type: 'hls', opacity: 0.6 },
    animationConfig: cineAnim({
      [preH]: { type: 'fade-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
      [mainH]: { type: 'scale-up', delay: 0.2, duration: 0.6, easing: E.expoOut },
      [subT]: { type: 'fade-in', delay: 0.4, duration: 0.6, easing: E.quintOut },
    }) });
  }

  // ─── S2: PROBLEM — Label + big heading + stat cards (3 columns) ───
  {
    const lab = gid(), head = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('02', fSans),
      txt(lab, '{{problem_label}}', 96, 130, 500, 22, { fontSize: 13, color: sub, fontFamily: fSans, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{problem_heading}}', 96, 180, 1600, 300, {
        fontSize: 46, fontWeight: '400', fontFamily: fSans, color: fg,
        lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15,
      }),
      txt(s1v, '{{stat1_value}}', 96, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: fSans, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 96, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fSans, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 700, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: fSans, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 700, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fSans, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{stat3_value}}', 1300, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: fSans, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s3l, '{{stat3_label}}', 1300, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fSans, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[1], type: 'mp4', opacity: 0.8, filter: 'brightness(0.6)' },
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

  // ─── S3: SOLUTION — Centered serif pre-headline + gradient main headline ───
  {
    const preH = gid(), mainH = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('03', fSans),
      txt(preH, '{{solution_pre}}', 460, 280, 1000, 50, {
        fontSize: 32, fontWeight: '400', fontFamily: fSerif, color: fg,
        textAlign: 'center', lineHeight: 1.1, zIndex: 15, textShadow: 'none',
      }),
      txt(mainH, '{{solution_headline}}', 260, 350, 1400, 200, {
        fontSize: 88, fontWeight: '600', fontFamily: fSans, color: fg,
        textAlign: 'center', lineHeight: 0.95, letterSpacing: -2,
        textGradient: 'linear-gradient(180deg, #FFFFFF 30%, #b4c0ff 100%)',
        zIndex: 15,
      }),
      txt(body, '{{solution_body}}', 460, 580, 1000, 120, {
        fontSize: 16, color: sub, fontFamily: fSans,
        textAlign: 'center', lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: VL, type: 'hls', opacity: 0.5 },
    animationConfig: cineAnim({
      [preH]: { type: 'fade-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
      [mainH]: { type: 'scale-up', delay: 0.2, duration: 0.6, easing: E.expoOut },
      [body]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: E.quintOut },
    }) });
  }

  // ─── S4: FEATURES — Label + heading left, body below ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('04', fSans),
      txt(lab, '{{features_label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: fSans, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{features_heading}}', 96, 310, 1200, 320, {
        fontSize: 48, fontWeight: '500', fontFamily: fSans, color: fg,
        lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15,
      }),
      txt(body, '{{features_body}}', 96, 690, 780, 200, {
        fontSize: 15, color: sub, fontFamily: fSans, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.7, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({
      [lab]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut },
    }) });
  }

  // ─── S5: CLOSING — Centered serif + gradient headline ───
  {
    const preH = gid(), mainH = gid(), sub2 = gid();
    slides.push({ id: gid(), elements: [
      ...skeleton('05', fSans),
      txt(preH, '{{closing_pre}}', 460, 340, 1000, 50, {
        fontSize: 32, fontWeight: '400', fontFamily: fSerif, color: fg,
        textAlign: 'center', lineHeight: 1.1, zIndex: 15, textShadow: 'none',
      }),
      txt(mainH, '{{closing_headline}}', 260, 410, 1400, 200, {
        fontSize: 88, fontWeight: '600', fontFamily: fSans, color: fg,
        textAlign: 'center', lineHeight: 0.95, letterSpacing: -2,
        textGradient: 'linear-gradient(180deg, #FFFFFF 30%, #b4c0ff 100%)',
        zIndex: 15,
      }),
      txt(sub2, '{{closing_body}}', 510, 640, 900, 80, {
        fontSize: 17, color: sub, fontFamily: fSans,
        textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none',
      }),
    ], background: { type: 'solid', value: '#050510' },
    videoBackground: { url: VL, type: 'hls', opacity: 0.6 },
    animationConfig: cineAnim({
      [preH]: { type: 'fade-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [mainH]: { type: 'scale-up', delay: 0.25, duration: 0.6, easing: E.expoOut },
      [sub2]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: E.quintOut },
    }) });
  }

  return slides;
}

function luminaTheme() {
  return {
    id: 'midnight', name: 'Lumina', category: 'Cinematic',
    tokens: {
      palette: { primary: '#3054ff', secondary: '#80838e', accent: '#3054ff', bg: '#000000', text: '#FFFFFF' },
      typography: { titleFont: 'Instrument Sans', bodyFont: 'Instrument Sans', titleSize: 56, bodySize: 17 },
      radii: '0px', shadows: 'none',
    },
    previewColors: ['#3054ff', '#b4c0ff', '#000000'],
  };
}

// ════════════════════════════════════════════
// TEMPLATE: VELORAH (Instrument Serif hero — 5 slides)
// ════════════════════════════════════════════

function buildVelorah(): Slide[] {
  const fSerif = 'Instrument Serif', fBody = 'Inter';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const VV = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4';
  const slides: Slide[] = [];

  // S1: Centered hero — serif headline + body + CTA feel
  { const h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('', fBody),
      txt(h, '{{hero_headline}}', 210, 300, 1500, 300, { fontSize: 96, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -2.5, zIndex: 15 }),
      txt(b, '{{hero_body}}', 510, 630, 900, 80, { fontSize: 17, color: fg, fontFamily: fBody, textAlign: 'center', lineHeight: 1.65, opacity: 0.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VV, type: 'mp4', opacity: 0.9, filter: 'brightness(0.7)' },
    animationConfig: cineAnim({ [h]: { type: 'blur-in', delay: 0.15, duration: 1.0, easing: E.expoOut }, [b]: { type: 'fade-in', delay: 0.6, duration: 0.6, easing: E.quintOut } }) }); }

  // S2: Problem — label + heading + body
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('02', fBody),
      txt(l, '{{problem_label}}', 96, 250, 500, 22, { fontSize: 13, color: sub, fontFamily: fBody, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{problem_heading}}', 96, 300, 1400, 320, { fontSize: 52, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.04, letterSpacing: -1, zIndex: 15 }),
      txt(b, '{{problem_body}}', 96, 680, 780, 200, { fontSize: 15, color: sub, fontFamily: fBody, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VV, type: 'mp4', opacity: 0.7, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }) }); }

  // S3: Statement — full centered serif
  { const h = gid();
    slides.push({ id: gid(), elements: [...skeleton('03', fBody),
      txt(h, '{{statement}}', 160, 340, 1600, 360, { fontSize: 56, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.1, letterSpacing: -0.5, zIndex: 15 }),
    ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.8, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({ [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.04 } }) }); }

  // S4: Content + stats right
  { const l = gid(), h = gid(), sv = gid(), sl = gid();
    slides.push({ id: gid(), elements: [...skeleton('04', fBody),
      txt(l, '{{content_label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: fBody, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{content_heading}}', 96, 310, 900, 320, { fontSize: 48, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.06, zIndex: 15 }),
      txt(sv, '{{stat_value}}', 1100, 350, 700, 140, { fontSize: 96, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(sl, '{{stat_label}}', 1100, 500, 600, 35, { fontSize: 15, color: sub, fontFamily: fBody, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[0], type: 'mp4', opacity: 0.75, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [sv]: { type: 'slide-up', delay: 0.5, duration: 0.6, easing: E.expoOut }, [sl]: { type: 'fade-in', delay: 0.65, duration: 0.5, easing: E.quintOut } }) }); }

  // S5: Closing bottom
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('05', fBody),
      txt(l, '{{closing_label}}', 96, 640, 500, 22, { fontSize: 13, color: sub, fontFamily: fBody, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{closing_heading}}', 96, 680, 1100, 240, { fontSize: 56, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.04, letterSpacing: -1, zIndex: 15 }),
      txt(b, '{{closing_body}}', 96, 930, 700, 80, { fontSize: 15, color: sub, fontFamily: fBody, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: { type: 'solid', value: '#050505' }, videoBackground: { url: VV, type: 'mp4', opacity: 0.85, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut } }) }); }

  return slides;
}

function velorahTheme() {
  return { id: 'midnight', name: 'Velorah', category: 'Cinematic', tokens: { palette: { primary: '#FFFFFF', secondary: '#80838e', accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF' }, typography: { titleFont: 'Instrument Serif', bodyFont: 'Inter', titleSize: 56, bodySize: 17 }, radii: '0px', shadows: 'none' }, previewColors: ['#FFFFFF', '#80838e', '#000000'] };
}

// ════════════════════════════════════════════
// TEMPLATE: BLOOM (Floral AI / Poppins — 5 slides)
// ════════════════════════════════════════════

function buildBloom(): Slide[] {
  const fH = 'Poppins', fSerif = 'Source Serif 4', fB = 'Poppins';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const VB = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4';
  const slides: Slide[] = [];

  // S1: Centered hero — mixed serif/sans heading
  { const h1 = gid(), h2 = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('', fB),
      txt(h1, '{{hero_line1}}', 260, 280, 1400, 120, { fontSize: 72, fontWeight: '500', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -2, zIndex: 15 }),
      txt(h2, '{{hero_line2}}', 260, 400, 1400, 120, { fontSize: 72, fontWeight: '400', fontFamily: fSerif, color: `${fg}cc`, textAlign: 'center', lineHeight: 0.95, letterSpacing: -1, zIndex: 15 }),
      txt(b, '{{hero_body}}', 510, 560, 900, 80, { fontSize: 16, color: `${fg}99`, fontFamily: fB, textAlign: 'center', lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VB, type: 'mp4', opacity: 0.85, filter: 'brightness(0.65)' },
    animationConfig: cineAnim({ [h1]: { type: 'blur-in', delay: 0.15, duration: 1.0, easing: E.expoOut }, [h2]: { type: 'blur-in', delay: 0.3, duration: 1.0, easing: E.expoOut }, [b]: { type: 'fade-in', delay: 0.7, duration: 0.6, easing: E.quintOut } }) }); }

  // S2: Problem — heading + stats
  { const l = gid(), h = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid();
    slides.push({ id: gid(), elements: [...skeleton('02', fB),
      txt(l, '{{problem_label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{problem_heading}}', 96, 310, 900, 300, { fontSize: 46, fontWeight: '500', fontFamily: fH, color: fg, lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15 }),
      txt(s1v, '{{stat1_value}}', 1100, 320, 700, 130, { fontSize: 88, fontWeight: '500', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 1100, 460, 600, 35, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 1100, 550, 700, 130, { fontSize: 88, fontWeight: '500', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 1100, 690, 600, 35, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VB, type: 'mp4', opacity: 0.7, filter: 'brightness(0.5)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [s1v]: { type: 'slide-up', delay: 0.5, duration: 0.6, easing: E.expoOut }, [s2v]: { type: 'slide-up', delay: 0.65, duration: 0.6, easing: E.expoOut } }) }); }

  // S3: Full statement (serif)
  { const h = gid();
    slides.push({ id: gid(), elements: [...skeleton('03', fB),
      txt(h, '{{statement}}', 160, 340, 1600, 360, { fontSize: 54, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.1, zIndex: 15 }),
    ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[3], type: 'mp4', opacity: 0.8, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({ [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.04 } }) }); }

  // S4: Content
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('04', fB),
      txt(l, '{{content_label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{content_heading}}', 96, 310, 1200, 320, { fontSize: 48, fontWeight: '500', fontFamily: fH, color: fg, lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15 }),
      txt(b, '{{content_body}}', 96, 690, 780, 200, { fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VB, type: 'mp4', opacity: 0.65, filter: 'brightness(0.5)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }) }); }

  // S5: Closing
  { const h1 = gid(), h2 = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('05', fB),
      txt(h1, '{{closing_line1}}', 260, 380, 1400, 120, { fontSize: 68, fontWeight: '500', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -1.5, zIndex: 15 }),
      txt(h2, '{{closing_line2}}', 260, 500, 1400, 100, { fontSize: 56, fontWeight: '400', fontFamily: fSerif, color: `${fg}cc`, textAlign: 'center', lineHeight: 1.0, zIndex: 15 }),
      txt(b, '{{closing_body}}', 510, 630, 900, 80, { fontSize: 16, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none' }),
    ], background: { type: 'solid', value: '#050505' }, videoBackground: { url: VB, type: 'mp4', opacity: 0.85, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({ [h1]: { type: 'blur-in', delay: 0.15, duration: 1.0, easing: E.expoOut }, [h2]: { type: 'blur-in', delay: 0.35, duration: 1.0, easing: E.expoOut }, [b]: { type: 'fade-in', delay: 0.7, duration: 0.6, easing: E.quintOut } }) }); }

  return slides;
}

function bloomTheme() {
  return { id: 'midnight', name: 'Bloom', category: 'Cinematic', tokens: { palette: { primary: '#FFFFFF', secondary: '#80838e', accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF' }, typography: { titleFont: 'Poppins', bodyFont: 'Poppins', titleSize: 56, bodySize: 16 }, radii: '0px', shadows: 'none' }, previewColors: ['#FFFFFF', '#80838e', '#000000'] };
}

// ════════════════════════════════════════════
// TEMPLATE: LOGOISUM (Video Agency / Barlow — 5 slides)
// ════════════════════════════════════════════

function buildLogoisum(): Slide[] {
  const fH = 'Barlow', fSerif = 'Instrument Serif', fB = 'Barlow';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const VLo = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260228_065522_522e2295-ba22-457e-8fdb-fbcd68109c73.mp4';
  const slides: Slide[] = [];

  // S1: Hero — Bold Barlow + Italic Instrument Serif mixed
  { const h1 = gid(), h2 = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('', fB),
      txt(h1, '{{hero_line1}}', 210, 300, 1500, 140, { fontSize: 72, fontWeight: '500', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -3, zIndex: 15 }),
      txt(h2, '{{hero_line2}}', 210, 440, 1500, 140, { fontSize: 72, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -1, zIndex: 15 }),
      txt(b, '{{hero_body}}', 510, 620, 900, 60, { fontSize: 16, fontWeight: '500', color: fg, fontFamily: fB, textAlign: 'center', lineHeight: 1.5, opacity: 0.8, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VLo, type: 'mp4', opacity: 1.0 },
    animationConfig: cineAnim({ [h1]: { type: 'slide-up', delay: 0.2, duration: 0.7, easing: E.expoOut }, [h2]: { type: 'slide-up', delay: 0.3, duration: 0.7, easing: E.expoOut }, [b]: { type: 'fade-in', delay: 0.6, duration: 0.5, easing: E.quintOut } }) }); }

  // S2: Problem + stats
  { const l = gid(), h = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [...skeleton('02', fB),
      txt(l, '{{problem_label}}', 96, 130, 500, 22, { fontSize: 13, fontWeight: '500', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{problem_heading}}', 96, 180, 1600, 300, { fontSize: 46, fontWeight: '400', fontFamily: fB, color: fg, lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15 }),
      txt(s1v, '{{stat1_value}}', 96, 680, 540, 140, { fontSize: 88, fontWeight: '300', fontFamily: fB, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 96, 830, 500, 35, { fontSize: 15, fontWeight: '500', color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 700, 680, 540, 140, { fontSize: 88, fontWeight: '300', fontFamily: fB, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 700, 830, 500, 35, { fontSize: 15, fontWeight: '500', color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{stat3_value}}', 1300, 680, 540, 140, { fontSize: 88, fontWeight: '300', fontFamily: fB, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s3l, '{{stat3_label}}', 1300, 830, 500, 35, { fontSize: 15, fontWeight: '500', color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[0], type: 'mp4', opacity: 0.85, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [s1v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut }, [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut }, [s3v]: { type: 'slide-up', delay: 0.8, duration: 0.6, easing: E.expoOut } }) }); }

  // S3: Statement (italic serif)
  { const h = gid();
    slides.push({ id: gid(), elements: [...skeleton('03', fB),
      txt(h, '{{statement}}', 160, 340, 1600, 360, { fontSize: 56, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.08, zIndex: 15 }),
    ], background: bg, videoBackground: { url: VLo, type: 'mp4', opacity: 0.9 },
    animationConfig: cineAnim({ [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.04 } }) }); }

  // S4: Content
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('04', fB),
      txt(l, '{{content_label}}', 96, 290, 500, 22, { fontSize: 13, fontWeight: '500', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{content_heading}}', 96, 330, 1200, 320, { fontSize: 54, fontWeight: '400', fontFamily: fB, color: fg, lineHeight: 1.04, letterSpacing: -0.5, zIndex: 15 }),
      txt(b, '{{content_body}}', 96, 700, 780, 200, { fontSize: 15, fontWeight: '500', color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VLo, type: 'mp4', opacity: 0.8 },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }) }); }

  // S5: Closing
  { const h1 = gid(), h2 = gid();
    slides.push({ id: gid(), elements: [...skeleton('05', fB),
      txt(h1, '{{closing_line1}}', 210, 380, 1500, 130, { fontSize: 68, fontWeight: '300', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -2, zIndex: 15 }),
      txt(h2, '{{closing_line2}}', 210, 510, 1500, 130, { fontSize: 68, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 0.95, zIndex: 15 }),
    ], background: bg, videoBackground: { url: VLo, type: 'mp4', opacity: 1.0 },
    animationConfig: cineAnim({ [h1]: { type: 'slide-up', delay: 0.2, duration: 0.7, easing: E.expoOut }, [h2]: { type: 'slide-up', delay: 0.35, duration: 0.7, easing: E.expoOut } }) }); }

  return slides;
}

function logoisumTheme() {
  return { id: 'midnight', name: 'Logoisum', category: 'Cinematic', tokens: { palette: { primary: '#FFFFFF', secondary: '#80838e', accent: '#f8f8f8', bg: '#000000', text: '#FFFFFF' }, typography: { titleFont: 'Barlow', bodyFont: 'Barlow', titleSize: 56, bodySize: 16 }, radii: '2px', shadows: 'none' }, previewColors: ['#f8f8f8', '#80838e', '#000000'] };
}

// ════════════════════════════════════════════
// TEMPLATE: FORTUNE (Agency / Barlow+IS — 5 slides)
// ════════════════════════════════════════════

function buildFortune(): Slide[] {
  const fH = 'Barlow', fSerif = 'Instrument Serif', fB = 'Barlow';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const VF = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_074215_04640ca7-042c-45d6-bb56-58b1e8a42489.mp4';
  const slides: Slide[] = [];

  // S1: Hero — Light Barlow + Italic Serif, featured badge feel
  { const h1 = gid(), h2 = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('', fB),
      txt(h1, '{{hero_line1}}', 260, 300, 1400, 120, { fontSize: 64, fontWeight: '300', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, zIndex: 15 }),
      txt(h2, '{{hero_line2}}', 260, 420, 1400, 120, { fontSize: 64, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 0.95, zIndex: 15 }),
      txt(b, '{{hero_body}}', 510, 580, 900, 60, { fontSize: 16, fontWeight: '500', color: `${fg}bf`, fontFamily: fB, textAlign: 'center', lineHeight: 1.5, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VF, type: 'mp4', opacity: 1.0 },
    animationConfig: cineAnim({ [h1]: { type: 'slide-up', delay: 0.2, duration: 0.7, easing: E.expoOut }, [h2]: { type: 'slide-up', delay: 0.3, duration: 0.7, easing: E.expoOut }, [b]: { type: 'fade-in', delay: 0.6, duration: 0.5, easing: E.quintOut } }) }); }

  // S2: Problem + 3 stats
  { const l = gid(), h = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [...skeleton('02', fB),
      txt(l, '{{problem_label}}', 96, 130, 500, 22, { fontSize: 13, fontWeight: '500', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{problem_heading}}', 96, 180, 1600, 300, { fontSize: 46, fontWeight: '300', fontFamily: fH, color: fg, lineHeight: 1.06, zIndex: 15 }),
      txt(s1v, '{{stat1_value}}', 96, 680, 540, 140, { fontSize: 88, fontWeight: '300', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 96, 830, 500, 35, { fontSize: 14, fontWeight: '500', color: `${fg}bf`, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 700, 680, 540, 140, { fontSize: 88, fontWeight: '300', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 700, 830, 500, 35, { fontSize: 14, fontWeight: '500', color: `${fg}bf`, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{stat3_value}}', 1300, 680, 540, 140, { fontSize: 88, fontWeight: '300', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s3l, '{{stat3_label}}', 1300, 830, 500, 35, { fontSize: 14, fontWeight: '500', color: `${fg}bf`, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VF, type: 'mp4', opacity: 0.85, filter: 'brightness(0.65)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [s1v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut }, [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut }, [s3v]: { type: 'slide-up', delay: 0.8, duration: 0.6, easing: E.expoOut } }) }); }

  // S3: Centered statement
  { const h = gid();
    slides.push({ id: gid(), elements: [...skeleton('03', fB),
      txt(h, '{{statement}}', 160, 340, 1600, 360, { fontSize: 56, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.08, zIndex: 15 }),
    ], background: bg, videoBackground: { url: VF, type: 'mp4', opacity: 0.9 },
    animationConfig: cineAnim({ [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.04 } }) }); }

  // S4: Content
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('04', fB),
      txt(l, '{{content_label}}', 96, 280, 500, 22, { fontSize: 13, fontWeight: '500', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{content_heading}}', 96, 320, 1200, 320, { fontSize: 52, fontWeight: '300', fontFamily: fH, color: fg, lineHeight: 1.04, zIndex: 15 }),
      txt(b, '{{content_body}}', 96, 700, 780, 200, { fontSize: 15, fontWeight: '500', color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VF, type: 'mp4', opacity: 0.8 },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }) }); }

  // S5: Closing
  { const h1 = gid(), h2 = gid();
    slides.push({ id: gid(), elements: [...skeleton('05', fB),
      txt(h1, '{{closing_line1}}', 210, 400, 1500, 120, { fontSize: 64, fontWeight: '300', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, zIndex: 15 }),
      txt(h2, '{{closing_line2}}', 210, 520, 1500, 120, { fontSize: 64, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 0.95, zIndex: 15 }),
    ], background: bg, videoBackground: { url: VF, type: 'mp4', opacity: 1.0 },
    animationConfig: cineAnim({ [h1]: { type: 'slide-up', delay: 0.2, duration: 0.7, easing: E.expoOut }, [h2]: { type: 'slide-up', delay: 0.35, duration: 0.7, easing: E.expoOut } }) }); }

  return slides;
}

function fortuneTheme() {
  return { id: 'midnight', name: 'Fortune', category: 'Cinematic', tokens: { palette: { primary: '#f8f8f8', secondary: '#80838e', accent: '#f8f8f8', bg: '#000000', text: '#FFFFFF' }, typography: { titleFont: 'Barlow', bodyFont: 'Barlow', titleSize: 52, bodySize: 16 }, radii: '2px', shadows: 'none' }, previewColors: ['#f8f8f8', '#80838e', '#000000'] };
}

// ════════════════════════════════════════════
// TEMPLATE: TASKLY (Light theme / SaaS — 5 slides)
// ════════════════════════════════════════════
// FIRST LIGHT TEMPLATE. White bg, dark text, blue accent.
// Fustat (headlines) + Inter (body). Clean, product-focused.

function buildTaskly(): Slide[] {
  const fH = 'Fustat', fB = 'Inter';
  const fg = '#1a1a2e', sub = '#64748b', accent = '#0084FF';
  const bg = { type: 'solid', value: '#FFFFFF' };
  const VO = 'https://future.co/images/homepage/glassy-orb/orb-purple.webm';
  const slides: Slide[] = [];

  // Light skeleton — dark text logo + number
  function lightSkel(num: string): SlideElement[] {
    return [
      txt(gid(), '{{logo}}', 96, 38, 200, 28, { fontSize: 16, fontWeight: '700', color: fg, fontFamily: fH, letterSpacing: -0.5, zIndex: 20, textShadow: 'none' }),
      txt(gid(), num, 1790, 38, 40, 28, { fontSize: 16, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
      shp(gid(), 96, 82, 1728, 1, { fill: 'rgba(0,0,0,0.08)', zIndex: 5 }),
    ];
  }

  function lightAnim(overrides: Record<string, any> = {}): Record<string, any> {
    return animCfg(overrides, {
      transition: 'fade-cross',
      transitionDuration: 0.4,
      overlays: { vignette: false, vignetteIntensity: 0, filmGrain: false, filmGrainOpacity: 0, scrim: 'none' as const, scrimOpacity: 0 },
    });
  }

  // ─── S1: HERO — Big headline centered, blue accent ───
  {
    const preH = gid(), mainH = gid(), subT = gid();
    slides.push({ id: gid(), elements: [
      ...lightSkel(''),
      // Pre-headline / social proof line
      txt(preH, '{{pre_headline}}', 460, 260, 1000, 40, {
        fontSize: 15, fontWeight: '500', fontFamily: fB, color: sub,
        textAlign: 'center', letterSpacing: -0.5, zIndex: 15, textShadow: 'none',
      }),
      // Main headline — dark, large
      txt(mainH, '{{main_headline}}', 210, 320, 1500, 240, {
        fontSize: 72, fontWeight: '700', fontFamily: fH, color: fg,
        textAlign: 'center', lineHeight: 1.05, letterSpacing: -2, zIndex: 15, textShadow: 'none',
      }),
      // Subheadline
      txt(subT, '{{sub_headline}}', 460, 580, 1000, 100, {
        fontSize: 17, fontWeight: '400', fontFamily: fB, color: sub,
        textAlign: 'center', lineHeight: 1.65, letterSpacing: -0.5, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: VO, type: 'mp4', opacity: 0.3, filter: 'hue-rotate(-55deg) saturate(250%) brightness(1.2) contrast(1.1)' },
    animationConfig: lightAnim({
      [preH]: { type: 'fade-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
      [mainH]: { type: 'scale-up', delay: 0.2, duration: 0.6, easing: E.expoOut },
      [subT]: { type: 'fade-in', delay: 0.4, duration: 0.6, easing: E.quintOut },
    }) });
  }

  // ─── S2: PROBLEM + STATS — Dark text on white, 3 stat columns ───
  {
    const lab = gid(), head = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [
      ...lightSkel('02'),
      txt(lab, '{{problem_label}}', 96, 130, 500, 22, { fontSize: 13, fontWeight: '500', color: accent, fontFamily: fB, letterSpacing: 1, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{problem_heading}}', 96, 180, 1500, 280, {
        fontSize: 46, fontWeight: '700', fontFamily: fH, color: fg,
        lineHeight: 1.08, letterSpacing: -1, zIndex: 15, textShadow: 'none',
      }),
      // Stats
      txt(s1v, '{{stat1_value}}', 96, 680, 540, 130, { fontSize: 80, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15, textShadow: 'none' }),
      txt(s1l, '{{stat1_label}}', 96, 820, 500, 35, { fontSize: 15, fontWeight: '500', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 700, 680, 540, 130, { fontSize: 80, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15, textShadow: 'none' }),
      txt(s2l, '{{stat2_label}}', 700, 820, 500, 35, { fontSize: 15, fontWeight: '500', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{stat3_value}}', 1300, 680, 540, 130, { fontSize: 80, fontWeight: '700', fontFamily: fH, color: accent, lineHeight: 0.96, letterSpacing: -2, zIndex: 15, textShadow: 'none' }),
      txt(s3l, '{{stat3_label}}', 1300, 820, 500, 35, { fontSize: 15, fontWeight: '500', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    animationConfig: lightAnim({
      [lab]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [s1v]: { type: 'slide-up', delay: 0.5, duration: 0.6, easing: E.expoOut },
      [s1l]: { type: 'fade-in', delay: 0.6, duration: 0.5, easing: E.quintOut },
      [s2v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut },
      [s2l]: { type: 'fade-in', delay: 0.7, duration: 0.5, easing: E.quintOut },
      [s3v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut },
      [s3l]: { type: 'fade-in', delay: 0.8, duration: 0.5, easing: E.quintOut },
    }) });
  }

  // ─── S3: SOLUTION — Centered bold headline ───
  {
    const head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...lightSkel('03'),
      txt(head, '{{solution_headline}}', 210, 320, 1500, 260, {
        fontSize: 60, fontWeight: '700', fontFamily: fH, color: fg,
        textAlign: 'center', lineHeight: 1.08, letterSpacing: -1.5, zIndex: 15, textShadow: 'none',
      }),
      txt(body, '{{solution_body}}', 410, 610, 1100, 120, {
        fontSize: 17, fontWeight: '400', fontFamily: fB, color: sub,
        textAlign: 'center', lineHeight: 1.65, letterSpacing: -0.5, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: VO, type: 'mp4', opacity: 0.25, filter: 'hue-rotate(-55deg) saturate(250%) brightness(1.2)' },
    animationConfig: lightAnim({
      [head]: { type: 'scale-up', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [body]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: E.quintOut },
    }) });
  }

  // ─── S4: CONTENT — Label + heading left + body ───
  {
    const lab = gid(), head = gid(), body = gid();
    slides.push({ id: gid(), elements: [
      ...lightSkel('04'),
      txt(lab, '{{content_label}}', 96, 260, 500, 22, { fontSize: 13, fontWeight: '500', color: accent, fontFamily: fB, letterSpacing: 1, zIndex: 15, textShadow: 'none' }),
      txt(head, '{{content_heading}}', 96, 310, 1200, 300, {
        fontSize: 48, fontWeight: '700', fontFamily: fH, color: fg,
        lineHeight: 1.08, letterSpacing: -1, zIndex: 15, textShadow: 'none',
      }),
      txt(body, '{{content_body}}', 96, 670, 780, 200, {
        fontSize: 16, fontWeight: '400', fontFamily: fB, color: sub,
        lineHeight: 1.7, letterSpacing: -0.5, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    animationConfig: lightAnim({
      [lab]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: E.expoOut },
      [head]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [body]: { type: 'fade-in', delay: 0.7, duration: 0.6, easing: E.quintOut },
    }) });
  }

  // ─── S5: CLOSING — Centered bold headline + subtitle ───
  {
    const head = gid(), sub2 = gid();
    slides.push({ id: gid(), elements: [
      ...lightSkel('05'),
      txt(head, '{{closing_headline}}', 210, 370, 1500, 220, {
        fontSize: 64, fontWeight: '700', fontFamily: fH, color: fg,
        textAlign: 'center', lineHeight: 1.05, letterSpacing: -2, zIndex: 15, textShadow: 'none',
      }),
      txt(sub2, '{{closing_body}}', 460, 620, 1000, 80, {
        fontSize: 17, fontWeight: '400', fontFamily: fB, color: sub,
        textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg,
    videoBackground: { url: VO, type: 'mp4', opacity: 0.2, filter: 'hue-rotate(-55deg) saturate(250%) brightness(1.3)' },
    animationConfig: lightAnim({
      [head]: { type: 'scale-up', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [sub2]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: E.quintOut },
    }) });
  }

  return slides;
}

function tasklyTheme() {
  return { id: 'editorial', name: 'Taskly', category: 'Cinematic', tokens: { palette: { primary: '#0084FF', secondary: '#64748b', accent: '#0084FF', bg: '#FFFFFF', text: '#1a1a2e' }, typography: { titleFont: 'Fustat', bodyFont: 'Inter', titleSize: 56, bodySize: 17 }, radii: '16px', shadows: 'lg' }, previewColors: ['#0084FF', '#64748b', '#FFFFFF'] };
}

// ════════════════════════════════════════════
// TEMPLATE: AURA (Purple/Pink gradient — 5 slides)
// ════════════════════════════════════════════

function buildAura(): Slide[] {
  const fH = 'Instrument Sans', fSerif = 'Instrument Serif', fB = 'Instrument Sans';
  const fg = '#FFFFFF', sub = '#a0a0b8';
  const bg = { type: 'solid', value: '#010101' };
  const VA = 'https://customer-cbeadsgr09pnsezs.cloudflarestream.com/697945ca6b876878dba3b23fbd2f1561/manifest/video.m3u8';
  const gradPurple = 'linear-gradient(135deg, #FFFFFF 20%, #C967E8 60%, #983AD6 100%)';
  const slides: Slide[] = [];

  // S1: Hero — Gradient headline centered
  { const preH = gid(), mainH = gid(), subT = gid();
    slides.push({ id: gid(), elements: [...skeleton('', fB),
      txt(preH, '{{pre_headline}}', 560, 260, 800, 35, { fontSize: 14, fontWeight: '500', color: sub, fontFamily: fB, textAlign: 'center', letterSpacing: 0.5, zIndex: 15, textShadow: 'none' }),
      txt(mainH, '{{main_headline}}', 260, 320, 1400, 260, { fontSize: 72, fontWeight: '600', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -2, textGradient: gradPurple, zIndex: 15 }),
      txt(subT, '{{sub_headline}}', 460, 610, 1000, 100, { fontSize: 17, color: `${fg}cc`, fontFamily: fB, textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VA, type: 'hls', opacity: 0.6 },
    animationConfig: cineAnim({ [preH]: { type: 'fade-in', delay: 0.1, duration: 0.6, easing: E.expoOut }, [mainH]: { type: 'scale-up', delay: 0.2, duration: 0.6, easing: E.expoOut }, [subT]: { type: 'fade-in', delay: 0.4, duration: 0.6, easing: E.quintOut } }) }); }

  // S2: Problem + 3 stats
  { const l = gid(), h = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [...skeleton('02', fB),
      txt(l, '{{problem_label}}', 96, 130, 500, 22, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{problem_heading}}', 96, 180, 1600, 300, { fontSize: 46, fontWeight: '500', fontFamily: fH, color: fg, lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15 }),
      txt(s1v, '{{stat1_value}}', 96, 680, 540, 140, { fontSize: 88, fontWeight: '600', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, textGradient: gradPurple, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 96, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 700, 680, 540, 140, { fontSize: 88, fontWeight: '600', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, textGradient: gradPurple, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 700, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{stat3_value}}', 1300, 680, 540, 140, { fontSize: 88, fontWeight: '600', fontFamily: fH, color: fg, lineHeight: 0.96, letterSpacing: -2, textGradient: gradPurple, zIndex: 15 }),
      txt(s3l, '{{stat3_label}}', 1300, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[1], type: 'mp4', opacity: 0.7, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [s1v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut }, [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut }, [s3v]: { type: 'slide-up', delay: 0.8, duration: 0.6, easing: E.expoOut } }) }); }

  // S3: Solution — serif pre + gradient main
  { const preH = gid(), mainH = gid(), body = gid();
    slides.push({ id: gid(), elements: [...skeleton('03', fB),
      txt(preH, '{{solution_pre}}', 460, 290, 1000, 45, { fontSize: 30, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.1, zIndex: 15, textShadow: 'none' }),
      txt(mainH, '{{solution_headline}}', 260, 360, 1400, 200, { fontSize: 80, fontWeight: '600', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -2, textGradient: gradPurple, zIndex: 15 }),
      txt(body, '{{solution_body}}', 460, 590, 1000, 120, { fontSize: 16, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VA, type: 'hls', opacity: 0.5 },
    animationConfig: cineAnim({ [preH]: { type: 'fade-in', delay: 0.1, duration: 0.6, easing: E.expoOut }, [mainH]: { type: 'scale-up', delay: 0.2, duration: 0.6, easing: E.expoOut }, [body]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: E.quintOut } }) }); }

  // S4: Content left
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('04', fB),
      txt(l, '{{content_label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{content_heading}}', 96, 310, 1200, 320, { fontSize: 48, fontWeight: '500', fontFamily: fH, color: fg, lineHeight: 1.06, letterSpacing: -0.5, zIndex: 15 }),
      txt(b, '{{content_body}}', 96, 690, 780, 200, { fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.65, filter: 'brightness(0.5) saturate(1.2)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }) }); }

  // S5: Closing gradient
  { const preH = gid(), mainH = gid(), sub2 = gid();
    slides.push({ id: gid(), elements: [...skeleton('05', fB),
      txt(preH, '{{closing_pre}}', 460, 340, 1000, 45, { fontSize: 30, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.1, zIndex: 15, textShadow: 'none' }),
      txt(mainH, '{{closing_headline}}', 260, 410, 1400, 200, { fontSize: 80, fontWeight: '600', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -2, textGradient: gradPurple, zIndex: 15 }),
      txt(sub2, '{{closing_body}}', 510, 640, 900, 80, { fontSize: 17, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none' }),
    ], background: { type: 'solid', value: '#050510' }, videoBackground: { url: VA, type: 'hls', opacity: 0.55 },
    animationConfig: cineAnim({ [preH]: { type: 'fade-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [mainH]: { type: 'scale-up', delay: 0.25, duration: 0.6, easing: E.expoOut }, [sub2]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: E.quintOut } }) }); }

  return slides;
}

function auraTheme() {
  return { id: 'midnight', name: 'Aura', category: 'Cinematic', tokens: { palette: { primary: '#C967E8', secondary: '#a0a0b8', accent: '#983AD6', bg: '#010101', text: '#FFFFFF' }, typography: { titleFont: 'Instrument Sans', bodyFont: 'Instrument Sans', titleSize: 56, bodySize: 17 }, radii: '16px', shadows: 'lg' }, previewColors: ['#C967E8', '#983AD6', '#010101'] };
}

// ════════════════════════════════════════════
// TEMPLATE: APEX (Rubik Bold Uppercase — 5 slides)
// ════════════════════════════════════════════
// Brutalist, high-impact. ALL CAPS headings. Deep blue video bg.

function buildApex(): Slide[] {
  const f = 'Rubik';
  const fg = '#FFFFFF', sub = '#94a3b8';
  const bg = { type: 'solid', value: '#21346e' };
  const VX = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260206_044704_dd33cb15-c23f-4cfc-aa09-a0465d4dcb54.mp4';
  const slides: Slide[] = [];

  // S1: Hero — Massive 3-line uppercase title
  { const l1 = gid(), l2 = gid(), l3 = gid();
    slides.push({ id: gid(), elements: [
      txt(gid(), '{{logo}}', 96, 38, 200, 28, { fontSize: 14, fontWeight: '700', color: fg, fontFamily: f, letterSpacing: 2, zIndex: 20, textShadow: 'none' }),
      shp(gid(), 96, 82, 1728, 1, { fill: 'rgba(255,255,255,0.1)', zIndex: 5 }),
      txt(l1, '{{hero_line1}}', 96, 340, 1600, 170, { fontSize: 100, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 0.98, letterSpacing: -3, zIndex: 15 }),
      txt(l2, '{{hero_line2}}', 96, 510, 1600, 170, { fontSize: 100, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 0.98, letterSpacing: -3, zIndex: 15 }),
      txt(l3, '{{hero_line3}}', 96, 680, 1600, 170, { fontSize: 100, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 0.98, letterSpacing: -3, zIndex: 15 }),
    ], background: bg, videoBackground: { url: VX, type: 'mp4', opacity: 0.9, filter: 'brightness(0.7)' },
    animationConfig: cineAnim({ [l1]: { type: 'slide-up', delay: 0.2, duration: 0.7, easing: E.expoOut }, [l2]: { type: 'slide-up', delay: 0.3, duration: 0.7, easing: E.expoOut }, [l3]: { type: 'slide-up', delay: 0.4, duration: 0.7, easing: E.expoOut } }) }); }

  // S2: Problem + stats
  { const l = gid(), h = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid();
    slides.push({ id: gid(), elements: [...skeleton('02', f),
      txt(l, '{{problem_label}}', 96, 130, 500, 22, { fontSize: 12, fontWeight: '700', color: sub, fontFamily: f, letterSpacing: 3, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{problem_heading}}', 96, 180, 1500, 300, { fontSize: 48, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 1.04, letterSpacing: -1, zIndex: 15 }),
      txt(s1v, '{{stat1_value}}', 96, 700, 700, 140, { fontSize: 96, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -3, zIndex: 15 }),
      txt(s1l, '{{stat1_label}}', 96, 850, 600, 35, { fontSize: 14, fontWeight: '500', color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{stat2_value}}', 900, 700, 700, 140, { fontSize: 96, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 0.96, letterSpacing: -3, zIndex: 15 }),
      txt(s2l, '{{stat2_label}}', 900, 850, 600, 35, { fontSize: 14, fontWeight: '500', color: sub, fontFamily: f, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VX, type: 'mp4', opacity: 0.8, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [s1v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut }, [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut } }) }); }

  // S3: Statement — big bold centered
  { const h = gid();
    slides.push({ id: gid(), elements: [...skeleton('03', f),
      txt(h, '{{statement}}', 96, 300, 1728, 400, { fontSize: 60, fontWeight: '700', fontFamily: f, color: fg, textAlign: 'center', lineHeight: 1.04, letterSpacing: -1.5, zIndex: 15 }),
    ], background: bg, videoBackground: { url: VX, type: 'mp4', opacity: 0.85, filter: 'brightness(0.65)' },
    animationConfig: cineAnim({ [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 } }) }); }

  // S4: Content
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('04', f),
      txt(l, '{{content_label}}', 96, 280, 500, 22, { fontSize: 12, fontWeight: '700', color: sub, fontFamily: f, letterSpacing: 3, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{content_heading}}', 96, 330, 1200, 300, { fontSize: 52, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 1.04, letterSpacing: -1, zIndex: 15 }),
      txt(b, '{{content_body}}', 96, 680, 780, 200, { fontSize: 15, fontWeight: '400', color: sub, fontFamily: f, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VX, type: 'mp4', opacity: 0.75, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }) }); }

  // S5: Closing — 2-line bold bottom
  { const l1 = gid(), l2 = gid();
    slides.push({ id: gid(), elements: [...skeleton('05', f),
      txt(l1, '{{closing_line1}}', 96, 640, 1500, 150, { fontSize: 80, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 0.98, letterSpacing: -2, zIndex: 15 }),
      txt(l2, '{{closing_line2}}', 96, 790, 1500, 150, { fontSize: 80, fontWeight: '700', fontFamily: f, color: fg, lineHeight: 0.98, letterSpacing: -2, zIndex: 15 }),
    ], background: bg, videoBackground: { url: VX, type: 'mp4', opacity: 0.9, filter: 'brightness(0.7)' },
    animationConfig: cineAnim({ [l1]: { type: 'slide-up', delay: 0.2, duration: 0.7, easing: E.expoOut }, [l2]: { type: 'slide-up', delay: 0.35, duration: 0.7, easing: E.expoOut } }) }); }

  return slides;
}

function apexTheme() {
  return { id: 'midnight', name: 'Apex', category: 'Cinematic', tokens: { palette: { primary: '#FFFFFF', secondary: '#94a3b8', accent: '#FFFFFF', bg: '#21346e', text: '#FFFFFF' }, typography: { titleFont: 'Rubik', bodyFont: 'Rubik', titleSize: 60, bodySize: 16 }, radii: '0px', shadows: 'none' }, previewColors: ['#FFFFFF', '#21346e', '#000000'] };
}

// ════════════════════════════════════════════
// TEMPLATE: NEXORA (Light SaaS — 5 slides)
// ════════════════════════════════════════════

function buildNexora(): Slide[] {
  const fSerif = 'Instrument Serif', fB = 'Inter';
  const fg = '#2b3544', sub = '#7a8a9e', accent = '#4f46e5';
  const bg = { type: 'solid', value: '#FFFFFF' };
  const VN = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4';
  const slides: Slide[] = [];

  function lightSkel2(num: string): SlideElement[] {
    return [
      txt(gid(), '{{logo}}', 96, 38, 200, 28, { fontSize: 16, fontWeight: '600', color: fg, fontFamily: fB, letterSpacing: -0.5, zIndex: 20, textShadow: 'none' }),
      txt(gid(), num, 1790, 38, 40, 28, { fontSize: 16, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
      shp(gid(), 96, 80, 1728, 1, { fill: 'rgba(0,0,0,0.06)', zIndex: 5 }),
    ];
  }
  function lightA(ov: Record<string, any> = {}): Record<string, any> {
    return animCfg(ov, { transition: 'fade-cross', transitionDuration: 0.4, overlays: { vignette: false, vignetteIntensity: 0, filmGrain: false, filmGrainOpacity: 0, scrim: 'none' as const, scrimOpacity: 0 } });
  }

  // S1: Centered serif headline + badge + subtitle
  { const badge = gid(), h = gid(), sub2 = gid();
    slides.push({ id: gid(), elements: [...lightSkel2(''),
      txt(badge, '{{badge}}', 710, 240, 500, 30, { fontSize: 13, fontWeight: '500', color: sub, fontFamily: fB, textAlign: 'center', zIndex: 15, textShadow: 'none' }),
      txt(h, '{{headline}}', 260, 300, 1400, 260, { fontSize: 72, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -1, zIndex: 15, textShadow: 'none' }),
      txt(sub2, '{{subtitle}}', 410, 590, 1100, 100, { fontSize: 17, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VN, type: 'mp4', opacity: 0.25, filter: 'brightness(1.1) saturate(0.8)' },
    animationConfig: lightA({ [badge]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: E.expoOut }, [h]: { type: 'scale-up', delay: 0.15, duration: 0.6, easing: E.expoOut }, [sub2]: { type: 'fade-in', delay: 0.4, duration: 0.6, easing: E.quintOut } }) }); }

  // S2: Problem + 2 stats right
  { const l = gid(), h = gid(), sv = gid(), sl = gid(), sv2 = gid(), sl2 = gid();
    slides.push({ id: gid(), elements: [...lightSkel2('02'),
      txt(l, '{{label}}', 96, 260, 400, 22, { fontSize: 13, fontWeight: '500', color: accent, fontFamily: fB, letterSpacing: 0.5, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{heading}}', 96, 310, 900, 320, { fontSize: 46, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.08, zIndex: 15, textShadow: 'none' }),
      txt(sv, '{{stat1_value}}', 1100, 320, 700, 120, { fontSize: 80, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15, textShadow: 'none' }),
      txt(sl, '{{stat1_label}}', 1100, 450, 600, 35, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(sv2, '{{stat2_value}}', 1100, 540, 700, 120, { fontSize: 80, fontWeight: '400', fontFamily: fSerif, color: accent, lineHeight: 0.96, letterSpacing: -2, zIndex: 15, textShadow: 'none' }),
      txt(sl2, '{{stat2_label}}', 1100, 670, 600, 35, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    animationConfig: lightA({ [l]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [sv]: { type: 'slide-up', delay: 0.5, duration: 0.6, easing: E.expoOut }, [sv2]: { type: 'slide-up', delay: 0.65, duration: 0.6, easing: E.expoOut } }) }); }

  // S3: Full statement centered
  { const h = gid();
    slides.push({ id: gid(), elements: [...lightSkel2('03'),
      txt(h, '{{statement}}', 210, 340, 1500, 360, { fontSize: 52, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.1, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VN, type: 'mp4', opacity: 0.2, filter: 'brightness(1.1)' },
    animationConfig: lightA({ [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.04 } }) }); }

  // S4: Content left
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...lightSkel2('04'),
      txt(l, '{{label}}', 96, 260, 400, 22, { fontSize: 13, fontWeight: '500', color: accent, fontFamily: fB, letterSpacing: 0.5, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{heading}}', 96, 310, 1200, 300, { fontSize: 46, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.08, zIndex: 15, textShadow: 'none' }),
      txt(b, '{{body}}', 96, 670, 780, 200, { fontSize: 16, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg,
    animationConfig: lightA({ [l]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'fade-in', delay: 0.7, duration: 0.6, easing: E.quintOut } }) }); }

  // S5: Closing
  { const h = gid(), sub2 = gid();
    slides.push({ id: gid(), elements: [...lightSkel2('05'),
      txt(h, '{{closing}}', 260, 370, 1400, 240, { fontSize: 60, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.0, zIndex: 15, textShadow: 'none' }),
      txt(sub2, '{{closing_body}}', 460, 640, 1000, 80, { fontSize: 17, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VN, type: 'mp4', opacity: 0.2, filter: 'brightness(1.1)' },
    animationConfig: lightA({ [h]: { type: 'scale-up', delay: 0.15, duration: 0.6, easing: E.expoOut }, [sub2]: { type: 'fade-in', delay: 0.5, duration: 0.6, easing: E.quintOut } }) }); }

  return slides;
}

function nexoraTheme() {
  return { id: 'editorial', name: 'Nexora', category: 'Cinematic', tokens: { palette: { primary: '#4f46e5', secondary: '#7a8a9e', accent: '#4f46e5', bg: '#FFFFFF', text: '#2b3544' }, typography: { titleFont: 'Instrument Serif', bodyFont: 'Inter', titleSize: 52, bodySize: 17 }, radii: '8px', shadows: 'lg' }, previewColors: ['#4f46e5', '#7a8a9e', '#FFFFFF'] };
}

// ════════════════════════════════════════════
// TEMPLATE: VELORAH NAVY (Deep navy — 5 slides)
// ════════════════════════════════════════════

function buildVelorahNavy(): Slide[] {
  const fSerif = 'Instrument Serif', fB = 'Inter';
  const fg = '#FFFFFF', sub = '#9ca3af';
  const bg = { type: 'solid', value: '#0a1628' };
  const VVN = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4';
  const slides: Slide[] = [];

  // S1: Centered serif hero
  { const h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('', fB),
      txt(h, '{{hero_headline}}', 210, 280, 1500, 320, { fontSize: 88, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 0.95, letterSpacing: -2.5, zIndex: 15 }),
      txt(b, '{{hero_body}}', 510, 630, 900, 80, { fontSize: 17, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.65, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VVN, type: 'mp4', opacity: 0.85, filter: 'brightness(0.65)' },
    animationConfig: cineAnim({ [h]: { type: 'blur-in', delay: 0.15, duration: 1.0, easing: E.expoOut }, [b]: { type: 'fade-in', delay: 0.6, duration: 0.6, easing: E.quintOut } }) }); }

  // S2: Problem + stats
  { const l = gid(), h = gid(), s1v = gid(), s1l = gid(), s2v = gid(), s2l = gid(), s3v = gid(), s3l = gid();
    slides.push({ id: gid(), elements: [...skeleton('02', fB),
      txt(l, '{{label}}', 96, 130, 500, 22, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{heading}}', 96, 180, 1600, 300, { fontSize: 46, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.06, zIndex: 15 }),
      txt(s1v, '{{s1v}}', 96, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s1l, '{{s1l}}', 96, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s2v, '{{s2v}}', 700, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s2l, '{{s2l}}', 700, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(s3v, '{{s3v}}', 1300, 680, 540, 140, { fontSize: 88, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 0.96, letterSpacing: -2, zIndex: 15 }),
      txt(s3l, '{{s3l}}', 1300, 830, 500, 35, { fontSize: 15, color: fg, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VVN, type: 'mp4', opacity: 0.75, filter: 'brightness(0.55)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [s1v]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut }, [s2v]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut }, [s3v]: { type: 'slide-up', delay: 0.8, duration: 0.6, easing: E.expoOut } }) }); }

  // S3: Full serif statement
  { const h = gid();
    slides.push({ id: gid(), elements: [...skeleton('03', fB),
      txt(h, '{{statement}}', 160, 340, 1600, 360, { fontSize: 56, fontWeight: '400', fontFamily: fSerif, color: fg, textAlign: 'center', lineHeight: 1.1, zIndex: 15 }),
    ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[3], type: 'mp4', opacity: 0.7, filter: 'brightness(0.5) hue-rotate(10deg)' },
    animationConfig: cineAnim({ [h]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.04 } }) }); }

  // S4: Content
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('04', fB),
      txt(l, '{{label}}', 96, 260, 500, 22, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{heading}}', 96, 310, 1200, 320, { fontSize: 48, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.06, zIndex: 15 }),
      txt(b, '{{body}}', 96, 690, 780, 200, { fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VVN, type: 'mp4', opacity: 0.65, filter: 'brightness(0.5)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }) }); }

  // S5: Closing bottom
  { const l = gid(), h = gid(), b = gid();
    slides.push({ id: gid(), elements: [...skeleton('05', fB),
      txt(l, '{{label}}', 96, 640, 500, 22, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      txt(h, '{{heading}}', 96, 680, 1100, 240, { fontSize: 56, fontWeight: '400', fontFamily: fSerif, color: fg, lineHeight: 1.04, letterSpacing: -1, zIndex: 15 }),
      txt(b, '{{body}}', 96, 930, 700, 80, { fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: VVN, type: 'mp4', opacity: 0.8, filter: 'brightness(0.6)' },
    animationConfig: cineAnim({ [l]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut }, [h]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 }, [b]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut } }) }); }

  return slides;
}

function velorahNavyTheme() {
  return { id: 'midnight', name: 'Velorah Navy', category: 'Cinematic', tokens: { palette: { primary: '#FFFFFF', secondary: '#9ca3af', accent: '#FFFFFF', bg: '#0a1628', text: '#FFFFFF' }, typography: { titleFont: 'Instrument Serif', bodyFont: 'Inter', titleSize: 56, bodySize: 17 }, radii: '0px', shadows: 'none' }, previewColors: ['#FFFFFF', '#9ca3af', '#0a1628'] };
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
  {
    name: 'Lumina',
    slug: 'lumina',
    category: 'AI / Product',
    description: 'AI builder style with Instrument Serif + Sans, gradient headlines, blue accent, and centered hero layouts.',
    preset_id: 'midnight',
    slides: buildLumina(),
    theme: luminaTheme(),
    tags: ['ai', 'saas', 'product', 'builder', 'landing'],
    sort_order: 4,
  },
  {
    name: 'Velorah',
    slug: 'velorah',
    category: 'Creative / Brand',
    description: 'Elegant serif typography with Instrument Serif headlines over full cinematic video backgrounds.',
    preset_id: 'midnight',
    slides: buildVelorah(),
    theme: velorahTheme(),
    tags: ['creative', 'brand', 'elegant', 'serif', 'minimal'],
    sort_order: 5,
  },
  {
    name: 'Bloom',
    slug: 'bloom',
    category: 'Design / AI',
    description: 'Poppins + Source Serif 4 mixed typography. Floral AI aesthetic with dual-font headings.',
    preset_id: 'midnight',
    slides: buildBloom(),
    theme: bloomTheme(),
    tags: ['design', 'ai', 'creative', 'floral', 'modern'],
    sort_order: 6,
  },
  {
    name: 'Logoisum',
    slug: 'logoisum',
    category: 'Agency / Video',
    description: 'Video agency style with Barlow + Instrument Serif. Bold meets elegant with full-opacity video.',
    preset_id: 'midnight',
    slides: buildLogoisum(),
    theme: logoisumTheme(),
    tags: ['agency', 'video', 'production', 'creative', 'reels'],
    sort_order: 7,
  },
  {
    name: 'Fortune',
    slug: 'fortune',
    category: 'Agency / Corporate',
    description: 'Ultra-light Barlow + Italic Serif. Featured badge aesthetic with sharp corners and clean hierarchy.',
    preset_id: 'midnight',
    slides: buildFortune(),
    theme: fortuneTheme(),
    tags: ['agency', 'corporate', 'fortune', 'featured', 'premium'],
    sort_order: 8,
  },
  {
    name: 'Taskly',
    slug: 'taskly',
    category: 'SaaS / Product',
    description: 'Light theme SaaS with Fustat headlines, blue accent, and clean product-focused layouts.',
    preset_id: 'editorial',
    slides: buildTaskly(),
    theme: tasklyTheme(),
    tags: ['saas', 'product', 'light', 'clean', 'task', 'ai'],
    sort_order: 9,
  },
  {
    name: 'Aura',
    slug: 'aura',
    category: 'Agency / Startup',
    description: 'Purple-pink gradient accents with glassmorphism. Instrument Sans + gradient headlines on dark.',
    preset_id: 'midnight',
    slides: buildAura(),
    theme: auraTheme(),
    tags: ['agency', 'startup', 'gradient', 'purple', 'glassmorphism'],
    sort_order: 10,
  },
  {
    name: 'Apex',
    slug: 'apex',
    category: 'Bold / Creative',
    description: 'Rubik Bold uppercase on deep blue video. Brutalist, high-impact, minimal.',
    preset_id: 'midnight',
    slides: buildApex(),
    theme: apexTheme(),
    tags: ['bold', 'creative', 'uppercase', 'brutalist', 'design'],
    sort_order: 11,
  },
  {
    name: 'Nexora',
    slug: 'nexora',
    category: 'SaaS / Light',
    description: 'Light SaaS with Instrument Serif italic + Inter. Indigo accent, clean product aesthetic.',
    preset_id: 'editorial',
    slides: buildNexora(),
    theme: nexoraTheme(),
    tags: ['saas', 'light', 'product', 'clean', 'automation', 'indigo'],
    sort_order: 12,
  },
  {
    name: 'Velorah Navy',
    slug: 'velorah-navy',
    category: 'Creative / Dark',
    description: 'Deep navy blue Instrument Serif with muted contrast and cinematic video depth.',
    preset_id: 'midnight',
    slides: buildVelorahNavy(),
    theme: velorahNavyTheme(),
    tags: ['creative', 'dark', 'navy', 'serif', 'cinematic', 'elegant'],
    sort_order: 13,
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
