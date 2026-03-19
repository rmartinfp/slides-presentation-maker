import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Slide, PresentationTheme } from '@/types/presentation';

interface Props {
  slides: Slide[];
  theme: PresentationTheme;
  startIndex?: number;
  onExit: () => void;
}

export default function PresentationMode({ slides, theme, startIndex = 0, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [direction, setDirection] = useState(0);
  const { palette, typography } = theme.tokens;
  const slide = slides[currentIndex];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        if (currentIndex < slides.length - 1) {
          setDirection(1);
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          setDirection(-1);
          setCurrentIndex(prev => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, slides.length, onExit]);

  // Enter fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const renderContent = () => {
    switch (slide.layout) {
      case 'cover':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-[10%]">
            <h1 style={{ color: palette.primary, fontFamily: typography.titleFont, fontSize: '4.5vw' }} className="font-bold leading-tight mb-6">
              {slide.title || 'Untitled'}
            </h1>
            {slide.subtitle && (
              <p style={{ color: palette.text, fontFamily: typography.bodyFont, fontSize: '2vw' }} className="opacity-70">
                {slide.subtitle}
              </p>
            )}
          </div>
        );
      case 'statement':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-[12%]" style={{ backgroundColor: palette.primary }}>
            <p style={{ color: '#ffffff', fontFamily: typography.titleFont, fontSize: '3.5vw' }} className="font-bold italic leading-tight mb-6">
              {slide.body || slide.title}
            </p>
            {slide.subtitle && (
              <p style={{ color: '#ffffff', fontFamily: typography.bodyFont, fontSize: '1.8vw' }} className="opacity-70 italic">
                {slide.subtitle}
              </p>
            )}
          </div>
        );
      case 'closing':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-[10%]">
            <h1 style={{ color: palette.primary, fontFamily: typography.titleFont, fontSize: '5vw' }} className="font-bold mb-4">
              {slide.title || 'Thank You'}
            </h1>
            {slide.subtitle && (
              <p style={{ color: palette.text, fontFamily: typography.bodyFont, fontSize: '2vw' }} className="opacity-60">
                {slide.subtitle}
              </p>
            )}
            {slide.body && (
              <p style={{ color: palette.primary, fontFamily: typography.bodyFont, fontSize: '1.5vw' }} className="mt-8 opacity-80">
                {slide.body}
              </p>
            )}
          </div>
        );
      default:
        return (
          <div className="flex flex-col h-full px-[8%] py-[6%]">
            <h2 style={{ color: palette.primary, fontFamily: typography.titleFont, fontSize: '3vw' }} className="font-bold mb-8">
              {slide.title}
            </h2>
            {slide.body && (
              <p style={{ color: palette.text, fontFamily: typography.bodyFont, fontSize: '1.6vw' }} className="mb-6 leading-relaxed opacity-80">
                {slide.body}
              </p>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <div className="flex-1 flex flex-col justify-start gap-4">
                {slide.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full mt-2 shrink-0" style={{ backgroundColor: palette.accent || palette.primary }} />
                    <p style={{ color: palette.text, fontFamily: typography.bodyFont, fontSize: '1.5vw' }} className="leading-relaxed">
                      {b}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-0 hover:opacity-100"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Slide */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute inset-0"
          style={{ backgroundColor: slide.layout === 'statement' ? palette.primary : palette.bg }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center gap-4 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
        <span className="text-white/70 text-sm font-mono">
          {currentIndex + 1} / {slides.length}
        </span>
        {/* Progress dots */}
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
