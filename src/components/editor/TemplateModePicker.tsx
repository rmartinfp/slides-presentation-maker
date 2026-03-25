import React, { useState, useEffect } from 'react';
import { Plus, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import SlideCanvas from './SlideCanvas';

interface Props {
  onSelect: (tmpl: any) => void;
  onBlank: () => void;
  onClose: () => void;
}

export default function TemplateModePicker({ onSelect, onBlank, onClose }: Props) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('cinematic_templates').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { setTemplates(data || []); setLoading(false); });
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-1.5 h-1.5 rounded-full bg-[#9333EA]" />
          <span className="text-sm font-semibold text-slate-700">Template Studio</span>
          <span className="text-[10px] text-white bg-[#9333EA] px-2 py-0.5 rounded-full font-medium">BACKEND</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Template Studio</h1>
          <p className="text-sm text-slate-500 mb-8">Design cinematic templates visually. All editor tools available.</p>

          {/* Start blank */}
          <button
            onClick={onBlank}
            className="w-full mb-8 p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#9333EA] hover:bg-purple-50/50 transition-all text-center group"
          >
            <Plus className="w-10 h-10 mx-auto mb-3 text-slate-300 group-hover:text-[#9333EA] transition-colors" />
            <p className="text-base font-semibold text-slate-600 group-hover:text-[#9333EA]">Start from scratch</p>
            <p className="text-xs text-slate-400 mt-1">5 blank black slides — add videos, text, shapes, everything</p>
          </button>

          {/* Existing templates */}
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Or edit an existing template</h2>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#9333EA]" /> Loading templates...
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {templates.map((tmpl: any) => {
              const firstSlide = tmpl.slides?.[0];
              const videoUrl = firstSlide?.videoBackground?.url || firstSlide?.videoUrl;
              const bgColor = firstSlide?.background?.value || tmpl.theme?.tokens?.palette?.bg || '#000';

              return (
                <button
                  key={tmpl.id}
                  onClick={() => onSelect(tmpl)}
                  className="rounded-xl overflow-hidden border border-slate-200 hover:border-[#9333EA] hover:shadow-xl hover:shadow-purple-500/10 transition-all text-left group"
                >
                  <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: bgColor }}>
                    {videoUrl && (
                      <video
                        src={videoUrl}
                        autoPlay muted loop playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: firstSlide?.videoBackground?.opacity || 0.5 }}
                      />
                    )}
                    <div className="absolute bottom-1.5 right-2 text-[10px] text-white/70 font-mono bg-black/30 px-1.5 py-0.5 rounded">
                      {tmpl.slides?.length || 0} slides
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#9333EA]">{tmpl.name}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{tmpl.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
