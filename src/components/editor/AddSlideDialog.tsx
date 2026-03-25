import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
const uid = () => crypto.randomUUID().slice(0, 9);

interface Props {
  onClose: () => void;
}

// Visual slide layout definitions with mini-preview blocks
const LAYOUTS = [
  {
    id: 'blank',
    label: 'Blank',
    prompt: '',
    blocks: [], // Empty — just the background
  },
  {
    id: 'title-content',
    label: 'Title & Content',
    prompt: 'Create a slide with a bold title at the top and a paragraph of body text below',
    blocks: [
      { type: 'title', x: 8, y: 10, w: 60, h: 8 },
      { type: 'body', x: 8, y: 25, w: 55, h: 4 },
      { type: 'body', x: 8, y: 31, w: 50, h: 4 },
      { type: 'body', x: 8, y: 37, w: 52, h: 4 },
    ],
  },
  {
    id: 'two-column',
    label: 'Two Columns',
    prompt: 'Create a slide with a title and two columns of text side by side',
    blocks: [
      { type: 'title', x: 8, y: 10, w: 84, h: 8 },
      { type: 'body', x: 8, y: 28, w: 38, h: 4 },
      { type: 'body', x: 8, y: 34, w: 35, h: 4 },
      { type: 'body', x: 8, y: 40, w: 36, h: 4 },
      { type: 'body', x: 54, y: 28, w: 38, h: 4 },
      { type: 'body', x: 54, y: 34, w: 35, h: 4 },
      { type: 'body', x: 54, y: 40, w: 36, h: 4 },
      { type: 'divider', x: 49, y: 26, w: 0.3, h: 22 },
    ],
  },
  {
    id: 'stats',
    label: 'Key Numbers',
    prompt: 'Create a slide with 3 large key statistics with labels',
    blocks: [
      { type: 'title', x: 8, y: 8, w: 50, h: 7 },
      { type: 'accent', x: 10, y: 32, w: 22, h: 20 },
      { type: 'accent', x: 39, y: 32, w: 22, h: 20 },
      { type: 'accent', x: 68, y: 32, w: 22, h: 20 },
      { type: 'body', x: 12, y: 58, w: 18, h: 3 },
      { type: 'body', x: 41, y: 58, w: 18, h: 3 },
      { type: 'body', x: 70, y: 58, w: 18, h: 3 },
    ],
  },
  {
    id: 'image-text',
    label: 'Image & Text',
    prompt: 'Create a slide with a large image placeholder on the right and title with text on the left',
    blocks: [
      { type: 'title', x: 8, y: 15, w: 40, h: 8 },
      { type: 'body', x: 8, y: 30, w: 38, h: 4 },
      { type: 'body', x: 8, y: 36, w: 35, h: 4 },
      { type: 'body', x: 8, y: 42, w: 37, h: 4 },
      { type: 'image', x: 55, y: 10, w: 38, h: 55 },
    ],
  },
  {
    id: 'quote',
    label: 'Quote',
    prompt: 'Create a slide with a large centered quote and the author name below',
    blocks: [
      { type: 'accent', x: 20, y: 18, w: 3, h: 15 },
      { type: 'title', x: 27, y: 20, w: 55, h: 6 },
      { type: 'title', x: 27, y: 28, w: 50, h: 6 },
      { type: 'body', x: 27, y: 42, w: 25, h: 4 },
    ],
  },
  {
    id: 'section',
    label: 'Section Divider',
    prompt: 'Create a section divider slide with a big centered title and a short subtitle below',
    blocks: [
      { type: 'title', x: 20, y: 30, w: 60, h: 12 },
      { type: 'body', x: 30, y: 48, w: 40, h: 4 },
    ],
  },
  {
    id: 'timeline',
    label: 'Timeline',
    prompt: 'Create a timeline slide with 4 milestones showing a progression or roadmap',
    blocks: [
      { type: 'title', x: 8, y: 8, w: 40, h: 7 },
      { type: 'divider', x: 8, y: 45, w: 84, h: 0.4 },
      { type: 'accent', x: 15, y: 43, w: 4, h: 4 },
      { type: 'accent', x: 35, y: 43, w: 4, h: 4 },
      { type: 'accent', x: 55, y: 43, w: 4, h: 4 },
      { type: 'accent', x: 75, y: 43, w: 4, h: 4 },
      { type: 'body', x: 10, y: 52, w: 16, h: 3 },
      { type: 'body', x: 30, y: 52, w: 16, h: 3 },
      { type: 'body', x: 50, y: 52, w: 16, h: 3 },
      { type: 'body', x: 70, y: 52, w: 16, h: 3 },
    ],
  },
];

