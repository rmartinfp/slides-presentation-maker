import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Upload, Wand2, ChevronRight, FileUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresentationTheme } from '@/types/presentation';
import StepIndicator from './StepIndicator';

const promptSuggestions = [
  'A pitch deck for my AI startup that automates customer support',
  'Quarterly sales report for Q4 2024 with key metrics',
  'Product launch presentation for a new mobile app',
];

const audiences = [
  { id: 'Team', emoji: '👔' },
  { id: 'Clients', emoji: '🤝' },
  { id: 'Students', emoji: '🎓' },
  { id: 'Investors', emoji: '💼' },
  { id: 'General', emoji: '🌍' },
];

const tones = [
  { id: 'Formal', color: 'from-slate-500 to-slate-600' },
  { id: 'Neutral', color: 'from-blue-500 to-cyan-500' },
  { id: 'Friendly', color: 'from-amber-500 to-orange-500' },
  { id: 'Playful', color: 'from-pink-500 to-rose-500' },
];

interface Props {
  theme: PresentationTheme;
  contentText: string;
  onContentChange: (text: string) => void;
  onGenerate: () => void;
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
      {/* Header */}
      <div className="sticky top-0 z-30 nav-glass">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <StepIndicator currentStep={2} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Main glass card */}
        <div className="glass-effect rounded-2xl p-6 shadow-xl shadow-[#4F46E5]/5">
          {/* Template preview + Title */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200/50">
            <div
              className="w-24 h-14 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: theme.tokens.palette.bg }}
            >
              <div className="w-12 h-2 rounded-full" style={{ backgroundColor: theme.tokens.palette.primary }} />
            </div>
            <div>
              <h1 className="text-xl font-headline font-extrabold headline-tight text-slate-900">What's your story?</h1>
              <p className="text-sm text-slate-500">{theme.name}</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setContentMode('ai')}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium transition-all',
                contentMode === 'ai'
                  ? 'bg-gradient-to-r from-[#4F46E5]/10 to-[#9333EA]/10 border-2 border-[#4F46E5]/30 text-slate-900'
                  : 'bg-white/40 border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-white/60'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                contentMode === 'ai'
                  ? 'bg-gradient-to-br from-[#4F46E5] to-[#9333EA] shadow-lg shadow-[#4F46E5]/25'
                  : 'bg-slate-100'
              )}>
                <Wand2 className={cn('w-5 h-5', contentMode === 'ai' ? 'text-white' : 'text-slate-400')} />
              </div>
              <div className="text-left">
                <p className="font-semibold">AI writes it</p>
                <p className="text-xs text-slate-400">Describe your topic</p>
              </div>
            </button>
            <button
              onClick={() => setContentMode('upload')}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium transition-all',
                contentMode === 'upload'
                  ? 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-2 border-sky-500/30 text-slate-900'
                  : 'bg-white/40 border border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-white/60'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                contentMode === 'upload'
                  ? 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25'
                  : 'bg-slate-100'
              )}>
                <FileUp className={cn('w-5 h-5', contentMode === 'upload' ? 'text-white' : 'text-slate-400')} />
              </div>
              <div className="text-left">
                <p className="font-semibold">Upload file</p>
                <p className="text-xs text-slate-400">PDF, DOCX, TXT</p>
              </div>
            </button>
          </div>

          {/* Input area */}
          <AnimatePresence mode="wait">
            {contentMode === 'ai' ? (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <textarea
                  value={contentText}
                  onChange={e => onContentChange(e.target.value)}
                  placeholder={'Describe your presentation in detail...\n\nInclude: main topic, key points you want to cover, specific data or examples...'}
                  className="w-full h-36 bg-white/60 border border-slate-200/60 rounded-xl p-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]/30 resize-none text-sm font-body transition-all"
                />
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <Lightbulb className="w-3 h-3" />
                    <span>Try one of these:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {promptSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => onContentChange(suggestion)}
                        className="px-3 py-1.5 rounded-full bg-white/60 border border-slate-200/60 text-xs text-slate-500 hover:bg-[#4F46E5]/10 hover:border-[#4F46E5]/20 hover:text-[#4F46E5] transition-all"
                      >
                        {suggestion.length > 40 ? suggestion.slice(0, 40) + '...' : suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button className="w-full h-36 border-2 border-dashed border-slate-300/60 rounded-xl flex flex-col items-center justify-center hover:border-[#4F46E5]/40 hover:bg-[#4F46E5]/5 transition-all">
                  <Upload className="w-8 h-8 text-slate-400 mb-3" />
                  <p className="text-slate-700 font-medium">Drop your file here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options row */}
          <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-200/50">
            <div>
              <label className="text-xs text-slate-500 mb-2 block font-medium">Audience</label>
              <div className="flex flex-wrap gap-1.5">
                {audiences.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className={cn(
                      'h-8 px-3 rounded-full text-xs font-medium transition-all',
                      audience === a.id
                        ? 'bg-[#4F46E5]/10 text-[#4F46E5] outline outline-1 outline-[#4F46E5]/20'
                        : 'bg-white/60 text-slate-500 outline outline-1 outline-slate-200/60 hover:text-slate-700 hover:bg-white/80'
                    )}
                  >
                    {a.emoji} {a.id}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-2 block font-medium">Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {tones.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={cn(
                      'h-8 px-3 rounded-full text-xs font-medium transition-all',
                      tone === t.id
                        ? 'bg-[#4F46E5]/10 text-[#4F46E5] outline outline-1 outline-[#4F46E5]/20'
                        : 'bg-white/60 text-slate-500 outline outline-1 outline-slate-200/60 hover:text-slate-700 hover:bg-white/80'
                    )}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-500 font-medium">Slides</label>
                <span className="text-xs font-bold text-[#4F46E5]">{slideCount}</span>
              </div>
              <input
                type="range"
                min={5}
                max={20}
                value={slideCount}
                onChange={e => setSlideCount(parseInt(e.target.value))}
                className="w-full accent-[#4F46E5]"
              />
            </div>
          </div>

          {/* Generate button */}
          <motion.button
            whileHover={{ scale: canGenerate ? 1.01 : 1 }}
            whileTap={{ scale: canGenerate ? 0.99 : 1 }}
            onClick={onGenerate}
            disabled={!canGenerate}
            className={cn(
              'w-full mt-6 py-4 rounded-full font-semibold flex items-center justify-center gap-2 transition-all',
              canGenerate
                ? 'bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white shadow-xl shadow-[#4F46E5]/25 hover:shadow-2xl hover:shadow-[#4F46E5]/30'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            <Sparkles className="w-5 h-5" />
            Generate Presentation
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
