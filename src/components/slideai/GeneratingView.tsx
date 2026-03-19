import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { PresentationTheme } from '@/types/presentation';
import { motion } from 'framer-motion';

const steps = [
  'Analyzing your content...',
  'Structuring slide outline...',
  'Applying theme design...',
  'Polishing layout & typography...',
  'Finalizing presentation...',
];

interface Props {
  theme: PresentationTheme;
}

export default function GeneratingView({ theme }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }, 550);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Animated orb */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 mx-auto mb-8 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${theme.tokens.palette.primary}, ${theme.tokens.palette.secondary})`,
          }}
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>

        <h2 className="font-display font-bold text-2xl text-foreground mb-2">
          Creating your presentation
        </h2>
        <p className="text-muted-foreground mb-8">
          Using <span className="text-primary font-medium">{theme.name}</span> theme
        </p>

        {/* Steps */}
        <div className="space-y-3 text-left">
          {steps.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className={`w-2 h-2 rounded-full transition-colors ${
                i <= currentStep ? 'bg-primary' : 'bg-muted'
              }`} />
              <span className={`text-sm ${
                i <= currentStep ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {s}
              </span>
              {i === currentStep && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1 h-4 bg-primary rounded-full ml-auto"
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
