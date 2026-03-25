import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { CINEMATIC_EASINGS } from '@/types/cinematic';

const DEFAULT_EASING = CINEMATIC_EASINGS.expoOut;

// ============ Shared Props ============

interface BaseProps {
  delay?: number;
  duration?: number;
  easing?: number[];
  className?: string;
}

// ============ 1. SlideUpLine ============
// Clip-reveal slide-up. Headings, single lines.

interface SlideUpLineProps extends BaseProps {
  children: React.ReactNode;
}

export function SlideUpLine({ children, delay = 0, duration = 0.7, easing = DEFAULT_EASING }: SlideUpLineProps) {
  return (
    <span className="overflow-hidden inline-block">
      <motion.span
        className="inline-block"
        initial={{ y: '115%' }}
        animate={{ y: '0%' }}
        transition={{ duration, delay, ease: easing }}
      >
        {children}
      </motion.span>
    </span>
  );
}

// ============ 2. WordByWordReveal ============
// Each word slides up with stagger.

interface WordByWordRevealProps extends BaseProps {
  text: string;
  stagger?: number;
}

export function WordByWordReveal({
  text, delay = 0, stagger = 0.035, duration = 0.55, easing = DEFAULT_EASING, className,
}: WordByWordRevealProps) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden inline-block mr-[0.27em]">
          <motion.span
            className="inline-block"
            initial={{ y: '115%' }}
            animate={{ y: '0%' }}
            transition={{ duration, delay: delay + i * stagger, ease: easing }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ============ 3. CharByCharReveal ============
// Each character slides up with micro-stagger. Premium feel.

interface CharByCharRevealProps extends BaseProps {
  text: string;
  stagger?: number;
}

export function CharByCharReveal({
  text, delay = 0, stagger = 0.02, duration = 0.4,
  easing = CINEMATIC_EASINGS.cinematic, className,
}: CharByCharRevealProps) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((char, i) => (
        <span key={i} className="overflow-hidden inline-block">
          <motion.span
            className="inline-block"
            initial={{ y: '115%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            transition={{
              duration,
              delay: delay + i * stagger,
              ease: easing,
            }}
            aria-hidden
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ============ 4. ClipRevealLine ============
// clipPath-based reveal. Stripe/Apple Keynote style. No overflow issues.

interface ClipRevealLineProps extends BaseProps {
  children: React.ReactNode;
}

export function ClipRevealLine({
  children, delay = 0, duration = 0.8,
  easing = CINEMATIC_EASINGS.cinematic, className,
}: ClipRevealLineProps) {
  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)', y: 30 }}
      animate={{ clipPath: 'inset(0% 0% 0% 0%)', y: 0 }}
      transition={{ duration, delay, ease: easing }}
    >
      {children}
    </motion.div>
  );
}

// ============ 5. BlurReveal ============
// Fade in with blur dissolve. Enhanced with scale for cinematic depth.

interface BlurRevealProps extends BaseProps {
  children: React.ReactNode;
  blurAmount?: number;
}

export function BlurReveal({
  children, delay = 0, duration = 0.9, easing = DEFAULT_EASING, className,
  blurAmount = 12,
}: BlurRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: `blur(${blurAmount}px)`, scale: 1.02, y: 8 }}
      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: easing,
        opacity: { duration: duration * 0.6, delay },
        filter: { duration, delay },
      }}
    >
      {children}
    </motion.div>
  );
}

// ============ 6. FadeIn ============
// Simple opacity fade.

interface FadeInProps extends BaseProps {
  children: React.ReactNode;
}

export function FadeIn({ children, delay = 0, duration = 0.6, className }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: DEFAULT_EASING }}
    >
      {children}
    </motion.div>
  );
}

// ============ 7. ScaleUp ============
// Scale from 0.85 to 1 with fade. Good for cards, stats.

interface ScaleUpProps extends BaseProps {
  children: React.ReactNode;
}

export function ScaleUp({ children, delay = 0, duration = 0.6, easing = CINEMATIC_EASINGS.backOut, className }: ScaleUpProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay, ease: easing }}
    >
      {children}
    </motion.div>
  );
}

// ============ 8. Counter ============
// Animated number counter from 0 to value. Uses spring physics.

interface CounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Counter({ value, suffix = '', prefix = '', delay = 0, duration = 1.5, className, style }: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: duration * 1000 });

  useEffect(() => {
    const timeout = setTimeout(() => motionValue.set(value), delay * 1000);
    return () => clearTimeout(timeout);
  }, [value, delay, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (v) => setDisplayValue(Math.round(v)));
    return unsubscribe;
  }, [springValue]);

  return <span className={className} style={style}>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
}

// ============ 9. TypewriterText ============
// Character-by-character with blinking cursor. Human-like jitter.

interface TypewriterTextProps extends BaseProps {
  text: string;
  speed?: number;          // ms per character
  cursorColor?: string;
  onComplete?: () => void;
}

export function TypewriterText({
  text, delay = 0, speed = 40,
  cursorColor = 'currentColor', className, onComplete,
}: TypewriterTextProps) {
  const [displayedCount, setDisplayedCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [started, setStarted] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayedCount >= text.length) {
      onComplete?.();
      const blinkTimeout = setTimeout(() => setShowCursor(false), 2000);
      return () => clearTimeout(blinkTimeout);
    }
    const jitter = speed + (Math.random() * speed * 0.5 - speed * 0.25);
    const timeout = setTimeout(() => setDisplayedCount(c => c + 1), jitter);
    return () => clearTimeout(timeout);
  }, [displayedCount, started, text.length, speed, onComplete]);

  useEffect(() => {
    const blink = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <span className={className}>
      {text.slice(0, displayedCount)}
      {showCursor && (
        <motion.span style={{ color: cursorColor }} animate={{ opacity: cursorVisible ? 1 : 0 }} transition={{ duration: 0.1 }}>
          |
        </motion.span>
      )}
    </span>
  );
}

