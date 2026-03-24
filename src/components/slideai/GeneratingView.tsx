import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Palette, Layout, Type, CheckCircle2 } from 'lucide-react';
import { PresentationTheme, Slide } from '@/types/presentation';
import StepIndicator from './StepIndicator';

const stages = [
  { id: 'analyze', label: 'Analyzing your content', icon: Wand2 },
  { id: 'structure', label: 'Structuring your story', icon: Layout },
  { id: 'design', label: 'Applying design magic', icon: Palette },
  { id: 'content', label: 'Writing slides', icon: Type },
  { id: 'polish', label: 'Final touches', icon: Sparkles },
];

interface Props {
  theme: PresentationTheme;
  generatedSlides: Slide[] | null;
  generatedTitle: string | null;
  onComplete: () => void;
}

export default function GeneratingView({ theme, generatedSlides, generatedTitle, onComplete }: Props) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [showMosaic, setShowMosaic] = useState(false);
  const [morphing, setMorphing] = useState(false);

  const slides = generatedSlides;
  const isGenerated = !!slides && slides.length > 0;

  // Progress stages while generating
  useEffect(() => {
    if (isGenerated) return; // Stop cycling once generated
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 0.5, 90));
      setCurrentStage(s => {
        if (s < stages.length - 1) return s + 1;
        return stages.length - 2; // Stay on second-to-last until generated
      });
    }, 600);
    return () => clearInterval(interval);
  }, [isGenerated]);

  // When slides arrive, finish progress and start mosaic reveal
  useEffect(() => {
    if (!isGenerated) return;
    setCurrentStage(stages.length - 1);
    setProgress(100);
    // Small delay then show mosaic
    const t = setTimeout(() => setShowMosaic(true), 400);
    return () => clearTimeout(t);
  }, [isGenerated]);

  // Reveal slides one by one
  useEffect(() => {
    if (!showMosaic || !slides) return;
    if (revealedCount >= slides.length) {
      // All revealed — wait, then morph
      const t = setTimeout(() => setMorphing(true), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealedCount(c => c + 1), 150);
    return () => clearTimeout(t);
  }, [showMosaic, revealedCount, slides]);

  // Morph done → navigate
  useEffect(() => {
    if (!morphing) return;
    const t = setTimeout(onComplete, 1200);
    return () => clearTimeout(t);
  }, [morphing, onComplete]);

  const palette = theme.tokens.palette;

  // Calculate mosaic grid layout
  const totalSlides = slides?.length || 8;
  const cols = totalSlides <= 4 ? 2 : totalSlides <= 9 ? 3 : 4;
  const rows = Math.ceil(totalSlides / cols);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 mesh-gradient overflow-hidden"
    >
      {/* Background glow */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/15 blur-[120px]"
      />

      {/* Header */}
      <div className="relative z-20 pt-6">
        <div className="max-w-4xl mx-auto px-6">
          <StepIndicator currentStep={3} />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        <AnimatePresence mode="wait">
          {/* Phase 1: Generating spinner */}
          {!showMosaic && (
            <motion.div
              key="spinner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {/* Central animation */}
              <div className="relative w-40 h-40 mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#4F46E5]/20" />
                </motion.div>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-4"
                >
                  <div className="absolute inset-0 rounded-full border border-[#9333EA]/15" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-2xl shadow-[#4F46E5]/30">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
              </div>

              {/* Stage indicators */}
              <div className="flex items-center gap-2 mb-5">
                {stages.map((stage, i) => {
                  const Icon = stage.icon;
                  const isComplete = currentStage > i;
                  const isCurrent = currentStage === i;
                  return (
                    <motion.div
                      key={stage.id}
                      animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.6, repeat: isCurrent ? Infinity : 0 }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isComplete ? 'bg-emerald-100 text-emerald-600' :
                        isCurrent ? 'bg-[#4F46E5]/15 text-[#4F46E5]' :
                        'bg-slate-100 text-slate-300'
                      }`}
                    >
                      {isComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    </motion.div>
                  );
                })}
              </div>

              <h2 className="text-lg font-headline font-bold text-slate-900 mb-1">
                {currentStage < stages.length ? stages[currentStage].label : 'Almost ready!'}
              </h2>
              <p className="text-slate-400 text-sm mb-6">Creating your presentation with AI</p>

              {/* Progress bar */}
              <div className="w-64">
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] rounded-full"
                    style={{ boxShadow: '0 0 20px rgba(79,70,229,0.4)' }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-[11px]">
                  <span className="text-slate-400">Generating...</span>
                  <span className="text-[#4F46E5] font-medium">{Math.round(progress)}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase 2: Mosaic reveal */}
          {showMosaic && slides && (
            <motion.div
              key="mosaic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center w-full max-w-5xl px-6"
            >
              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-6"
              >
                <h2 className="text-2xl font-headline font-bold text-slate-900 mb-1">
                  {generatedTitle || 'Your Presentation'}
                </h2>
                <p className="text-slate-400 text-sm">{slides.length} slides created</p>
              </motion.div>

              {/* Mosaic grid */}
              <motion.div
                className="grid gap-3 w-full"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                animate={morphing ? { scale: 0.85, opacity: 0, filter: 'blur(8px)' } : {}}
                transition={morphing ? { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } : {}}
              >
                {slides.map((slide, i) => {
                  const isRevealed = i < revealedCount;
                  const bg = slide.background?.type === 'solid' ? slide.background.value :
                    slide.background?.type === 'gradient' ? slide.background.value : palette.bg;

                  // Find title text element
                  const titleEl = (slide.elements || [])
                    .filter(e => e.type === 'text')
                    .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0))[0];

                  return (
                    <motion.div
                      key={slide.id || i}
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={isRevealed ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 30 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                      className="aspect-video rounded-xl overflow-hidden shadow-lg shadow-black/10 border border-white/60"
                      style={{ background: bg }}
                    >
                      <div className="w-full h-full p-[8%] flex flex-col justify-end relative">
                        {/* Slide number */}
                        <div className="absolute top-[6%] right-[6%] text-[10px] font-mono opacity-30" style={{ color: palette.text }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        {/* Title preview */}
                        {titleEl && (
                          <p
                            className="font-semibold leading-tight line-clamp-2"
                            style={{
                              color: titleEl.style.color || palette.text,
                              fontSize: 'clamp(10px, 1.8vw, 16px)',
                            }}
                          >
                            {titleEl.content?.replace(/<[^>]+>/g, '').slice(0, 80)}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* "Opening editor..." text during morph */}
              {morphing && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 text-sm text-slate-400"
                >
                  Opening editor...
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
