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

// ════════════════════════════════════════════
// TEMPLATE: NEXUS (SaaS/Tech Pitch — 8 slides)
// ════════════════════════════════════════════

function buildNexus(): Slide[] {
  const fH = 'General Sans', fB = 'Geist Sans';
  const fg = '#F2F2F3', sub = '#9CA0AE', acc = '#7C3AED';
  const bg = { type: 'solid', value: '#0a0512' };
  // Gradient for hero text: white → blue (like reference "Grow")
  const heroGradient = 'linear-gradient(223deg, #E8E8E9 0%, #3A7BBF 104%)';
  const ov = { vignette: true, vignetteIntensity: 0.4, filmGrain: true, filmGrainOpacity: 0.03, scrim: 'bottom' as const, scrimOpacity: 0.55 };
  const radOv = { ...ov, scrim: 'radial' as const };
  const slides: Slide[] = [];

  // S1: Hero — Giant gradient word + subtitle + glass CTA (matching reference)
  let ids = Array.from({length: 7}, () => gid());
  slides.push({ id: gid(), elements: [
    // Nav: brand name top-left
    txt(ids[0], '{{brand_name}}', 80, 45, 300, 30, { fontSize: 18, fontWeight: '600', color: fg, fontFamily: fB, letterSpacing: -0.3, zIndex: 20 }),
    // Nav links top-center (decorative)
    txt(ids[6], 'Features    Solutions    Plans    Learning', 560, 48, 800, 25, { fontSize: 14, fontWeight: '400', color: `${sub}99`, fontFamily: fB, textAlign: 'center', letterSpacing: 0.5, zIndex: 20 }),
    // Divider line
    shp(ids[1], 0, 90, 1920, 1, { fill: 'rgba(255,255,255,0.06)', zIndex: 5 }),
    // GIANT gradient headline — the star of the slide
    txt(ids[2], '{{hero_word}}', 60, 220, 1800, 380, {
      fontSize: 220, fontWeight: '400', fontFamily: fH, textAlign: 'center',
      lineHeight: 1.02, letterSpacing: -6,
      textGradient: heroGradient,  // Gradient text like "Grow"
      glowColor: 'rgba(58, 123, 191, 0.15)', glowSize: 100,
      zIndex: 15,
    }),
    // Subtitle — muted, centered
    txt(ids[3], '{{hero_subtitle}}', 560, 620, 800, 70, {
      fontSize: 17, color: `${sub}cc`, fontFamily: fB, textAlign: 'center',
      lineHeight: 1.8, zIndex: 15,
      textShadow: 'none',
    }),
    // Glass CTA pill
    shp(ids[4], 760, 730, 400, 56, { glass: true, glassBlur: 4, glassOpacity: 0.01, borderRadius: 28, zIndex: 14 }),
    txt(ids[5], '{{hero_cta}}', 760, 742, 400, 32, { fontSize: 15, fontWeight: '500', color: fg, fontFamily: fB, textAlign: 'center', zIndex: 16, textShadow: 'none' }),
  ], background: bg, videoBackground: { url: NEXUS_VIDEO, type: 'mp4', opacity: 0.3, filter: 'brightness(0.45) saturate(0.85)' },
  animationConfig: animCfg({
    [ids[0]]: { type: 'fade-in', delay: 0.05, duration: 0.4, easing: E.smooth },
    [ids[6]]: { type: 'fade-in', delay: 0.1, duration: 0.5, easing: E.smooth },
    [ids[2]]: { type: 'blur-in', delay: 0.15, duration: 1.4, easing: E.expoOut },
    [ids[3]]: { type: 'blur-in', delay: 0.7, duration: 0.9, easing: E.expoOut },
    [ids[4]]: { type: 'scale-up', delay: 1.1, duration: 0.6, easing: E.backOut },
    [ids[5]]: { type: 'fade-in', delay: 1.2, duration: 0.5, easing: E.quintOut },
  }, { overlays: ov }) });

  // S2: Problem Statement — Big text + stat cards at bottom (like reference slide 2)
  ids = Array.from({length: 8}, () => gid());
  slides.push({ id: gid(), elements: [
    // Subtitle label
    txt(ids[0], '{{problem_label}}', 96, 140, 400, 25, { fontSize: 13, fontWeight: '400', color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    // Slide number
    txt(ids[7], '02', 1780, 140, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 15, textShadow: 'none' }),
    // Divider
    shp(ids[6], 96, 185, 1728, 1, { fill: 'rgba(255,255,255,0.12)', zIndex: 5 }),
    // Main heading — large, wrapping
    txt(ids[1], '{{problem_statement}}', 96, 220, 1600, 250, {
      fontSize: 48, fontWeight: '400', fontFamily: fH, color: fg,
      lineHeight: 1.06, letterSpacing: -1,
      textShadow: '0 2px 30px rgba(0,0,0,0.4)', zIndex: 15,
    }),
    // Stat cards at bottom — 3 columns
    txt(ids[2], '{{stat1_value}}', 96, 700, 520, 130, {
      fontSize: 88, fontWeight: '400', fontFamily: fH, color: fg,
      lineHeight: 0.96, letterSpacing: -2, zIndex: 15,
    }),
    txt(ids[3], '{{stat1_label}}', 96, 840, 520, 40, { fontSize: 16, color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
    txt(ids[4], '{{stat2_value}}', 680, 700, 520, 130, {
      fontSize: 88, fontWeight: '400', fontFamily: fH, color: fg,
      lineHeight: 0.96, letterSpacing: -2, zIndex: 15,
    }),
    txt(ids[5], '{{stat2_label}}', 680, 840, 520, 40, { fontSize: 16, color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[1], type: 'mp4', opacity: 0.35, filter: 'brightness(0.5)' },
  animationConfig: animCfg({
    [ids[0]]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
    [ids[1]]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
    [ids[2]]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut },
    [ids[3]]: { type: 'fade-in', delay: 0.75, duration: 0.5, easing: E.quintOut },
    [ids[4]]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut },
    [ids[5]]: { type: 'fade-in', delay: 0.85, duration: 0.5, easing: E.quintOut },
  }, { overlays: ov }) });

  // S3: Content — label + big heading + body text (full-width cinematic style)
  ids = Array.from({length: 5}, () => gid());
  slides.push({ id: gid(), elements: [
    // Slide number
    txt(ids[4], '03', 1780, 36, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
    // Subtitle label
    txt(ids[0], '{{content_label}}', 96, 160, 600, 25, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    // Big heading
    txt(ids[1], '{{content_heading}}', 96, 220, 1500, 280, {
      fontSize: 56, fontWeight: '400', fontFamily: fH, color: fg,
      lineHeight: 1.04, letterSpacing: -1,
      textShadow: '0 2px 30px rgba(0,0,0,0.4)', zIndex: 15,
    }),
    // Body paragraph
    txt(ids[2], '{{content_body}}', 96, 560, 780, 200, {
      fontSize: 16, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15,
      textShadow: 'none',
    }),
    // Divider
    shp(ids[3], 96, 195, 1728, 1, { fill: 'rgba(255,255,255,0.12)', zIndex: 5 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[2], type: 'mp4', opacity: 0.4, filter: 'brightness(0.5) saturate(0.9)' },
  animationConfig: animCfg({
    [ids[0]]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
    [ids[1]]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
    [ids[2]]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut },
  }) });

  // S4: Sales/Distribution — Vertically centered big text, video takes the right half
  ids = Array.from({length: 5}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '04', 1780, 36, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
    txt(ids[1], '{{distribution_label}}', 96, 350, 500, 25, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    txt(ids[2], '{{distribution_heading}}', 96, 400, 1100, 300, {
      fontSize: 64, fontWeight: '400', fontFamily: fH, color: fg,
      lineHeight: 1.04, letterSpacing: -1.5,
      textShadow: '0 4px 40px rgba(0,0,0,0.5)', zIndex: 15,
    }),
    txt(ids[3], '{{distribution_body}}', 96, 740, 780, 150, {
      fontSize: 16, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15,
      textShadow: 'none',
    }),
    shp(ids[4], 96, 385, 1728, 1, { fill: 'rgba(255,255,255,0.12)', zIndex: 5 }),
  ], background: bg, videoBackground: { url: ABSTRACT_VIDEOS[3], type: 'mp4', opacity: 0.5, filter: 'brightness(0.5)' },
  animationConfig: animCfg({
    [ids[1]]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
    [ids[2]]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
    [ids[3]]: { type: 'blur-in', delay: 1.0, duration: 0.8, easing: E.expoOut },
  }) });

  // S5: Global/Expansion — Bottom-aligned text, video fills most of slide
  ids = Array.from({length: 4}, () => gid());
  slides.push({ id: gid(), elements: [
    txt(ids[0], '05', 1780, 36, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
    shp(ids[3], 96, 90, 1728, 1, { fill: 'rgba(255,255,255,0.12)', zIndex: 5 }),
    txt(ids[1], '{{expansion_label}}', 96, 740, 500, 25, { fontSize: 13, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
    txt(ids[2], '{{expansion_heading}}', 96, 790, 1000, 200, {
      fontSize: 64, fontWeight: '400', fontFamily: fH, color: fg,
      lineHeight: 1.04, letterSpacing: -1.5,
      textShadow: '0 4px 40px rgba(0,0,0,0.5)', zIndex: 15,
    }),
  ], background: { type: 'solid', value: '#131318' },
  videoBackground: { url: ABSTRACT_VIDEOS[0], type: 'mp4', opacity: 0.6, filter: 'brightness(0.5)' },
  animationConfig: animCfg({
    [ids[1]]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
    [ids[2]]: { type: 'word-by-word', delay: 0.2, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
  }, { overlays: { ...ov, scrimOpacity: 0.7 } }) });

  // No more S6/S7/S8 — the Nexus template now has 5 slides matching the reference quality.
  // Each slide has: full video bg, big cinematic text, proper spacing.

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

// ════════════════════════════════════════════
// TEMPLATE: VIKTORY (Investor Deck — 5 slides)
// ════════════════════════════════════════════
// Black bg, Aeonik font, HLS Mux videos, fade-through-black transitions.
// Each slide: full video bg + big cinematic text + metadata.

function buildViktory(): Slide[] {
  const fH = 'Aeonik', fB = 'Aeonik';
  const fg = '#FFFFFF', sub = '#80838e';
  const bg = { type: 'solid', value: '#000000' };
  const ov = { vignette: true, vignetteIntensity: 0.3, filmGrain: true, filmGrainOpacity: 0.03, scrim: 'none' as const, scrimOpacity: 0 };
  const btmOv = { ...ov, scrim: 'bottom' as const, scrimOpacity: 0.4 };
  const slides: Slide[] = [];

  // Mux HLS video URLs
  const V1 = 'https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8';
  const V2 = 'https://stream.mux.com/s8pMcOvMQXc4GD6AX4e1o01xFogFxipmuKltNfSYza0200.m3u8';
  const V3 = 'https://stream.mux.com/Gs3wZfrtz6ZfqZqQ02c02Z7lugV00FGZvRpcqFTel66r3g.m3u8';
  const V4 = 'https://stream.mux.com/PkFsoKeakRLgL01gjf02CRcSbsJ600Z00NvLr9eRZ92pLbA.m3u8';
  const V5 = 'https://stream.mux.com/BuGGTsiXq1T00WUb8qfURrHkTCbhrkfFLSv4uAOZzdhw.m3u8';

  // ─── S1: Title — "Innovation and Growth" ───
  // Full video bg, metadata bar top, two-line heading at bottom
  {
    const ids = Array.from({length: 8}, () => gid());
    slides.push({ id: gid(), elements: [
      // Metadata items (top-right) — Type, Investor, Date, Industry
      txt(ids[0], '{{meta_type_label}}', 920, 38, 100, 16, { fontSize: 10, color: sub, fontFamily: fB, zIndex: 20, textShadow: 'none' }),
      txt(ids[1], '{{meta_type_value}}', 920, 56, 180, 18, { fontSize: 10, color: fg, fontFamily: fB, zIndex: 20, textShadow: 'none' }),
      txt(ids[2], '{{meta_investor_label}}', 1150, 38, 100, 16, { fontSize: 10, color: sub, fontFamily: fB, zIndex: 20, textShadow: 'none' }),
      txt(ids[3], '{{meta_investor_value}}', 1150, 56, 180, 18, { fontSize: 10, color: fg, fontFamily: fB, zIndex: 20, textShadow: 'none' }),
      // Divider
      shp(ids[4], 96, 90, 1728, 1, { fill: 'rgba(255,255,255,0.15)', zIndex: 5 }),
      // Two-line title — bottom-left, massive
      txt(ids[5], '{{title_line1}}', 96, 700, 1400, 160, {
        fontSize: 120, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 0.9, letterSpacing: -2,
        textShadow: '0 4px 40px rgba(0,0,0,0.5)', zIndex: 15,
      }),
      txt(ids[6], '{{title_line2}}', 96, 850, 1400, 140, {
        fontSize: 120, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 0.9, letterSpacing: -2,
        textShadow: '0 4px 40px rgba(0,0,0,0.5)', zIndex: 15,
      }),
    ], background: bg, videoBackground: { url: V1, type: 'hls', opacity: 1.0 },
    animationConfig: animCfg({
      [ids[4]]: { type: 'fade-in', delay: 0.05, duration: 0.4, easing: E.smooth },
      [ids[0]]: { type: 'blur-in', delay: 0.1, duration: 0.6, easing: E.expoOut },
      [ids[1]]: { type: 'blur-in', delay: 0.12, duration: 0.6, easing: E.expoOut },
      [ids[2]]: { type: 'blur-in', delay: 0.14, duration: 0.6, easing: E.expoOut },
      [ids[3]]: { type: 'blur-in', delay: 0.16, duration: 0.6, easing: E.expoOut },
      [ids[5]]: { type: 'slide-up', delay: 0.3, duration: 0.7, easing: E.expoOut },
      [ids[6]]: { type: 'slide-up', delay: 0.4, duration: 0.7, easing: E.expoOut },
    }, { overlays: btmOv, transition: 'fade-through-black', transitionDuration: 0.35 }) });
  }

  // ─── S2: Problem Statement + Stat Cards ───
  // Subtitle + big heading top, 3 stat cards at bottom
  {
    const ids = Array.from({length: 10}, () => gid());
    slides.push({ id: gid(), elements: [
      // Slide number top-right
      txt(ids[0], '02', 1780, 38, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
      // Divider
      shp(ids[9], 96, 90, 1728, 1, { fill: 'rgba(255,255,255,0.15)', zIndex: 5 }),
      // Subtitle
      txt(ids[1], '{{problem_label}}', 96, 130, 400, 25, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      // Main heading — big, flowing text
      txt(ids[2], '{{problem_statement}}', 96, 180, 1600, 260, {
        fontSize: 48, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 1.04, letterSpacing: -0.5,
        textShadow: '0 2px 20px rgba(0,0,0,0.3)', zIndex: 15,
      }),
      // 3 Stat cards at bottom — massive numbers
      txt(ids[3], '{{stat1_value}}', 96, 660, 560, 140, {
        fontSize: 96, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 0.96, letterSpacing: -2, zIndex: 15,
      }),
      txt(ids[4], '{{stat1_label}}', 96, 810, 500, 40, { fontSize: 16, color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(ids[5], '{{stat2_value}}', 700, 660, 560, 140, {
        fontSize: 96, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 0.96, letterSpacing: -2, zIndex: 15,
      }),
      txt(ids[6], '{{stat2_label}}', 700, 810, 500, 40, { fontSize: 16, color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
      txt(ids[7], '{{stat3_value}}', 1300, 660, 560, 140, {
        fontSize: 96, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 0.96, letterSpacing: -2, zIndex: 15,
      }),
      txt(ids[8], '{{stat3_label}}', 1300, 810, 500, 40, { fontSize: 16, color: fg, fontFamily: fB, lineHeight: 1.4, zIndex: 15, textShadow: 'none' }),
    ], background: bg, videoBackground: { url: V2, type: 'hls', opacity: 1.0 },
    animationConfig: animCfg({
      [ids[1]]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [ids[2]]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [ids[3]]: { type: 'slide-up', delay: 0.6, duration: 0.6, easing: E.expoOut },
      [ids[4]]: { type: 'fade-in', delay: 0.7, duration: 0.5, easing: E.quintOut },
      [ids[5]]: { type: 'slide-up', delay: 0.7, duration: 0.6, easing: E.expoOut },
      [ids[6]]: { type: 'fade-in', delay: 0.8, duration: 0.5, easing: E.quintOut },
      [ids[7]]: { type: 'slide-up', delay: 0.8, duration: 0.6, easing: E.expoOut },
      [ids[8]]: { type: 'fade-in', delay: 0.9, duration: 0.5, easing: E.quintOut },
    }, { overlays: btmOv, transition: 'fade-through-black', transitionDuration: 0.35 }) });
  }

  // ─── S3: Market Opportunity ───
  // Text on left half, video at 50% opacity (flipped), gradient accent
  {
    const ids = Array.from({length: 6}, () => gid());
    slides.push({ id: gid(), elements: [
      txt(ids[0], '03', 1780, 38, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
      shp(ids[5], 96, 90, 1728, 1, { fill: 'rgba(255,255,255,0.15)', zIndex: 5 }),
      // Subtitle
      txt(ids[1], '{{market_label}}', 96, 140, 400, 25, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      // Heading — left half only
      txt(ids[2], '{{market_heading}}', 96, 190, 1000, 260, {
        fontSize: 44, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 1.04, letterSpacing: -0.5,
        textShadow: '0 2px 20px rgba(0,0,0,0.3)', zIndex: 15,
      }),
      // Body paragraph
      txt(ids[3], '{{market_body}}', 96, 500, 900, 200, {
        fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
      // Gradient accent shape — represents chart area (right side)
      shp(ids[4], 1050, 400, 800, 500, {
        fill: 'rgba(130, 56, 220, 0.08)', borderRadius: 20, zIndex: 3,
        boxShadow: '0 0 120px rgba(130, 56, 220, 0.15)',
      }),
    ], background: bg, videoBackground: { url: V3, type: 'hls', opacity: 0.5, filter: 'none', transform: 'scale(-1, -1)' },
    animationConfig: animCfg({
      [ids[1]]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [ids[2]]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [ids[3]]: { type: 'blur-in', delay: 0.8, duration: 0.8, easing: E.expoOut },
      [ids[4]]: { type: 'fade-in', delay: 0.7, duration: 1.0, easing: E.quintOut },
    }, { overlays: btmOv, transition: 'fade-through-black', transitionDuration: 0.35 }) });
  }

  // ─── S4: Sales & Distribution ───
  // Vertically centered text, video on right half (offset)
  {
    const ids = Array.from({length: 5}, () => gid());
    slides.push({ id: gid(), elements: [
      txt(ids[0], '04', 1780, 38, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
      shp(ids[4], 96, 90, 1728, 1, { fill: 'rgba(255,255,255,0.15)', zIndex: 5 }),
      // Subtitle
      txt(ids[1], '{{sales_label}}', 96, 340, 500, 25, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      // Big heading — vertically centered, takes left 65%
      txt(ids[2], '{{sales_heading}}', 96, 390, 1200, 300, {
        fontSize: 64, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 1.04, letterSpacing: -1,
        textShadow: '0 4px 40px rgba(0,0,0,0.5)', zIndex: 15,
      }),
      // Body
      txt(ids[3], '{{sales_body}}', 96, 730, 780, 150, {
        fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: bg, videoBackground: { url: V4, type: 'hls', opacity: 1.0 },
    animationConfig: animCfg({
      [ids[1]]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [ids[2]]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [ids[3]]: { type: 'blur-in', delay: 1.2, duration: 0.8, easing: E.expoOut },
    }, { overlays: btmOv, transition: 'fade-through-black', transitionDuration: 0.35 }) });
  }

  // ─── S5: Global Expansion ───
  // bg-[#131318], video 200% anchored bottom-left, text at bottom
  {
    const ids = Array.from({length: 5}, () => gid());
    slides.push({ id: gid(), elements: [
      txt(ids[0], '05', 1780, 38, 50, 28, { fontSize: 18, color: sub, fontFamily: fB, textAlign: 'right', zIndex: 20, textShadow: 'none' }),
      shp(ids[4], 96, 90, 1728, 1, { fill: 'rgba(255,255,255,0.15)', zIndex: 5 }),
      // Subtitle at bottom
      txt(ids[1], '{{global_label}}', 96, 700, 500, 25, { fontSize: 15, color: sub, fontFamily: fB, zIndex: 15, textShadow: 'none' }),
      // Big heading at bottom
      txt(ids[2], '{{global_heading}}', 96, 750, 1000, 200, {
        fontSize: 64, fontWeight: '400', fontFamily: fH, color: fg,
        lineHeight: 1.04, letterSpacing: -1,
        textShadow: '0 4px 40px rgba(0,0,0,0.5)', zIndex: 15,
      }),
      // Body
      txt(ids[3], '{{global_body}}', 96, 940, 680, 80, {
        fontSize: 15, color: sub, fontFamily: fB, lineHeight: 1.7, zIndex: 15, textShadow: 'none',
      }),
    ], background: { type: 'solid', value: '#131318' },
    videoBackground: { url: V5, type: 'hls', opacity: 0.8 },
    animationConfig: animCfg({
      [ids[1]]: { type: 'blur-in', delay: 0.15, duration: 0.6, easing: E.expoOut },
      [ids[2]]: { type: 'word-by-word', delay: 0.25, duration: 0.55, easing: E.expoOut, stagger: 0.035 },
      [ids[3]]: { type: 'blur-in', delay: 0.6, duration: 0.8, easing: E.expoOut },
    }, { overlays: { ...btmOv, scrimOpacity: 0.6 }, transition: 'fade-through-black', transitionDuration: 0.35 }) });
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