// ============ 10. SplitFromCenter ============
// Letters start collapsed at center and spread to natural positions.

interface SplitFromCenterProps extends BaseProps {
  text: string;
}

export function SplitFromCenter({
  text, delay = 0, duration = 1.0,
  easing = DEFAULT_EASING, className,
}: SplitFromCenterProps) {
  const chars = text.split('');
  const mid = chars.length / 2;

  return (
    <span className={className} style={{ display: 'inline-flex' }}>
      {chars.map((char, i) => {
        const distFromCenter = i - mid;
        const offsetX = -distFromCenter * 20;

        return (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ x: offsetX, opacity: 0, filter: 'blur(4px)' }}
            animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
            transition={{
              duration,
              delay: delay + Math.abs(distFromCenter) * 0.02,
              ease: easing,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        );
      })}
    </span>
  );
}

// ============ 11. Perspective3DReveal ============
// Text flips in from below with 3D perspective.

interface Perspective3DRevealProps extends BaseProps {
  children: React.ReactNode;
}

export function Perspective3DReveal({
  children, delay = 0, duration = 0.9,
  easing = DEFAULT_EASING, className,
}: Perspective3DRevealProps) {
  return (
    <div style={{ perspective: '800px' }}>
      <motion.div
        className={className}
        style={{ transformOrigin: 'center bottom' }}
        initial={{ rotateX: 60, opacity: 0, y: 40 }}
        animate={{ rotateX: 0, opacity: 1, y: 0 }}
        transition={{
          duration,
          delay,
          ease: easing,
          opacity: { duration: duration * 0.4, delay },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============ 12. GlassReveal ============
// Element reveals with glassmorphism backdrop effect.

interface GlassRevealProps extends BaseProps {
  children: React.ReactNode;
}

export function GlassReveal({
  children, delay = 0, duration = 0.8,
  easing = DEFAULT_EASING, className,
}: GlassRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: 20,
        backdropFilter: 'blur(0px)',
        background: 'rgba(255,255,255,0)',
      }}
      animate={{
        opacity: 1,
        y: 0,
        backdropFilter: 'blur(20px)',
        background: 'rgba(255,255,255,0.06)',
      }}
      transition={{ duration, delay, ease: easing }}
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 'inherit',
      }}
    >
      {children}
    </motion.div>
  );
}

// ============ Render helper ============
// Maps animation name to component. Used by CinematicPresentation.

export function renderAnimatedText(
  text: string,
  animation: string,
  opts: { delay?: number; duration?: number; easing?: number[]; stagger?: number; className?: string },
): React.ReactNode {
  const { delay = 0, duration, easing, stagger, className } = opts;

  switch (animation) {
    case 'word-by-word':
      return <WordByWordReveal text={text} delay={delay} stagger={stagger} duration={duration} easing={easing} className={className} />;
    case 'char-by-char':
      return <CharByCharReveal text={text} delay={delay} stagger={stagger ?? 0.02} duration={duration} easing={easing} className={className} />;
    case 'clip-reveal': {
      const words = text.split(' ');
      if (words.length > 5) {
        const mid = Math.ceil(words.length / 2);
        return (
          <>
            <ClipRevealLine delay={delay} duration={duration} easing={easing} className={className}>{words.slice(0, mid).join(' ')}</ClipRevealLine>
            <ClipRevealLine delay={(delay ?? 0) + 0.1} duration={duration} easing={easing} className={className}>{words.slice(mid).join(' ')}</ClipRevealLine>
          </>
        );
      }
      return <ClipRevealLine delay={delay} duration={duration} easing={easing} className={className}>{text}</ClipRevealLine>;
    }
    case 'blur-in':
      return <BlurReveal delay={delay} duration={duration} easing={easing} className={className}>{text}</BlurReveal>;
    case 'fade-in':
      return <FadeIn delay={delay} duration={duration} className={className}>{text}</FadeIn>;
    case 'type-writer':
      return <TypewriterText text={text} delay={delay} className={className} />;
    case 'scale-up':
      return <ScaleUp delay={delay} duration={duration} easing={easing} className={className}>{text}</ScaleUp>;
    case 'split-center':
      return <SplitFromCenter text={text} delay={delay} duration={duration} easing={easing} className={className} />;
    case 'perspective-3d':
      return <Perspective3DReveal delay={delay} duration={duration} easing={easing} className={className}>{text}</Perspective3DReveal>;
    case 'slide-up':
    default: {
      const words = text.split(' ');
      if (words.length > 5) {
        const mid = Math.ceil(words.length / 2);
        return (
          <>
            <SlideUpLine delay={delay} duration={duration} easing={easing}>{words.slice(0, mid).join(' ')}</SlideUpLine>
            <br />
            <SlideUpLine delay={(delay ?? 0) + 0.1} duration={duration} easing={easing}>{words.slice(mid).join(' ')}</SlideUpLine>
          </>
        );
      }
      return <SlideUpLine delay={delay} duration={duration} easing={easing}>{text}</SlideUpLine>;
    }
  }
}
