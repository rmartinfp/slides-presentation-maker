import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Play, Check, User, Search, Paperclip, Mic, MicOff, X, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import HlsVideo from '@/components/ui/HlsVideo';
import { cn } from '@/lib/utils';
import { getPresetById } from '@/lib/cinematic-presets';
import { toast } from 'sonner';

export default function Entry() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'classic' | 'cinematic' | null>(null);
  const [filter, setFilter] = useState<'all' | 'classic' | 'cinematic'>('all');
  const [search, setSearch] = useState('');
  const [slideCount, setSlideCount] = useState(8);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Smart filter: uses search box + prompt keywords to match templates
  const allTemplates = React.useMemo(() => {
    const promptWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const searchWords = search.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const allWords = [...searchWords, ...promptWords];

    return allTemplatesRaw.filter(t => {
      if (filter === 'cinematic' && t.type !== 'cinematic') return false;
      if (filter === 'classic' && t.type !== 'classic') return false;

      // If no search terms, show all
      if (allWords.length === 0) return true;

      // Match against name + category + tags
      const haystack = `${t.name} ${t.category} ${t.tags}`.toLowerCase();
      // Show template if ANY word matches (loose matching)
      return allWords.some(w => haystack.includes(w));
    });
  }, [allTemplatesRaw, filter, search, prompt]);

  const handleGenerate = () => {
    sessionStorage.setItem('entryPrompt', prompt);
    sessionStorage.setItem('entrySlideCount', String(slideCount));
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
            Describe it. We design it.
          </h1>
          <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm focus-within:ring-2 focus-within:ring-[#4F46E5]/20 focus-within:border-[#4F46E5]/30">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe your presentation... e.g. 'A pitch deck for our AI startup, focusing on market opportunity, product features, and team'"
              rows={3}
              className="w-full px-5 pt-4 pb-2 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none resize-none"
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

              {/* Voice input */}
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
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                )}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Slide count */}
              <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/60">
                <button onClick={() => setSlideCount(c => Math.max(3, c - 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 text-slate-500">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-medium text-slate-700 w-14 text-center">{slideCount} slides</span>
                <button onClick={() => setSlideCount(c => Math.min(20, c + 1))} className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-200 text-slate-500">
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1" />

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
