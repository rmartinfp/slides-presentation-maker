import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { PresentationTheme, Slide } from '@/types/presentation';
import StepIndicator from './StepIndicator';

interface Props {
  theme: PresentationTheme;
  generatedSlides: Slide[] | null;
  generatedTitle: string | null;
  onComplete: () => void;
}

// Fake slide content that looks realistic while typing
const FAKE_SLIDES = [
  { title: 'Introduction & Overview', body: 'An executive summary of our strategic vision and key objectives for the coming year.' },
  { title: 'Market Analysis', body: 'Current market trends show a 34% growth in our target segment, driven by digital transformation.' },
  { title: 'Our Solution', body: 'A unified platform that combines AI-powered analytics with intuitive workflow automation.' },
  { title: 'Key Metrics & Results', body: 'Revenue grew 127% year-over-year while customer acquisition costs decreased by 40%.' },
  { title: 'Competitive Landscape', body: 'We maintain a strong position with 3 key differentiators that set us apart from existing solutions.' },
  { title: 'Product Roadmap', body: 'Our development pipeline includes 12 major features planned across four quarterly releases.' },
  { title: 'Business Model', body: 'SaaS subscription model with three tiers, targeting SMB through enterprise segments.' },
  { title: 'Team & Leadership', body: 'A diverse team of 45 professionals with deep expertise in AI, design and enterprise software.' },
  { title: 'Financial Projections', body: 'Projecting $8.5M ARR by end of year with a clear path to profitability within 18 months.' },
  { title: 'Next Steps', body: 'Three immediate priorities to accelerate growth and strengthen our market position.' },
];

interface SlideState {
  titleChars: number;
  bodyChars: number;
  phase: 'waiting' | 'typing-title' | 'typing-body' | 'done';
  cursorOn: 'title' | 'body' | null;
}

