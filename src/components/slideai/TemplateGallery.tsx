import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight, ArrowLeft, Loader2, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresentationTheme, Slide } from '@/types/presentation';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { CINEMATIC_PRESETS } from '@/lib/cinematic-presets';
import { CinematicPreset } from '@/types/cinematic';
import StepIndicator from './StepIndicator';
import { useNavigate } from 'react-router-dom';

// Unified template type
export interface UnifiedTemplate {
  id: string;
  name: string;
  category: string;
  theme: PresentationTheme;
  slides?: Slide[];
  thumbnailUrl?: string;
  slideImages?: string[]; // PNG thumbnails of each slide from Google Slides
  colors: { primary: string; secondary: string; accent: string; bg: string; text: string };
}

function useDbTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) return [];
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function ThemeCard({ template, isSelected, onSelect }: { template: UnifiedTemplate; isSelected: boolean; onSelect: (t: UnifiedTemplate) => void }) {
  const hasSlides = template.slides && template.slides.length > 0;
  const hasSlideImages = template.slideImages && template.slideImages.length > 0;
  const [isHovering, setIsHovering] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const imageCount = template.slideImages?.length || 0;

  // Auto-cycle slides on hover (use real images if available)
  React.useEffect(() => {
    if (!isHovering || imageCount <= 1) {
      setCurrentSlide(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % imageCount);
    }, 1500);
    return () => clearInterval(interval);
  }, [isHovering, imageCount]);

  return (
    <motion.div
      layout
      whileHover={{ y: -6 }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => { setIsHovering(false); setCurrentSlide(0); }}
      onClick={() => onSelect(template)}
      className={cn(
        'relative group rounded-xl overflow-hidden transition-all duration-300 text-left w-full cursor-pointer',
        isSelected
          ? 'ring-2 ring-[#4F46E5] ring-offset-2 ring-offset-white shadow-xl shadow-[#4F46E5]/20'
          : 'hover:shadow-xl hover:shadow-[#4F46E5]/10'
      )}
    >
      <div className="aspect-video relative overflow-hidden bg-slate-900">
        {/* Cover image by default, cycle real slide PNGs on hover */}
        {isHovering && hasSlideImages ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={template.slideImages![currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
        ) : template.thumbnailUrl ? (
          <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: template.colors.bg }}>
            <div className="w-3/4 h-4 rounded-full" style={{ backgroundColor: template.colors.primary }} />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Slide progress dots on hover */}
        {isHovering && imageCount > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {template.slideImages!.slice(0, Math.min(imageCount, 14)).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  currentSlide === idx ? 'w-4 bg-white' : 'w-1 bg-white/40'
                )}
              />
            ))}
          </div>
        )}

        {!isHovering && (template.slides?.length || imageCount) > 0 && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur text-white text-[10px] font-medium rounded-full">
            {template.slides?.length || imageCount} slides
          </div>
        )}

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#4F46E5] flex items-center justify-center shadow-lg"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>

      <div className="p-3 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-slate-800 text-sm truncate">{template.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{template.category}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {[template.colors.primary, template.colors.secondary].map((color, idx) => (
              <div key={idx} className="w-3 h-3 rounded-full ring-1 ring-slate-300" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface Props {
  onSelect: (theme: PresentationTheme, slides?: Slide[]) => void;
  onSelectCinematic?: (preset: CinematicPreset) => void;
  selectedTheme?: PresentationTheme | null;
}

export default function TemplateGallery({ onSelect, onSelectCinematic, selectedTheme }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'classic' | 'cinematic'>('classic');
  const [selectedTemplate, setSelectedTemplate] = useState<UnifiedTemplate | null>(null);
  const [selectedCinematicPreset, setSelectedCinematicPreset] = useState<CinematicPreset | null>(null);

  const { data: dbTemplates, isLoading: loadingDb } = useDbTemplates();

  const allTemplates = useMemo(() => {
    if (!dbTemplates) return [];
    return dbTemplates.map((t: any): UnifiedTemplate => {
      const colors = t.colors || t.theme?.tokens?.palette || {};
      return {
        id: t.id,
        name: t.name.replace(/ by Slidesgo$/i, ''),
        category: t.category === 'Imported' ? 'All' : t.category,
        theme: t.theme as PresentationTheme,
        slides: t.preview_slides as Slide[],
        thumbnailUrl: t.thumbnail_url,
        slideImages: Array.isArray(t.layouts) && t.layouts.length > 0 && typeof t.layouts[0] === 'string'
          ? t.layouts as string[]
          : undefined,
        colors: {
          primary: colors.primary || '#6366f1',
          secondary: colors.secondary || '#666666',
          accent: colors.accent || '#f59e0b',
          bg: colors.bg || '#ffffff',
          text: colors.text || '#000000',
        },
      };
    });
  }, [dbTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.category));
    return ['All', ...Array.from(cats).filter(c => c !== 'All')];
  }, [allTemplates]);

  const filtered = useMemo(() => {
    return allTemplates.filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeCategory !== 'All' && t.category !== activeCategory) return false;
      return true;
    });
  }, [search, activeCategory, allTemplates]);

  const handleSelect = (template: UnifiedTemplate) => {
    setSelectedTemplate(template);
    setSelectedCinematicPreset(null);
  };

  const handleContinue = () => {
    if (activeTab === 'cinematic' && selectedCinematicPreset) {
      onSelectCinematic?.(selectedCinematicPreset);
      return;
    }
    if (!selectedTemplate) return;
    onSelect(selectedTemplate.theme, selectedTemplate.slides);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen mesh-gradient relative z-10 font-body"
    >
      <div className="sticky top-0 z-30 nav-glass border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <StepIndicator currentStep={1} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-extrabold headline-tight text-slate-900">Pick your template</h1>
            <p className="text-slate-500 text-sm mt-1">Choose a design that fits your story</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('classic'); setSelectedCinematicPreset(null); }}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border',
              activeTab === 'classic'
                ? 'bg-[#4F46E5]/10 border-[#4F46E5]/20 text-[#4F46E5]'
                : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-white/80'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => { setActiveTab('cinematic'); setSelectedTemplate(null); }}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border',
              activeTab === 'cinematic'
                ? 'bg-gradient-to-r from-[#4F46E5]/10 to-[#9333EA]/10 border-[#4F46E5]/20 text-[#4F46E5]'
                : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-white/80'
            )}
          >
            <Play className="w-4 h-4" />
            Cinematic
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white">NEW</span>
          </button>
        </div>

        {activeTab === 'classic' ? (
          <>
            <div className="flex items-center gap-3 mb-6 p-2 glass-effect rounded-xl flex-wrap">
              <div className="relative flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-44 h-8 pl-8 pr-3 bg-white/60 border border-slate-200/60 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]/30"
                />
              </div>
              {categories.length > 2 && (
                <>
                  <div className="w-px h-5 bg-slate-200/60" />
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'h-8 px-3 rounded-md text-xs font-medium transition-all border',
                        activeCategory === cat
                          ? 'bg-[#4F46E5]/10 border-[#4F46E5]/20 text-[#4F46E5]'
                          : 'bg-white/60 border-slate-200/60 text-slate-500 hover:text-slate-700 hover:bg-white/80'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-4">
              {loadingDb && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}
            </p>

            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filtered.map(template => (
                  <ThemeCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={handleSelect}
                  />
                ))}
              </AnimatePresence>
            </motion.div>

            {filtered.length === 0 && !loadingDb && (
              <div className="text-center py-16">
                <p className="text-slate-500">No templates found</p>
              </div>
            )}
            {loadingDb && filtered.length === 0 && (
              <div className="text-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-[#4F46E5] mx-auto mb-3" />
                <p className="text-slate-400">Loading templates...</p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">
              Modern, animated presentations with cinematic text reveals. Perfect for pitches, keynotes, and storytelling.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {CINEMATIC_PRESETS.map(preset => (
                <motion.div
                  key={preset.id}
                  whileHover={{ y: -6 }}
                  onClick={() => { setSelectedCinematicPreset(preset); setSelectedTemplate(null); }}
                  className={cn(
                    'relative group rounded-xl overflow-hidden cursor-pointer transition-all',
                    selectedCinematicPreset?.id === preset.id
                      ? 'ring-2 ring-[#4F46E5] ring-offset-2 ring-offset-white'
                      : 'hover:ring-1 hover:ring-slate-300'
                  )}
                >
                  <div className="aspect-video relative overflow-hidden" style={{ backgroundColor: preset.backgroundColor }}>
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      <div className="w-px h-8 mb-3" style={{ backgroundColor: preset.accentColor }} />
                      <div className="text-2xl font-bold leading-tight mb-2" style={{ color: preset.primaryTextColor, fontFamily: `'${preset.fontHeading}', sans-serif` }}>
                        {preset.name}
                      </div>
                      <div className="text-xs" style={{ color: preset.secondaryTextColor }}>{preset.description}</div>
                    </div>
                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 blur-3xl" style={{ background: `radial-gradient(circle at top right, ${preset.accentColor}, transparent)` }} />
                    {selectedCinematicPreset?.id === preset.id && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#4F46E5] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div className="p-3 bg-white/80 backdrop-blur-sm flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-800">{preset.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{preset.fontHeading} / {preset.fontBody}</p>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accentColor }} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <AnimatePresence>
        {(selectedTemplate || selectedCinematicPreset) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 nav-glass border-t border-slate-200/60 py-4 px-6 z-40"
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedCinematicPreset ? (
                  <>
                    <div className="w-16 h-9 rounded-lg ring-2 ring-[#4F46E5] flex items-center justify-center" style={{ backgroundColor: selectedCinematicPreset.backgroundColor }}>
                      <Play className="w-5 h-5" style={{ color: selectedCinematicPreset.accentColor }} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{selectedCinematicPreset.name}</p>
                      <p className="text-xs text-slate-500">Cinematic presentation</p>
                    </div>
                  </>
                ) : selectedTemplate ? (
                  <>
                    <div className="w-16 h-9 rounded-lg ring-2 ring-[#4F46E5] overflow-hidden" style={{ backgroundColor: selectedTemplate.colors.bg }}>
                      {selectedTemplate.slides?.[0]?.background?.type === 'image' && (
                        <img src={selectedTemplate.slides[0].background.value} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{selectedTemplate.name}</p>
                      <p className="text-xs text-slate-400">
                        {selectedTemplate.slides ? `${selectedTemplate.slides.length} slides` : 'Template'}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinue}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white font-medium shadow-xl shadow-[#4F46E5]/25 flex items-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
