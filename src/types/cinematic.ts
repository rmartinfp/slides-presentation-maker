// ============ Cinematic Presentation System ============

/**
 * Animation types that can be applied to text elements.
 * Each animation preset defines how text enters the slide.
 */
export type TextAnimation =
  | 'slide-up'        // Clip-reveal slide up (headings)
  | 'word-by-word'    // Each word slides up with stagger
  | 'blur-in'         // Fade in with blur dissolve
  | 'fade-in'         // Simple opacity fade
  | 'type-writer'     // Character by character
  | 'scale-up'        // Scale from 0.8 to 1 with fade
  | 'slide-right'     // Slide in from left
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
  | 'none';

/**
 * Transition between slides.
 */
export type SlideTransitionType =
  | 'fade-through-black'   // Fade to black, then fade in
  | 'fade-cross'           // Crossfade
  | 'slide-left'           // Slide horizontally
  | 'zoom-in'              // Zoom into next slide
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
 * Defines how elements of a specific type should be animated
 * within a cinematic template.
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
 * Different from classic slide types — these define the
 * visual treatment and animation behavior.
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
 * Video pool category — videos are assigned by theme/mood, not per-template.
 */
export type VideoCategory =
  | 'abstract-dark'    // Abstract shapes, particles on dark
  | 'abstract-light'   // Soft gradients, light backgrounds
  | 'tech'             // Data streams, circuits, code
  | 'nature'           // Water, leaves, sky
  | 'corporate'        // Office, city, architecture
  | 'space'            // Stars, nebulae, planets
  | 'gradient'         // Flowing gradient animations
  | 'minimal';         // Very subtle, almost static

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
 * A cinematic animation preset — the "skin" that determines
 * how content is animated in presentation mode.
 */
export interface CinematicPreset {
  id: string;
  name: string;
  description: string;
  preview?: string;     // Preview thumbnail/video

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

  // Animation rules per slide type
  animations: Record<CinematicSlideType, AnimationRule[]>;

  // Metadata display
  showSlideNumbers: boolean;
  showMetadata: boolean;  // Date, type, etc. in header
  showProgressDots: boolean;

  // Navigation style
  navStyle: 'dots' | 'progress-bar' | 'numbers' | 'none';
}

/**
 * A template in the gallery can be either classic (PPTX) or cinematic.
 */
export type TemplateType = 'classic' | 'cinematic';
