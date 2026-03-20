import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Slide, PresentationTheme } from '@/types/presentation';
import { CinematicPreset } from '@/types/cinematic';
import { SlideUpLine, WordByWordReveal, BlurReveal, FadeIn, ScaleUp } from './AnimatedText';
import { loadGoogleFont } from '@/lib/font-loader';

interface Props {
  slides: Slide[];
  theme: PresentationTheme;
  preset: CinematicPreset;
  startIndex?: number;
  metadata?: { type?: string; author?: string; date?: string; industry?: string };
  onExit: () => void;
}

export default function CinematicPresentation({
  slides, theme, preset, startIndex = 0, metadata, onExit,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [activationCounts, setActivationCounts] = useState<number[]>(() => slides.map(() => 0));
  const slide = slides[currentIndex];

  // Load preset fonts
  useEffect(() => {
    loadGoogleFont(preset.fontHeading);
    loadGoogleFont(preset.fontBody);
  }, [preset]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goTo(Math.min(currentIndex + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo(Math.max(currentIndex - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, slides.length, onExit]);

  // Fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.exitFullscreen?.().catch(() => {}); };
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setActivationCounts(prev => {
      const next = [...prev];
      next[index] = (next[index] || 0) + 1;
      return next;
    });
  }, []);

  // Classify slide elements for animation mapping
  const classifyElements = (slide: Slide) => {
    const texts = [...(slide.elements || [])]
      .filter(e => e.type === 'text')
      .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));

    return {
      title: texts[0],
      subtitle: texts[1],
      body: texts.slice(2),
      images: (slide.elements || []).filter(e => e.type === 'image'),
      shapes: (slide.elements || []).filter(e => e.type === 'shape'),
    };
  };

  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Render a single slide with cinematic animations
  const renderSlide = (slideIndex: number) => {
    const s = slides[slideIndex];
    const isActive = slideIndex === currentIndex;
    const key = activationCounts[slideIndex] || 0;
    const { title, subtitle, body } = classifyElements(s);

    const titleText = title ? stripHtml(title.content) : '';
    const subtitleText = subtitle ? stripHtml(subtitle.content) : '';

    // Determine slide type heuristic
    const slideType = slideIndex === 0 ? 'hero'
      : slideIndex === slides.length - 1 ? 'closing'
      : body.length === 0 && !subtitle ? 'section'
      : 'content';

    return (
      <motion.div
        key={slideIndex}
        className="absolute inset-0"
        animate={{ opacity: isActive ? 1 : 0, zIndex: isActive ? 10 : 0 }}
        transition={{ duration: preset.transitionDuration, ease: 'easeInOut' }}
        style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      >
        {/* Background */}
        <div className="absolute inset-0" style={{ backgroundColor: preset.backgroundColor }}>
          {/* Background image from slide */}
          {s.background?.type === 'image' && s.background.value && (
            <img
              src={s.background.value}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.6, filter: 'brightness(0.5)' }}
            />
          )}
        </div>

        {/* Content wrapper — re-mount on activation to replay animations */}
        {isActive && (
          <div key={key} className="relative z-10 w-full h-full flex flex-col" style={{ fontFamily: `'${preset.fontBody}', sans-serif` }}>
            {/* Top bar */}
            <BlurReveal delay={0.05} className="px-[5%] pt-[3.5%] flex items-center justify-between">
              <div className="text-white/60 text-sm font-medium tracking-wide" style={{ fontFamily: `'${preset.fontHeading}', sans-serif` }}>
                {metadata?.author || ''}
              </div>
              {preset.showSlideNumbers && (
                <div style={{ color: preset.secondaryTextColor, fontSize: 20 }}>
                  {String(slideIndex + 1).padStart(2, '0')}
                </div>
              )}
            </BlurReveal>

            {/* Divider */}
            <div className="mt-4 mx-[5%]">
              <div className="w-full h-px" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Metadata bar */}
            {preset.showMetadata && slideIndex === 0 && metadata && (
              <BlurReveal delay={0.1} className="px-[5%] mt-4 flex gap-8">
                {metadata.type && <MetaItem label="Type" value={metadata.type} color={preset.secondaryTextColor} />}
                {metadata.author && <MetaItem label="Author" value={metadata.author} color={preset.secondaryTextColor} />}
                {metadata.date && <MetaItem label="Date" value={metadata.date} color={preset.secondaryTextColor} />}
                {metadata.industry && <MetaItem label="Industry" value={metadata.industry} color={preset.secondaryTextColor} />}
              </BlurReveal>
            )}

            {/* Main content */}
            {slideType === 'hero' ? (
              <div className="flex-1 flex items-end px-[5%] pb-[8%]">
                <h1
                  className="leading-[0.9] tracking-tight"
                  style={{
                    color: preset.primaryTextColor,
                    fontFamily: `'${preset.fontHeading}', sans-serif`,
                    fontSize: 'clamp(48px, 10vw, 140px)',
                  }}
                >
                  {titleText.split(' ').length > 3 ? (
                    <>
                      <SlideUpLine delay={0.3} duration={0.7}>{titleText.split(' ').slice(0, Math.ceil(titleText.split(' ').length / 2)).join(' ')}</SlideUpLine>
                      <br />
                      <SlideUpLine delay={0.4} duration={0.7}>{titleText.split(' ').slice(Math.ceil(titleText.split(' ').length / 2)).join(' ')}</SlideUpLine>
                    </>
                  ) : (
                    <SlideUpLine delay={0.3} duration={0.7}>{titleText}</SlideUpLine>
                  )}
                </h1>
              </div>
            ) : slideType === 'section' ? (
              <div className="flex-1 flex items-center justify-center px-[10%]">
                <h1
                  className="text-center leading-[0.95] tracking-tight"
                  style={{
                    color: preset.primaryTextColor,
                    fontFamily: `'${preset.fontHeading}', sans-serif`,
                    fontSize: 'clamp(36px, 8vw, 120px)',
                  }}
                >
                  <SlideUpLine delay={0.2}>{titleText}</SlideUpLine>
                </h1>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between px-[5%] pt-[4%] pb-[5%]">
                <div className="max-w-[85%]">
                  {subtitleText && (
                    <BlurReveal delay={0.15}>
                      <p style={{ color: preset.secondaryTextColor, fontSize: 'clamp(12px, 1.2vw, 18px)' }}>
                        {subtitleText}
                      </p>
                    </BlurReveal>
                  )}
                  <div className="mt-3">
                    <WordByWordReveal
                      text={titleText}
                      delay={0.25}
                      stagger={0.035}
                      duration={0.55}
                      className="leading-[1.04] tracking-tight block"
                      style={{
                        color: preset.primaryTextColor,
                        fontFamily: `'${preset.fontHeading}', sans-serif`,
                        fontSize: 'clamp(22px, 3.5vw, 56px)',
                      } as any}
                    />
                  </div>
                  {body.length > 0 && (
                    <BlurReveal delay={0.8} className="mt-6 max-w-[90%]">
                      <p style={{ color: preset.secondaryTextColor, fontSize: 'clamp(12px, 1.1vw, 18px)', lineHeight: 1.6 }}>
                        {body.map(b => stripHtml(b.content)).join(' ')}
                      </p>
                    </BlurReveal>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        backgroundColor: preset.backgroundColor,
        fontFamily: `'${preset.fontBody}', sans-serif`,
      }}
    >
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all opacity-0 hover:opacity-100"
      >
        <X className="w-5 h-5" />
      </button>

      {/* All slides mounted simultaneously */}
      {slides.map((_, i) => renderSlide(i))}

      {/* Navigation dots */}
      {preset.showProgressDots && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'bg-white w-6 h-2'
                  : 'bg-white/40 w-2 h-2 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span style={{ color, fontSize: 13 }}>{label}</span>
      <span className="text-white" style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}
