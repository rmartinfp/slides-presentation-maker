import { CinematicPreset, AnimationRule } from '@/types/cinematic';

// Shared easing curves
const SMOOTH: number[] = [0.25, 0.1, 0.25, 1];
const BOUNCE: number[] = [0.34, 1.56, 0.64, 1];
const EASE_OUT: number[] = [0, 0, 0.2, 1];

// Default animation rules for each slide type
const heroAnimations: AnimationRule[] = [
  { target: 'title', animation: 'slide-up', duration: 0.7, delay: 0.3, easing: SMOOTH },
  { target: 'subtitle', animation: 'blur-in', duration: 0.9, delay: 0.6, easing: SMOOTH },
  { target: 'label', animation: 'blur-in', duration: 0.9, delay: 0.1, easing: SMOOTH },
];

const statAnimations: AnimationRule[] = [
  { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.25, stagger: 0.035, easing: SMOOTH },
  { target: 'stat', animation: 'scale-up', duration: 0.6, delay: 0.6, stagger: 0.1, easing: SMOOTH },
  { target: 'label', animation: 'blur-in', duration: 0.9, delay: 0.15, easing: SMOOTH },
];

const contentAnimations: AnimationRule[] = [
  { target: 'label', animation: 'blur-in', duration: 0.9, delay: 0.15, easing: SMOOTH },
  { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.25, stagger: 0.035, easing: SMOOTH },
  { target: 'body', animation: 'blur-in', duration: 0.9, delay: 0.8, easing: SMOOTH },
];

const sectionAnimations: AnimationRule[] = [
  { target: 'title', animation: 'slide-up', duration: 0.7, delay: 0.2, easing: SMOOTH },
  { target: 'subtitle', animation: 'fade-in', duration: 0.6, delay: 0.5, easing: SMOOTH },
];

const closingAnimations: AnimationRule[] = [
  { target: 'title', animation: 'slide-up', duration: 0.7, delay: 0.2, easing: SMOOTH },
  { target: 'body', animation: 'blur-in', duration: 0.9, delay: 0.5, easing: SMOOTH },
];

// ============ PRESETS ============

