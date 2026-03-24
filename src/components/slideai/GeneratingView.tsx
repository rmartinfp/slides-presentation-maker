import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { PresentationTheme, Slide } from '@/types/presentation';
import StepIndicator from './StepIndicator';

interface Props {
  theme: PresentationTheme;
  generatedSlides: Slide[] | null;
  generatedTitle: string | null;
  onComplete: () => void;
}

const FAKE_SLIDES = [
  { title: 'Introduction & Overview', body: 'An executive summary of our strategic vision and key objectives for the coming year.' },
  { title: 'Market Analysis', body: 'Current market trends show a 34% growth in our target segment, driven by digital transformation.' },
  { title: 'Our Solution', body: 'A unified platform that combines AI-powered analytics with intuitive workflow automation.' },
  { title: 'Key Metrics & Results', body: 'Revenue grew 127% year-over-year while customer acquisition costs decreased by 40%.' },
  { title: 'Competitive Landscape', body: 'We maintain a strong position with 3 key differentiators that set us apart.' },
  { title: 'Product Roadmap', body: 'Our development pipeline includes 12 major features planned across four quarterly releases.' },
  { title: 'Business Model', body: 'SaaS subscription model with three tiers, targeting SMB through enterprise segments.' },
  { title: 'Team & Leadership', body: 'A diverse team of 45 professionals with deep expertise in AI, design and enterprise.' },
  { title: 'Financial Projections', body: 'Projecting $8.5M ARR by end of year with a clear path to profitability.' },
  { title: 'Next Steps', body: 'Three immediate priorities to accelerate growth and strengthen market position.' },
];

interface SlideTypingState {
  titleChars: number;
  bodyChars: number;
  isTyping: boolean;
  isDone: boolean;
}

