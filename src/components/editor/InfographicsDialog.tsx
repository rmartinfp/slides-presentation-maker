import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, LayoutGrid, Loader2, Sparkles } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { produce } from 'immer';
import { INFOGRAPHIC_TEMPLATES, InfographicTemplate } from '@/lib/infographic-templates';
import type { Slide } from '@/types/presentation';

interface Props {
  onClose: () => void;
}

// ─── Template matcher for AI prompt ───

function pickBestTemplate(prompt: string): InfographicTemplate {
  const lower = prompt.toLowerCase();
  if (/timeline|history|year|phase|stage/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'timeline')!;
  if (/compare|vs|versus|differ/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'comparison')!;
  if (/step|process|flow|how to/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'process-steps')!;
  if (/pro|con|advantage|disadvantage/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'pros-cons')!;
  if (/percent|bar|progress/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'percentage-bars')!;
  if (/quote|said|saying/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'quote-spotlight')!;
  if (/funnel|sales|pipeline/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'funnel')!;
  if (/number|stat|kpi|metric|revenue/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'big-numbers')!;
  if (/mind|map|branch|idea/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'mind-map')!;
  if (/list|top|rank|priority/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'numbered-list')!;
  if (/donut|pie|segment|breakdown/.test(lower)) return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'donut-legend')!;
  return INFOGRAPHIC_TEMPLATES.find(t => t.id === 'feature-grid')!; // default
}

// ─── Mini element renderer ───