export const CINEMATIC_PRESETS: CinematicPreset[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark & bold. Abstract gradients with smooth reveals.',
    baseTheme: 'dark',
    backgroundColor: '#000000',
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#80838e',
    accentColor: '#8238DC',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    videoCategory: 'abstract-dark',
    videoOpacity: 1,
    transition: 'fade-through-black',
    transitionDuration: 0.35,
    animations: {
      hero: heroAnimations,
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.04, easing: SMOOTH },
      ],
      stats: statAnimations,
      content: contentAnimations,
      split: contentAnimations,
      'image-full': [
        { target: 'title', animation: 'slide-up', duration: 0.7, delay: 0.3, easing: SMOOTH },
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
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#6b7280',
    accentColor: '#06b6d4',
    fontHeading: 'Sora',
    fontBody: 'Inter',
    videoCategory: 'gradient',
    videoOpacity: 0.5,
    videoFilter: 'saturate(1.3)',
    transition: 'fade-through-black',
    transitionDuration: 0.4,
    animations: {
      hero: [
        { target: 'title', animation: 'blur-in', duration: 1.2, delay: 0.2, easing: EASE_OUT },
        { target: 'subtitle', animation: 'blur-in', duration: 1.0, delay: 0.6, easing: EASE_OUT },
      ],
      statement: [
        { target: 'title', animation: 'blur-in', duration: 1.2, delay: 0.2, easing: EASE_OUT },
      ],
      stats: [
        { target: 'title', animation: 'blur-in', duration: 0.8, delay: 0.2, easing: EASE_OUT },
        { target: 'stat', animation: 'counter', duration: 1.0, delay: 0.5, stagger: 0.15, easing: EASE_OUT },
      ],
      content: [
        { target: 'title', animation: 'blur-in', duration: 0.8, delay: 0.2, easing: EASE_OUT },
        { target: 'body', animation: 'blur-in', duration: 0.8, delay: 0.5, easing: EASE_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'blur-in', duration: 1.0, delay: 0.2, easing: EASE_OUT },
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
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#71717a',
    accentColor: '#f43f5e',
    fontHeading: 'Space Grotesk',
    fontBody: 'Inter',
    videoCategory: 'tech',
    videoOpacity: 0.4,
    videoFilter: 'brightness(0.6) saturate(0.8)',
    transition: 'fade-through-black',
    transitionDuration: 0.25,
    animations: {
      hero: [
        { target: 'title', animation: 'slide-up', duration: 0.5, delay: 0.15, easing: SMOOTH },
        { target: 'subtitle', animation: 'slide-up', duration: 0.5, delay: 0.35, easing: SMOOTH },
      ],
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.4, delay: 0.1, stagger: 0.025, easing: SMOOTH },
      ],
      stats: [
        { target: 'title', animation: 'word-by-word', duration: 0.4, delay: 0.15, stagger: 0.025, easing: SMOOTH },
        { target: 'stat', animation: 'slide-up', duration: 0.4, delay: 0.4, stagger: 0.08, easing: SMOOTH },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.4, delay: 0.15, stagger: 0.025, easing: SMOOTH },
        { target: 'body', animation: 'fade-in', duration: 0.5, delay: 0.5, easing: SMOOTH },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'slide-up', duration: 0.5, delay: 0.1, easing: SMOOTH },
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
    videoOpacity: 0.2,
    transition: 'fade-cross',
    transitionDuration: 0.5,
    animations: {
      hero: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: EASE_OUT },
        { target: 'subtitle', animation: 'fade-in', duration: 0.8, delay: 0.7, easing: EASE_OUT },
      ],
      statement: [
        { target: 'title', animation: 'fade-in', duration: 1.2, delay: 0.2, easing: EASE_OUT },
      ],
      stats: statAnimations,
      content: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: EASE_OUT },
        { target: 'body', animation: 'fade-in', duration: 0.8, delay: 0.5, easing: EASE_OUT },
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
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#818cf8',
    accentColor: '#c084fc',
    fontHeading: 'Outfit',
    fontBody: 'Inter',
    videoCategory: 'abstract-dark',
    videoOpacity: 0.6,
    videoFilter: 'saturate(1.5) hue-rotate(20deg)',
    transition: 'zoom-in',
    transitionDuration: 0.4,
    animations: {
      hero: [
        { target: 'title', animation: 'scale-up', duration: 0.6, delay: 0.2, easing: BOUNCE },
        { target: 'subtitle', animation: 'blur-in', duration: 0.8, delay: 0.5, easing: SMOOTH },
      ],
      statement: [
        { target: 'title', animation: 'scale-up', duration: 0.7, delay: 0.2, easing: BOUNCE },
      ],
      stats: [
        { target: 'title', animation: 'slide-up', duration: 0.5, delay: 0.15, easing: SMOOTH },
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

  // ---- 6. Obsidian ----
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Ultra-dark void. White text on near-black, cosmic backgrounds.',
    baseTheme: 'dark',
    backgroundColor: '#020204',
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#5a5a6a',
    accentColor: '#a0a0b0',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    videoCategory: 'space',
    videoOpacity: 0.3,
    videoFilter: 'brightness(0.4) saturate(0.6)',
    transition: 'fade-through-black',
    transitionDuration: 0.5,
    animations: {
      hero: [
        { target: 'title', animation: 'slide-up', duration: 0.8, delay: 0.4, easing: EASE_OUT },
        { target: 'subtitle', animation: 'fade-in', duration: 0.6, delay: 0.8, easing: EASE_OUT },
      ],
      statement: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: EASE_OUT },
      ],
      stats: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: EASE_OUT },
        { target: 'stat', animation: 'fade-in', duration: 0.6, delay: 0.5, stagger: 0.15, easing: EASE_OUT },
      ],
      content: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: EASE_OUT },
        { target: 'body', animation: 'fade-in', duration: 0.7, delay: 0.5, easing: EASE_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: EASE_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: false,
    showProgressDots: true,
    navStyle: 'dots',
  },
  // ---- 7. Prism ----
  {
    id: 'prism',
    name: 'Prism',
    description: 'Colorful gradients with purple/pink accents and dynamic reveals.',
    baseTheme: 'dark',
    backgroundColor: '#0c0018',
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#c084fc',
    accentColor: '#ec4899',
    fontHeading: 'Sora',
    fontBody: 'Inter',
    videoCategory: 'gradient',
    videoOpacity: 0.55,
    videoFilter: 'saturate(1.4) hue-rotate(-10deg)',
    transition: 'fade-cross',
    transitionDuration: 0.4,
    animations: {
      hero: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.04, easing: SMOOTH },
        { target: 'subtitle', animation: 'blur-in', duration: 0.9, delay: 0.6, easing: SMOOTH },
      ],
      statement: [
        { target: 'title', animation: 'blur-in', duration: 1.0, delay: 0.2, easing: SMOOTH },
      ],
      stats: [
        { target: 'title', animation: 'blur-in', duration: 0.8, delay: 0.2, easing: SMOOTH },
        { target: 'stat', animation: 'scale-up', duration: 0.5, delay: 0.5, stagger: 0.12, easing: BOUNCE },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.5, delay: 0.2, stagger: 0.035, easing: SMOOTH },
        { target: 'body', animation: 'blur-in', duration: 0.8, delay: 0.7, easing: SMOOTH },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'blur-in', duration: 0.9, delay: 0.2, easing: SMOOTH },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: true,
    showMetadata: true,
    showProgressDots: true,
    navStyle: 'dots',
  },
  // ---- 8. Monochrome ----
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
    videoOpacity: 0.15,
    videoFilter: 'grayscale(1) brightness(0.5)',
    transition: 'fade-cross',
    transitionDuration: 0.6,
    animations: {
      hero: [
        { target: 'title', animation: 'fade-in', duration: 1.2, delay: 0.3, easing: EASE_OUT },
        { target: 'subtitle', animation: 'fade-in', duration: 0.8, delay: 0.8, easing: EASE_OUT },
      ],
      statement: [
        { target: 'title', animation: 'fade-in', duration: 1.2, delay: 0.2, easing: EASE_OUT },
      ],
      stats: [
        { target: 'title', animation: 'fade-in', duration: 0.8, delay: 0.2, easing: EASE_OUT },
        { target: 'stat', animation: 'fade-in', duration: 0.6, delay: 0.5, stagger: 0.2, easing: EASE_OUT },
      ],
      content: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.2, easing: EASE_OUT },
        { target: 'body', animation: 'fade-in', duration: 0.8, delay: 0.6, easing: EASE_OUT },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'fade-in', duration: 1.0, delay: 0.3, easing: EASE_OUT },
      ],
      closing: closingAnimations,
    },
    showSlideNumbers: false,
    showMetadata: true,
    showProgressDots: false,
    navStyle: 'numbers',
  },
  // ---- 9. Ember ----
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm & energetic. Orange/amber tones with bold scale-up animations.',
    baseTheme: 'dark',
    backgroundColor: '#080404',
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#b8856c',
    accentColor: '#f59e0b',
    fontHeading: 'Outfit',
    fontBody: 'Inter',
    videoCategory: 'abstract-dark',
    videoOpacity: 0.5,
    videoFilter: 'saturate(1.2) hue-rotate(-20deg) brightness(0.7)',
    transition: 'fade-through-black',
    transitionDuration: 0.3,
    animations: {
      hero: [
        { target: 'title', animation: 'scale-up', duration: 0.6, delay: 0.2, easing: BOUNCE },
        { target: 'subtitle', animation: 'blur-in', duration: 0.8, delay: 0.5, easing: SMOOTH },
      ],
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.45, delay: 0.15, stagger: 0.03, easing: SMOOTH },
      ],
      stats: [
        { target: 'title', animation: 'slide-up', duration: 0.5, delay: 0.15, easing: SMOOTH },
        { target: 'stat', animation: 'scale-up', duration: 0.5, delay: 0.4, stagger: 0.1, easing: BOUNCE },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.5, delay: 0.2, stagger: 0.03, easing: SMOOTH },
        { target: 'body', animation: 'blur-in', duration: 0.7, delay: 0.7, easing: SMOOTH },
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
  // ---- 10. Arctic ----
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool blues & teals. Clean minimal feel with smooth reveals.',
    baseTheme: 'dark',
    backgroundColor: '#040a10',
    primaryTextColor: '#FFFFFF',
    secondaryTextColor: '#5eead4',
    accentColor: '#22d3ee',
    fontHeading: 'Space Grotesk',
    fontBody: 'Inter',
    videoCategory: 'nature',
    videoOpacity: 0.35,
    videoFilter: 'saturate(0.8) hue-rotate(20deg) brightness(0.5)',
    transition: 'fade-through-black',
    transitionDuration: 0.4,
    animations: {
      hero: [
        { target: 'title', animation: 'slide-up', duration: 0.7, delay: 0.3, easing: SMOOTH },
        { target: 'subtitle', animation: 'blur-in', duration: 0.8, delay: 0.6, easing: SMOOTH },
      ],
      statement: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.035, easing: SMOOTH },
      ],
      stats: [
        { target: 'title', animation: 'word-by-word', duration: 0.5, delay: 0.2, stagger: 0.03, easing: SMOOTH },
        { target: 'stat', animation: 'slide-up', duration: 0.5, delay: 0.5, stagger: 0.12, easing: SMOOTH },
      ],
      content: [
        { target: 'title', animation: 'word-by-word', duration: 0.55, delay: 0.2, stagger: 0.035, easing: SMOOTH },
        { target: 'body', animation: 'blur-in', duration: 0.8, delay: 0.7, easing: SMOOTH },
      ],
      split: contentAnimations,
      'image-full': heroAnimations,
      section: [
        { target: 'title', animation: 'slide-up', duration: 0.7, delay: 0.2, easing: SMOOTH },
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
