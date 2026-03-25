// ============ Cinematic Presentation System ============

/**
 * Animation types that can be applied to text elements.
 * Each animation preset defines how text enters the slide.
 */
export type TextAnimation =
  | 'slide-up'        // Clip-reveal slide up (headings)
  | 'word-by-word'    // Each word slides up with stagger
  | 'char-by-char'    // Each character slides up with stagger
  | 'clip-reveal'     // clipPath-based reveal (Stripe-style)
  | 'blur-in'         // Fade in with blur dissolve
  | 'fade-in'         // Simple opacity fade
  | 'type-writer'     // Character by character with cursor
  | 'scale-up'        // Scale from 0.8 to 1 with fade
  | 'slide-right'     // Slide in from left
  | 'split-center'    // Letters spread from center
  | 'perspective-3d'  // rotateX entrance with perspective
  | 'none';           // No animation

/**
 * Animation types for non-text elements (shapes, images).
 */
export type ElementAnimation =
  | 'fade-in'
  | 'scale-up'
  | 'slide-up'
  | 'slide-right'
  | 'blur-in'
  | 'draw'            // SVG stroke draw-in for shapes
  | 'counter'         // Animated number counter for stats
  | 'glass-reveal'    // Glassmorphism card entrance
  | 'none';

/**
 * Transition between slides.
 */
export type SlideTransitionType =
  | 'fade-through-black'   // Fade to black, then fade in
  | 'fade-cross'           // Crossfade
  | 'slide-left'           // Slide horizontally
  | 'zoom-in'              // Zoom into next slide
  | 'zoom-morph'           // Scale + blur dissolve
  | 'parallax'             // Elements at different speeds
  | 'cross-blur'           // Crossfade with blur
  | 'morph'                // Morph matching elements
  | 'none';

/**
 * Video background definition.
 */
export interface VideoBackground {
  url: string;          // Direct MP4 URL or HLS stream
  type: 'mp4' | 'hls';
  opacity: number;      // 0-1
  playbackRate?: number; // 0.5-2
  filter?: string;      // CSS filter (e.g., 'brightness(0.4) saturate(1.2)')
  objectFit?: 'cover' | 'contain';
  transform?: string;   // CSS transform (e.g., 'scale(-1, -1)')
}

/**
 * Per-element animation configuration.
 * Stored in SlideAnimationConfig for precise control.
 */
export interface ElementAnimationConfig {
  type: TextAnimation | ElementAnimation;
  delay: number;        // seconds from slide enter
  duration: number;     // seconds
  easing: number[];     // cubic-bezier [x1, y1, x2, y2]
  stagger?: number;     // for text: delay between words/chars
}

/**
 * Overlay configuration for a slide.
 */
export interface SlideOverlays {
  vignette: boolean;
  vignetteIntensity?: number;   // 0-1, default 0.4
  filmGrain: boolean;
  filmGrainOpacity?: number;    // 0-1, default 0.04
  scrim: 'bottom' | 'top' | 'left' | 'right' | 'radial' | 'dual' | 'none';
  scrimOpacity?: number;        // 0-1, default 0.5
  colorGrade?: string;          // CSS filter for color grading
}

/**
 * Slide-level animation configuration.
 * Each cinematic slide carries this to define how elements animate.
 */
export interface SlideAnimationConfig {
  transition: SlideTransitionType;
  transitionDuration: number;
  autoAdvanceDuration?: number;  // seconds, undefined = manual advance
  overlays: SlideOverlays;
  kenBurns?: {
    enabled: boolean;
    direction: 'zoom-in' | 'zoom-out' | 'pan-right' | 'pan-left';
    duration: number;            // seconds for one cycle
  };
  // Default animations by element type (if no per-element override)
  defaultTextAnimation?: ElementAnimationConfig;
  defaultImageAnimation?: ElementAnimationConfig;
  defaultShapeAnimation?: ElementAnimationConfig;
  // Per-element overrides (keyed by element ID)
  elementOverrides?: Record<string, ElementAnimationConfig>;
}

