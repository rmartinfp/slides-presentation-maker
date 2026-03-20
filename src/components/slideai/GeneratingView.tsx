import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, Palette, Layout, Type, CheckCircle2 } from 'lucide-react';
import { PresentationTheme } from '@/types/presentation';
import StepIndicator from './StepIndicator';

const stages = [
  { id: 'analyze', label: 'Analyzing your content', icon: Wand2, duration: 500 },
  { id: 'structure', label: 'Structuring your story', icon: Layout, duration: 500 },
  { id: 'design', label: 'Applying design magic', icon: Palette, duration: 500 },
  { id: 'content', label: 'Writing slides', icon: Type, duration: 700 },
  { id: 'polish', label: 'Final touches', icon: Sparkles, duration: 500 },
];

function OrbitParticle({ index, total, radius }: { index: number; total: number; radius: number }) {
  const angle = (index / total) * Math.PI * 2;
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 8 + index, repeat: Infinity, ease: 'linear' }}
      className="absolute inset-0"
      style={{ transformOrigin: 'center' }}
    >
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
        className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA]"
        style={{
          left: `calc(50% + ${Math.cos(angle) * radius}px)`,
          top: `calc(50% + ${Math.sin(angle) * radius}px)`,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 15px 3px rgba(79,70,229,0.3)',
        }}
      />
    </motion.div>
  );
}

interface Props {
  theme: PresentationTheme;
}

export default function GeneratingView({ theme }: Props) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / totalDuration) * 100, 99));
      let stageElapsed = 0;
      for (let i = 0; i < stages.length; i++) {
        stageElapsed += stages[i].duration;
        if (elapsed < stageElapsed) {
          setCurrentStage(i);
          break;
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

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
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.15, 0.08] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#9333EA]/15 blur-[100px]"
      />

      {/* Header */}
      <div className="relative z-20 pt-6">
        <div className="max-w-4xl mx-auto px-6">
          <StepIndicator currentStep={3} />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
        {/* Central animation */}
        <div className="relative w-56 h-56 mb-10">
          {[...Array(8)].map((_, i) => (
            <OrbitParticle key={i} index={i} total={8} radius={90} />
          ))}
          {[...Array(6)].map((_, i) => (
            <OrbitParticle key={`inner-${i}`} index={i} total={6} radius={60} />
          ))}
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-2xl shadow-[#4F46E5]/30">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
            </div>
          </motion.div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          >
            <div className="absolute inset-6 rounded-full border border-[#4F46E5]/20" />
          </motion.div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 rounded-full border border-dashed border-[#9333EA]/15" />
          </motion.div>
        </div>

        {/* Stage indicators */}
        <div className="flex items-center gap-3 mb-6">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isComplete = currentStage > i;
            const isCurrent = currentStage === i;
            return (
              <motion.div
                key={stage.id}
                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5, repeat: isCurrent ? Infinity : 0 }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isComplete ? 'bg-emerald-100 text-emerald-600' :
                  isCurrent ? 'bg-[#4F46E5]/15 text-[#4F46E5]' :
                  'bg-slate-100 text-slate-400'
                }`}
              >
                {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </motion.div>
            );
          })}
        </div>

        {/* Current stage text */}
        <AnimatePresence mode="wait">
          <motion.h2
            key={currentStage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xl font-headline font-extrabold text-slate-900 mb-2"
          >
            {currentStage < stages.length ? stages[currentStage].label : 'Almost ready!'}
          </motion.h2>
        </AnimatePresence>
        <p className="text-slate-500 text-sm mb-8">Creating your presentation with AI magic</p>

        {/* Progress bar */}
        <div className="w-72">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] rounded-full"
              style={{ boxShadow: '0 0 20px rgba(79,70,229,0.4)' }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-slate-500">Generating...</span>
            <span className="text-[#4F46E5] font-medium">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
