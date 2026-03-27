import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Slide, PresentationTheme, SlideElement } from '@/types/presentation';
import { Sparkles } from 'lucide-react';

function RevealElement({
  element,
  delay,
  onDone,
}: {
  element: SlideElement;
  delay: number;
  onDone: () => void;
}) {
  const plainText = element.content
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const totalChars = plainText.length;
  const duration = Math.max(350, Math.min(totalChars * 8, 1800));

  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const doneRef = useRef(false);
  const frameRef = useRef<number>();

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const linear = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - linear, 2.5);
      setProgress(eased);
      if (linear < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(1);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [started, duration, onDone]);

  const revealPct = progress * 100;
  const maskGradient = `linear-gradient(to right, black 0%, black ${revealPct}%, transparent ${Math.min(100, revealPct + 0.5)}%)`;

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        fontSize: element.style.fontSize || 16,
        fontFamily: element.style.fontFamily
          ? `${element.style.fontFamily}, sans-serif`
          : 'sans-serif',
        fontWeight: element.style.fontWeight as React.CSSProperties['fontWeight'],
        color: element.style.color || '#000',
        textAlign: element.style.textAlign as React.CSSProperties['textAlign'],
        lineHeight: element.style.lineHeight || 1.2,
        letterSpacing: element.style.letterSpacing,
        opacity: started ? (element.opacity ?? 1) : 0,
        WebkitMaskImage: started ? maskGradient : undefined,
        maskImage: started ? maskGradient : undefined,
        transition: 'opacity 0.15s ease-out',
      }}
    >
      {plainText}
      {started && progress < 1 && (
        <span className="animate-pulse opacity-50">|</span>
      )}
    </div>
  );
}

interface OverlayProps {
  slide: Slide;
  theme: PresentationTheme;
  scale: number;
  onComplete: () => void;
}

export default function LiveGenerationOverlay({
  slide,
  theme,
  scale,
  onComplete,
}: OverlayProps) {
  const [completedCount, setCompletedCount] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const completeCalledRef = useRef(false);

  const textElements = (slide.elements || [])
    .filter((e) => e.type === 'text' && e.content)
    .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));

  const nonTextElements = (slide.elements || []).filter(
    (e) => e.type !== 'text',
  );

  const totalTexts = textElements.length;

  const handleElementDone = useCallback(() => {
    setCompletedCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (completedCount >= totalTexts && totalTexts > 0 && !completeCalledRef.current) {
      completeCalledRef.current = true;
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, 350);
      }, 200);
    }
  }, [completedCount, totalTexts, onComplete]);

  useEffect(() => {
    if (totalTexts === 0 && !completeCalledRef.current) {
      completeCalledRef.current = true;
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, 350);
      }, 500);
    }
  }, [totalTexts, onComplete]);

  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    if (slide.background.type === 'solid') bgStyle.backgroundColor = slide.background.value;
    else if (slide.background.type === 'gradient') bgStyle.background = slide.background.value;
    else if (slide.background.type === 'image') {
      bgStyle.backgroundImage = `url(${slide.background.value})`;
      bgStyle.backgroundSize = 'cover';
      bgStyle.backgroundPosition = 'center';
    }
  } else {
    bgStyle.backgroundColor = theme.tokens.palette.bg;
  }

  return (
    <motion.div
      className="absolute top-0 left-0 z-40 pointer-events-none origin-top-left"
      style={{ width: 1920, height: 1080, transform: `scale(${scale})`, ...bgStyle }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Non-text elements fade in */}
      {nonTextElements.map((el, i) => (
        <motion.div
          key={el.id}
          className="absolute overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: el.opacity }}
          transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
          style={{
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            borderRadius:
              el.type === 'shape' && el.style.shapeType === 'circle'
                ? '50%'
                : el.style.borderRadius || 0,
          }}
        >
          {el.type === 'image' && (
            <img
              src={el.content}
              alt=""
              className="w-full h-full"
              style={{
                objectFit: el.style.objectFit || 'cover',
                borderRadius: el.style.borderRadius || 0,
              }}
            />
          )}
          {el.type === 'shape' && (
            <div
              className="w-full h-full"
              style={{
                backgroundColor: el.style.shapeFill,
                borderRadius:
                  el.style.shapeType === 'circle'
                    ? '50%'
                    : el.style.borderRadius || 0,
              }}
            />
          )}
        </motion.div>
      ))}

      {/* Text elements with mask-based reveal (plain text, matching font styling) */}
      {textElements.map((el, i) => (
        <RevealElement
          key={el.id}
          element={el}
          delay={i * 150}
          onDone={handleElementDone}
        />
      ))}
    </motion.div>
  );
}

export function SlideShimmer({
  theme,
  scale,
  bgStyle,
  slideIndex,
}: {
  theme: PresentationTheme;
  scale: number;
  bgStyle?: React.CSSProperties;
  slideIndex: number;
}) {
  const textColor = theme.tokens.palette.text;

  return (
    <div
      className="absolute top-0 left-0 z-30 pointer-events-none origin-top-left"
      style={{ width: 1920, height: 1080, transform: `scale(${scale})`, ...bgStyle }}
    >
      {/* Skeleton bars */}
      <div className="absolute left-[8%] top-[32%] w-[55%] h-[36px] rounded-lg animate-shimmer bg-gradient-to-r from-transparent via-current/[0.06] to-transparent bg-[length:200%_100%]" style={{ color: textColor }} />
      <div className="absolute left-[8%] top-[40%] w-[75%] h-[18px] rounded animate-shimmer bg-gradient-to-r from-transparent via-current/[0.06] to-transparent bg-[length:200%_100%]" style={{ color: textColor, animationDelay: '0.3s' }} />
      <div className="absolute left-[8%] top-[45%] w-[60%] h-[18px] rounded animate-shimmer bg-gradient-to-r from-transparent via-current/[0.06] to-transparent bg-[length:200%_100%]" style={{ color: textColor, animationDelay: '0.6s' }} />

      {/* Center indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 bg-black/15 backdrop-blur-sm rounded-2xl px-6 py-3"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="w-5 h-5 text-white/70" />
          </motion.div>
          <span className="text-white/70 text-base font-medium">
            Generating slide {slideIndex + 1}...
          </span>
        </motion.div>
      </div>
    </div>
  );
}
