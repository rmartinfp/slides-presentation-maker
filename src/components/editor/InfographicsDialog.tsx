import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutGrid, ArrowLeft, Loader2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { produce } from 'immer';
import { INFOGRAPHIC_TEMPLATES, InfographicTemplate } from '@/lib/infographic-templates';
import type { Slide } from '@/types/presentation';

interface Props {
  onClose: () => void;
}

type Mode = 'browse' | 'generate';

const CATEGORIES = ['All', 'Statistics', 'Process', 'Comparison', 'Data'] as const;

export default function InfographicsDialog({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('browse');
  const [selectedTemplate, setSelectedTemplate] = useState<InfographicTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const presentation = useEditorStore(s => s.presentation);
  const theme = presentation.theme;
  const palette = theme.tokens.palette;
  const typography = theme.tokens.typography;

  // Derive unique categories from templates
  const allCategories = useMemo(() => {
    const cats = new Set(INFOGRAPHIC_TEMPLATES.map(t => t.category));
    return ['All', ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'All') return INFOGRAPHIC_TEMPLATES;
    return INFOGRAPHIC_TEMPLATES.filter(t => t.category === activeCategory);
  }, [activeCategory]);

  const handleSelectTemplate = (template: InfographicTemplate) => {
    setSelectedTemplate(template);
    setMode('generate');
  };

  const handleInsert = (slotValues: Record<string, string>) => {
    const template = selectedTemplate!;

    // Generate elements from template
    const rawElements = template.generate(palette, typography, slotValues);

    // Create new slide
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

    // Add to presentation
    useEditorStore.setState(produce((state: any) => {
      state.presentation.slides.push(newSlide);
      state.activeSlideIndex = state.presentation.slides.length - 1;
      state.selectedElementIds = [];
      state.presentation.updatedAt = new Date().toISOString();
    }));

    toast.success('Infographic added to new slide!');
    onClose();
  };

  const handleQuickAdd = (template: InfographicTemplate) => {
    setSelectedTemplate(template);
    // Use example values from slots
    const exampleValues: Record<string, string> = {};
    for (const slot of template.slots) {
      exampleValues[slot.id] = slot.example;
    }
    // Need to set selectedTemplate first, then insert
    const rawElements = template.generate(palette, typography, exampleValues);

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

    toast.success('Infographic added to new slide!');
    onClose();
  };

  const handleGenerateWithAI = async () => {
    if (!selectedTemplate || !prompt.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-infographic', {
        body: {
          slots: selectedTemplate.slots,
          userContent: prompt.trim(),
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const filledSlots: Record<string, string> = data?.slots || {};

      // Fallback: fill any missing slots with examples
      for (const slot of selectedTemplate.slots) {
        if (!filledSlots[slot.id]) {
          filledSlots[slot.id] = slot.example;
        }
      }

      handleInsert(filledSlots);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate infographic');
    } finally {
      setLoading(false);
    }
  };

  const handleUsePlaceholder = () => {
    if (!selectedTemplate) return;
    const exampleValues: Record<string, string> = {};
    for (const slot of selectedTemplate.slots) {
      exampleValues[slot.id] = slot.example;
    }
    handleInsert(exampleValues);
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
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {mode === 'generate' && (
              <button
                onClick={() => { setMode('browse'); setSelectedTemplate(null); setPrompt(''); }}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center mr-1"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Add Infographic</h3>
              <p className="text-xs text-slate-400">
                {mode === 'browse'
                  ? 'Choose a template, then customize with AI or placeholder content'
                  : `Configure "${selectedTemplate?.name}"`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {mode === 'browse' ? (
              <motion.div
                key="browse"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                {/* Category filter pills */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        activeCategory === cat
                          ? 'bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Template grid */}
                <div className="grid grid-cols-3 gap-4">
                  {filteredTemplates.map(template => (
                    <div
                      key={template.id}
                      className="group relative rounded-xl border-2 border-slate-200 hover:border-[#4F46E5]/40 hover:shadow-lg transition-all overflow-hidden"
                    >
                      {/* Card body — click to select and generate */}
                      <button
                        onClick={() => handleSelectTemplate(template)}
                        className="w-full text-left p-4 pb-2"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <span className="text-2xl">{template.icon}</span>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-slate-800 block">{template.name}</span>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{template.description}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 inline-block">
                          {template.category}
                        </span>
                      </button>

                      {/* Quick add button */}
                      <div className="px-4 pb-3 pt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuickAdd(template); }}
                          className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-[#4F46E5] transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          Quick add with placeholder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="generate"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="p-6 space-y-5"
              >
                {/* Selected template preview */}
                {selectedTemplate && (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-3xl">{selectedTemplate.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">{selectedTemplate.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{selectedTemplate.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedTemplate.slots.map(slot => (
                          <span key={slot.id} className="text-[9px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">
                            {slot.id} ({slot.type}, max {slot.maxChars})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt textarea */}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium mb-1.5 block">
                    Describe the content for your infographic
                  </label>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe the content for your infographic... e.g., 'Our Q3 revenue was $2.4M, up 27% from Q2. Customer satisfaction hit 98%. We onboarded 150+ new partners.'"
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 resize-none"
                    disabled={loading}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-slate-400">{prompt.length}/3000 characters</span>
                  </div>
                </div>

                {/* Loading state */}
                {loading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-[#4F46E5] animate-spin mr-3" />
                    <span className="text-sm text-slate-500">AI is filling your infographic slots...</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer — only in generate mode */}
        {mode === 'generate' && (
          <div className="px-6 py-4 border-t border-slate-200 shrink-0 flex gap-3">
            <Button
              onClick={handleUsePlaceholder}
              disabled={loading}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              Use placeholder content
            </Button>
            <Button
              onClick={handleGenerateWithAI}
              disabled={loading || !prompt.trim()}
              className="flex-1 bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white rounded-xl shadow-lg shadow-[#4F46E5]/20 disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate with AI</>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
