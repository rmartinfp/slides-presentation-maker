import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Slide, SlideElement } from '@/types/presentation';
import {
  CinematicPreset, CinematicSlideType, AnimationRule, SlideAnimationConfig,
  ElementAnimationConfig, SlideOverlays, CINEMATIC_EASINGS,
} from '@/types/cinematic';
import {
  SlideUpLine, WordByWordReveal, CharByCharReveal, ClipRevealLine,
  BlurReveal, FadeIn, ScaleUp, Counter, TypewriterText,
  SplitFromCenter, Perspective3DReveal, GlassReveal,
  renderAnimatedText,
} from './AnimatedText';
import VideoBackground from './VideoBackground';
import CinematicOverlays from './CinematicOverlays';
import { loadGoogleFont } from '@/lib/font-loader';
import { getVideosForSlides } from '@/lib/video-pool';

// ============ Constants ============

const CANVAS_W = 1920;
const CANVAS_H = 1080;

// ============ Types ============

interface Props {
  slides: Slide[];
  preset: CinematicPreset;
  startIndex?: number;
  presentationTitle?: string;
  metadata?: { type?: string; author?: string; date?: string; industry?: string };
  onExit: () => void;
}

// ============ Helpers ============

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function parseStatText(text: string): { value: number; prefix: string; suffix: string; label: string } | null {
  const clean = stripHtml(text);
  const match = clean.match(/^([^\d]*)(\d[\d,.]*)([\w%+$]*)\s*(.*)/);
  if (!match) return null;
  const numStr = match[2].replace(/,/g, '');
  const value = parseFloat(numStr);
  if (isNaN(value)) return null;
  return { prefix: match[1].trim(), value, suffix: match[3].trim(), label: match[4].trim() };
}

/** Classify a slide heuristically when no animationConfig is present */
function classifySlideType(idx: number, total: number, elements: SlideElement[]): CinematicSlideType {
  const textEls = elements.filter(e => e.type === 'text');
  const images = elements.filter(e => e.type === 'image');
  const stats = textEls.filter(e => parseStatText(e.content) !== null);

  if (idx === 0) return 'hero';
  if (idx === total - 1) return 'closing';
  if (stats.length >= 2) return 'stats';
  if (images.length > 0 && textEls.length <= 1) return 'image-full';
  if (images.length > 0 && textEls.length > 1) return 'split';
  if (textEls.length === 1) return 'section';
  if (textEls.length === 2) return 'statement';
  return 'content';
}

/** Get animation rule from preset for heuristic mode */
function getRule(preset: CinematicPreset, slideType: CinematicSlideType, target: AnimationRule['target']): AnimationRule | undefined {
  const rules = preset.animations[slideType] || preset.animations.content;
  return rules.find(r => r.target === target);
}

/** Get element animation config: explicit override > slide default > preset heuristic */
function getElementAnimation(
  element: SlideElement,
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  preset: CinematicPreset,
  elementIndex: number,
): ElementAnimationConfig {
  const config = slide.animationConfig;

  // 1. Check for explicit per-element override
  if (config?.elementOverrides?.[element.id]) {
    return config.elementOverrides[element.id];
  }

  // 2. Check for slide-level default by element type
  if (config) {
    if (element.type === 'text' && config.defaultTextAnimation) return config.defaultTextAnimation;
    if (element.type === 'image' && config.defaultImageAnimation) return config.defaultImageAnimation;
    if (element.type === 'shape' && config.defaultShapeAnimation) return config.defaultShapeAnimation;
  }

  // 3. Fall back to preset heuristic classification
  const slideType = classifySlideType(slideIndex, totalSlides, slide.elements || []);
  const textEls = [...(slide.elements || [])].filter(e => e.type === 'text')
    .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));

  let target: AnimationRule['target'] = 'body';
  if (element.type === 'image') target = 'image';
  else if (element.type === 'shape') target = 'shape';
  else if (element.type === 'text') {
    const textIdx = textEls.findIndex(e => e.id === element.id);
    if (textIdx === 0) target = 'title';
    else if (textIdx === 1) target = 'subtitle';
    else target = 'body';
  }

  const rule = getRule(preset, slideType, target);
  if (rule) {
    return {
      type: rule.animation,
      delay: rule.delay + elementIndex * 0.05,
      duration: rule.duration,
      easing: rule.easing,
      stagger: rule.stagger,
    };
  }

  // Ultimate fallback
  return {
    type: element.type === 'text' ? 'blur-in' : 'fade-in',
    delay: 0.2 + elementIndex * 0.12,
    duration: 0.7,
    easing: CINEMATIC_EASINGS.expoOut,
  };
}

