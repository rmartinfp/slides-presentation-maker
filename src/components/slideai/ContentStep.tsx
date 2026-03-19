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
      className="min-h-screen relative z-10"
    >
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-64 md:w-96 h-64 md:h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-64 md:w-96 h-64 md:h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#030305]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <StepIndicator currentStep={2} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Main card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          {/* Template preview + Title */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
            <div
              className="w-24 h-14 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: theme.tokens.palette.bg }}
            >
              <div className="w-12 h-2 rounded-full" style={{ backgroundColor: theme.tokens.palette.primary }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">What's your story?</h1>
              <p className="text-sm text-slate-400">{theme.name}</p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setContentMode('ai')}
              className={cn(
                'flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium transition-all',
                contentMode === 'ai'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 text-white'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', contentMode === 'ai' ? 'bg-purple-500' : 'bg-white/10')}>
                <Wand2 className="w-5 h-5 text-white" />
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
                  ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50 text-white'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', contentMode === 'upload' ? 'bg-blue-500' : 'bg-white/10')}>
                <FileUp className="w-5 h-5 text-white" />
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
                  className="w-full h-36 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 resize-none text-sm"
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
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-white transition-all"
                      >
                        {suggestion.length > 40 ? suggestion.slice(0, 40) + '...' : suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button className="w-full h-36 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
                  <Upload className="w-8 h-8 text-slate-400 mb-3" />
                  <p className="text-white font-medium">Drop your file here</p>
                  <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options row */}
          <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-white/10">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Audience</label>
              <div className="flex flex-wrap gap-1.5">
                {audiences.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className={cn(
                      'h-8 px-3 rounded-md text-xs font-medium transition-all border',
                      audience === a.id
                        ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                        : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    )}
                  >
                    {a.emoji} {a.id}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {tones.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={cn(
                      'h-8 px-3 rounded-md text-xs font-medium transition-all border',
                      tone === t.id
                        ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                        : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    )}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Slides</label>
                <span className="text-xs font-bold text-purple-400">{slideCount}</span>
              </div>
              <input
                type="range"
                min={5}
                max={20}
                value={slideCount}
                onChange={e => setSlideCount(parseInt(e.target.value))}
                className="w-full accent-purple-500"
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
              'w-full mt-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
              canGenerate
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
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