/**
 * Defines how elements of a specific type should be animated
 * within a cinematic template. Used by presets.
 */
export interface AnimationRule {
  target: 'title' | 'subtitle' | 'body' | 'stat' | 'image' | 'shape' | 'label';
  animation: TextAnimation | ElementAnimation;
  duration: number;     // seconds
  delay: number;        // seconds (relative to slide entering)
  stagger?: number;     // seconds between items (for word-by-word, lists)
  easing: number[];     // cubic-bezier [x1, y1, x2, y2]
}

/**
 * A cinematic slide layout type.
 * Used for heuristic classification when no explicit config exists.
 */
export type CinematicSlideType =
  | 'hero'             // Full-screen title with large text
  | 'statement'        // Big quote or key message
  | 'stats'            // Statistics with animated counters
  | 'content'          // Title + body text
  | 'split'            // Text left, visual right
  | 'image-full'       // Full-bleed image with overlay text
  | 'section'          // Section divider
  | 'closing';         // Thank you / CTA

/**
 * Video pool category — videos are assigned by theme/mood.
 */
export type VideoCategory =
  | 'abstract-dark'
  | 'abstract-light'
  | 'tech'
  | 'nature'
  | 'corporate'
  | 'space'
  | 'gradient'
  | 'minimal';

/**
 * A single video in the pool.
 */
export interface PoolVideo {
  id: string;
  url: string;
  category: VideoCategory;
  orientation: 'landscape' | 'portrait';
  duration: number;     // seconds
  preview?: string;     // thumbnail URL
}

/**
 * Premium easing curves for cinematic animations.
 */
export const CINEMATIC_EASINGS = {
  /** Apple/Stripe-style. The #1 curve for text reveals. Fast burst + long deceleration. */
  expoOut: [0.16, 1, 0.3, 1] as number[],
  /** For exits. Slow start, fast finish. Things "fall away." */
  expoIn: [0.7, 0, 0.84, 0] as number[],
  /** Slightly less aggressive than expo. Good for slide-ups. */
  circOut: [0, 0.55, 0.45, 1] as number[],
  /** Between ease-out and expo-out. Versatile. */
  quintOut: [0.22, 1, 0.36, 1] as number[],
  /** Slight overshoot then settle. For cards/stats. */
  backOut: [0.34, 1.3, 0.64, 1] as number[],
  /** Bouncy. For pop/scale effects. */
  bounce: [0.34, 1.56, 0.64, 1] as number[],
  /** Apple-style smooth. For opacity animations. */
  smoothPower: [0.4, 0, 0.2, 1] as number[],
  /** Motion design studios. Mask reveals, clip-paths. */
  cinematic: [0.77, 0, 0.175, 1] as number[],
  /** Standard smooth ease. */
  smooth: [0.25, 0.1, 0.25, 1] as number[],
} as const;

/**
 * A cinematic animation preset — the "skin" that determines
 * how content is animated in presentation mode.
 */
export interface CinematicPreset {
  id: string;
  name: string;
  description: string;
  preview?: string;

  // Visual style
  baseTheme: 'dark' | 'light';
  backgroundColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;

  // Video backgrounds
  videoCategory: VideoCategory;
  videoOpacity: number;
  videoFilter?: string;

  // Transitions
  transition: SlideTransitionType;
  transitionDuration: number;

  // Default overlays for all slides
  defaultOverlays: SlideOverlays;

  // Animation rules per slide type (used for heuristic mode)
  animations: Record<CinematicSlideType, AnimationRule[]>;

  // Metadata display
  showSlideNumbers: boolean;
  showMetadata: boolean;
  showProgressDots: boolean;

  // Navigation style
  navStyle: 'dots' | 'progress-bar' | 'numbers' | 'none';
}

/**
 * A template in the gallery can be either classic (PPTX) or cinematic.
 */
export type TemplateType = 'classic' | 'cinematic';