/** Get overlays for a slide */
function getOverlays(slide: Slide, preset: CinematicPreset): SlideOverlays {
  return slide.animationConfig?.overlays || preset.defaultOverlays;
}

/** Get transition config for a slide */
function getTransition(slide: Slide, preset: CinematicPreset) {
  const config = slide.animationConfig;
  return {
    type: config?.transition || preset.transition,
    duration: config?.transitionDuration || preset.transitionDuration,
  };
}

// ============ Slide Transition Variants ============

function getTransitionVariants(type: string, duration: number) {
  switch (type) {
    case 'fade-through-black':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: duration * 1.2, ease: CINEMATIC_EASINGS.quintOut } },
        exit: { opacity: 0, transition: { duration, ease: CINEMATIC_EASINGS.expoIn } },
      };
    case 'fade-cross':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration, ease: CINEMATIC_EASINGS.smoothPower } },
        exit: { opacity: 0, transition: { duration, ease: CINEMATIC_EASINGS.smoothPower } },
      };
    case 'zoom-morph':
      return {
        initial: { opacity: 0, scale: 0.92, filter: 'blur(4px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: duration * 1.2, ease: CINEMATIC_EASINGS.expoOut } },
        exit: { opacity: 0, scale: 1.08, filter: 'blur(4px)', transition: { duration, ease: CINEMATIC_EASINGS.expoIn } },
      };
    case 'zoom-in':
      return {
        initial: { opacity: 0, scale: 1.1 },
        animate: { opacity: 1, scale: 1, transition: { duration, ease: CINEMATIC_EASINGS.quintOut } },
        exit: { opacity: 0, scale: 0.9, transition: { duration, ease: CINEMATIC_EASINGS.expoIn } },
      };
    case 'cross-blur':
      return {
        initial: { opacity: 0, filter: 'blur(12px)' },
        animate: { opacity: 1, filter: 'blur(0px)', transition: { duration, ease: CINEMATIC_EASINGS.quintOut } },
        exit: { opacity: 0, filter: 'blur(12px)', transition: { duration, ease: CINEMATIC_EASINGS.quintOut } },
      };
    case 'slide-left':
      return {
        initial: { opacity: 0, x: '15%' },
        animate: { opacity: 1, x: '0%', transition: { duration, ease: CINEMATIC_EASINGS.expoOut } },
        exit: { opacity: 0, x: '-15%', transition: { duration, ease: CINEMATIC_EASINGS.expoIn } },
      };
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.3 } },
        exit: { opacity: 0, transition: { duration: 0.3 } },
      };
  }
}

// ============ Navigation Components ============

function NavigationDots({ count, current, onNavigate }: { count: number; current: number; onNavigate: (i: number) => void }) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onNavigate(i)}
          className={`rounded-full transition-all duration-300 ${
            i === current ? 'bg-white w-6 h-2' : 'bg-white/40 w-2 h-2 hover:bg-white/60'
          }`}
        />
      ))}
    </div>
  );
}

