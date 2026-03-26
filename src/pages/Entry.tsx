import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Play, Check, User, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import HlsVideo from '@/components/ui/HlsVideo';
import { cn } from '@/lib/utils';
import { getPresetById } from '@/lib/cinematic-presets';

export default function Entry() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'classic' | 'cinematic' | null>(null);
  const [filter, setFilter] = useState<'all' | 'classic' | 'cinematic'>('all');
  const [search, setSearch] = useState('');

  // Fetch templates
  const { data: classicTemplates } = useQuery({
    queryKey: ['templates-home'],
    queryFn: async () => {
      const { data } = await supabase.from('templates').select('*').eq('is_active', true).order('sort_order').limit(20);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: cinematicTemplates } = useQuery({
    queryKey: ['cinematic-templates-home'],
    queryFn: async () => {
      const { data } = await supabase.from('cinematic_templates').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const allTemplates = [
    ...(cinematicTemplates || []).map((t: any) => ({
      id: t.id, name: t.name, category: t.category, type: 'cinematic' as const,
      thumbnailUrl: null,
      videoUrl: t.slides?.[0]?.videoBackground?.url,
      videoOpacity: t.slides?.[0]?.videoBackground?.opacity || 0.5,
      bgColor: t.slides?.[0]?.background?.value || t.theme?.tokens?.palette?.bg || '#000',
      raw: t,
    })),
    ...(classicTemplates || []).map((t: any) => ({
      id: t.id, name: t.name.replace(/ by Slidesgo$/i, ''), category: t.category === 'Imported' ? 'All' : t.category, type: 'classic' as const,
      thumbnailUrl: t.thumbnail_url,
      videoUrl: null, videoOpacity: 0,
      bgColor: t.theme?.tokens?.palette?.bg || '#fff',
      raw: t,
    })),
  ].filter(t => {
    if (filter === 'cinematic' && t.type !== 'cinematic') return false;
    if (filter === 'classic' && t.type !== 'classic') return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleGenerate = () => {
    // Store prompt and selected template in sessionStorage
    sessionStorage.setItem('entryPrompt', prompt);
    if (selectedId && selectedType) {
      const tmpl = allTemplates.find(t => t.id === selectedId);
      if (tmpl) sessionStorage.setItem('entryTemplate', JSON.stringify({ type: selectedType, data: tmpl.raw }));
    }
    navigate('/create');
  };

  return (
    <div className="min-h-screen mesh-gradient text-slate-900 font-body">
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-glass border-b border-slate-200/60">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-lg shadow-[#4F46E5]/25">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-headline font-extrabold text-slate-900">SlideAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/template-studio')} className="hidden sm:block px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 rounded-full hover:bg-white/50 transition-all">
              Template Studio
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center cursor-pointer">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-16">

        {/* Prompt Section */}
        <div className="max-w-3xl mx-auto mb-10">
          <h1 className="font-headline font-extrabold text-3xl sm:text-4xl headline-tight text-slate-900 text-center mb-6">
            Create a presentation
          </h1>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your presentation... e.g. 'A pitch deck for our AI startup, focusing on market opportunity, product features, and team'"
              rows={3}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]/30 resize-none shadow-sm"
            />
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="absolute bottom-3 right-3 bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white shadow-lg shadow-[#4F46E5]/20 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generate
            </Button>
          </div>
          {selectedId && (
            <p className="text-xs text-[#4F46E5] mt-2 text-center">
              Template selected — your presentation will use this design
            </p>
          )}
        </div>

        {/* Filter tabs + search */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex gap-1.5">
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'cinematic' as const, label: 'Cinematic' },
              { id: 'classic' as const, label: 'Classic' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-medium transition-all border',
                  filter === f.id
                    ? 'bg-[#4F46E5]/10 border-[#4F46E5]/20 text-[#4F46E5]'
                    : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-white/80'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-40 h-9 pl-8 pr-3 bg-white/60 border border-slate-200/60 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
            />
          </div>
          <span className="text-xs text-slate-400">{allTemplates.length} templates</span>
        </div>

        {/* Templates Grid — 4 columns, max 5 rows scrollable */}
        <div className="max-h-[calc(5*180px)] overflow-y-auto rounded-2xl" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {allTemplates.map((tmpl, i) => {
              const isSelected = selectedId === tmpl.id;
              return (
                <motion.div
                  key={`${tmpl.type}-${tmpl.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => {
                    setSelectedId(isSelected ? null : tmpl.id);
                    setSelectedType(isSelected ? null : tmpl.type);
                  }}
                  className={cn(
                    'group cursor-pointer rounded-xl overflow-hidden transition-all duration-200',
                    isSelected
                      ? 'ring-2 ring-[#4F46E5] ring-offset-2 ring-offset-white shadow-xl shadow-[#4F46E5]/15 -translate-y-1'
                      : 'hover:shadow-lg hover:-translate-y-0.5'
                  )}
                >
                  <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: tmpl.bgColor }}>
                    {/* Classic thumbnail */}
                    {tmpl.thumbnailUrl && (
                      <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {/* Cinematic video */}
                    {tmpl.videoUrl && (
                      <HlsVideo
                        src={tmpl.videoUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: tmpl.videoOpacity }}
                      />
                    )}
                    {/* Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                      <p className="text-[11px] font-medium text-white truncate">{tmpl.name}</p>
                    </div>
                    {/* Cinematic badge */}
                    {tmpl.type === 'cinematic' && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-[#9333EA]/80 text-white font-medium flex items-center gap-0.5">
                        <Play className="w-2 h-2" />Cinematic
                      </span>
                    )}
                    {/* Selected check */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#4F46E5] flex items-center justify-center shadow-lg"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
