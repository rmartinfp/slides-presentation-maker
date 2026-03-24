import React, { useState, useEffect, useRef } from 'react';
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

// Placeholder "building blocks" for each slide skeleton
const SKELETON_ELEMENTS = [
  // Different layout patterns that cycle through slides
  [
    { type: 'title', x: 8, y: 12, w: 55, h: 8 },
    { type: 'subtitle', x: 8, y: 24, w: 35, h: 4 },
    { type: 'body', x: 8, y: 38, w: 45, h: 3 },
    { type: 'body', x: 8, y: 44, w: 40, h: 3 },
    { type: 'body', x: 8, y: 50, w: 42, h: 3 },
    { type: 'image', x: 58, y: 15, w: 35, h: 55 },
  ],
  [
    { type: 'title', x: 15, y: 30, w: 70, h: 10 },
    { type: 'subtitle', x: 25, y: 48, w: 50, h: 5 },
  ],
  [
    { type: 'title', x: 8, y: 8, w: 50, h: 7 },
    { type: 'stat', x: 8, y: 40, w: 25, h: 35 },
    { type: 'stat', x: 37, y: 40, w: 25, h: 35 },
    { type: 'stat', x: 66, y: 40, w: 25, h: 35 },
  ],
  [
    { type: 'title', x: 8, y: 10, w: 45, h: 7 },
    { type: 'body', x: 8, y: 25, w: 40, h: 3 },
    { type: 'body', x: 8, y: 31, w: 38, h: 3 },
    { type: 'body', x: 8, y: 37, w: 42, h: 3 },
    { type: 'body', x: 8, y: 43, w: 35, h: 3 },
    { type: 'shape', x: 55, y: 20, w: 38, h: 50 },
  ],
  [
    { type: 'image', x: 0, y: 0, w: 100, h: 100 },
    { type: 'title', x: 8, y: 65, w: 60, h: 9 },
    { type: 'subtitle', x: 8, y: 78, w: 40, h: 4 },
  ],
];

const TYPING_TEXTS = [
  'Crafting your opening slide...',
  'Writing the key message...',
  'Adding supporting data...',
  'Building the visual layout...',
  'Designing the content flow...',
  'Creating data visualizations...',
  'Refining the narrative...',
  'Polishing the design...',
  'Adding final details...',
  'Wrapping up...',
];

