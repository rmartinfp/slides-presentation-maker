import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Play, Check, User, Search, Paperclip, Mic, MicOff, X, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import HlsVideo from '@/components/ui/HlsVideo';
import { cn } from '@/lib/utils';
import { getPresetById } from '@/lib/cinematic-presets';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';

export default function Entry() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'classic' | 'cinematic' | null>(null);
  const [filter, setFilter] = useState<'all' | 'classic' | 'cinematic'>('all');
  const [search, setSearch] = useState('');
  const [slideCount, setSlideCount] = useState(8);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [isRecording, setIsRecording] = useState(false);
  const [previewTmpl, setPreviewTmpl] = useState<any>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch templates
  const { data: classicTemplates } = useQuery({
    queryKey: ['templates-home'],
    queryFn: async () => {
      const { data } = await supabase.from('templates').select('*').eq('is_active', true).order('sort_order').limit(100);
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

  // Build both lists then interleave them
  const cinematicList = (cinematicTemplates || []).map((t: any) => ({
    id: t.id, name: t.name, category: t.category, type: 'cinematic' as const,
    thumbnailUrl: null,
    videoUrl: t.slides?.[0]?.videoBackground?.url,
    videoOpacity: t.slides?.[0]?.videoBackground?.opacity || 0.5,
    bgColor: t.slides?.[0]?.background?.value || t.theme?.tokens?.palette?.bg || '#000',
    tags: (t.tags || []).join(' '),
    raw: t,
  }));
  const classicList = (classicTemplates || []).map((t: any) => ({
    id: t.id, name: t.name.replace(/ by Slidesgo$/i, ''), category: t.category === 'Imported' ? 'All' : t.category, type: 'classic' as const,
    thumbnailUrl: t.thumbnail_url,
    slideImages: Array.isArray(t.layouts) && t.layouts.length > 0 && typeof t.layouts[0] === 'string' && t.layouts[0].startsWith('http') ? t.layouts as string[] : undefined,
    videoUrl: null, videoOpacity: 0,
      bgColor: t.theme?.tokens?.palette?.bg || '#fff',
      tags: (t.tags || []).join(' '),
      raw: t,
    }));

  // Interleave cinematic and classic so they appear mixed
  const allTemplatesRaw: typeof cinematicList = [];
  const maxLen = Math.max(cinematicList.length, classicList.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < cinematicList.length) allTemplatesRaw.push(cinematicList[i]);
    if (i < classicList.length) allTemplatesRaw.push(classicList[i]);
  }

  // Debounced prompt for filtering — waits 800ms after typing stops
  const [debouncedPrompt, setDebouncedPrompt] = useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedPrompt(prompt), 400);
    return () => clearTimeout(t);
  }, [prompt]);

  // Smart filter: uses search box + debounced prompt keywords
  // Always shows results — if nothing matches, show all templates
  const allTemplates = React.useMemo(() => {
    const promptWords = debouncedPrompt.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const searchWords = search.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const allWords = [...searchWords, ...promptWords];

    // Apply type filter first
    const typeFiltered = allTemplatesRaw.filter(t => {
      if (filter === 'cinematic' && t.type !== 'cinematic') return false;
      if (filter === 'classic' && t.type !== 'classic') return false;
      return true;
    });

    // If no search terms, show all
    if (allWords.length === 0) return typeFiltered;

    // Try matching
    const matched = typeFiltered.filter(t => {
      const haystack = `${t.name} ${t.category} ${t.tags}`.toLowerCase();
      return allWords.some(w => haystack.includes(w));
    });

    // If no matches, show all (never empty)
    return matched.length > 0 ? matched : typeFiltered;
  }, [allTemplatesRaw, filter, search, debouncedPrompt]);

  const handleGenerate = () => {
    sessionStorage.setItem('entryPrompt', prompt);
    sessionStorage.setItem('entrySlideCount', String(slideCount));
    if (selectedId && selectedType) {
      // Search in UNFILTERED list — the selected template may have been filtered out by prompt keywords
      const tmpl = allTemplatesRaw.find(t => t.id === selectedId);
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
            Describe it. We design it.
          </h1>
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm focus-within:ring-2 focus-within:ring-[#4F46E5]/20 focus-within:border-[#4F46E5]/30">
            {/* Selected template thumbnail */}
            {selectedId && (() => {
              const tmpl = allTemplatesRaw.find(t => t.id === selectedId);
              if (!tmpl) return null;
              const thumb = tmpl.thumbnailUrl || tmpl.slideImages?.[0];
              return (
                <div className="px-5 pt-4 pb-1">
                  <div className="group relative inline-block rounded-lg overflow-hidden border border-slate-200/60 shadow-sm">
                    {thumb ? (
                      <img src={thumb} alt={tmpl.name || 'Template'} className="h-16 w-auto object-cover rounded-lg" />
                    ) : (
                      <div className="h-16 w-28 rounded-lg relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: tmpl.bgColor }}>
                        {tmpl.videoUrl && <HlsVideo src={tmpl.videoUrl} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: tmpl.videoOpacity }} />}
                        <div className="relative z-10 flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 text-white/80" />
                          <span className="text-[10px] font-medium text-white/80 truncate max-w-[70px]">{tmpl.name}</span>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { setSelectedId(null); setSelectedType(null); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })()}

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your presentation... e.g. 'A pitch deck for our AI startup, focusing on market opportunity, product features, and team'"
              rows={3}
              className={cn("w-full px-5 pb-2 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none", selectedId ? "pt-2" : "pt-4")}
            />

            {/* Attached files */}
            {attachedFiles.length > 0 && (
              <div className="px-5 pb-2 flex flex-wrap gap-2">
                {attachedFiles.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600">
                    <Paperclip className="w-3 h-3" />
                    {f.name.length > 25 ? f.name.slice(0, 22) + '...' : f.name}
                    <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Bottom bar: attach + mic + slide count + generate */}
            <div className="flex items-center gap-2 px-4 pb-3 pt-1">
              {/* Attach file */}
              <input ref={fileInputRef} type="file" accept=".pdf,.pptx,.docx,.txt,.md" multiple className="hidden"
                onChange={e => { if (e.target.files) setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; }} />
              <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors" title="Attach files">
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Slide count */}
              <div className="flex items-center gap-1.5 ml-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/60">
                <button onClick={() => setSlideCount(c => Math.max(3, c - 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 text-slate-500">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-medium text-slate-700 w-14 text-center">{slideCount} slides</span>
                <button onClick={() => setSlideCount(c => Math.min(20, c + 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 text-slate-500">
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1" />

              {/* Voice input — next to Generate */}
              <button
                onClick={() => {
                  if (isRecording) {
                    mediaRecorderRef.current?.stop();
                    setIsRecording(false);
                    return;
                  }
                  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                    const SpeechRec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                    if (!SpeechRec) { toast.info('Speech recognition not supported'); stream.getTracks().forEach(t => t.stop()); return; }
                    const recognition = new SpeechRec();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'es-ES';
                    recognition.onresult = (e: any) => {
                      let text = '';
                      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
                      setPrompt(prev => prev ? prev + ' ' + text : text);
                    };
                    recognition.onerror = () => { setIsRecording(false); stream.getTracks().forEach(t => t.stop()); };
                    recognition.onend = () => { setIsRecording(false); stream.getTracks().forEach(t => t.stop()); };
                    recognition.start();
                    setIsRecording(true);
                    (mediaRecorderRef as any).current = recognition;
                  }).catch(() => toast.error('Microphone access denied'));
                }}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                  isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                )}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Generate */}
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white shadow-lg shadow-[#4F46E5]/20 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate
              </Button>
            </div>
          </div>

        </div>

        {/* Template bar: count + type tabs + search icon + filter icon */}
        <div className="flex items-center gap-3 mb-5">
          {/* Left: count + label */}
          <span className="text-sm font-medium text-slate-800">15,000+</span>
          <span className="text-xs text-slate-400">Designed by professionals</span>

          {/* Type tabs */}
          <div className="flex gap-1 ml-4">
            {[
              { id: 'all' as const, label: 'All' },
              { id: 'cinematic' as const, label: 'Cinematic' },
              { id: 'classic' as const, label: 'Classic' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[11px] font-medium transition-all',
                  filter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Search — collapsible */}
          <div className="flex items-center gap-1.5">
            {searchOpen ? (
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  autoFocus
                  onBlur={() => { if (!search) setSearchOpen(false); }}
                  className="w-48 h-8 pl-8 pr-8 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/30"
                />
                <button onClick={() => { setSearch(''); setSearchOpen(false); }} className="absolute right-2">
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Filters icon */}
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                filtersOpen ? 'bg-[#4F46E5] text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded filters panel */}
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-5 p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-slate-200/60 overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Industry */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Industry</label>
                <div className="flex flex-wrap gap-1">
                  {['all', 'Tech', 'Finance', 'Education', 'Marketing', 'Healthcare'].map(v => (
                    <button key={v} onClick={() => setFilterIndustry(v)}
                      className={cn('px-2.5 py-1 rounded-full text-[10px] transition-all', filterIndustry === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                      {v === 'all' ? 'All' : v}
                    </button>
                  ))}
                </div>
              </div>
              {/* Style */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Style</label>
                <div className="flex flex-wrap gap-1">
                  {['all', 'Minimal', 'Bold', 'Elegant', 'Dark', 'Light', 'Serif'].map(v => (
                    <button key={v} onClick={() => setFilterStyle(v)}
                      className={cn('px-2.5 py-1 rounded-full text-[10px] transition-all', filterStyle === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                      {v === 'all' ? 'All' : v}
                    </button>
                  ))}
                </div>
              </div>
              {/* Color */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Color</label>
                <div className="flex gap-1.5">
                  {[
                    { id: 'all', color: 'bg-gradient-to-br from-slate-300 to-slate-500' },
                    { id: 'dark', color: 'bg-slate-900' },
                    { id: 'light', color: 'bg-white border border-slate-200' },
                    { id: 'blue', color: 'bg-blue-500' },
                    { id: 'purple', color: 'bg-purple-500' },
                    { id: 'warm', color: 'bg-orange-400' },
                  ].map(v => (
                    <button key={v.id} onClick={() => setFilterColor(v.id)}
                      className={cn('w-6 h-6 rounded-full transition-all', v.color, filterColor === v.id ? 'ring-2 ring-[#4F46E5] ring-offset-2 scale-110' : 'hover:scale-105')} />
                  ))}
                </div>
              </div>
              {/* Sort */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Sort by</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'popular', label: 'Popular' },
                    { id: 'newest', label: 'Newest' },
                    { id: 'name', label: 'Name' },
                  ].map(v => (
                    <button key={v.id} onClick={() => setSortBy(v.id)}
                      className={cn('px-2.5 py-1 rounded-full text-[10px] transition-all', sortBy === v.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Templates Grid — 4 columns, max 5 rows scrollable */}
        <div className="max-h-[calc(5*180px)] overflow-y-auto px-1 pt-1 pb-1 -mx-1" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {allTemplates.map((tmpl, i) => (
              <TemplateCard
                key={`${tmpl.type}-${tmpl.id}`}
                tmpl={tmpl}
                index={i}
                isSelected={selectedId === tmpl.id}
                onSelect={() => {
                  setSelectedId(selectedId === tmpl.id ? null : tmpl.id);
                  setSelectedType(selectedId === tmpl.id ? null : tmpl.type);
                }}
                onPreview={() => setPreviewTmpl(tmpl)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Preview modal — click on card opens this */}
      <AnimatePresence>
        {previewTmpl && (
          <EntryPreviewModal
            tmpl={previewTmpl}
            isSelected={selectedId === previewTmpl.id}
            onSelect={() => {
              setSelectedId(selectedId === previewTmpl.id ? null : previewTmpl.id);
              setSelectedType(selectedId === previewTmpl.id ? null : previewTmpl.type);
              setPreviewTmpl(null);
            }}
            onClose={() => setPreviewTmpl(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Template Card — hover autoscrolls, click opens preview ───
function TemplateCard({ tmpl, index, isSelected, onSelect, onPreview }: {
  tmpl: any; index: number; isSelected: boolean; onSelect: () => void; onPreview: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideImages = tmpl.slideImages || [];
  const hasSlideImages = slideImages.length > 1;

  React.useEffect(() => {
    if (!isHovering || slideImages.length <= 1) { setCurrentSlide(0); return; }
    const interval = setInterval(() => setCurrentSlide(prev => (prev + 1) % slideImages.length), 1500);
    return () => clearInterval(interval);
  }, [isHovering, slideImages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      onHoverStart={() => { hoverTimer.current = setTimeout(() => setIsHovering(true), 500); }}
      onHoverEnd={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setIsHovering(false); setCurrentSlide(0); }}
      onClick={onPreview}
      className={cn(
        'group cursor-pointer rounded-xl overflow-hidden transition-all duration-200',
        isSelected
          ? 'ring-2 ring-[#4F46E5] ring-offset-2 ring-offset-white shadow-xl shadow-[#4F46E5]/15 -translate-y-1'
          : 'hover:shadow-lg hover:-translate-y-0.5'
      )}
    >
      <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: tmpl.bgColor }}>
        {/* On hover with slide images: cycle through them; otherwise show static cover */}
        {isHovering && hasSlideImages ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={slideImages[currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        ) : (
          <>
            {tmpl.thumbnailUrl && <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="absolute inset-0 w-full h-full object-cover" />}
            {tmpl.videoUrl && <HlsVideo src={tmpl.videoUrl} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: tmpl.videoOpacity }} />}
          </>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
          <p className="text-[11px] font-medium text-white truncate">{tmpl.name}</p>
        </div>
        {tmpl.type === 'cinematic' && !isSelected && (
          <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-[#9333EA]/80 text-white font-medium flex items-center gap-0.5">
            <Play className="w-2 h-2" />Cinematic
          </span>
        )}
        {!isSelected && (
          <button
            onClick={e => { e.stopPropagation(); onSelect(); }}
            className="absolute top-1.5 right-1.5 px-3 py-1.5 rounded-full bg-white text-slate-900 text-[10px] font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hover:bg-slate-100"
          >
            Use template
          </button>
        )}
        {isHovering && hasSlideImages && (
          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium z-10">
            {currentSlide + 1}/{slideImages.length}
          </span>
        )}
        {isSelected && (
          <div className="absolute inset-0 bg-[#4F46E5]/15 flex items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-10 h-10 rounded-full bg-[#4F46E5] flex items-center justify-center shadow-xl">
              <Check className="w-5 h-5 text-white" />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Preview modal — opened on card click ───
function EntryPreviewModal({ tmpl, isSelected, onSelect, onClose }: {
  tmpl: any; isSelected: boolean; onSelect: () => void; onClose: () => void;
}) {
  const slideImages = tmpl.slideImages || [];
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(c + 1, slideImages.length - 1));
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slideImages.length, onClose]);

  const hasCover = tmpl.thumbnailUrl || tmpl.videoUrl;
  const hasSlides = slideImages.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-3xl mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <div className="absolute -top-12 left-0 text-white/90 text-sm font-medium">
          {tmpl.name}{hasSlides ? ` — Slide ${current + 1} / ${slideImages.length}` : ''}
        </div>

        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900">
          <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: tmpl.bgColor }}>
            {hasSlides ? (
              <AnimatePresence mode="wait">
                <motion.img
                  key={current}
                  src={slideImages[current]}
                  alt={`Slide ${current + 1}`}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="w-full h-full object-contain"
                />
              </AnimatePresence>
            ) : (
              <>
                {tmpl.thumbnailUrl && <img src={tmpl.thumbnailUrl} alt={tmpl.name} className="w-full h-full object-cover" />}
                {tmpl.videoUrl && <HlsVideo src={tmpl.videoUrl} className="w-full h-full object-cover" style={{ opacity: tmpl.videoOpacity }} />}
              </>
            )}

            {hasSlides && current > 0 && (
              <button onClick={() => setCurrent(c => c - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            {hasSlides && current < slideImages.length - 1 && (
              <button onClick={() => setCurrent(c => c + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {hasSlides && slideImages.length > 1 && (
            <div className="flex gap-2 px-4 py-3 bg-slate-900/90 overflow-x-auto justify-center">
              {slideImages.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={cn(
                    'flex-shrink-0 w-16 h-10 rounded-md overflow-hidden border-2 transition-all',
                    current === idx ? 'border-[#4F46E5] shadow-lg scale-105' : 'border-transparent opacity-50 hover:opacity-80'
                  )}
                >
                  <img src={img} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Use template button */}
          <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-t border-white/5">
            <span className="text-white/60 text-sm">{tmpl.name}</span>
            <button
              onClick={onSelect}
              className={cn(
                'px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                isSelected
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white shadow-lg shadow-[#4F46E5]/25 hover:shadow-xl'
              )}
            >
              {isSelected ? (
                <><Check className="w-4 h-4" /> Selected</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Use template</>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