function MiniElement({ el }: { el: any }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${(el.x / 1920) * 100}%`,
    top: `${(el.y / 1080) * 100}%`,
    width: `${(el.width / 1920) * 100}%`,
    height: `${(el.height / 1080) * 100}%`,
  };

  if (el.type === 'text') {
    // Scale font: convert pt to fraction of 1920-wide canvas, slightly smaller for preview fit
    const fontSizePct = ((el.style?.fontSize || 12) * 2.666) / 1920 * 100 * 0.92;
    return (
      <div style={{
        ...style,
        fontSize: `${fontSizePct}cqw`,
        color: el.style?.color,
        fontFamily: el.style?.fontFamily,
        fontWeight: el.style?.fontWeight,
        fontStyle: el.style?.fontStyle,
        textAlign: el.style?.textAlign as any,
        overflow: 'hidden',
        lineHeight: 1.1,
        letterSpacing: '-0.01em',
        display: '-webkit-box',
        WebkitLineClamp: Math.max(1, Math.round(el.height / ((el.style?.fontSize || 12) * 2.666 * 1.1))),
        WebkitBoxOrient: 'vertical' as any,
      }}>
        {el.content?.replace(/<[^>]+>/g, '') || ''}
      </div>
    );
  }

  if (el.type === 'shape') {
    return (
      <div style={{
        ...style,
        backgroundColor: el.style?.shapeFill || 'transparent',
        borderRadius: el.style?.shapeType === 'circle' ? '50%' : (el.style?.borderRadius ? `${el.style.borderRadius / 19.2}cqw` : 0),
        border: el.style?.borderColor ? `2px solid ${el.style.borderColor}` : (el.style?.shapeStroke && el.style.shapeStroke !== 'transparent' ? `1px solid ${el.style.shapeStroke}` : undefined),
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      }} />
    );
  }

  if (el.type === 'chart') {
    // Render a simple placeholder for chart elements in preview
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6,
      }}>
        <svg viewBox="0 0 100 100" style={{ width: '60%', height: '60%' }}>
          <circle cx="50" cy="50" r="40" fill="none" stroke={el.style?.shapeFill || '#6366F1'} strokeWidth="15" strokeDasharray="80 170" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={el.style?.shapeFill || '#818CF8'} strokeWidth="15" strokeDasharray="50 200" strokeDashoffset="-80" opacity="0.6" />
        </svg>
      </div>
    );
  }

  return null;
}

// ─── Mini infographic preview ───

function MiniInfographicPreview({ template, palette, typography }: {
  template: InfographicTemplate;
  palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
  typography: { titleFont: string; bodyFont: string };
}) {
  const elements = useMemo(() => {
    const exampleSlots: Record<string, string> = {};
    for (const slot of template.slots) {
      exampleSlots[slot.id] = slot.example;
    }
    return template.generate(palette, typography, exampleSlots);
  }, [template, palette, typography]);

  return (
    <div
      className="w-full aspect-[16/9] relative overflow-hidden rounded-lg"
      style={{ backgroundColor: palette.bg, containerType: 'inline-size' }}
    >
      {elements.map((el, i) => (
        <MiniElement key={i} el={el} />
      ))}
    </div>
  );
}

// ─── Main Dialog ───

export default function InfographicsDialog({ onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const presentation = useEditorStore(s => s.presentation);
  const theme = presentation.theme;
  const palette = theme.tokens.palette;
  const typography = theme.tokens.typography;

  // ─── Insert slide from template ───

  const insertSlide = (template: InfographicTemplate, slotValues: Record<string, string>) => {
    const rawElements = template.generate(palette, typography, slotValues);

    const newSlide: Slide = {
      id: crypto.randomUUID(),
      elements: rawElements.map((el, i) => ({
        ...el,
        id: crypto.randomUUID(),
        zIndex: i + 1,
        rotation: el.rotation ?? 0,
        opacity: el.opacity ?? 1,
        locked: el.locked ?? false,
        visible: el.visible ?? true,
        content: el.content ?? '',
        style: el.style ?? {},
      })),
      background: { type: 'solid', value: palette.bg },
      notes: '',
    };

    useEditorStore.setState(produce((state: any) => {
      state.presentation.slides.push(newSlide);
      state.activeSlideIndex = state.presentation.slides.length - 1;
      state.selectedElementIds = [];
      state.presentation.updatedAt = new Date().toISOString();
    }));

    toast.success(`"${template.name}" added as new slide!`);
    onClose();
  };

  // ─── Card click: instant apply with example data ───

  const handleApply = (template: InfographicTemplate) => {
    const exampleSlots: Record<string, string> = {};
    for (const slot of template.slots) {
      exampleSlots[slot.id] = slot.example;
    }
    insertSlide(template, exampleSlots);
  };

  // ─── Prompt submit: AI generates content ───

  const handleGenerateWithAI = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const bestTemplate = pickBestTemplate(prompt);

      const { data, error } = await supabase.functions.invoke('generate-infographic', {
        body: {
          slots: bestTemplate.slots,
          userContent: prompt.trim(),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const filledSlots: Record<string, string> = data?.slots || {};

      // Fallback: fill any missing slots with examples
      for (const slot of bestTemplate.slots) {
        if (!filledSlots[slot.id]) {
          filledSlots[slot.id] = slot.example;
        }
      }

      insertSlide(bestTemplate, filledSlots);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate infographic');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !loading) {
      e.preventDefault();
      handleGenerateWithAI();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Add Infographic</h3>
              <p className="text-xs text-slate-400">Click a preview to instantly add it as a new slide</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Prompt input */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your infographic... e.g. 'Sales funnel with 10K leads to 620 conversions'"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 pr-10"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleGenerateWithAI}
              disabled={loading || !prompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white text-sm font-medium shadow-lg shadow-[#4F46E5]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0 transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate</>
              )}
            </button>
          </div>
        </div>

        {/* Grid of visual preview cards */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
            {INFOGRAPHIC_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => handleApply(template)}
                className="group text-left rounded-xl border-2 border-slate-200 hover:border-[#4F46E5]/50 transition-all hover:shadow-xl hover:shadow-[#4F46E5]/10 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] overflow-hidden"
              >
                {/* Mini slide preview */}
                <div className="pointer-events-none">
                  <MiniInfographicPreview
                    template={template}
                    palette={palette}
                    typography={typography}
                  />
                </div>

                {/* Template name */}
                <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{template.icon}</span>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#4F46E5] transition-colors">{template.name}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