export default function AddSlideDialog({ onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const { presentation, activeSlideIndex, addSlide } = useEditorStore();
  const theme = presentation.theme.tokens;
  const currentSlide = presentation.slides[activeSlideIndex];

  const handleGenerate = async (finalPrompt: string) => {
    if (!finalPrompt.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-slide', {
        body: {
          prompt: finalPrompt.trim(),
          context: presentation.title,
          themeTokens: { palette: theme.palette, typography: theme.typography },
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const elements = (data.elements || []).map((el: any) => ({
        id: uid(),
        type: el.type || 'text',
        content: el.content || '',
        x: el.x || 100, y: el.y || 100,
        width: el.width || 400, height: el.height || 200,
        rotation: el.rotation || 0, opacity: el.opacity ?? 1,
        locked: false, visible: true, zIndex: 0,
        style: {
          ...el.style,
          fontFamily: el.style?.fontFamily || (el.style?.fontSize > 20 ? theme.typography.titleFont : theme.typography.bodyFont),
          color: el.style?.color || theme.palette.text,
        },
      }));

      // Copy locked decorations from current slide
      const decorations = (currentSlide?.elements || [])
        .filter(e => e.locked)
        .map(e => ({ ...e, id: uid() }));

      const newSlide = {
        id: uid(),
        elements: [...decorations, ...elements],
        background: currentSlide?.background || { type: 'solid' as const, value: theme.palette.bg },
        videoBackground: currentSlide?.videoBackground,
      };

      useEditorStore.setState((state: any) => {
        const slides = [...state.presentation.slides];
        slides.splice(activeSlideIndex + 1, 0, newSlide);
        return { presentation: { ...state.presentation, slides }, activeSlideIndex: activeSlideIndex + 1 };
      });

      toast.success('Slide added!');
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

  const handleLayoutClick = (layout: typeof LAYOUTS[number]) => {
    if (layout.id === 'blank') {
      handleBlank();
      return;
    }
    setSelectedLayout(layout.id);
    handleGenerate(layout.prompt);
  };

  // Preview colors from theme
  const bg = theme.palette.bg;
  const text = theme.palette.text;
  const accent = theme.palette.primary;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Add Slide</h3>
              <p className="text-xs text-slate-400">Pick a layout or describe what you need</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Layout grid */}
          {!loading && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              {LAYOUTS.map(layout => (
                <button
                  key={layout.id}
                  onClick={() => handleLayoutClick(layout)}
                  className="group text-left rounded-xl border-2 border-slate-200 hover:border-[#4F46E5] transition-all overflow-hidden"
                >
                  {/* Mini slide preview */}
                  <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: bg }}>
                    {/* Background image from current slide */}
                    {currentSlide?.background?.type === 'image' && (
                      <img src={currentSlide.background.value} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    {layout.blocks.map((block, i) => (
                      <div
                        key={i}
                        className="absolute rounded-sm"
                        style={{
                          left: `${block.x}%`,
                          top: `${block.y}%`,
                          width: `${block.w}%`,
                          height: `${block.h}%`,
                          backgroundColor:
                            block.type === 'title' ? text :
                            block.type === 'body' ? `${text}40` :
                            block.type === 'accent' ? accent :
                            block.type === 'image' ? `${text}15` :
                            block.type === 'divider' ? `${text}20` :
                            `${text}30`,
                          borderRadius: block.type === 'accent' ? 3 : block.type === 'image' ? 4 : 1,
                        }}
                      />
                    ))}
                    {layout.id === 'blank' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Plus className="w-6 h-6" style={{ color: `${text}30` }} />
                      </div>
                    )}
                  </div>
                  <div className="px-2.5 py-2 bg-white">
                    <span className="text-[11px] font-medium text-slate-700 group-hover:text-[#4F46E5] transition-colors">
                      {layout.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#4F46E5] animate-spin mr-3" />
              <span className="text-sm text-slate-500">Generating slide...</span>
            </div>
          )}

          {/* Custom prompt */}
          {!loading && (
            <div>
              <label className="text-[10px] text-slate-400 font-medium mb-1.5 block flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Or describe with AI
              </label>
              <div className="flex gap-2">
                <input
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && prompt.trim() && handleGenerate(prompt)}
                  placeholder="A slide about our Q4 revenue growth..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20"
                  disabled={loading}
                />
                <Button
                  onClick={() => handleGenerate(prompt)}
                  disabled={loading || !prompt.trim()}
                  className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white rounded-xl px-4"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
