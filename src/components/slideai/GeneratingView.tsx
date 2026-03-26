import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { PresentationTheme, Slide } from '@/types/presentation';
import StepIndicator from './StepIndicator';

/** Extract the biggest text from a template slide for the typing preview */
function getTemplateTitle(slide: Slide): string {
  const texts = (slide.elements || [])
    .filter(e => e.type === 'text' && e.content)
    .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));
  const raw = texts[0]?.content || '';
  // Strip HTML tags, clean placeholder markers, normalize whitespace
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\{\{|\}\}/g, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Writing content...';
}

/** Typewriter component for the generating view */
function TypingText({ text, color, font, delay = 0, small }: { text: string; color: string; font: string; delay?: number; small?: boolean }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started || count >= text.length) return;
    const speed = small ? 15 + Math.random() * 20 : 30 + Math.random() * 40;
    const t = setTimeout(() => setCount(c => c + 1), speed);
    return () => clearTimeout(t);
  }, [count, started, text.length, small]);

  return (
    <p
      className={small ? 'leading-snug line-clamp-1 opacity-60' : 'font-bold leading-snug line-clamp-2'}
      style={{
        color,
        fontSize: small ? 'clamp(6px, 0.9vw, 10px)' : 'clamp(9px, 1.6vw, 15px)',
        fontFamily: `${font}, sans-serif`,
        textShadow: '0 1px 4px rgba(0,0,0,0.3)',
        marginBottom: small ? 0 : 2,
      }}
    >
      {text.slice(0, count)}
      {count < text.length && <span className="animate-pulse">|</span>}
    </p>
  );
}

interface Props {
  theme: PresentationTheme;
  generatedSlides: Slide[] | null;
  generatedTitle: string | null;
  userPrompt?: string;
  templateSlides?: Slide[] | null;
  onComplete: () => void;
}

const STAGES = [
  'Analyzing your content...',
  'Structuring the narrative...',
  'Designing the layouts...',
  'Writing slide content...',
  'Adding visual elements...',
  'Polishing the design...',
];

