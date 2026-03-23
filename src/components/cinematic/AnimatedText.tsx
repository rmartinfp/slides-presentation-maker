import React from 'react';
import { motion } from 'framer-motion';

const DEFAULT_EASING = [0.25, 0.1, 0.25, 1];

interface SlideUpLineProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  easing?: number[];
}

/** Clip-reveal slide-up for headings */
export function SlideUpLine({ children, delay = 0, duration = 0.7, easing = DEFAULT_EASING }: SlideUpLineProps) {
  return (
    <span className="overflow-hidden inline-block">
      <motion.span
        className="inline-block"
        initial={{ y: '100%' }}
        animate={{ y: '0%' }}
        transition={{ duration, delay, ease: easing }}
      >
        {children}
      </motion.span>
    </span>
  );
}

interface WordByWordRevealProps {
  text: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  easing?: number[];
  className?: string;
}

/** Split text by spaces, each word slides up with stagger */
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
            initial={{ y: '100%' }}
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

interface BlurRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  easing?: number[];
  className?: string;
}

/** Fade in with blur dissolve */
export function BlurReveal({ children, delay = 0, duration = 0.9, easing = DEFAULT_EASING, className }: BlurRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration, delay, ease: easing }}
    >
      {children}
    </motion.div>
  );
}

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

/** Simple opacity fade */
export function FadeIn({ children, delay = 0, duration = 0.6, className }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: DEFAULT_EASING }}
    >
      {children}
    </motion.div>
  );
}

interface ScaleUpProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  easing?: number[];
  className?: string;
}

/** Scale from 0.8 to 1 with fade */
export function ScaleUp({ children, delay = 0, duration = 0.6, easing = DEFAULT_EASING, className }: ScaleUpProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay, ease: easing }}
    >
      {children}
    </motion.div>
  );
}

interface CounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Animated number counter */
export function Counter({ value, suffix = '', prefix = '', delay = 0, duration = 1.5, className, style }: CounterProps) {
  return (
    <motion.span
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.1 }}
      >
        {/* Simple approach: animate from 0 to value using CSS counter or just show value with fade */}
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: delay + 0.2, ease: DEFAULT_EASING }}
        >
          {value}
        </motion.span>
      </motion.span>
      {suffix}
    </motion.span>
  );
}