function ProgressBar({ count, current }: { count: number; current: number }) {
  const progress = count > 1 ? (current / (count - 1)) * 100 : 100;
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-[3px] bg-white/10">
      <motion.div
        className="h-full bg-white/60"
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

function NumberNav({ count, current, color }: { count: number; current: number; color: string }) {
  return (
    <div className="absolute bottom-5 right-[5%] z-20" style={{ color, fontSize: 14 }}>
      {String(current + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
    </div>
  );
}

// ============ Element Renderer ============

/**
 * Renders a single SlideElement at its real position with cinematic animation.
 * The canvas is scaled to fit the viewport while maintaining 16:9 aspect ratio.
 */
function AnimatedElement({
  element,
  animConfig,
  activationKey,
}: {
  element: SlideElement;
  animConfig: ElementAnimationConfig;
  activationKey: number;
}) {
  if (!element.visible) return null;

  const plainText = stripHtml(element.content);
  const isText = element.type === 'text';
  const isImage = element.type === 'image';
  const isShape = element.type === 'shape';
  const isChart = element.type === 'chart';

  // For counter animation on stat-like text
  const statParsed = isText ? parseStatText(element.content) : null;
  const isStatWithCounter = statParsed && (animConfig.type === 'counter' || animConfig.type === 'scale-up');

  // Base style for positioning
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    opacity: element.opacity,
    transform: `rotate(${element.rotation || 0}deg)${element.style.flipH ? ' scaleX(-1)' : ''}${element.style.flipV ? ' scaleY(-1)' : ''}`,
    zIndex: element.zIndex || 0,
  };

  const st = element.style;

  // Text styling
  const hasGradientText = isText && st.textGradient;
  const textStyle: React.CSSProperties = isText ? {
    fontFamily: st.fontFamily ? `'${st.fontFamily}', sans-serif` : 'inherit',
    fontSize: st.fontSize ? st.fontSize * 1.333 : undefined,
    fontWeight: st.fontWeight || undefined,
    fontStyle: st.fontStyle || undefined,
    color: hasGradientText ? 'transparent' : (st.color || 'inherit'),
    textAlign: st.textAlign || undefined,
    lineHeight: st.lineHeight || 1.2,
    letterSpacing: st.letterSpacing || undefined,
    textShadow: st.textShadow || (!hasGradientText ? '0 2px 20px rgba(0,0,0,0.3)' : undefined),
    // Gradient text effect
    ...(hasGradientText ? {
      backgroundImage: st.textGradient,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } : {}),
  } : {};

  // Wrapper animation (for non-text animations like fade-in, scale-up, slide-up)
  const wrapperVariants = {
    hidden: getInitialState(animConfig.type),
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: animConfig.duration,
        delay: animConfig.delay,
        ease: animConfig.easing,
      },
    },
  };

  // For text elements with text-specific animations (word-by-word, char-by-char, etc.)
  const isTextAnimation = isText && ['word-by-word', 'char-by-char', 'clip-reveal', 'type-writer', 'split-center', 'perspective-3d'].includes(animConfig.type);

  return (
    <motion.div
      key={`${element.id}-${activationKey}`}
      style={posStyle}
      variants={isTextAnimation ? undefined : wrapperVariants}
      initial={isTextAnimation ? { opacity: 1 } : 'hidden'}
      animate={isTextAnimation ? { opacity: 1 } : 'visible'}
    >
      {/* Text element */}
      {isText && !isStatWithCounter && (
        <div className="w-full h-full relative">
          {/* Glow effect behind text */}
          {st.glowColor && (
            <div className="absolute inset-0 pointer-events-none" style={{
              filter: `blur(${st.glowSize || 60}px)`,
              background: st.glowColor,
              transform: 'scale(1.3)',
              opacity: 0.5,
            }} />
          )}
          <div style={textStyle} className={`w-full h-full flex relative ${st.verticalAlign === 'center' ? 'items-center' : st.verticalAlign === 'bottom' ? 'items-end' : 'items-start'}`}>
            <div className="w-full">
              {isTextAnimation ? (
                renderAnimatedText(plainText, animConfig.type, {
                  delay: animConfig.delay,
                  duration: animConfig.duration,
                  easing: animConfig.easing,
                  stagger: animConfig.stagger,
                })
              ) : (
                plainText
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stat with counter animation */}
      {isText && isStatWithCounter && statParsed && (
        <div style={textStyle} className="w-full h-full flex items-center justify-center">
          <Counter
            value={statParsed.value}
            prefix={statParsed.prefix}
            suffix={statParsed.suffix}
            delay={animConfig.delay}
            duration={animConfig.duration}
            style={textStyle}
          />
          {statParsed.label && (
            <BlurReveal delay={animConfig.delay + 0.3} className="mt-1">
              <span style={{ fontSize: (textStyle.fontSize as number || 24) * 0.5, opacity: 0.7, color: textStyle.color }}>
                {statParsed.label}
              </span>
            </BlurReveal>
          )}
        </div>
      )}

      {/* Image element */}
      {isImage && element.content && (
        <img
          src={element.content}
          alt=""
          className="w-full h-full"
          style={{
            objectFit: element.style.objectFit || 'cover',
            objectPosition: element.style.objectPosition || 'center',
            borderRadius: element.style.borderRadius || 0,
          }}
        />
      )}

      {/* Shape element */}
      {isShape && (
        st.glassmorphism ? (
          // Glassmorphism card
          <div
            className="w-full h-full"
            style={{
              background: `rgba(255, 255, 255, ${st.glassOpacity ?? 0.06})`,
              backdropFilter: `blur(${st.glassBlur ?? 20}px) saturate(1.3)`,
              WebkitBackdropFilter: `blur(${st.glassBlur ?? 20}px) saturate(1.3)`,
              borderRadius: st.borderRadius || 16,
              border: st.glassBorder !== false ? '1px solid rgba(255,255,255,0.1)' : undefined,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          />
        ) : element.content && (element.content.startsWith('<svg') || element.content.startsWith('<path')) ? (
          // SVG shape
          <div
            className="w-full h-full"
            style={{
              backgroundColor: st.shapeFill || st.backgroundColor,
              borderRadius: st.borderRadius || 0,
            }}
            dangerouslySetInnerHTML={{ __html: element.content }}
          />
        ) : (
          // Regular shape
          <div
            className="w-full h-full"
            style={{
              backgroundColor: st.shapeFill || st.backgroundColor,
              borderRadius: st.borderRadius || 0,
              boxShadow: st.boxShadow || undefined,
            }}
          />
        )
      )}

      {/* Chart placeholder in cinematic mode */}
      {/* Video element */}
      {element.type === 'video' && element.content && (
        <video
          src={element.content}
          autoPlay muted loop playsInline
          className="w-full h-full"
          style={{
            objectFit: (element.style.objectFit as any) || 'cover',
            borderRadius: element.style.borderRadius || 0,
          }}
        />
      )}

      {isChart && (
        <div className="w-full h-full flex items-center justify-center" style={{ opacity: 0.5 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Chart</span>
        </div>
      )}
    </motion.div>
  );
}

/** Get initial animation state based on animation type */
function getInitialState(type: string): Record<string, number | string> {
  switch (type) {
    case 'scale-up':
      return { opacity: 0, scale: 0.85, y: 0 };
    case 'slide-up':
      return { opacity: 0, y: 30, scale: 1 };
    case 'slide-right':
      return { opacity: 0, x: -30, y: 0, scale: 1 };
    case 'blur-in':
      return { opacity: 0, filter: 'blur(12px)', y: 8, scale: 1 };
    case 'glass-reveal':
      return { opacity: 0, y: 20, scale: 1 };
    case 'fade-in':
    default:
      return { opacity: 0, y: 10, scale: 1 };
  }
}

// ============ Main Component ============

export default function CinematicPresentation({
  slides, preset, startIndex = 0, presentationTitle, metadata, onExit,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [activationCounts, setActivationCounts] = useState<number[]>(() =>
    slides.map((_, i) => (i === startIndex ? 1 : 0))
  );
  const [fullscreenToast, setFullscreenToast] = useState<string | null>(null);

  const headingFont = `'${preset.fontHeading}', sans-serif`;
  const bodyFont = `'${preset.fontBody}', sans-serif`;

  // Assign videos from pool for slides without explicit videoBackground
  const poolVideos = useMemo(
    () => getVideosForSlides(preset.videoCategory, slides.length),
    [preset.videoCategory, slides.length]
  );
  const slideVideos = useMemo(
    () => poolVideos.map((poolVideo, i) => {
      const stored = slides[i]?.videoBackground;
      if (stored) return { url: stored.url, type: stored.type, opacity: stored.opacity, filter: stored.filter, transform: stored.transform };
      return poolVideo
        ? { url: poolVideo.url, type: poolVideo.url.includes('.m3u8') ? 'hls' as const : 'mp4' as const, opacity: preset.videoOpacity, filter: preset.videoFilter }
        : null;
    }),
    [poolVideos, slides, preset.videoOpacity, preset.videoFilter]
  );

  // Load fonts
  useEffect(() => {
    loadGoogleFont(preset.fontHeading);
    loadGoogleFont(preset.fontBody);
  }, [preset]);

  // Fullscreen — exit presentation when user leaves fullscreen (single Escape)
  useEffect(() => {
    let listening = false;

    const handleFullscreenChange = () => {
      if (listening && !document.fullscreenElement) onExit();
    };

    document.documentElement.requestFullscreen?.()
      .then(() => {
        listening = true;
        document.addEventListener('fullscreenchange', handleFullscreenChange);
      })
      .catch(() => {
        setFullscreenToast('Press F11 for fullscreen');
        setTimeout(() => setFullscreenToast(null), 3000);
      });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onExit]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= slides.length || index === currentIndex) return;
    setCurrentIndex(index);
    setActivationCounts(prev => {
      const next = [...prev];
      next[index] = (next[index] || 0) + 1;
      return next;
    });
  }, [currentIndex, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onExit(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goTo(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, goTo, onExit]);

  // Auto-advance timer
  useEffect(() => {
    const slide = slides[currentIndex];
    const autoAdvance = slide?.animationConfig?.autoAdvanceDuration;
    if (!autoAdvance || autoAdvance <= 0) return;
    const timeout = setTimeout(() => goTo(currentIndex + 1), autoAdvance * 1000);
    return () => clearTimeout(timeout);
  }, [currentIndex, slides, goTo]);

  // Compute viewport scale for 1920×1080 → screen size
  const [viewportScale, setViewportScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const scaleX = window.innerWidth / CANVAS_W;
      const scaleY = window.innerHeight / CANVAS_H;
      setViewportScale(Math.min(scaleX, scaleY));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const transition = getTransition(slides[currentIndex], preset);
  const variants = getTransitionVariants(transition.type, transition.duration);

  // Use AnimatePresence mode based on transition type
  const apMode = ['fade-cross', 'cross-blur'].includes(transition.type) ? 'sync' as const : 'wait' as const;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden cursor-none"
      style={{ backgroundColor: preset.backgroundColor, fontFamily: bodyFont }}
    >
      {/* Fullscreen toast */}
      <AnimatePresence>
        {fullscreenToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xs tracking-wide"
          >
            {fullscreenToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right UI */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3 opacity-0 hover:opacity-100 transition-opacity duration-300">
        {presentationTitle && (
          <span className="text-white/40 text-xs tracking-wide truncate max-w-[200px]" style={{ fontFamily: bodyFont }}>
            {presentationTitle}
          </span>
        )}
        <span className="text-white/40 text-xs tabular-nums">
          {currentIndex + 1}/{slides.length}
        </span>
        <button
          onClick={onExit}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Slides with transitions */}
      <AnimatePresence mode={apMode}>
        <motion.div
          key={currentIndex}
          className="absolute inset-0"
          {...variants}
        >
          {/* Background layers */}
          <div className="absolute inset-0" style={{ backgroundColor: preset.backgroundColor }}>
            {/* Video background */}
            {slideVideos[currentIndex] && (
              <VideoBackground
                config={{
                  url: slideVideos[currentIndex]!.url,
                  type: slideVideos[currentIndex]!.type || 'mp4',
                  opacity: slideVideos[currentIndex]!.opacity ?? preset.videoOpacity,
                  filter: slideVideos[currentIndex]!.filter || preset.videoFilter,
                  transform: slideVideos[currentIndex]!.transform,
                  objectFit: 'cover',
                }}
              />
            )}

            {/* Slide background image */}
            {slides[currentIndex]?.background?.type === 'image' && slides[currentIndex].background.value && (
              <img
                src={slides[currentIndex].background.value}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.5, filter: 'brightness(0.5)' }}
              />
            )}

            {/* Slide background color/gradient */}
            {slides[currentIndex]?.background?.type === 'solid' && (
              <div className="absolute inset-0" style={{ backgroundColor: slides[currentIndex].background.value, opacity: 0.3 }} />
            )}
            {slides[currentIndex]?.background?.type === 'gradient' && (
              <div className="absolute inset-0" style={{ background: slides[currentIndex].background.value, opacity: 0.3 }} />
            )}

            {/* Cinematic overlays */}
            <CinematicOverlays config={getOverlays(slides[currentIndex], preset)} />
          </div>

          {/* Content: positioned elements at real coordinates */}
          <div
            className="absolute z-10"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${viewportScale})`,
              transformOrigin: 'center center',
              fontFamily: bodyFont,
            }}
          >
            {/* Top bar (from preset, not template elements) */}
            {(preset.showMetadata || preset.showSlideNumbers) && (
              <BlurReveal delay={0.05} className="absolute top-[3%] left-[5%] right-[5%] flex items-center justify-between z-20">
                <div
                  className="text-sm font-medium tracking-widest uppercase"
                  style={{ color: preset.secondaryTextColor, fontFamily: headingFont, fontSize: 14 }}
                >
                  {preset.showMetadata && (metadata?.author || metadata?.type || '')}
                </div>
                {preset.showSlideNumbers && (
                  <div style={{ color: preset.secondaryTextColor, fontSize: 18 }}>
                    {String(currentIndex + 1).padStart(2, '0')}
                  </div>
                )}
              </BlurReveal>
            )}

            {/* Metadata bar (hero only) */}
            {preset.showMetadata && currentIndex === 0 && metadata && (
              <BlurReveal delay={0.12} className="absolute top-[7%] left-[5%] flex gap-8 z-20">
                {metadata.type && <MetaItem label="Type" value={metadata.type} color={preset.secondaryTextColor} />}
                {metadata.author && <MetaItem label="Author" value={metadata.author} color={preset.secondaryTextColor} />}
                {metadata.date && <MetaItem label="Date" value={metadata.date} color={preset.secondaryTextColor} />}
              </BlurReveal>
            )}

            {/* Divider line */}
            <div className="absolute top-[5.5%] left-[5%] right-[5%] h-px bg-white/[0.08] z-20" />

            {/* Render all slide elements at their real positions */}
            {(slides[currentIndex]?.elements || [])
              .filter(el => el.visible !== false)
              .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
              .map((element, elIdx) => (
                <AnimatedElement
                  key={element.id}
                  element={element}
                  animConfig={getElementAnimation(
                    element,
                    slides[currentIndex],
                    currentIndex,
                    slides.length,
                    preset,
                    elIdx,
                  )}
                  activationKey={activationCounts[currentIndex] || 0}
                />
              ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {preset.navStyle === 'dots' && <NavigationDots count={slides.length} current={currentIndex} onNavigate={goTo} />}
      {preset.navStyle === 'progress-bar' && <ProgressBar count={slides.length} current={currentIndex} />}
      {preset.navStyle === 'numbers' && <NumberNav count={slides.length} current={currentIndex} color={preset.secondaryTextColor} />}
    </div>
  );
}

function MetaItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span style={{ color, fontSize: 13, letterSpacing: '0.04em' }}>{label}</span>
      <span className="text-white" style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}
