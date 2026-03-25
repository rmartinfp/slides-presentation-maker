import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/stores/editor-store';
import SlideCanvas from '@/components/editor/SlideCanvas';
import SlideList from '@/components/editor/SlideList';
import CinematicPresentation from '@/components/cinematic/CinematicPresentation';
import { getPresetById } from '@/lib/cinematic-presets';
import { loadGoogleFont } from '@/lib/font-loader';
import { supabase } from '@/lib/supabase';
import { Presentation, Slide, SlideElement } from '@/types/presentation';
import { CinematicPreset } from '@/types/cinematic';
import { toast } from 'sonner';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import {
  ArrowLeft, Plus, Play, Search, Loader2, Upload, Eye, Type, Video,
  Palette, ChevronDown, Trash2, Copy, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ─── Popular curated fonts for quick access ───
const CURATED_FONTS = [
  // Sans-serif modern
  'Inter', 'Instrument Sans', 'Geist Sans', 'General Sans', 'Outfit', 'Sora',
  'Space Grotesk', 'DM Sans', 'Poppins', 'Barlow', 'Rubik', 'Manrope',
  'Plus Jakarta Sans', 'Satoshi', 'Cabinet Grotesk', 'Fustat',
  // Serif elegant
  'Instrument Serif', 'Playfair Display', 'Source Serif 4', 'Fraunces',
  'Cormorant Garamond', 'Lora', 'Crimson Pro', 'Libre Baskerville',
  // Display
  'Clash Display', 'Archivo Black', 'Anton', 'Bebas Neue',
  // Mono
  'JetBrains Mono', 'Fira Code', 'Space Mono',
];

function createBlankSlide(): Slide {
  return {
    id: crypto.randomUUID(),
    elements: [],
    background: { type: 'solid', value: '#000000' },
  };
}

function createBlankPresentation(): Presentation {
  return {
    id: crypto.randomUUID(),
    title: 'New Template',
    slides: Array.from({ length: 5 }, createBlankSlide),
    theme: {
      id: 'custom', name: 'Custom', category: 'Cinematic',
      tokens: {
        palette: { primary: '#FFFFFF', secondary: '#80838e', accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF' },
        typography: { titleFont: 'Inter', bodyFont: 'Inter', titleSize: 56, bodySize: 17 },
        radii: '0px', shadows: 'none',
      },
      previewColors: ['#FFFFFF', '#80838e', '#000000'],
    },
    templateType: 'cinematic',
    cinematicPresetId: 'midnight',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Font Picker Panel ───
function FontPicker({ onSelect }: { onSelect: (font: string) => void }) {
  const [search, setSearch] = useState('');
  const [customFont, setCustomFont] = useState('');
  const [loadedPreviews, setLoadedPreviews] = useState<Set<string>>(new Set());

  const filtered = CURATED_FONTS.filter(f =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  const handleLoadPreview = (font: string) => {
    if (!loadedPreviews.has(font)) {
      loadGoogleFont(font);
      setLoadedPreviews(prev => new Set([...prev, font]));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-200/60">
        <p className="text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Google Fonts</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search fonts..."
            className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map(font => (
          <button
            key={font}
            onClick={() => { handleLoadPreview(font); onSelect(font); }}
            onMouseEnter={() => handleLoadPreview(font)}
            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors group"
          >
            <span
              className="text-sm text-slate-800 block truncate"
              style={{ fontFamily: loadedPreviews.has(font) ? `'${font}', sans-serif` : 'inherit' }}
            >
              {font}
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-500">
              {font.includes('Serif') || font.includes('Cormorant') || font.includes('Lora') || font.includes('Baskerville') || font.includes('Fraunces') ? 'Serif' : font.includes('Mono') || font.includes('Code') ? 'Mono' : 'Sans-serif'}
            </span>
          </button>
        ))}
      </div>

      {/* Custom font input */}
      <div className="p-3 border-t border-slate-200/60">
        <p className="text-[10px] text-slate-500 mb-1">Custom Google Font</p>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customFont}
            onChange={e => setCustomFont(e.target.value)}
            placeholder="Font name..."
            className="flex-1 h-7 px-2 bg-white border border-slate-200 rounded text-xs"
            onKeyDown={e => {
              if (e.key === 'Enter' && customFont.trim()) {
                loadGoogleFont(customFont.trim());
                onSelect(customFont.trim());
                setCustomFont('');
              }
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={() => {
              if (customFont.trim()) {
                loadGoogleFont(customFont.trim());
                onSelect(customFont.trim());
                setCustomFont('');
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Background Panel ───
function VideoPanel({ slide, onUpdate }: { slide: Slide; onUpdate: (vb: Slide['videoBackground']) => void }) {
  const [url, setUrl] = useState(slide.videoBackground?.url || '');
  const [opacity, setOpacity] = useState(slide.videoBackground?.opacity ?? 1);
  const [filter, setFilter] = useState(slide.videoBackground?.filter || '');

  const apply = () => {
    if (!url.trim()) { onUpdate(undefined); return; }
    onUpdate({
      url: url.trim(),
      type: url.includes('.m3u8') ? 'hls' : 'mp4',
      opacity,
      filter: filter || undefined,
    });
    toast.success('Video background updated');
  };

  return (
    <div className="p-3 space-y-3">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Video Background</p>

      <div>
        <label className="text-[10px] text-slate-500 mb-0.5 block">Video URL (MP4 or HLS)</label>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://... .mp4 or .m3u8"
          className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs"
        />
      </div>

      <div>
        <label className="text-[10px] text-slate-500 mb-0.5 block">Opacity: {(opacity * 100).toFixed(0)}%</label>
        <input
          type="range" min="0" max="1" step="0.05"
          value={opacity}
          onChange={e => setOpacity(parseFloat(e.target.value))}
          className="w-full h-1.5 accent-[#4F46E5]"
        />
      </div>

      <div>
        <label className="text-[10px] text-slate-500 mb-0.5 block">CSS Filter (optional)</label>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="e.g. brightness(0.7) saturate(0.9)"
          className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs"
        />
      </div>

      <Button size="sm" onClick={apply} className="w-full bg-[#4F46E5] text-white text-xs">
        Apply Video
      </Button>

      {slide.videoBackground && (
        <Button size="sm" variant="ghost" onClick={() => { setUrl(''); onUpdate(undefined); }} className="w-full text-xs text-red-500">
          Remove Video
        </Button>
      )}
    </div>
  );
}

// ─── Save Template Panel ───
function SavePanel({ presentation }: { presentation: Presentation }) {
  const [name, setName] = useState(presentation.title || '');
  const [category, setCategory] = useState('SaaS / Tech');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const CATS = ['SaaS / Tech', 'Investor Deck', 'Agency / Creative', 'AI / Product', 'Newsletter / Content', 'Corporate', 'Bold / Brutalist', 'Light / Clean'];

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const theme = { ...presentation.theme, name: name.trim(), category: 'Cinematic' };
      const slides = presentation.slides.map(s => ({
        id: s.id, elements: s.elements, background: s.background,
        videoBackground: s.videoBackground, animationConfig: s.animationConfig,
      }));

      const { error } = await supabase.from('cinematic_templates').insert({
        name: name.trim(), slug, category,
        description: `${name} — ${slides.length} slides cinematic template.`,
        preset_id: presentation.cinematicPresetId || 'midnight',
        slides, theme,
        tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        is_active: true, sort_order: 99,
      });
      if (error) throw error;
      toast.success(`"${name}" published to Cinematic gallery!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-3 space-y-3">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Publish Template</p>
      <div>
        <label className="text-[10px] text-slate-500 mb-0.5 block">Name *</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Template name..." className="h-8 text-xs" />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 mb-1 block">Category</label>
        <div className="flex flex-wrap gap-1">
          {CATS.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn('px-2 py-1 rounded-full text-[10px] transition-all', category === c ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] text-slate-500 mb-0.5 block">Tags (comma-separated)</label>
        <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="dark, serif, minimal..." className="h-8 text-xs" />
      </div>
      <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white text-xs">
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
        {saving ? 'Publishing...' : 'Publish Template'}
      </Button>
    </div>
  );
}

// ─── Slide Background Color ───
function BgColorPanel({ slide, onChange }: { slide: Slide; onChange: (bg: Slide['background']) => void }) {
  const presets = ['#000000', '#0a0512', '#0a1628', '#111111', '#131318', '#21346e', '#FFFFFF', '#f5f5f5'];
  const [custom, setCustom] = useState(slide.background?.value || '#000000');

  return (
    <div className="p-3 space-y-2">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Slide Background</p>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(c => (
          <button key={c} onClick={() => { setCustom(c); onChange({ type: 'solid', value: c }); }}
            className={cn('w-7 h-7 rounded-lg border-2 transition-all', slide.background?.value === c ? 'border-[#4F46E5] scale-110' : 'border-slate-200')}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-1.5 items-center">
        <input type="color" value={custom} onChange={e => { setCustom(e.target.value); onChange({ type: 'solid', value: e.target.value }); }} className="w-7 h-7 rounded cursor-pointer" />
        <input type="text" value={custom} onChange={e => { setCustom(e.target.value); onChange({ type: 'solid', value: e.target.value }); }}
          className="flex-1 h-7 px-2 bg-white border border-slate-200 rounded text-xs font-mono" />
      </div>
    </div>
  );
}

// ═══════════════════════════════
// MAIN TEMPLATE STUDIO PAGE
// ═══════════════════════════════

export default function TemplateStudio() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<'fonts' | 'video' | 'bg' | 'save'>('fonts');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const {
    presentation, activeSlideIndex, selectedElementIds,
    setPresentation, setActiveSlideIndex, addSlide, deleteSlide, duplicateSlide,
    updateElement, addElement, clearSelection, reorderSlides, scale, setScale,
  } = useEditorStore();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const activeSlide = presentation.slides[activeSlideIndex];
  const selectedElements = activeSlide?.elements?.filter(e => selectedElementIds.includes(e.id)) ?? [];

  // Initialize with blank template
  useEffect(() => {
    const stored = sessionStorage.getItem('templateStudioPresentation');
    if (stored) {
      try { setPresentation(JSON.parse(stored)); return; } catch {}
    }
    setPresentation(createBlankPresentation());
  }, []);

  // Auto-save to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('templateStudioPresentation', JSON.stringify(presentation));
  }, [presentation]);

  // Auto-fit canvas
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const s = Math.min(w / 1920, h / 1080, 1) * 0.88;
      setScale(s);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [setScale]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    reorderSlides(result.source.index, result.destination.index);
  };

  const handleFontSelect = (font: string) => {
    loadGoogleFont(font);
    // Apply to selected text elements
    if (selectedElements.length > 0) {
      for (const el of selectedElements) {
        if (el.type === 'text') {
          updateElement(el.id, { style: { ...el.style, fontFamily: font } });
        }
      }
      toast.success(`Applied "${font}" to ${selectedElements.length} element(s)`);
    } else {
      toast.info(`Font "${font}" loaded. Select text elements to apply.`);
    }
  };

  const handleUpdateVideoBackground = (vb: Slide['videoBackground']) => {
    const slides = [...presentation.slides];
    slides[activeSlideIndex] = { ...slides[activeSlideIndex], videoBackground: vb };
    setPresentation({ ...presentation, slides });
  };

  const handleUpdateBackground = (bg: Slide['background']) => {
    const slides = [...presentation.slides];
    slides[activeSlideIndex] = { ...slides[activeSlideIndex], background: bg };
    setPresentation({ ...presentation, slides });
  };

  const preset = getPresetById(presentation.cinematicPresetId || 'midnight');

  return (
    <>
      {/* Cinematic Preview */}
      {isPreviewing && preset && (
        <CinematicPresentation
          slides={presentation.slides}
          preset={preset}
          presentationTitle={presentation.title}
          onExit={() => setIsPreviewing(false)}
        />
      )}

      <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
        {/* Top bar */}
        <div className="h-11 flex items-center justify-between px-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-1.5 h-1.5 rounded-full bg-[#9333EA]" />
            <span className="text-sm font-semibold text-slate-700">Template Studio</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">BACKEND</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsPreviewing(true)} className="h-8 gap-1.5 text-xs">
              <Eye className="w-3.5 h-3.5" />Preview Cinematic
            </Button>
            <Button size="sm" onClick={() => setActivePanel('save')} className="h-8 gap-1.5 text-xs bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white">
              <Upload className="w-3.5 h-3.5" />Publish
            </Button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Slide list */}
          <div className="w-32 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="p-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{presentation.slides.length} slides</span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-[#4F46E5] px-1.5" onClick={() => addSlide(createBlankSlide(), activeSlideIndex + 1)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="studio-slides">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto px-2 pb-2">
                    <SlideList />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Canvas */}
          <div ref={canvasContainerRef} className="flex-1 flex items-center justify-center bg-slate-100 overflow-hidden">
            <SlideCanvas />
          </div>

          {/* Right panel — Tools */}
          <div className="w-64 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            {/* Panel tabs */}
            <div className="flex border-b border-slate-200 shrink-0">
              {[
                { id: 'fonts' as const, icon: Type, label: 'Fonts' },
                { id: 'video' as const, icon: Video, label: 'Video' },
                { id: 'bg' as const, icon: Palette, label: 'BG' },
                { id: 'save' as const, icon: Upload, label: 'Save' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors border-b-2',
                    activePanel === tab.id
                      ? 'text-[#4F46E5] border-[#4F46E5]'
                      : 'text-slate-400 border-transparent hover:text-slate-600'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto">
              {activePanel === 'fonts' && <FontPicker onSelect={handleFontSelect} />}
              {activePanel === 'video' && activeSlide && <VideoPanel slide={activeSlide} onUpdate={handleUpdateVideoBackground} />}
              {activePanel === 'bg' && activeSlide && <BgColorPanel slide={activeSlide} onChange={handleUpdateBackground} />}
              {activePanel === 'save' && <SavePanel presentation={presentation} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
