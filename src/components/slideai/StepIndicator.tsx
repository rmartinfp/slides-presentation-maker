import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, name: 'Template' },
  { id: 2, name: 'Content' },
  { id: 3, name: 'Create' },
];

interface Props {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: Props) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, idx) => {
        const isComplete = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isUpcoming = currentStep < step.id;

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all',
                  isComplete && 'bg-emerald-500 text-white',
                  isCurrent && 'bg-[#4F46E5] text-white',
                  isUpcoming && 'bg-slate-200/80 text-slate-400'
                )}
              >
                {isComplete ? <Check className="w-3 h-3" /> : step.id}
              </div>
              <span className={cn(
                'text-xs font-medium',
                isComplete && 'text-emerald-600',
                isCurrent && 'text-[#4F46E5]',
                isUpcoming && 'text-slate-400'
              )}>
                {step.name}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="w-8 h-px mx-1">
                <div className={cn(
                  'h-full rounded-full',
                  isComplete ? 'bg-emerald-400' : 'bg-slate-200/80'
                )} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
