import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { generateId } from '@/lib/slide-utils';
import { Slide, SlideElement } from '@/types/presentation';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

export default function AISlideDialog({ onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { presentation, activeSlideIndex } = useEditorStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-slide', {
        body: {
          prompt: prompt.trim(),
          context: presentation.title,
          themeTokens: presentation.theme.tokens,
          existingSlides: presentation.slides.map(s => ({
            elements: s.elements?.slice(0, 2).map(e => ({ type: e.type, content: e.content.slice(0, 100) })),
          })),
        },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      const elements: SlideElement[] = (data.elements || []).map((el: Partial<SlideElement>, i: number) => ({
        id: generateId(),
        type: el.type || 'text',
        content: el.content || '',
        x: el.x ?? 128,
        y: el.y ?? 100 + i * 150,
        width: el.width ?? 1664,
        height: el.height ?? 120,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        zIndex: i + 1,
        style: el.style || {},
      }));

      const newSlide: Slide = {
        id: generateId(),
        elements,
        background: {
          type: 'solid',
          value: presentation.theme.tokens.palette.bg,
        },
        notes: '',
      };

      // Add slide after current
      useEditorStore.setState(state => ({
        presentation: {
          ...state.presentation,
          slides: [
            ...state.presentation.slides.slice(0, activeSlideIndex + 1),
            newSlide,
            ...state.presentation.slides.slice(activeSlideIndex + 1),
          ],
          updatedAt: new Date().toISOString(),
        },
        activeSlideIndex: activeSlideIndex + 1,
        selectedElementIds: [],
      }));

      toast.success('AI slide generated!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate slide');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Key takeaways summary',
    'Timeline / milestones',
    'Team introduction',
    'Pricing comparison',
    'Statistics dashboard',
    'Call to action',
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Generate Slide with AI</h3>
              <p className="text-xs text-slate-400">Describe what you want on this slide</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <p className="text-xs text-slate-400 mb-2">Quick ideas:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="Describe the slide content..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              disabled={loading}
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
