import React, { useState } from 'react';
import { Lightbulb, X, Loader2, Scissors, ImagePlus, FileText, Palette } from 'lucide-react';
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

interface Props {
  onClose: () => void;
}

export default function SmartSuggest({ onClose }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const { presentation, activeSlideIndex } = useEditorStore();
  const activeSlide = presentation.slides[activeSlideIndex];

  const fetchSuggestions = async () => {
    if (!activeSlide) return;
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
      } else {
        setSuggestions(data?.suggestions || []);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  // Fetch on mount
  React.useEffect(() => { fetchSuggestions(); }, []);

  const typeIcon = (type: string) => {
    if (type === 'content') return <FileText className="w-3.5 h-3.5" />;
    if (type === 'design') return <Palette className="w-3.5 h-3.5" />;
    if (type === 'add') return <ImagePlus className="w-3.5 h-3.5" />;
    if (type === 'split') return <Scissors className="w-3.5 h-3.5" />;
    return <Lightbulb className="w-3.5 h-3.5" />;
  };

  const severityDot = (p: string) => {
    if (p === 'high') return 'bg-red-400';
    if (p === 'medium') return 'bg-amber-400';
    return 'bg-blue-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Smart Suggestions</h3>
              <p className="text-[10px] text-slate-400">Slide {activeSlideIndex + 1}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-[#4F46E5] animate-spin" />
              <span className="text-xs text-slate-400 ml-2">Analyzing slide...</span>
            </div>
          )}

          {fetched && !loading && suggestions.length === 0 && (
            <div className="py-10 text-center">
              <Lightbulb className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">This slide looks good! No suggestions.</p>
            </div>
          )}

          {suggestions.map(s => (
            <div
              key={s.id}
              className="px-5 py-3 border-b border-slate-100 last:border-0 flex items-start gap-3 hover:bg-slate-50/50 transition-colors"
            >
              <span className="mt-0.5 shrink-0 text-slate-400">{typeIcon(s.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(s.priority)}`} />
                  <span className="text-xs font-medium text-slate-700 leading-tight">{s.title}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
