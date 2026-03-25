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
    },
  };
}

function shp(id: string, x: number, y: number, w: number, h: number, opts: any = {}): SlideElement {
  return {
    id, type: 'shape', content: '', x, y, width: w, height: h,
    rotation: 0, opacity: opts.opacity ?? 1, locked: false, visible: true,
    zIndex: opts.zIndex ?? 5,
    style: { shapeType: 'rectangle', shapeFill: opts.fill ?? 'rgba(255,255,255,0.06)', borderRadius: opts.borderRadius ?? 0 },
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

// ════════════════════════════════════════════
// TEMPLATE: NEXUS (SaaS/Tech Pitch — 8 slides)
// ════════════════════════════════════════════

function buildNexus(): Slide[] {
  const fH = 'General Sans', fB = 'Geist Sans';
  const fg = '#F2F2F3', sub = '#9CA0AE', acc = '#7C3AED';
  const glass = 'rgba(255,255,255,0.04)', brd = 'rgba(255,255,255,0.08)';
  const bg = { type: 'solid', value: '#0a0512' };
  const ov = { vignette: true, vignetteIntensity: 0.4, filmGrain: true, filmGrainOpacity: 0.03, scrim: 'bottom' as const, scrimOpacity: 0.55 };
  const radOv = { ...ov, scrim: 'radial' as const };
  const slides: Slide[] = [];

  // S1: Hero
  let ids = Array.from({length: 6}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{brand_name}}', 80, 50, 300, 30, { fontSize: 16, fontWeight: '600', color: fg, fontFamily: fB, letterSpacing: 0.5, zIndex: 20 }),
    shp(ids[1], 0, 95, 1920, 1, { fill: brd, zIndex: 5 }),
    txt(ids[2], '{{hero_word}}', 160, 260, 1600, 350, { fontSize: 200, fontWeight: '400', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 1.0, letterSpacing: -5, zIndex: 15 }),
    txt(ids[3], '{{hero_subtitle}}', 560, 640, 800, 80, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.7, zIndex: 15 }),
    shp(ids[4], 760, 760, 400, 60, { fill: glass, borderRadius: 30, opacity: 0.9, zIndex: 14 }),
    txt(ids[5], '{{hero_cta}}', 760, 770, 400, 40, { fontSize: 15, fontWeight: '500', color: fg, fontFamily: fB, textAlign: 'center', zIndex: 16 }),
  ], background: bg, videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.25, filter: 'brightness(0.4) saturate(0.8)' },
  animationConfig: animCfg({ [ids[0]]: { type: 'fade-in', delay: 0.05, duration: 0.4, easing: E.smooth }, [ids[2]]: { type: 'blur-in', delay: 0.2, duration: 1.2, easing: E.expoOut }, [ids[3]]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: E.expoOut }, [ids[4]]: { type: 'scale-up', delay: 1.1, duration: 0.6, easing: E.backOut }, [ids[5]]: { type: 'fade-in', delay: 1.2, duration: 0.5, easing: E.quintOut } }, { overlays: ov }) });

  // S2: Statement
  ids = Array.from({length: 2}, () => gid());
  slides.push({ id: gid(), elements: [
    shp(ids[0], 935, 280, 50, 50, { fill: acc, borderRadius: 25, opacity: 0.3, zIndex: 5 }),
    txt(ids[1], '{{statement}}', 200, 340, 1520, 300, { fontSize: 48, fontWeight: '500', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, zIndex: 15 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[1], type: 'mp4', opacity: 0.2, filter: 'brightness(0.35) saturate(0.7)' },
  animationConfig: animCfg({ [ids[0]]: { type: 'scale-up', delay: 0.1, duration: 0.6, easing: E.backOut }, [ids[1]]: { type: 'word-by-word', delay: 0.2, duration: 0.5, easing: E.expoOut, stagger: 0.04 } }, { overlays: radOv }) });

  // S3: Content + glass card
  ids = Array.from({length: 5}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{label}}', 96, 140, 400, 25, { fontSize: 11, fontWeight: '600', color: acc, fontFamily: fB, letterSpacing: 3, zIndex: 15 }),
    txt(ids[1], '{{title}}', 96, 200, 1100, 140, { fontSize: 48, fontWeight: '600', fontFamily: fH, color: fg, lineHeight: 1.08, letterSpacing: -1.2, zIndex: 15 }),
    txt(ids[2], '{{body}}', 96, 400, 820, 200, { fontSize: 17, color: sub, fontFamily: fB, lineHeight: 1.75, zIndex: 15 }),
    shp(ids[3], 1050, 200, 780, 400, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[4], '{{card_highlight}}', 1090, 240, 700, 320, { fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 12 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.15, filter: 'brightness(0.35)' },
  animationConfig: animCfg({ [ids[0]]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: E.quintOut }, [ids[1]]: { type: 'blur-in', delay: 0.2, duration: 0.8, easing: E.expoOut }, [ids[2]]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut }, [ids[3]]: { type: 'glass-reveal', delay: 0.3, duration: 0.7, easing: E.quintOut }, [ids[4]]: { type: 'blur-in', delay: 0.7, duration: 0.7, easing: E.expoOut } }) });

  // S4: Stats — 3 numbers
  ids = Array.from({length: 9}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{stats_header}}', 96, 150, 600, 35, { fontSize: 12, fontWeight: '600', color: acc, fontFamily: fB, letterSpacing: 3, zIndex: 15 }),
    txt(ids[1], '{{stat1_value}}', 96, 380, 500, 140, { fontSize: 88, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 1, zIndex: 15 }),
    txt(ids[2], '{{stat1_label}}', 96, 530, 400, 40, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15 }),
    shp(ids[3], 620, 370, 1, 200, { fill: brd, zIndex: 5 }),
    txt(ids[4], '{{stat2_value}}', 700, 380, 500, 140, { fontSize: 88, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 1, zIndex: 15 }),
    txt(ids[5], '{{stat2_label}}', 700, 530, 400, 40, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15 }),
    shp(ids[6], 1220, 370, 1, 200, { fill: brd, zIndex: 5 }),
    txt(ids[7], '{{stat3_value}}', 1300, 380, 500, 140, { fontSize: 88, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 1, zIndex: 15 }),
    txt(ids[8], '{{stat3_label}}', 1300, 530, 400, 40, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[3], type: 'mp4', opacity: 0.15, filter: 'brightness(0.3)' },
  animationConfig: animCfg({ [ids[1]]: { type: 'scale-up', delay: 0.25, duration: 0.7, easing: E.backOut }, [ids[4]]: { type: 'scale-up', delay: 0.4, duration: 0.7, easing: E.backOut }, [ids[7]]: { type: 'scale-up', delay: 0.55, duration: 0.7, easing: E.backOut } }) });

  // S5: Features — 3 glass cards
  ids = Array.from({length: 9}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{features_title}}', 96, 120, 800, 60, { fontSize: 12, fontWeight: '600', color: acc, fontFamily: fB, letterSpacing: 3, zIndex: 15 }),
    shp(ids[1], 96, 240, 560, 360, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[2], '{{feat1_title}}', 136, 280, 480, 50, { fontSize: 22, fontWeight: '600', fontFamily: fH, color: fg, zIndex: 12 }),
    txt(ids[3], '{{feat1_desc}}', 136, 345, 480, 200, { fontSize: 14, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 12 }),
    shp(ids[4], 680, 240, 560, 360, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[5], '{{feat2_title}}', 720, 280, 480, 50, { fontSize: 22, fontWeight: '600', fontFamily: fH, color: fg, zIndex: 12 }),
    txt(ids[6], '{{feat2_desc}}', 720, 345, 480, 200, { fontSize: 14, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 12 }),
    shp(ids[7], 1264, 240, 560, 360, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[8], '{{feat3_title}}', 1304, 280, 480, 50, { fontSize: 22, fontWeight: '600', fontFamily: fH, color: fg, zIndex: 12 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[0], type: 'mp4', opacity: 0.12, filter: 'brightness(0.3)' },
  animationConfig: animCfg({ [ids[1]]: { type: 'glass-reveal', delay: 0.2, duration: 0.7, easing: E.quintOut }, [ids[4]]: { type: 'glass-reveal', delay: 0.35, duration: 0.7, easing: E.quintOut }, [ids[7]]: { type: 'glass-reveal', delay: 0.5, duration: 0.7, easing: E.quintOut } }) });

  // S6: Social Proof
  ids = Array.from({length: 8}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{social_proof_title}}', 200, 300, 1520, 60, { fontSize: 13, fontWeight: '600', color: sub, fontFamily: fB, textAlign: 'center', letterSpacing: 3, zIndex: 15 }),
    txt(ids[1], '{{social_proof_subtitle}}', 400, 370, 1120, 50, { fontSize: 36, fontWeight: '600', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 1.15, zIndex: 15 }),
    shp(ids[2], 210, 520, 200, 60, { fill: glass, borderRadius: 12, zIndex: 8 }),
    shp(ids[3], 450, 520, 200, 60, { fill: glass, borderRadius: 12, zIndex: 8 }),
    shp(ids[4], 690, 520, 200, 60, { fill: glass, borderRadius: 12, zIndex: 8 }),
    shp(ids[5], 930, 520, 200, 60, { fill: glass, borderRadius: 12, zIndex: 8 }),
    shp(ids[6], 1170, 520, 200, 60, { fill: glass, borderRadius: 12, zIndex: 8 }),
    shp(ids[7], 1410, 520, 200, 60, { fill: glass, borderRadius: 12, zIndex: 8 }),
  ], background: bg, videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.18, filter: 'brightness(0.35) saturate(0.7)' },
  animationConfig: animCfg({ [ids[1]]: { type: 'blur-in', delay: 0.3, duration: 0.8, easing: E.expoOut } }, { overlays: radOv }) });

  // S7: Split — image + text
  ids = Array.from({length: 4}, () => gid());
  slides.push({ id: gid(), elements: [
    { id: ids[0], type: 'image', content: '{{image}}', x: 60, y: 60, width: 880, height: 960, rotation: 0, opacity: 1, locked: false, visible: true, zIndex: 8, style: { objectFit: 'cover', borderRadius: 24 } },
    shp(ids[1], 1000, 260, 4, 500, { fill: acc, opacity: 0.25, zIndex: 5 }),
    txt(ids[2], '{{title}}', 1060, 280, 780, 160, { fontSize: 42, fontWeight: '600', fontFamily: fH, color: fg, lineHeight: 1.1, letterSpacing: -1, zIndex: 15 }),
    txt(ids[3], '{{body}}', 1060, 480, 760, 280, { fontSize: 16, color: sub, fontFamily: fB, lineHeight: 1.75, zIndex: 15 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[1], type: 'mp4', opacity: 0.1, filter: 'brightness(0.25)' },
  animationConfig: animCfg({ [ids[0]]: { type: 'scale-up', delay: 0.2, duration: 0.9, easing: E.quintOut }, [ids[2]]: { type: 'blur-in', delay: 0.3, duration: 0.8, easing: E.expoOut }, [ids[3]]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: E.expoOut } }) });

  // S8: Closing CTA
  ids = Array.from({length: 5}, () => gid());
  slides.push({ id: gid(), elements: [
    shp(ids[0], 660, 280, 600, 200, { fill: acc, borderRadius: 300, opacity: 0.12, zIndex: 3 }),
    txt(ids[1], '{{closing_title}}', 260, 320, 1400, 200, { fontSize: 72, fontWeight: '600', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 1.05, letterSpacing: -2, zIndex: 15 }),
    txt(ids[2], '{{closing_subtitle}}', 510, 540, 900, 60, { fontSize: 17, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.6, zIndex: 15 }),
    shp(ids[3], 760, 650, 400, 60, { fill: acc, borderRadius: 30, opacity: 0.9, zIndex: 14 }),
    txt(ids[4], '{{closing_cta}}', 760, 660, 400, 40, { fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: fB, textAlign: 'center', zIndex: 16 }),
  ], background: bg, videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.25, filter: 'brightness(0.35)' },
  animationConfig: animCfg({ [ids[1]]: { type: 'blur-in', delay: 0.2, duration: 1.2, easing: E.quintOut }, [ids[2]]: { type: 'blur-in', delay: 0.7, duration: 0.8, easing: E.quintOut }, [ids[3]]: { type: 'scale-up', delay: 1.1, duration: 0.6, easing: E.backOut } }, { overlays: radOv }) });

  return slides;
}