export default function GeneratingView({ theme, generatedSlides, generatedTitle, onComplete }: Props) {
  // Lock slide count at mount — never changes, so grid never shifts
  const [slideCount] = useState(8);
  const cols = slideCount <= 4 ? 2 : slideCount <= 6 ? 3 : 3;
  const palette = theme.tokens.palette;
  const isGenerated = !!generatedSlides && generatedSlides.length > 0;

  const [states, setStates] = useState<SlideTypingState[]>(() =>
    Array.from({ length: slideCount }, () => ({ titleChars: 0, bodyChars: 0, isTyping: false, isDone: false }))
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [realOpacity, setRealOpacity] = useState(0); // 0→1 crossfade
  const [morphing, setMorphing] = useState(false);
  const rafRef = useRef<number>();
  const stoppedRef = useRef(false);

  // ── Phase 1: Type slides one by one. NEVER erase. Stop when all done. ──
  useEffect(() => {
    if (isGenerated) { stoppedRef.current = true; return; }

    let current = 0;
    let phase: 'title' | 'pause' | 'body' = 'title';
    let charIdx = 0;
    let lastTime = 0;
    const TITLE_SPEED = 35;
    const BODY_SPEED = 18;

    const tick = (time: number) => {
      if (stoppedRef.current) return;
      if (current >= slideCount) {
        // All typed — just wait, don't erase
        return;
      }

      const fake = FAKE_SLIDES[current % FAKE_SLIDES.length];
      const speed = phase === 'title' ? TITLE_SPEED : phase === 'body' ? BODY_SPEED : 300;

      if (time - lastTime >= speed) {
        lastTime = time;

        if (phase === 'title') {
          charIdx++;
          setActiveIdx(current);
          const chars = Math.min(charIdx, fake.title.length);
          setStates(p => {
            const n = [...p];
            n[current] = { ...n[current], titleChars: chars, isTyping: true };
            return n;
          });
          if (charIdx >= fake.title.length) {
            phase = 'pause';
            charIdx = 0;
          }
        } else if (phase === 'pause') {
          phase = 'body';
        } else {
          charIdx++;
          const chars = Math.min(charIdx, fake.body.length);
          setStates(p => {
            const n = [...p];
            n[current] = { ...n[current], bodyChars: chars };
            return n;
          });
          if (charIdx >= fake.body.length) {
            // Mark done — text STAYS
            setStates(p => {
              const n = [...p];
              n[current] = { ...n[current], isDone: true, isTyping: false };
              return n;
            });
            current++;
            phase = 'title';
            charIdx = 0;
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { stoppedRef.current = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isGenerated, slideCount]);

  // ── Phase 2: Crossfade to real content (no layout change) ──
  useEffect(() => {
    if (!isGenerated) return;
    stoppedRef.current = true;
    // Smooth crossfade over 600ms
    const start = performance.now();
    const duration = 600;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setRealOpacity(t);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isGenerated]);

  // ── Phase 3: Morph → navigate ──
  useEffect(() => {
    if (!isGenerated || realOpacity < 1) return;
    const t = setTimeout(() => setMorphing(true), 1200);
    return () => clearTimeout(t);
  }, [isGenerated, realOpacity]);

  useEffect(() => {
    if (!morphing) return;
    const t = setTimeout(onComplete, 800);
    return () => clearTimeout(t);
  }, [morphing, onComplete]);

  // Use actual slide count for rendering real slides, but keep grid at slideCount
  const realSlides = generatedSlides || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 mesh-gradient overflow-hidden flex flex-col"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#4F46E5]/10 blur-[150px] pointer-events-none"
      />

      <div className="relative z-20 pt-6 shrink-0">
        <div className="max-w-5xl mx-auto px-6">
          <StepIndicator currentStep={3} />
        </div>
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
            {realOpacity >= 1 ? (generatedTitle || 'Your Presentation') : `Writing slide ${Math.min(activeIdx + 1, slideCount)} of ${slideCount}...`}
          </h2>
        </div>
        {realOpacity >= 1 && (
          <p className="text-sm text-slate-400">{realSlides.length} slides ready</p>
        )}
      </div>

      {/* Slide grid — FIXED dimensions, never changes */}
      <div className="relative z-10 flex-1 flex items-start justify-center overflow-hidden px-6 pb-8">
        <motion.div
          className="grid gap-3 w-full max-w-5xl"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          animate={morphing ? { scale: 0.92, opacity: 0, filter: 'blur(10px)', y: -30 } : {}}
          transition={morphing ? { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } : {}}
        >
          {Array.from({ length: slideCount }).map((_, i) => {
            const st = states[i];
            const fake = FAKE_SLIDES[i % FAKE_SLIDES.length];
            const isActive = activeIdx === i && !stoppedRef.current && !st.isDone;
            const real = realSlides[i];

            // Real slide display data
            let realTitle = '', realBody = '', realBg = palette.bg, realTitleColor = palette.text;
            if (real) {
              const texts = (real.elements || []).filter(e => e.type === 'text').sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));
              realTitle = texts[0]?.content?.replace(/<[^>]+>/g, '').slice(0, 80) || '';
              realBody = texts[1]?.content?.replace(/<[^>]+>/g, '').slice(0, 120) || '';
              realBg = real.background?.type === 'solid' ? real.background.value : real.background?.type === 'gradient' ? real.background.value : palette.bg;
              realTitleColor = texts[0]?.style.color || palette.text;
            }

            return (
              <div
                key={i}
                className={`aspect-video rounded-xl overflow-hidden relative transition-shadow duration-300 ${
                  isActive ? 'shadow-xl shadow-[#4F46E5]/15 ring-2 ring-[#4F46E5]/30' : 'shadow-md shadow-black/5 ring-1 ring-black/[0.04]'
                }`}
                style={{ background: palette.bg }}
              >
                {/* Slide number — always visible */}
                <div className="absolute top-[5%] right-[5%] text-[9px] font-mono opacity-20 z-20" style={{ color: palette.text }}>
                  {String(i + 1).padStart(2, '0')}
                </div>

                {/* Layer 1: Fake typed content — always stays, never removed */}
                <div className="absolute inset-0 p-[7%] flex flex-col justify-end z-10" style={{ opacity: 1 - realOpacity }}>
                  {/* Title */}
                  <p className="font-bold leading-snug mb-1" style={{ color: palette.text, fontSize: 'clamp(9px, 1.6vw, 15px)', minHeight: '1.3em' }}>
                    {fake.title.slice(0, st.titleChars)}
                    {st.isTyping && st.bodyChars === 0 && (
                      <span className="inline-block w-[2px] h-[1em] ml-[1px] align-text-bottom animate-pulse" style={{ backgroundColor: '#4F46E5' }} />
                    )}
                  </p>
                  {/* Body */}
                  {st.bodyChars > 0 && (
                    <p className="leading-snug opacity-45" style={{ color: palette.text, fontSize: 'clamp(6px, 0.9vw, 10px)', minHeight: '0.9em' }}>
                      {fake.body.slice(0, st.bodyChars)}
                      {st.isTyping && (
                        <span className="inline-block w-[1.5px] h-[0.9em] ml-[1px] align-text-bottom animate-pulse" style={{ backgroundColor: '#4F46E5' }} />
                      )}
                    </p>
                  )}

                  {/* Done check */}
                  {st.isDone && (
                    <div className="absolute top-[5%] left-[5%] w-4 h-4 rounded-full bg-emerald-500/90 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>

                {/* Layer 2: Real content — fades in OVER the fake, same position */}
                {real && realOpacity > 0 && (
                  <div className="absolute inset-0 z-10" style={{ opacity: realOpacity, background: realBg }}>
                    <div className="absolute inset-0 p-[7%] flex flex-col justify-end">
                      <p className="font-bold leading-snug line-clamp-2 mb-1" style={{ color: realTitleColor, fontSize: 'clamp(9px, 1.6vw, 15px)' }}>
                        {realTitle}
                      </p>
                      {realBody && (
                        <p className="leading-snug line-clamp-2 opacity-45" style={{ color: palette.text, fontSize: 'clamp(6px, 0.9vw, 10px)' }}>
                          {realBody}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
