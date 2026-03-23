import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles, FileText, Layout, BarChart3, Image, Users, TrendingUp, Quote, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
const uid = () => crypto.randomUUID().slice(0, 9);

interface Props {
  onClose: () => void;
}

const QUICK_TYPES = [
  { icon: <FileText className="w-4 h-4" />, label: 'Title & Content', prompt: 'Create a slide with a title and body text about the topic' },
  { icon: <BarChart3 className="w-4 h-4" />, label: 'Stats & Data', prompt: 'Create a slide with 3 key statistics or metrics' },
  { icon: <Image className="w-4 h-4" />, label: 'Image Focus', prompt: 'Create a slide with a large image placeholder and a short caption' },
  { icon: <Users className="w-4 h-4" />, label: 'Team / People', prompt: 'Create a slide introducing team members or key people' },
  { icon: <TrendingUp className="w-4 h-4" />, label: 'Timeline', prompt: 'Create a timeline slide showing a progression or roadmap' },
  { icon: <Quote className="w-4 h-4" />, label: 'Quote / Statement', prompt: 'Create a quote or key statement slide with large centered text' },
  { icon: <Target className="w-4 h-4" />, label: 'Comparison', prompt: 'Create a comparison slide with two columns showing pros/cons or before/after' },
  { icon: <Layout className="w-4 h-4" />, label: 'Section Divider', prompt: 'Create a section divider slide with just a title and subtitle' },
];

export default function AddSlideDialog({ onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { presentation, activeSlideIndex, addSlide } = useEditorStore();
  const theme = presentation.theme.tokens;

  const handleGenerate = async (finalPrompt: string) => {
    if (!finalPrompt.trim()) return;
    setLoading(true);

    try {
      const existingSlides = presentation.slides.slice(0, 3).map(s => ({
        elements: (s.elements || []).slice(0, 2).map(e => ({
          type: e.type,
          content: e.content?.substring(0, 100),
        })),
      }));

      const { data, error } = await supabase.functions.invoke('generate-slide', {
        body: {
          prompt: finalPrompt.trim(),
          context: presentation.title,
          themeTokens: {
            palette: theme.palette,
            typography: theme.typography,
          },
          existingSlides,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const elements = (data.elements || []).map((el: any) => ({
        id: uid(),
        type: el.type || 'text',
        content: el.content || '',
        x: el.x || 100,
        y: el.y || 100,
        width: el.width || 400,
        height: el.height || 200,
        rotation: el.rotation || 0,
        opacity: el.opacity ?? 1,
        locked: false,
        visible: true,
        zIndex: 0,
        style: el.style || {},
      }));

      // Add slide after current
      const newSlide = {
        id: uid(),
        elements,
        background: presentation.slides[activeSlideIndex]?.background || { type: 'solid' as const, value: theme.palette.bg },
      };

      useEditorStore.setState((state: any) => {
        const slides = [...state.presentation.slides];
        slides.splice(activeSlideIndex + 1, 0, newSlide);
        return {
          presentation: { ...state.presentation, slides },
          activeSlideIndex: activeSlideIndex + 1,
        };
      });

      toast.success('Slide generated!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate slide');
    } finally {
      setLoading(false);
    }
  };

  const handleBlank = () => {
    addSlide();
    onClose();
  };

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Add New Slide</h3>
              <p className="text-xs text-slate-400">Describe what you need or pick a type</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick type buttons */}
          <div>
            <label className="text-[10px] text-slate-500 font-medium mb-2 block">Quick Templates</label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_TYPES.map(qt => (
                <button
                  key={qt.label}
                  onClick={() => handleGenerate(qt.prompt)}
                  disabled={loading}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  {qt.icon}
                  <span className="text-[10px] font-medium leading-tight text-center">{qt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom prompt */}
          <div>
            <label className="text-[10px] text-slate-500 font-medium mb-1 block">Or describe what you want</label>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && prompt.trim() && handleGenerate(prompt)}
                placeholder="A slide about our Q4 revenue growth..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                disabled={loading}
                autoFocus
              />
              <Button
                onClick={() => handleGenerate(prompt)}
                disabled={loading || !prompt.trim()}
                className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white rounded-xl px-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-[#4F46E5] animate-spin mr-2" />
              <span className="text-sm text-slate-500">Generating slide...</span>
            </div>
          )}

          {/* Blank slide option */}
          <button
            onClick={handleBlank}
            disabled={loading}
            className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            or add a blank slide
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