// ════════════════════════════════════════════
// TEMPLATE: PRYSMA (Growth/Data — 6 slides)
// ════════════════════════════════════════════

function buildPrysma(): Slide[] {
  const fH = 'General Sans', fB = 'Geist Sans';
  const fg = '#F2F2F3', sub = '#9CA0AE', acc = '#7C3AED';
  const glass = 'rgba(255,255,255,0.04)', brd = 'rgba(255,255,255,0.08)';
  const bg = { type: 'solid', value: '#0a0512' };
  const ov = { vignette: true, vignetteIntensity: 0.35, filmGrain: true, filmGrainOpacity: 0.03, scrim: 'bottom' as const, scrimOpacity: 0.5 };
  const radOv = { ...ov, scrim: 'radial' as const };
  const slides: Slide[] = [];

  // S1: Hero
  let ids = Array.from({length: 5}, () => gid());
  slides.push({ id: gid(), elements: [
    shp(ids[0], 80, 50, 140, 32, { fill: acc, borderRadius: 16, opacity: 0.7, zIndex: 14 }),
    txt(gid(), '{{tag}}', 80, 55, 140, 22, { fontSize: 10, fontWeight: '600', color: '#FFFFFF', fontFamily: fB, textAlign: 'center', letterSpacing: 1.5, zIndex: 16 }),
    shp(ids[1], 0, 100, 1920, 1, { fill: brd, zIndex: 5 }),
    txt(ids[2], '{{title}}', 96, 550, 1200, 220, { fontSize: 72, fontWeight: '600', fontFamily: fH, color: fg, lineHeight: 1.05, letterSpacing: -2, zIndex: 15 }),
    txt(ids[3], '{{subtitle}}', 96, 800, 700, 70, { fontSize: 17, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15 }),
  ], background: bg, videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.2, filter: 'brightness(0.35) saturate(0.8)' },
  animationConfig: animCfg({ [ids[0]]: { type: 'scale-up', delay: 0.1, duration: 0.5, easing: E.backOut }, [ids[2]]: { type: 'clip-reveal', delay: 0.3, duration: 0.9, easing: E.cinematic }, [ids[3]]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut } }, { overlays: ov }) });

  // S2: Dashboard — 4 glass cards 2×2
  ids = Array.from({length: 12}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{metrics_header}}', 96, 100, 600, 35, { fontSize: 12, fontWeight: '600', color: acc, fontFamily: fB, letterSpacing: 3, zIndex: 15 }),
    shp(ids[1], 96, 200, 860, 340, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[2], '{{m1_value}}', 140, 250, 770, 120, { fontSize: 72, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 1, zIndex: 12 }),
    txt(ids[3], '{{m1_label}}', 140, 390, 770, 40, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 12 }),
    shp(ids[4], 980, 200, 860, 340, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[5], '{{m2_value}}', 1024, 250, 770, 120, { fontSize: 72, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 1, zIndex: 12 }),
    txt(ids[6], '{{m2_label}}', 1024, 390, 770, 40, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 12 }),
    shp(ids[7], 96, 564, 860, 340, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[8], '{{m3_value}}', 140, 614, 770, 120, { fontSize: 72, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 1, zIndex: 12 }),
    txt(ids[9], '{{m3_label}}', 140, 754, 770, 40, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 12 }),
    shp(ids[10], 980, 564, 860, 340, { fill: glass, borderRadius: 20, zIndex: 8 }),
    txt(ids[11], '{{m4_value}}', 1024, 614, 770, 120, { fontSize: 72, fontWeight: '700', fontFamily: fH, color: fg, lineHeight: 1, zIndex: 12 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[1], type: 'mp4', opacity: 0.1, filter: 'brightness(0.25)' },
  animationConfig: animCfg({ [ids[1]]: { type: 'glass-reveal', delay: 0.2, duration: 0.6, easing: E.quintOut }, [ids[4]]: { type: 'glass-reveal', delay: 0.3, duration: 0.6, easing: E.quintOut }, [ids[7]]: { type: 'glass-reveal', delay: 0.4, duration: 0.6, easing: E.quintOut }, [ids[10]]: { type: 'glass-reveal', delay: 0.5, duration: 0.6, easing: E.quintOut } }) });

  // S3: Content
  ids = Array.from({length: 3}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{label}}', 96, 160, 400, 25, { fontSize: 11, fontWeight: '600', color: acc, fontFamily: fB, letterSpacing: 3, zIndex: 15 }),
    txt(ids[1], '{{title}}', 96, 230, 1100, 140, { fontSize: 48, fontWeight: '600', fontFamily: fH, color: fg, lineHeight: 1.08, letterSpacing: -1.2, zIndex: 15 }),
    txt(ids[2], '{{body}}', 96, 430, 900, 300, { fontSize: 17, color: sub, fontFamily: fB, lineHeight: 1.8, zIndex: 15 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.15, filter: 'brightness(0.35)' },
  animationConfig: animCfg({ [ids[1]]: { type: 'blur-in', delay: 0.2, duration: 0.8, easing: E.expoOut }, [ids[2]]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut } }) });

  // S4: Testimonial
  ids = Array.from({length: 5}, () => gid());
  slides.push({ id: gid(), elements: [
    shp(ids[0], 260, 200, 1400, 580, { fill: glass, borderRadius: 32, zIndex: 8 }),
    txt(ids[1], '"', 320, 230, 100, 120, { fontSize: 120, fontWeight: '400', fontFamily: fH, color: acc, opacity: 0.3, zIndex: 12 }),
    txt(ids[2], '{{testimonial_quote}}', 340, 340, 1240, 220, { fontSize: 32, fontWeight: '500', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 1.35, zIndex: 12 }),
    txt(ids[3], '{{testimonial_author}}', 660, 600, 600, 30, { fontSize: 16, fontWeight: '600', color: fg, fontFamily: fB, textAlign: 'center', zIndex: 12 }),
    txt(ids[4], '{{testimonial_role}}', 660, 635, 600, 25, { fontSize: 13, color: sub, fontFamily: fB, textAlign: 'center', zIndex: 12 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[3], type: 'mp4', opacity: 0.15, filter: 'brightness(0.3)' },
  animationConfig: animCfg({ [ids[0]]: { type: 'glass-reveal', delay: 0.15, duration: 0.8, easing: E.quintOut }, [ids[2]]: { type: 'blur-in', delay: 0.35, duration: 0.9, easing: E.expoOut }, [ids[3]]: { type: 'blur-in', delay: 0.8, duration: 0.6, easing: E.quintOut } }, { overlays: radOv }) });

  // S5: Process timeline
  ids = Array.from({length: 9}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '{{process_title}}', 96, 140, 800, 50, { fontSize: 12, fontWeight: '600', color: acc, fontFamily: fB, letterSpacing: 3, zIndex: 15 }),
    shp(ids[1], 96, 440, 1728, 2, { fill: brd, zIndex: 5 }),
    txt(ids[2], '01', 140, 370, 60, 40, { fontSize: 28, fontWeight: '700', fontFamily: fH, color: acc, zIndex: 15 }),
    txt(ids[3], '{{step1}}', 96, 480, 380, 120, { fontSize: 16, color: sub, fontFamily: fB, lineHeight: 1.6, zIndex: 15 }),
    txt(ids[4], '02', 596, 370, 60, 40, { fontSize: 28, fontWeight: '700', fontFamily: fH, color: acc, zIndex: 15 }),
    txt(ids[5], '{{step2}}', 556, 480, 380, 120, { fontSize: 16, color: sub, fontFamily: fB, lineHeight: 1.6, zIndex: 15 }),
    txt(ids[6], '03', 1056, 370, 60, 40, { fontSize: 28, fontWeight: '700', fontFamily: fH, color: acc, zIndex: 15 }),
    txt(ids[7], '{{step3}}', 1016, 480, 380, 120, { fontSize: 16, color: sub, fontFamily: fB, lineHeight: 1.6, zIndex: 15 }),
    txt(ids[8], '04', 1516, 370, 60, 40, { fontSize: 28, fontWeight: '700', fontFamily: fH, color: acc, zIndex: 15 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[0], type: 'mp4', opacity: 0.1, filter: 'brightness(0.25)' },
  animationConfig: animCfg({ [ids[2]]: { type: 'scale-up', delay: 0.25, duration: 0.5, easing: E.backOut }, [ids[4]]: { type: 'scale-up', delay: 0.4, duration: 0.5, easing: E.backOut }, [ids[6]]: { type: 'scale-up', delay: 0.55, duration: 0.5, easing: E.backOut }, [ids[8]]: { type: 'scale-up', delay: 0.7, duration: 0.5, easing: E.backOut } }) });

  // S6: Closing
  ids = Array.from({length: 5}, () => gid());
  slides.push({ id: gid(), elements: [
    shp(ids[0], 660, 300, 600, 180, { fill: acc, borderRadius: 300, opacity: 0.1, zIndex: 3 }),
    txt(ids[1], '{{closing_title}}', 260, 340, 1400, 180, { fontSize: 64, fontWeight: '600', fontFamily: fH, color: fg, textAlign: 'center', lineHeight: 1.08, letterSpacing: -1.5, zIndex: 15 }),
    txt(ids[2], '{{closing_subtitle}}', 460, 550, 1000, 50, { fontSize: 17, color: sub, fontFamily: fB, textAlign: 'center', lineHeight: 1.6, zIndex: 15 }),
    shp(ids[3], 760, 650, 400, 60, { fill: acc, borderRadius: 30, opacity: 0.9, zIndex: 14 }),
    txt(ids[4], '{{closing_cta}}', 760, 660, 400, 40, { fontSize: 15, fontWeight: '600', color: '#FFFFFF', fontFamily: fB, textAlign: 'center', zIndex: 16 }),
  ], background: bg, videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.22, filter: 'brightness(0.35)' },
  animationConfig: animCfg({ [ids[1]]: { type: 'blur-in', delay: 0.2, duration: 1.0, easing: E.quintOut }, [ids[2]]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.quintOut }, [ids[3]]: { type: 'scale-up', delay: 1.0, duration: 0.6, easing: E.backOut } }, { overlays: radOv }) });

  return slides;
}

// ══════════════════════════════
// THEME BUILDERS
// ══════════════════════════════

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
