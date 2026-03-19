import React from 'react';
import { cn } from '@/lib/utils';

export type SlideTransition = 'none' | 'fade' | 'slide' | 'zoom';

interface Props {
  value: SlideTransition;
  onChange: (t: SlideTransition) => void;
}

const transitions: { id: SlideTransition; name: string; desc: string }[] = [
  { id: 'none', name: 'None', desc: 'Instant switch' },
  { id: 'fade', name: 'Fade', desc: 'Crossfade' },
  { id: 'slide', name: 'Slide', desc: 'Slide left/right' },
  { id: 'zoom', name: 'Zoom', desc: 'Zoom in/out' },
];

export default function TransitionPicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-500">Slide Transition</label>
      <div className="grid grid-cols-2 gap-2">
        {transitions.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'p-3 rounded-lg text-left transition-all',
              value === t.id
                ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                : 'bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-700',
            )}
          >
            <div className="text-xs font-medium">{t.name}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
