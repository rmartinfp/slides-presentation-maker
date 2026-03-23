import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Loader2, ChevronRight } from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';

interface Suggestion {
  id: string;
  type: 'content' | 'design' | 'add' | 'split';
  icon: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export default function SmartSuggest() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const lastSlideRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { presentation, activeSlideIndex } = useEditorStore();
  const activeSlide = presentation.slides[activeSlideIndex];

  // Auto-fetch suggestions when slide changes (debounced)
  useEffect(() => {
    if (!activeSlide) return;

    const slideKey = `${activeSlideIndex}-${activeSlide.elements?.length || 0}`;
    if (slideKey === lastSlideRef.current) return;
    lastSlideRef.current = slideKey;

    // Reset dismissed for new slide
    setDismissed(new Set());

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('smart-suggest', {
          body: {
            slide: activeSlide,
            slideIndex: activeSlideIndex,
            totalSlides: presentation.slides.length,
            presentationTitle: presentation.title,
          },
        });

        if (error || data?.error) {
          setSuggestions([]);
          return;
        }

        setSuggestions(data?.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 2000); // 2s debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeSlideIndex, activeSlide?.elements?.length]);

  const visibleSuggestions = suggestions.filter(s => !dismissed.has(s.id));

  if (visibleSuggestions.length === 0 && !loading) return null;

  const priorityColor = (p: string) => {
    if (p === 'high') return 'border-red-200 bg-red-50';
    if (p === 'medium') return 'border-amber-200 bg-amber-50';
    return 'border-blue-200 bg-blue-50';
  };

  return (
    <div className="absolute bottom-14 right-4 z-20 w-72">
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-semibold text-slate-700">AI Suggestions</span>
              {loading && <Loader2 className="w-3 h-3 text-slate-400 animate-spin ml-auto" />}
              <button
                onClick={() => setCollapsed(true)}
                className="ml-auto p-0.5 hover:bg-slate-100 rounded"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {visibleSuggestions.map(s => (
                <div
                  key={s.id}
                  className={`px-3 py-2 border-b border-slate-50 last:border-0 flex items-start gap-2 group hover:bg-slate-50 transition-colors ${priorityColor(s.priority)} border-l-2`}
                >
                  <span className="text-sm mt-0.5 shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-slate-800 leading-tight">{s.title}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{s.description}</div>
                  </div>
                  <button
                    onClick={() => setDismissed(prev => new Set(prev).add(s.id))}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded transition-opacity shrink-0"
                  >
                    <X className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {collapsed && visibleSuggestions.length > 0 && (
        <motion.button
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          onClick={() => setCollapsed(false)}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[10px] font-medium text-amber-700 shadow-sm transition-colors"
        >
          <Lightbulb className="w-3 h-3" />
          {visibleSuggestions.length} suggestion{visibleSuggestions.length > 1 ? 's' : ''}
          <ChevronRight className="w-3 h-3" />
        </motion.button>
      )}
    </div>
  );
}
