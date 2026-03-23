import React, { useState } from 'react';
import { ChevronUp, ChevronDown, StickyNote, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  notes: string;
  onChange: (notes: string) => void;
}

export default function SpeakerNotes({ notes, onChange }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { presentation, activeSlideIndex } = useEditorStore();

  const handleGenerateNotes = async () => {
    const slide = presentation.slides[activeSlideIndex];
    if (!slide) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-notes', {
        body: {
          elements: slide.elements || [],
          slideIndex: activeSlideIndex,
          totalSlides: presentation.slides.length,
          presentationTitle: presentation.title,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.notes) {
        onChange(data.notes);
        toast.success('Speaker notes generated!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate notes');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={cn(
      'border-t border-slate-200 bg-white transition-all duration-200',
      isExpanded ? 'h-40' : 'h-10'
    )}>
      <div className="flex items-center h-10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 h-10 px-4 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span className="font-medium">Speaker Notes</span>
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronUp className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {isExpanded && (
          <button
            onClick={handleGenerateNotes}
            disabled={generating}
            className="h-7 px-2.5 mr-3 flex items-center gap-1.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors disabled:opacity-50"
            title="Generate speaker notes with AI"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? 'Generating...' : 'AI Generate'}
          </button>
        )}
      </div>
      {isExpanded && (
        <textarea
          value={notes}
          onChange={e => onChange(e.target.value)}
          placeholder="Add speaker notes for this slide..."
          className="w-full h-[calc(100%-2.5rem)] px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 bg-slate-50 resize-none focus:outline-none"
        />
      )}
    </div>
  );
}