export default function GeneratingView({ theme, generatedSlides, generatedTitle, onComplete }: Props) {
  const totalSlides = generatedSlides?.length || 8;
  const cols = totalSlides <= 4 ? 2 : totalSlides <= 6 ? 3 : totalSlides <= 9 ? 3 : 4;
  const palette = theme.tokens.palette;
  const isGenerated = !!generatedSlides && generatedSlides.length > 0;

  // Track typing state per slide
  const [slideStates, setSlideStates] = useState<SlideState[]>(() =>
    Array.from({ length: totalSlides }, () => ({ titleChars: 0, bodyChars: 0, phase: 'waiting', cursorOn: null }))
  );
  const [activeSlide, setActiveSlide] = useState(0);
  const [morphing, setMorphing] = useState(false);
  const [showReal, setShowReal] = useState(false);
  const frameRef = useRef<number>();

  // Phase 1: Type text on each slide sequentially
  useEffect(() => {
    if (isGenerated) return;

    const TITLE_SPEED = 30; // ms per char
    const BODY_SPEED = 15;
    const PAUSE_BETWEEN = 400;
    let current = 0;
    let phase: 'title' | 'body' | 'pause' = 'title';
    let charIdx = 0;
    let lastTime = 0;

    const tick = (time: number) => {
      if (current >= totalSlides) {
        // Loop back
        current = 0;
        setSlideStates(prev => prev.map(s => ({ ...s, titleChars: 0, bodyChars: 0, phase: 'waiting', cursorOn: null })));
      }

      const fake = FAKE_SLIDES[current % FAKE_SLIDES.length];
      const speed = phase === 'title' ? TITLE_SPEED : phase === 'body' ? BODY_SPEED : PAUSE_BETWEEN;

      if (time - lastTime >= speed) {
        lastTime = time;

        if (phase === 'title') {
          charIdx++;
          if (charIdx > fake.title.length) {
            phase = 'pause';
            charIdx = 0;
          }
          setActiveSlide(current);
          setSlideStates(prev => {
            const next = [...prev];
            next[current] = { ...next[current], titleChars: Math.min(charIdx, fake.title.length), phase: 'typing-title', cursorOn: 'title' };
            return next;
          });
        } else if (phase === 'pause') {
          // Brief pause between title and body
          phase = 'body';
          setSlideStates(prev => {
            const next = [...prev];
            next[current] = { ...next[current], cursorOn: 'body', phase: 'typing-body' };
            return next;
          });
        } else if (phase === 'body') {
          charIdx++;
          if (charIdx > fake.body.length) {
            // Done with this slide
            setSlideStates(prev => {
              const next = [...prev];
              next[current] = { ...next[current], bodyChars: fake.body.length, phase: 'done', cursorOn: null };
              return next;
            });
            current++;
            phase = 'title';
            charIdx = 0;
          } else {
            setSlideStates(prev => {
              const next = [...prev];
              next[current] = { ...next[current], bodyChars: charIdx };
              return next;
            });
          }
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [isGenerated, totalSlides]);

  // Phase 2: When real slides arrive, crossfade
  useEffect(() => {
    if (!isGenerated) return;
    // Stop typing, show real content
    const t = setTimeout(() => setShowReal(true), 300);
    return () => clearTimeout(t);
  }, [isGenerated]);

  // Phase 3: Morph to editor
  useEffect(() => {
    if (!showReal) return;
    const t = setTimeout(() => setMorphing(true), 1500);
    return () => clearTimeout(t);
  }, [showReal]);

  useEffect(() => {
    if (!morphing) return;
    const t = setTimeout(onComplete, 900);
    return () => clearTimeout(t);
  }, [morphing, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 mesh-gradient overflow-hidden flex flex-col"
    >
      {/* Background glow */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#4F46E5]/10 blur-[150px] pointer-events-none"
      />

      {/* Header */}
      <div className="relative z-20 pt-6 shrink-0">
        <div className="max-w-5xl mx-auto px-6">
          <StepIndicator currentStep={3} />
        </div>
      </div>

      {/* Status */}
      <div className="relative z-10 text-center pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2 justify-center mb-1">
          {!showReal && (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
              <Sparkles className="w-4 h-4 text-[#4F46E5]" />
            </motion.div>
          )}
          <h2 className="text-lg font-headline font-bold text-slate-800">
            {showReal ? (generatedTitle || 'Your Presentation') : `Writing slide ${activeSlide + 1} of ${totalSlides}...`}
          </h2>
        </div>
        {showReal && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-400">
            {generatedSlides!.length} slides ready
          </motion.p>
        )}
      </div>

      {/* Slide grid */}
      <div className="relative z-10 flex-1 flex items-start justify-center overflow-hidden px-6 pb-8">
        <motion.div
          className="grid gap-3 w-full max-w-5xl"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          animate={morphing ? { scale: 0.92, opacity: 0, filter: 'blur(10px)', y: -30 } : {}}
          transition={morphing ? { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } : {}}
        >
          {Array.from({ length: totalSlides }).map((_, i) => {
            const state = slideStates[i] || { titleChars: 0, bodyChars: 0, phase: 'waiting', cursorOn: null };
            const fake = FAKE_SLIDES[i % FAKE_SLIDES.length];
            const isActive = activeSlide === i && !isGenerated;
            const realSlide = showReal && generatedSlides ? generatedSlides[i] : null;

            // Get real slide content
            let realTitle = '';
            let realBody = '';
            let realBg = palette.bg;
            let realTitleColor = palette.text;
            if (realSlide) {
              const texts = (realSlide.elements || [])
                .filter(e => e.type === 'text')
                .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));
              realTitle = texts[0]?.content?.replace(/<[^>]+>/g, '').slice(0, 80) || '';
              realBody = texts[1]?.content?.replace(/<[^>]+>/g, '').slice(0, 120) || '';
              realBg = realSlide.background?.type === 'solid' ? realSlide.background.value :
                realSlide.background?.type === 'gradient' ? realSlide.background.value : palette.bg;
              realTitleColor = texts[0]?.style.color || palette.text;
            }

            return (
              <motion.div
                key={i}
                className={`aspect-video rounded-xl overflow-hidden relative transition-shadow duration-300 ${
                  isActive
                    ? 'shadow-xl shadow-[#4F46E5]/15 ring-2 ring-[#4F46E5]/30'
                    : 'shadow-md shadow-black/5 ring-1 ring-black/[0.04]'
                }`}
                style={{ background: realSlide ? realBg : palette.bg }}
              >
                {/* Slide number */}
                <div className="absolute top-[5%] right-[5%] text-[9px] font-mono opacity-20 z-10" style={{ color: palette.text }}>
                  {String(i + 1).padStart(2, '0')}
                </div>

                {/* Content area */}
                <div className="absolute inset-0 p-[7%] flex flex-col justify-end">
                  <AnimatePresence mode="wait">
                    {realSlide ? (
                      /* Real content */
                      <motion.div
                        key="real"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.08 }}
                      >
                        <p className="font-bold leading-snug line-clamp-2 mb-1"
                          style={{ color: realTitleColor, fontSize: 'clamp(9px, 1.6vw, 15px)' }}>
                          {realTitle}
                        </p>
                        {realBody && (
                          <p className="leading-snug line-clamp-2 opacity-45"
                            style={{ color: palette.text, fontSize: 'clamp(6px, 0.9vw, 10px)' }}>
                            {realBody}
                          </p>
                        )}
                      </motion.div>
                    ) : (
                      /* Typing content */
                      <motion.div key="fake">
                        {/* Title */}
                        <p className="font-bold leading-snug mb-1 relative"
                          style={{ color: palette.text, fontSize: 'clamp(9px, 1.6vw, 15px)', minHeight: '1.2em' }}>
                          {fake.title.slice(0, state.titleChars)}
                          {state.cursorOn === 'title' && (
                            <motion.span
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              className="inline-block w-[2px] h-[1em] ml-[1px] align-text-bottom"
                              style={{ backgroundColor: '#4F46E5' }}
                            />
                          )}
                        </p>
                        {/* Body */}
                        {(state.phase === 'typing-body' || state.phase === 'done') && (
                          <p className="leading-snug opacity-45 relative"
                            style={{ color: palette.text, fontSize: 'clamp(6px, 0.9vw, 10px)', minHeight: '1em' }}>
                            {fake.body.slice(0, state.bodyChars)}
                            {state.cursorOn === 'body' && (
                              <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="inline-block w-[1.5px] h-[0.9em] ml-[1px] align-text-bottom"
                                style={{ backgroundColor: '#4F46E5' }}
                              />
                            )}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Done indicator */}
                {state.phase === 'done' && !realSlide && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute top-[5%] left-[5%] w-4 h-4 rounded-full bg-emerald-500/90 flex items-center justify-center"
                  >
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {morphing && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-slate-400 z-20"
        >
          Opening editor...
        </motion.p>
      )}
    </motion.div>
  );
}