export default function GeneratingView({ theme, generatedSlides, generatedTitle, userPrompt, templateSlides, onComplete }: Props) {
  const slideCount = templateSlides?.length || 8;
  const cols = slideCount <= 4 ? 2 : slideCount <= 6 ? 3 : slideCount <= 9 ? 3 : 4;
  const palette = theme.tokens.palette;
  const isGenerated = !!generatedSlides && generatedSlides.length > 0;

  const [revealedSlides, setRevealedSlides] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [realOpacity, setRealOpacity] = useState(0);
  const [morphing, setMorphing] = useState(false);

  // Phase 1: Reveal template slides one by one with stagger
  useEffect(() => {
    if (isGenerated) return;
    if (revealedSlides >= slideCount) return;
    const t = setTimeout(() => setRevealedSlides(c => c + 1), 400);
    return () => clearTimeout(t);
  }, [revealedSlides, slideCount, isGenerated]);

  // Cycle through stages
  useEffect(() => {
    if (isGenerated) return;
    const interval = setInterval(() => {
      setStageIdx(i => (i + 1) % STAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isGenerated]);

  // Phase 2: When real slides arrive, crossfade
  useEffect(() => {
    if (!isGenerated) return;
    setRevealedSlides(slideCount);
    const start = performance.now();
    const dur = 500;
    const anim = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setRealOpacity(t);
      if (t < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }, [isGenerated, slideCount]);

  // Phase 3: Morph to editor
  useEffect(() => {
    if (!isGenerated || realOpacity < 1) return;
    const t = setTimeout(() => setMorphing(true), 1000);
    return () => clearTimeout(t);
  }, [isGenerated, realOpacity]);

  useEffect(() => {
    if (!morphing) return;
    const t = setTimeout(onComplete, 800);
    return () => clearTimeout(t);
  }, [morphing, onComplete]);

  const realSlides = generatedSlides || [];

  // Get bg style for a slide
  const getBg = (slide?: Slide) => {
    if (!slide?.background) return palette.bg;
    if (slide.background.type === 'solid') return slide.background.value;
    if (slide.background.type === 'gradient') return slide.background.value;
    return palette.bg;
  };

  const getBgImage = (slide?: Slide) => {
    if (slide?.background?.type === 'image') return slide.background.value;
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 mesh-gradient overflow-hidden flex flex-col">

      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#4F46E5]/10 blur-[150px] pointer-events-none" />

      <div className="relative z-20 pt-6 shrink-0">
        <div className="max-w-5xl mx-auto px-6"><StepIndicator currentStep={3} /></div>
      </div>

      {/* Status */}
      <div className="relative z-10 text-center pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2 justify-center mb-1">
          {realOpacity < 1 && (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
              <Sparkles className="w-4 h-4 text-[#4F46E5]" />
            </motion.div>
          )}
          <h2 className="text-lg font-headline font-bold text-slate-800">
            {realOpacity >= 1 ? (generatedTitle || 'Your Presentation') : STAGES[stageIdx]}
          </h2>
        </div>
        {realOpacity >= 1 && <p className="text-sm text-slate-400">{realSlides.length} slides ready</p>}
      </div>

      {/* Slide grid */}
      <div className="relative z-10 flex-1 flex items-start justify-center overflow-hidden px-6 pb-8">
        <motion.div
          className="grid gap-3 w-full max-w-5xl"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          animate={morphing ? { scale: 0.92, opacity: 0, filter: 'blur(10px)', y: -30 } : {}}
          transition={morphing ? { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } : {}}
        >
          {Array.from({ length: slideCount }).map((_, i) => {
            const tmplSlide = templateSlides?.[i];
            const realSlide = realSlides[i];
            const isRevealed = i < revealedSlides;
            const bg = getBg(realSlide || tmplSlide);
            const bgImg = getBgImage(realSlide || tmplSlide);

            // Get real slide title if available — strip all HTML and entities
            let realTitle = '';
            let realBody = '';
            if (realSlide) {
              const texts = (realSlide.elements || []).filter(e => e.type === 'text')
                .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));
              const clean = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\{\{|\}\}/g, '').replace(/\s+/g, ' ').trim();
              realTitle = clean(texts[0]?.content || '').slice(0, 60);
              realBody = clean(texts[1]?.content || '').slice(0, 80);
            }

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={isRevealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="aspect-video rounded-xl overflow-hidden relative shadow-md shadow-black/5 ring-1 ring-black/[0.04]"
                style={{ background: bg }}
              >
                {/* Background image */}
                {bgImg && <img src={bgImg} alt="" className="absolute inset-0 w-full h-full object-cover" />}

                {/* Slide number */}
                <div className="absolute top-[5%] right-[5%] text-[9px] font-mono opacity-20 z-20" style={{ color: palette.text }}>
                  {String(i + 1).padStart(2, '0')}
                </div>

                {/* Typewriter text while waiting for real content */}
                {isRevealed && !realSlide && (
                  <div className="absolute inset-0 z-10 p-[7%] flex flex-col justify-end">
                    <TypingText
                      text={tmplSlide ? getTemplateTitle(tmplSlide) : STAGES[stageIdx]}
                      color={palette.text}
                      font={theme.tokens.typography.titleFont}
                      delay={i * 600}
                    />
                  </div>
                )}

                {/* Real content — typing animation when AI finishes */}
                {realSlide && realOpacity > 0 && (
                  <div className="absolute inset-0 p-[7%] flex flex-col justify-end z-20" style={{ opacity: realOpacity }}>
                    <TypingText
                      text={realTitle || 'Untitled'}
                      color={palette.text}
                      font={theme.tokens.typography.titleFont}
                      delay={i * 400}
                    />
                    {realBody && (
                      <TypingText
                        text={realBody}
                        color={palette.text}
                        font={theme.tokens.typography.bodyFont}
                        delay={i * 400 + 800}
                        small
                      />
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {morphing && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-slate-400 z-20">
          Opening editor...
        </motion.p>
      )}
    </motion.div>
  );
}
