import { CinematicPreset, AnimationRule, SlideOverlays, CINEMATIC_EASINGS } from '@/types/cinematic';

// Shorthand for easing curves
const EXPO_OUT = CINEMATIC_EASINGS.expoOut;
const QUINT_OUT = CINEMATIC_EASINGS.quintOut;
const BOUNCE = CINEMATIC_EASINGS.bounce;
const CINEMATIC = CINEMATIC_EASINGS.cinematic;
const SMOOTH = CINEMATIC_EASINGS.smooth;

// Default overlay configs
const DARK_OVERLAYS: SlideOverlays = {
  vignette: true,
  vignetteIntensity: 0.35,
  filmGrain: true,
  filmGrainOpacity: 0.04,
  scrim: 'bottom',
  scrimOpacity: 0.5,
};

const MINIMAL_OVERLAYS: SlideOverlays = {
  vignette: true,
  vignetteIntensity: 0.25,
  filmGrain: false,
  filmGrainOpacity: 0,
  scrim: 'bottom',
  scrimOpacity: 0.4,
};

const DRAMATIC_OVERLAYS: SlideOverlays = {
  vignette: true,
  vignetteIntensity: 0.45,
  filmGrain: true,
  filmGrainOpacity: 0.05,
  scrim: 'dual',
  scrimOpacity: 0.6,
};

// Default animation rules for each slide type
const heroAnimations: AnimationRule[] = [
  { target: 'title', animation: 'clip-reveal', duration: 0.8, delay: 0.3, easing: CINEMATIC },
  { target: 'subtitle', animation: 'blur-in', duration: 0.9, delay: 0.7, easing: EXPO_OUT },
  { target: 'label', animation: 'blur-in', duration: 0.9, delay: 0.1, easing: EXPO_OUT },
];

const statAnimations: AnimationRule[] = [
  { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.25, stagger: 0.035, easing: EXPO_OUT },
  { target: 'stat', animation: 'scale-up', duration: 0.6, delay: 0.6, stagger: 0.12, easing: BOUNCE },
  { target: 'label', animation: 'blur-in', duration: 0.9, delay: 0.15, easing: EXPO_OUT },
];

const contentAnimations: AnimationRule[] = [
  { target: 'label', animation: 'blur-in', duration: 0.9, delay: 0.15, easing: EXPO_OUT },
  { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.25, stagger: 0.035, easing: EXPO_OUT },
  { target: 'body', animation: 'blur-in', duration: 0.9, delay: 0.8, easing: EXPO_OUT },
];

const sectionAnimations: AnimationRule[] = [
  { target: 'title', animation: 'clip-reveal', duration: 0.8, delay: 0.2, easing: CINEMATIC },
  { target: 'subtitle', animation: 'fade-in', duration: 0.6, delay: 0.5, easing: EXPO_OUT },
];

const closingAnimations: AnimationRule[] = [
  { target: 'title', animation: 'clip-reveal', duration: 0.8, delay: 0.2, easing: CINEMATIC },
  { target: 'body', animation: 'blur-in', duration: 0.9, delay: 0.5, easing: EXPO_OUT },
];

// ============ PRESETS ============

