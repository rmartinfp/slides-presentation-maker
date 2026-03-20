import React from 'react';
import { motion } from 'framer-motion';
import { Palette, FileText, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, name: 'Template', icon: Palette },
  { id: 2, name: 'Content', icon: FileText },
  { id: 3, name: 'Create', icon: Sparkles },
];

interface Props {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: Props) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isComplete = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isUpcoming = currentStep < step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative',
                  isComplete && 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20',
                  isCurrent && 'bg-gradient-to-br from-[#4F46E5] to-[#9333EA] shadow-lg shadow-[#4F46E5]/30 scale-110',
                  isUpcoming && 'bg-white/60 border border-slate-200/60'
                )}
              >
                {isComplete ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Icon className={cn('w-5 h-5', isCurrent ? 'text-white' : 'text-slate-400')} />
                )}
                {isCurrent && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-2xl bg-[#4F46E5]/30"
                  />
                )}
              </motion.div>
              <span className={cn(
                'mt-2 text-xs font-medium',
                isComplete && 'text-emerald-600',
                isCurrent && 'text-[#4F46E5]',
                isUpcoming && 'text-slate-400'
              )}>
                {step.name}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="w-20 h-0.5 mx-2 mb-6 relative">
                <div className="absolute inset-0 bg-slate-200/60 rounded-full" />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: isComplete ? '100%' : '0%' }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
