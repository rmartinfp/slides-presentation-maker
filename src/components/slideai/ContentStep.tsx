import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Upload, Wand2, ChevronRight, FileUp, Lightbulb, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresentationTheme } from '@/types/presentation';
import StepIndicator from './StepIndicator';

const promptSuggestions = [
  'Pitch deck for AI startup',
  'Quarterly sales report',
  'Product launch',
];

const audiences = [
  { id: 'Team', emoji: '👔' },
  { id: 'Clients', emoji: '🤝' },
  { id: 'Students', emoji: '🎓' },
  { id: 'Investors', emoji: '💼' },
  { id: 'General', emoji: '🌍' },
];

const tones = [
  { id: 'Formal' },
  { id: 'Neutral' },
  { id: 'Friendly' },
  { id: 'Playful' },
];

interface Props {
  theme: PresentationTheme;
  contentText: string;
  onContentChange: (text: string) => void;
  onGenerate: (options?: { slideCount?: number; audience?: string; tone?: string }) => void;
  onBack: () => void;
}

export default function ContentStep({ theme, contentText, onContentChange, onGenerate, onBack }: Props) {
  const [contentMode, setContentMode] = useState<'ai' | 'upload'>('ai');
  const [audience, setAudience] = useState('Team');
  const [tone, setTone] = useState('Neutral');
  const [slideCount, setSlideCount] = useState(10);

  const canGenerate = contentMode === 'ai' ? contentText.trim().length > 10 : false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen mesh-gradient relative z-10 font-body"
    >
      {/* Background accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#4F46E5]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#9333EA]/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 nav-glass">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <StepIndicator currentStep={2} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-20">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold headline-tight text-slate-900">
            What's your story?
          </h1>
        </div>

        {/* Central glass card */}
        <div className="glass-effect rounded-2xl p-8 md:p-12 shadow-[0_0_40px_-10px_rgba(79,70,229,0.15)]">
          {/* Mode toggle — pill style */}
          <div className="flex p-1.5 bg-slate-100/80 rounded-full w-full max-w-sm mx-auto mb-10">
            <button
              onClick={() => setContentMode('ai')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all',
                contentMode === 'ai'
                  ? 'bg-white shadow-sm text-[#4F46E5]'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Wand2 className="w-4 h-4" />
              AI writes it
            </button>
            <button
              onClick={() => setContentMode('upload')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all',
                contentMode === 'upload'
                  ? 'bg-white shadow-sm text-[#4F46E5]'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <FileUp className="w-4 h-4" />
              Upload file
            </button>
          </div>

          {/* Input area */}
          <AnimatePresence mode="wait">
            {contentMode === 'ai' ? (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
                <label className="block text-sm font-semibold text-slate-500 mb-3 ml-1">Presentation Prompt</label>
                <textarea
                  value={contentText}
                  onChange={e => onContentChange(e.target.value)}
                  placeholder="Describe your presentation in detail..."
                  rows={5}
                  className="w-full bg-white/40 border-0 rounded-xl p-6 text-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#4F46E5]/20 focus:bg-white/60 resize-none transition-all"
                />
                {/* Suggestion pills */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {promptSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => onContentChange(s)}
                      className="px-4 py-2 bg-slate-200/50 hover:bg-slate-200/80 text-sm font-medium text-slate-600 rounded-full transition-colors border border-white/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
                <button className="w-full h-44 border-2 border-dashed border-slate-300/60 rounded-xl flex flex-col items-center justify-center hover:border-[#4F46E5]/40 hover:bg-[#4F46E5]/5 transition-all">
                  <Upload className="w-8 h-8 text-slate-400 mb-3" />
                  <p className="text-slate-700 font-medium">Drop your file here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse • PDF, DOCX, TXT</p>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Configuration row — 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Audience */}
            <div>
              <label className="block text-sm font-semibold text-slate-500 mb-3 ml-1">Target Audience</label>
              <div className="flex flex-wrap gap-2">
                {audiences.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-medium transition-all',
                      audience === a.id
                        ? 'bg-[#9333EA]/15 text-[#9333EA] font-bold'
                        : 'bg-white/50 border border-slate-200/60 text-slate-600 hover:bg-white'
                    )}
                  >
                    {a.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-semibold text-slate-500 mb-3 ml-1">Tone of Voice</label>
              <div className="flex flex-wrap gap-2">
                {tones.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-medium transition-all',
                      tone === t.id
                        ? 'bg-[#9333EA]/15 text-[#9333EA] font-bold'
                        : 'bg-white/50 border border-slate-200/60 text-slate-600 hover:bg-white'
                    )}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slide slider */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-4 px-1">
              <label className="text-sm font-semibold text-slate-500">Number of Slides</label>
              <span className="text-xl font-bold text-[#4F46E5]">
                {slideCount} <span className="text-xs font-medium text-slate-400">Slides</span>
              </span>
            </div>
            <div className="px-1">
              <input
                type="range"
                min={5}
                max={20}
                value={slideCount}
                onChange={e => setSlideCount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 tracking-tight uppercase">
                <span>5 slides</span>
                <span>10 slides</span>
                <span>15 slides</span>
                <span>20 slides</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center">
            <motion.button
              whileHover={{ scale: canGenerate ? 1.02 : 1 }}
              whileTap={{ scale: canGenerate ? 0.97 : 1 }}
              onClick={() => onGenerate({ slideCount, audience, tone })}
              disabled={!canGenerate}
              className={cn(
                'w-full md:w-auto md:px-12 py-5 rounded-full font-headline font-bold text-lg flex items-center justify-center gap-3 transition-all',
                canGenerate
                  ? 'bg-gradient-to-br from-[#4F46E5] to-[#9333EA] text-white shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(79,70,229,0.5)]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              Generate Presentation
              <Sparkles className="w-5 h-5" />
            </motion.button>
            <p className="mt-5 text-xs text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              AI may take up to 30 seconds to draft your layout
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