export const CINEMATIC_PRESETS: CinematicPreset[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark & bold. Abstract gradients with smooth reveals.',
    baseTheme: 'dark',
    backgroundColor: '#000000',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#80838e',
    accentColor: '#8238DC',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    videoCategory: 'abstract-dark',
    videoOpacity: 0.5,
    transition: 'fade-through-black',
    transitionDuration: 0.35,
    defaultOverlays: DARK_OVERLAYS,
    animations: {
      hero: heroAnimations,
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.04, easing: EXPO_OUT },
      ],
      stats: statAnimations,
      content: contentAnimations,
      split: contentAnimations,
      'image-full': [
        { target: 'title', animation: 'clip-reveal', duration: 0.8, delay: 0.3, easing: CINEMATIC },
      ],
      section: sectionAnimations,
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: true,
    showProgressDots: true,
    navStyle: 'dots',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Ethereal gradients with blur-in text animations.',
    baseTheme: 'dark',
    backgroundColor: '#0a0a0f',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#6b7280',
    accentColor: '#06b6d4',
    fontHeading: 'Sora',
    fontBody: 'Inter',
    videoCategory: 'gradient',
    videoOpacity: 0.45,
    videoFilter: 'saturate(1.3)',
    transition: 'cross-blur',
    transitionDuration: 0.5,
    defaultOverlays: { ...DARK_OVERLAYS, scrim: 'radial', filmGrainOpacity: 0.03 },
    animations: {
      hero: [
        { target: 'title', animation: 'blur-in', duration: 1.2, delay: 0.2, easing: QUINT_OUT },
        { target: 'subtitle', animation: 'blur-in', duration: 1.0, delay: 0.6, easing: QUINT_OUT },
      ],
      statement: [
        { target: 'title', animation: 'blur-in', duration: 1.2, delay: 0.2, easing: QUINT_OUT },
      ],
      stats: [
        { target: 'title', animation: 'blur-in', duration: 0.8, delay: 0.2, easing: QUINT_OUT },
        { target: 'stat', animation: 'counter', duration: 1.0, delay: 0.5, stagger: 0.15, easing: QUINT_OUT },
      ],
      content: [
        { target: 'title', animation: 'blur-in', duration: 0.8, delay: 0.2, easing: QUINT_OUT },
        { target: 'body', animation: 'blur-in', duration: 0.8, delay: 0.5, easing: QUINT_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'blur-in', duration: 1.0, delay: 0.2, easing: QUINT_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: false,
    showProgressDots: true,
    navStyle: 'dots',
  },
  {
    id: 'velocity',
    name: 'Velocity',
    description: 'Fast-paced. Word-by-word reveals with tech vibes.',
    baseTheme: 'dark',
    backgroundColor: '#000000',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#71717a',
    accentColor: '#f43f5e',
    fontHeading: 'Space Grotesk',
    fontBody: 'Inter',
    videoCategory: 'tech',
    videoOpacity: 0.35,
    videoFilter: 'brightness(0.6) saturate(0.8)',
    transition: 'fade-through-black',
    transitionDuration: 0.25,
    defaultOverlays: DARK_OVERLAYS,
    animations: {
      hero: [
        { target: 'title', animation: 'char-by-char', duration: 0.4, delay: 0.15, stagger: 0.02, easing: EXPO_OUT },
        { target: 'subtitle', animation: 'slide-up', duration: 0.5, delay: 0.35, easing: EXPO_OUT },
      ],
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.4, delay: 0.1, stagger: 0.025, easing: EXPO_OUT },
      ],
      stats: [
        { target: 'title', animation: 'word-by-word', duration: 0.4, delay: 0.15, stagger: 0.025, easing: EXPO_OUT },
        { target: 'stat', animation: 'slide-up', duration: 0.4, delay: 0.4, stagger: 0.08, easing: EXPO_OUT },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.4, delay: 0.15, stagger: 0.025, easing: EXPO_OUT },
        { target: 'body', animation: 'fade-in', duration: 0.5, delay: 0.5, easing: EXPO_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'slide-up', duration: 0.5, delay: 0.1, easing: EXPO_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: true,
    showProgressDots: true,
    navStyle: 'progress-bar',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Clean & sophisticated. Minimal animations, serif typography.',
    baseTheme: 'dark',
    backgroundColor: '#111111',
    primaryTextColor: '#f5f5f5',
    secondaryTextColor: '#737373',
    accentColor: '#d4a574',
    fontHeading: 'Playfair Display',
    fontBody: 'Inter',
    videoCategory: 'minimal',
    videoOpacity: 0.15,
    transition: 'fade-cross',
    transitionDuration: 0.5,
    defaultOverlays: MINIMAL_OVERLAYS,
    animations: {
      hero: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: QUINT_OUT },
        { target: 'subtitle', animation: 'fade-in', duration: 0.8, delay: 0.7, easing: QUINT_OUT },
      ],
      statement: [
        { target: 'title', animation: 'fade-in', duration: 1.2, delay: 0.2, easing: QUINT_OUT },
      ],
      stats: statAnimations,
      content: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: QUINT_OUT },
        { target: 'body', animation: 'fade-in', duration: 0.8, delay: 0.5, easing: QUINT_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: sectionAnimations,
      closing: closingAnimations,
    },
    showSlideNumbers: false,
    showMetadata: true,
    showProgressDots: false,
    navStyle: 'numbers',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Cyberpunk energy. Vivid colors with scale-up animations.',
    baseTheme: 'dark',
    backgroundColor: '#050510',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#818cf8',
    accentColor: '#c084fc',
    fontHeading: 'Outfit',
    fontBody: 'Inter',
    videoCategory: 'abstract-dark',
    videoOpacity: 0.5,
    videoFilter: 'saturate(1.5) hue-rotate(20deg)',
    transition: 'zoom-morph',
    transitionDuration: 0.4,
    defaultOverlays: DRAMATIC_OVERLAYS,
    animations: {
      hero: [
        { target: 'title', animation: 'scale-up', duration: 0.6, delay: 0.2, easing: BOUNCE },
        { target: 'subtitle', animation: 'blur-in', duration: 0.8, delay: 0.5, easing: EXPO_OUT },
      ],
      statement: [
        { target: 'title', animation: 'scale-up', duration: 0.7, delay: 0.2, easing: BOUNCE },
      ],
      stats: [
        { target: 'title', animation: 'slide-up', duration: 0.5, delay: 0.15, easing: EXPO_OUT },
        { target: 'stat', animation: 'scale-up', duration: 0.5, delay: 0.4, stagger: 0.1, easing: BOUNCE },
      ],
      content: contentAnimations,
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'scale-up', duration: 0.6, delay: 0.2, easing: BOUNCE },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: false,
    showProgressDots: true,
    navStyle: 'dots',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Ultra-dark void. White text on near-black, cosmic backgrounds.',
    baseTheme: 'dark',
    backgroundColor: '#020204',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#5a5a6a',
    accentColor: '#a0a0b0',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    videoCategory: 'space',
    videoOpacity: 0.25,
    videoFilter: 'brightness(0.4) saturate(0.6)',
    transition: 'fade-through-black',
    transitionDuration: 0.5,
    defaultOverlays: { ...DARK_OVERLAYS, vignetteIntensity: 0.5, scrimOpacity: 0.6 },
    animations: {
      hero: [
        { target: 'title', animation: 'clip-reveal', duration: 0.9, delay: 0.4, easing: CINEMATIC },
        { target: 'subtitle', animation: 'fade-in', duration: 0.6, delay: 0.8, easing: QUINT_OUT },
      ],
      statement: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: QUINT_OUT },
      ],
      stats: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: QUINT_OUT },
        { target: 'stat', animation: 'fade-in', duration: 0.6, delay: 0.5, stagger: 0.15, easing: QUINT_OUT },
      ],
      content: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: QUINT_OUT },
        { target: 'body', animation: 'fade-in', duration: 0.7, delay: 0.5, easing: QUINT_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: QUINT_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: false,
    showProgressDots: true,
    navStyle: 'dots',
  },
  {
    id: 'prism',
    name: 'Prism',
    description: 'Colorful gradients with purple/pink accents and dynamic reveals.',
    baseTheme: 'dark',
    backgroundColor: '#0c0018',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#c084fc',
    accentColor: '#ec4899',
    fontHeading: 'Sora',
    fontBody: 'Inter',
    videoCategory: 'gradient',
    videoOpacity: 0.45,
    videoFilter: 'saturate(1.4) hue-rotate(-10deg)',
    transition: 'cross-blur',
    transitionDuration: 0.4,
    defaultOverlays: { ...DARK_OVERLAYS, scrim: 'radial' },
    animations: {
      hero: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.04, easing: EXPO_OUT },
        { target: 'subtitle', animation: 'blur-in', duration: 0.9, delay: 0.6, easing: EXPO_OUT },
      ],
      statement: [
        { target: 'title', animation: 'blur-in', duration: 1.0, delay: 0.2, easing: EXPO_OUT },
      ],
      stats: [
        { target: 'title', animation: 'blur-in', duration: 0.8, delay: 0.2, easing: EXPO_OUT },
        { target: 'stat', animation: 'scale-up', duration: 0.5, delay: 0.5, stagger: 0.12, easing: BOUNCE },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.5, delay: 0.2, stagger: 0.035, easing: EXPO_OUT },
        { target: 'body', animation: 'blur-in', duration: 0.8, delay: 0.7, easing: EXPO_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'blur-in', duration: 0.9, delay: 0.2, easing: EXPO_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: true,
    showProgressDots: true,
    navStyle: 'dots',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Black & white editorial. Serif typography, understated elegance.',
    baseTheme: 'dark',
    backgroundColor: '#0e0e0e',
    primaryTextColor: '#e8e8e8',
    secondaryTextColor: '#6b6b6b',
    accentColor: '#a0a0a0',
    fontHeading: 'Playfair Display',
    fontBody: 'Inter',
    videoCategory: 'corporate',
    videoOpacity: 0.12,
    videoFilter: 'grayscale(1) brightness(0.5)',
    transition: 'fade-cross',
    transitionDuration: 0.6,
    defaultOverlays: MINIMAL_OVERLAYS,
    animations: {
      hero: [
        { target: 'title', animation: 'fade-in', duration: 1.2, delay: 0.3, easing: QUINT_OUT },
        { target: 'subtitle', animation: 'fade-in', duration: 0.8, delay: 0.8, easing: QUINT_OUT },
      ],
      statement: [
        { target: 'title', animation: 'fade-in', duration: 1.2, delay: 0.2, easing: QUINT_OUT },
      ],
      stats: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: QUINT_OUT },
        { target: 'stat', animation: 'fade-in', duration: 0.6, delay: 0.5, stagger: 0.2, easing: QUINT_OUT },
      ],
      content: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.2, easing: QUINT_OUT },
        { target: 'body', animation: 'fade-in', duration: 0.8, delay: 0.6, easing: QUINT_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: QUINT_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: false,
    showMetadata: true,
    showProgressDots: false,
    navStyle: 'numbers',
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm & energetic. Orange/amber tones with bold scale-up animations.',
    baseTheme: 'dark',
    backgroundColor: '#080404',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#b8856c',
    accentColor: '#f59e0b',
    fontHeading: 'Outfit',
    fontBody: 'Inter',
    videoCategory: 'abstract-dark',
    videoOpacity: 0.4,
    videoFilter: 'saturate(1.2) hue-rotate(-20deg) brightness(0.7)',
    transition: 'fade-through-black',
    transitionDuration: 0.3,
    defaultOverlays: DRAMATIC_OVERLAYS,
    animations: {
      hero: [
        { target: 'title', animation: 'scale-up', duration: 0.6, delay: 0.2, easing: BOUNCE },
        { target: 'subtitle', animation: 'blur-in', duration: 0.8, delay: 0.5, easing: EXPO_OUT },
      ],
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.45, delay: 0.15, stagger: 0.03, easing: EXPO_OUT },
      ],
      stats: [
        { target: 'title', animation: 'slide-up', duration: 0.5, delay: 0.15, easing: EXPO_OUT },
        { target: 'stat', animation: 'scale-up', duration: 0.5, delay: 0.4, stagger: 0.1, easing: BOUNCE },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.5, delay: 0.2, stagger: 0.03, easing: EXPO_OUT },
        { target: 'body', animation: 'blur-in', duration: 0.7, delay: 0.7, easing: EXPO_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'scale-up', duration: 0.6, delay: 0.2, easing: BOUNCE },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: true,
    showProgressDots: true,
    navStyle: 'dots',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool blues & teals. Clean minimal feel with smooth reveals.',
    baseTheme: 'dark',
    backgroundColor: '#040a10',
    primaryTextColor: '#F0F0F0',
    secondaryTextColor: '#5eead4',
    accentColor: '#22d3ee',
    fontHeading: 'Space Grotesk',
    fontBody: 'Inter',
    videoCategory: 'nature',
    videoOpacity: 0.3,
    videoFilter: 'saturate(0.8) hue-rotate(20deg) brightness(0.5)',
    transition: 'fade-through-black',
    transitionDuration: 0.4,
    defaultOverlays: DARK_OVERLAYS,
    animations: {
      hero: [
        { target: 'title', animation: 'clip-reveal', duration: 0.8, delay: 0.3, easing: CINEMATIC },
        { target: 'subtitle', animation: 'blur-in', duration: 0.8, delay: 0.6, easing: EXPO_OUT },
      ],
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.035, easing: EXPO_OUT },
      ],
      stats: [
        { target: 'title', animation: 'word-by-word', duration: 0.5, delay: 0.2, stagger: 0.03, easing: EXPO_OUT },
        { target: 'stat', animation: 'slide-up', duration: 0.5, delay: 0.5, stagger: 0.12, easing: EXPO_OUT },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.035, easing: EXPO_OUT },
        { target: 'body', animation: 'blur-in', duration: 0.8, delay: 0.7, easing: EXPO_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'clip-reveal', duration: 0.8, delay: 0.2, easing: CINEMATIC },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: false,
    showProgressDots: true,
    navStyle: 'progress-bar',
  },
  // ---- 11. Nexus ----
  {
    id: 'nexus',
    name: 'Nexus',
    description: 'Dark purple SaaS. Gradient headlines, liquid glass, Geist Sans typography.',
    baseTheme: 'dark',
    backgroundColor: '#0a0512',
    primaryTextColor: '#F2F2F3',
    secondaryTextColor: '#9CA0AE',
    accentColor: '#7C3AED',
    fontHeading: 'General Sans',
    fontBody: 'Geist Sans',
    videoCategory: 'abstract-dark',
    videoOpacity: 0.35,
    videoFilter: 'brightness(0.45) saturate(0.9)',
    transition: 'fade-through-black',
    transitionDuration: 0.35,
    defaultOverlays: {
      vignette: true,
      vignetteIntensity: 0.4,
      filmGrain: true,
      filmGrainOpacity: 0.03,
      scrim: 'bottom',
      scrimOpacity: 0.55,
    },
    animations: {
      hero: [
        { target: 'title', animation: 'blur-in', duration: 1.0, delay: 0.2, easing: EXPO_OUT },
        { target: 'subtitle', animation: 'blur-in', duration: 0.8, delay: 0.6, easing: EXPO_OUT },
      ],
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.5, delay: 0.15, stagger: 0.035, easing: EXPO_OUT },
      ],
      stats: [
        { target: 'title', animation: 'blur-in', duration: 0.7, delay: 0.15, easing: EXPO_OUT },
        { target: 'stat', animation: 'scale-up', duration: 0.6, delay: 0.4, stagger: 0.12, easing: BOUNCE },
      ],
      content: [
        { target: 'title', animation: 'blur-in', duration: 0.7, delay: 0.2, easing: EXPO_OUT },
        { target: 'body', animation: 'blur-in', duration: 0.7, delay: 0.5, easing: EXPO_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'blur-in', duration: 0.9, delay: 0.2, easing: EXPO_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: false,
    showProgressDots: true,
    navStyle: 'progress-bar',
  },
];

export function getPresetById(id: string): CinematicPreset | undefined {
  return CINEMATIC_PRESETS.find(p => p.id === id);
}
