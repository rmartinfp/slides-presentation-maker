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

// Visual slide layouts with text previews
interface LayoutBlock {
  type: 'title' | 'body' | 'accent' | 'image' | 'divider' | 'number';
  x: number; y: number; w: number; h: number;
  text?: string;
  fontSize?: number;
  bold?: boolean;
  align?: string;
  rounded?: number;
}

const LAYOUTS: { id: string; label: string; prompt: string; blocks: LayoutBlock[] }[] = [
  {
    id: 'blank', label: 'Blank', prompt: '',
    blocks: [],
  },
  {
    id: 'title-content', label: 'Title & Content',
    prompt: 'Create a slide with a bold title at the top and a paragraph of body text below',
    blocks: [
      { type: 'title', x: 8, y: 12, w: 70, h: 10, text: 'Slide Title', fontSize: 11, bold: true },
      { type: 'body', x: 8, y: 28, w: 60, h: 4, text: 'Body text goes here with details', fontSize: 6 },
      { type: 'body', x: 8, y: 35, w: 55, h: 4, text: 'and supporting information for', fontSize: 6 },
      { type: 'body', x: 8, y: 42, w: 50, h: 4, text: 'your audience to understand.', fontSize: 6 },
    ],
  },
  {
    id: 'two-column', label: 'Two Columns',
    prompt: 'Create a slide with a title and two columns of text side by side',
    blocks: [
      { type: 'title', x: 8, y: 8, w: 84, h: 10, text: 'Two Columns', fontSize: 11, bold: true },
      { type: 'divider', x: 49.5, y: 24, w: 0.3, h: 50 },
      { type: 'body', x: 8, y: 26, w: 38, h: 4, text: 'First column with', fontSize: 5.5 },
      { type: 'body', x: 8, y: 33, w: 35, h: 4, text: 'key points and', fontSize: 5.5 },
      { type: 'body', x: 8, y: 40, w: 36, h: 4, text: 'supporting details', fontSize: 5.5 },
      { type: 'body', x: 54, y: 26, w: 38, h: 4, text: 'Second column', fontSize: 5.5 },
      { type: 'body', x: 54, y: 33, w: 35, h: 4, text: 'with additional', fontSize: 5.5 },
      { type: 'body', x: 54, y: 40, w: 36, h: 4, text: 'information here', fontSize: 5.5 },
    ],
  },
  {
    id: 'stats', label: 'Key Numbers',
    prompt: 'Create a slide with 3 large key statistics with labels',
    blocks: [
      { type: 'title', x: 8, y: 8, w: 50, h: 9, text: 'Key Metrics', fontSize: 10, bold: true },
      { type: 'number', x: 10, y: 30, w: 22, h: 16, text: '85%', fontSize: 14, bold: true, align: 'center' },
      { type: 'number', x: 39, y: 30, w: 22, h: 16, text: '$2.4M', fontSize: 14, bold: true, align: 'center' },
      { type: 'number', x: 68, y: 30, w: 22, h: 16, text: '3.2x', fontSize: 14, bold: true, align: 'center' },
      { type: 'accent', x: 16, y: 48, w: 10, h: 1.5, rounded: 1 },
      { type: 'accent', x: 45, y: 48, w: 10, h: 1.5, rounded: 1 },
      { type: 'accent', x: 74, y: 48, w: 10, h: 1.5, rounded: 1 },
      { type: 'body', x: 10, y: 53, w: 22, h: 4, text: 'Satisfaction', fontSize: 5, align: 'center' },
      { type: 'body', x: 39, y: 53, w: 22, h: 4, text: 'Revenue', fontSize: 5, align: 'center' },
      { type: 'body', x: 68, y: 53, w: 22, h: 4, text: 'Growth', fontSize: 5, align: 'center' },
    ],
  },
  {
    id: 'image-text', label: 'Image & Text',
    prompt: 'Create a slide with a large image placeholder on the right and title with text on the left',
    blocks: [
      { type: 'title', x: 8, y: 15, w: 42, h: 10, text: 'Visual Slide', fontSize: 10, bold: true },
      { type: 'body', x: 8, y: 32, w: 38, h: 4, text: 'Describe the image', fontSize: 5.5 },
      { type: 'body', x: 8, y: 39, w: 35, h: 4, text: 'context and details', fontSize: 5.5 },
      { type: 'image', x: 55, y: 8, w: 38, h: 60, rounded: 4 },
    ],
  },
  {
    id: 'quote', label: 'Quote',
    prompt: 'Create a slide with a large centered quote and the author name below',
    blocks: [
      { type: 'accent', x: 18, y: 22, w: 1.5, h: 20 },
      { type: 'title', x: 24, y: 22, w: 60, h: 8, text: '"A powerful quote that', fontSize: 9, bold: true },
      { type: 'title', x: 24, y: 33, w: 55, h: 8, text: 'inspires the audience"', fontSize: 9, bold: true },
      { type: 'body', x: 24, y: 50, w: 30, h: 4, text: '— Author Name', fontSize: 5.5 },
    ],
  },
  {
    id: 'section', label: 'Section Divider',
    prompt: 'Create a section divider slide with a big centered title and a short subtitle below',
    blocks: [
      { type: 'title', x: 15, y: 28, w: 70, h: 14, text: 'Section Title', fontSize: 14, bold: true, align: 'center' },
      { type: 'body', x: 25, y: 50, w: 50, h: 5, text: 'Subtitle description here', fontSize: 6, align: 'center' },
    ],
  },
  {
    id: 'timeline', label: 'Timeline',
    prompt: 'Create a timeline slide with 4 milestones showing a progression or roadmap',
    blocks: [
      { type: 'title', x: 8, y: 6, w: 40, h: 9, text: 'Roadmap', fontSize: 10, bold: true },
      { type: 'divider', x: 6, y: 46, w: 88, h: 0.6 },
      { type: 'accent', x: 14, y: 43.5, w: 5, h: 5, rounded: 50 },
      { type: 'accent', x: 34, y: 43.5, w: 5, h: 5, rounded: 50 },
      { type: 'accent', x: 54, y: 43.5, w: 5, h: 5, rounded: 50 },
      { type: 'accent', x: 74, y: 43.5, w: 5, h: 5, rounded: 50 },
      { type: 'body', x: 8, y: 26, w: 18, h: 4, text: 'Q1 2026', fontSize: 5, align: 'center', bold: true },
      { type: 'body', x: 28, y: 54, w: 18, h: 4, text: 'Q2 2026', fontSize: 5, align: 'center', bold: true },
      { type: 'body', x: 48, y: 26, w: 18, h: 4, text: 'Q3 2026', fontSize: 5, align: 'center', bold: true },
      { type: 'body', x: 68, y: 54, w: 18, h: 4, text: 'Q4 2026', fontSize: 5, align: 'center', bold: true },
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

      const titleSize = theme.typography.titleSize || 42;
      const bodySize = theme.typography.bodySize || 24;

      const elements = (data.elements || []).map((el: any, idx: number) => {
        const isText = (el.type || 'text') === 'text';
        const rawFontSize = el.style?.fontSize || 14;
        // Detect if this is a title (first text, or large font, or bold)
        const isTitle = isText && (idx === 0 || rawFontSize >= 28 || el.style?.fontWeight === 'bold');

        // Force correct font sizes from theme — AI often generates too small
        const fontSize = isText
          ? (isTitle ? titleSize : Math.max(bodySize, rawFontSize))
          : rawFontSize;

        // Force minimum dimensions proportional to font size
        // fontSize in pt × 2.666 = px. A line needs ~1.4× that height.
        const fontPx = fontSize * 2.666;
        const minH = isText ? Math.max(fontPx * 2, 80) : 50;
        const minW = isText ? Math.max(300, isTitle ? 800 : 400) : 100;
        const width = isText ? Math.max(el.width || 400, minW) : (el.width || 400);
        const height = isText ? Math.max(el.height || 100, minH) : (el.height || 200);

        return {
          id: uid(),
          type: el.type || 'text',
          content: el.content || '',
          x: Math.max(80, el.x || 120),
          y: Math.max(40, el.y || 100),
          width, height,
          rotation: el.rotation || 0, opacity: el.opacity ?? 1,
          locked: false, visible: true, zIndex: 0,
          style: {
            ...el.style,
            fontSize,
            fontFamily: isTitle ? theme.typography.titleFont : theme.typography.bodyFont,
            fontWeight: isTitle ? 'bold' : (el.style?.fontWeight || 'normal'),
            color: el.style?.color || theme.palette.text,
          },
        };
      });

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
                        className="absolute overflow-hidden"
                        style={{
                          left: `${block.x}%`,
                          top: `${block.y}%`,
                          width: `${block.w}%`,
                          height: `${block.h}%`,
                          backgroundColor:
                            block.text ? 'transparent' :
                            block.type === 'accent' ? text :
                            block.type === 'image' ? `${text}12` :
                            block.type === 'divider' ? `${text}18` :
                            block.type === 'number' ? 'transparent' :
                            `${text}20`,
                          borderRadius: block.rounded ?? (block.type === 'image' ? 4 : 1),
                          border: block.type === 'image' ? `1px dashed ${text}25` : undefined,
                        }}
                      >
                        {block.text && (
                          <span
                            className="block truncate leading-tight"
                            style={{
                              fontSize: block.fontSize || 6,
                              fontWeight: block.bold ? 'bold' : 'normal',
                              color: block.type === 'number' ? text : block.type === 'title' ? text : `${text}90`,
                              fontFamily: block.type === 'title' || block.type === 'number'
                                ? `${theme.typography.titleFont}, sans-serif`
                                : `${theme.typography.bodyFont}, sans-serif`,
                              textAlign: (block.align as any) || 'left',
                            }}
                          >
                            {block.text}
                          </span>
                        )}
                      </div>
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