export default function GeneratingView({ theme, generatedSlides, generatedTitle, onComplete }: Props) {
  const [buildingSlideIndex, setBuildingSlideIndex] = useState(0);
  const [elementProgress, setElementProgress] = useState(0); // how many elements shown in current slide
  const [filledSlides, setFilledSlides] = useState<Set<number>>(new Set());
  const [realSlidesRevealed, setRealSlidesRevealed] = useState(0);
  const [morphing, setMorphing] = useState(false);
  const [typingText, setTypingText] = useState(TYPING_TEXTS[0]);
  const tickRef = useRef(0);

  const palette = theme.tokens.palette;
  const totalSlides = generatedSlides?.length || 8;
  const cols = totalSlides <= 4 ? 2 : totalSlides <= 6 ? 3 : totalSlides <= 9 ? 3 : 4;
  const isGenerated = !!generatedSlides && generatedSlides.length > 0;

  // Phase 1: Simulate building slides one by one while API is working
  useEffect(() => {
    if (isGenerated) return;
    const interval = setInterval(() => {
      tickRef.current++;

      // Update typing text
      setTypingText(TYPING_TEXTS[Math.min(Math.floor(tickRef.current / 8), TYPING_TEXTS.length - 1)]);

      setElementProgress(prev => {
        const layout = SKELETON_ELEMENTS[buildingSlideIndex % SKELETON_ELEMENTS.length];
        if (prev >= layout.length) {
          // Current slide done — mark as filled, move to next
          setFilledSlides(s => new Set(s).add(buildingSlideIndex));
          setBuildingSlideIndex(i => {
            const next = i + 1;
            if (next >= totalSlides) return 0; // Loop back
            return next;
          });
          return 0;
        }
        return prev + 1;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [isGenerated, buildingSlideIndex, totalSlides]);

  // Phase 2: When real slides arrive, reveal them one by one
  useEffect(() => {
    if (!isGenerated) return;
    if (realSlidesRevealed >= generatedSlides.length) {
      const t = setTimeout(() => setMorphing(true), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRealSlidesRevealed(c => c + 1), 200);
    return () => clearTimeout(t);
  }, [isGenerated, realSlidesRevealed, generatedSlides]);

  // Phase 3: Morph → navigate
  useEffect(() => {
    if (!morphing) return;
    const t = setTimeout(onComplete, 1000);
    return () => clearTimeout(t);
  }, [morphing, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 mesh-gradient overflow-hidden"
    >
      {/* Background glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#4F46E5]/10 blur-[150px]"
      />

      {/* Header */}
      <div className="relative z-20 pt-6">
        <div className="max-w-5xl mx-auto px-6">
          <StepIndicator currentStep={3} />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center pt-8 px-6">
        {/* Status text */}
        <motion.div className="text-center mb-6" layout>
          <div className="flex items-center gap-2 justify-center mb-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-5 h-5 text-[#4F46E5]" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.h2
                key={isGenerated ? 'done' : typingText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-lg font-headline font-bold text-slate-800"
              >
                {isGenerated ? (generatedTitle || 'Your Presentation') : typingText}
              </motion.h2>
            </AnimatePresence>
          </div>
          {isGenerated && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-slate-400"
            >
              {generatedSlides.length} slides ready
            </motion.p>
          )}
        </motion.div>

        {/* Slide grid */}
        <motion.div
          className="grid gap-3 w-full max-w-5xl"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          animate={morphing ? { scale: 0.9, opacity: 0, filter: 'blur(12px)', y: -20 } : {}}
          transition={morphing ? { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } : {}}
        >
          {Array.from({ length: totalSlides }).map((_, i) => {
            const isCurrentlyBuilding = !isGenerated && buildingSlideIndex === i;
            const isFilled = filledSlides.has(i);
            const realSlide = isGenerated && i < realSlidesRevealed ? generatedSlides[i] : null;
            const layout = SKELETON_ELEMENTS[i % SKELETON_ELEMENTS.length];
            const visibleElements = isCurrentlyBuilding ? elementProgress : (isFilled ? layout.length : 0);

            return (
              <motion.div
                key={i}
                layout
                className={`aspect-video rounded-xl overflow-hidden relative border transition-all duration-300 ${
                  isCurrentlyBuilding
                    ? 'border-[#4F46E5]/40 shadow-lg shadow-[#4F46E5]/10 ring-1 ring-[#4F46E5]/20'
                    : 'border-slate-200/60 shadow-sm'
                }`}
                style={{
                  background: realSlide
                    ? (realSlide.background?.type === 'solid' ? realSlide.background.value
                      : realSlide.background?.type === 'gradient' ? realSlide.background.value
                      : palette.bg)
                    : palette.bg,
                }}
              >
                {/* Real slide content (after generation) */}
                {realSlide ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full p-[6%] flex flex-col justify-between relative"
                  >
                    <div className="text-[8px] font-mono opacity-25" style={{ color: palette.text }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      {(() => {
                        const titleEl = (realSlide.elements || [])
                          .filter(e => e.type === 'text')
                          .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0))[0];
                        const bodyEl = (realSlide.elements || [])
                          .filter(e => e.type === 'text')
                          .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0))[1];
                        return (
                          <>
                            {titleEl && (
                              <p className="font-bold leading-tight line-clamp-2 mb-1"
                                style={{ color: titleEl.style.color || palette.text, fontSize: 'clamp(8px, 1.5vw, 14px)' }}>
                                {titleEl.content?.replace(/<[^>]+>/g, '').slice(0, 60)}
                              </p>
                            )}
                            {bodyEl && (
                              <p className="leading-tight line-clamp-1 opacity-50"
                                style={{ color: bodyEl.style.color || palette.text, fontSize: 'clamp(6px, 0.9vw, 10px)' }}>
                                {bodyEl.content?.replace(/<[^>]+>/g, '').slice(0, 80)}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                ) : (
                  /* Skeleton building animation */
                  <div className="w-full h-full relative">
                    {/* Slide number */}
                    <div className="absolute top-[6%] right-[6%] text-[8px] font-mono opacity-15" style={{ color: palette.text }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>

                    {/* Skeleton elements appearing one by one */}
                    {layout.slice(0, visibleElements).map((el, ei) => {
                      const isLatest = isCurrentlyBuilding && ei === visibleElements - 1;
                      const blockColor =
                        el.type === 'title' ? palette.text :
                        el.type === 'subtitle' ? palette.text + '80' :
                        el.type === 'body' ? palette.text + '40' :
                        el.type === 'stat' ? palette.primary :
                        el.type === 'image' ? palette.secondary + '30' :
                        palette.accent + '25';

                      return (
                        <motion.div
                          key={ei}
                          initial={{ opacity: 0, scaleX: 0 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="absolute rounded-sm origin-left"
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            backgroundColor: blockColor,
                            borderRadius: el.type === 'image' || el.type === 'stat' || el.type === 'shape' ? 4 : 2,
                          }}
                        >
                          {/* Shimmer effect on the latest element */}
                          {isLatest && (
                            <motion.div
                              animate={{ x: ['0%', '200%'] }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              style={{ width: '50%' }}
                            />
                          )}
                        </motion.div>
                      );
                    })}

                    {/* "Currently building" cursor effect */}
                    {isCurrentlyBuilding && (
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="absolute bottom-[6%] left-[6%] flex items-center gap-1"
                      >
                        <div className="w-1 h-3 rounded-full bg-[#4F46E5]" />
                        <span className="text-[7px] text-[#4F46E5] font-medium">writing...</span>
                      </motion.div>
                    )}

                    {/* Filled checkmark */}
                    {isFilled && !isCurrentlyBuilding && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute bottom-[6%] right-[6%] w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                      >
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom status */}
        {morphing && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-sm text-slate-400"
          >
            Opening editor...
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
