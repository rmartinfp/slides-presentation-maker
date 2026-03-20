import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight, ArrowLeft, Loader2, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresentationTheme, Slide } from '@/types/presentation';
import { TEMPLATE_REGISTRY, templateToTheme, getAllCategories, TemplateDefinition } from '@/lib/template-registry';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { CINEMATIC_PRESETS } from '@/lib/cinematic-presets';
import { CinematicPreset } from '@/types/cinematic';
import StepIndicator from './StepIndicator';
import { useNavigate } from 'react-router-dom';

// Unified template type for both hardcoded and DB templates
export interface UnifiedTemplate {
  id: string;
  name: string;
  category: string;
  coverImage: string;
  slideImages: string[];
  theme: PresentationTheme;
  // DB templates have real slides with elements
  slides?: Slide[];
  source: 'registry' | 'db';
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
      if (error) {
        console.warn('Failed to load DB templates:', error.message);
        return [];
      }
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function ThemeCard({ template, isSelected, onSelect }: { template: UnifiedTemplate; isSelected: boolean; onSelect: (t: UnifiedTemplate) => void }) {
  const [isHovering, setIsHovering] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  React.useEffect(() => {
    if (!isHovering || template.slideImages.length === 0) {
      setCurrentSlide(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % (template.slideImages.length + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isHovering, template.slideImages.length]);

  const displayImage = currentSlide === 0 ? template.coverImage : template.slideImages[currentSlide - 1];
  const hasImages = template.coverImage !== '';
  const hasSlides = template.slides && template.slides.length > 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -6 }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      onClick={() => onSelect(template)}
      className={cn(
        'relative group rounded-xl overflow-hidden transition-all duration-300 text-left w-full cursor-pointer',
        isSelected
          ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#0a0a0c] shadow-xl shadow-purple-500/25'
          : 'hover:shadow-xl hover:shadow-purple-500/10'
      )}
    >
      <div className="aspect-video relative overflow-hidden bg-slate-900">
        {hasImages ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={displayImage}
              src={displayImage}
              alt={template.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
        ) : hasSlides ? (
          // Render mini preview of first slide elements
          <div
            className="w-full h-full relative"
            style={{
              backgroundColor:
                template.slides![0]?.background?.type === 'solid'
                  ? template.slides![0].background.value
                  : template.colors.bg,
            }}
          >
            {template.slides![0]?.elements?.slice(0, 8).map((el) => {
              const s = 280 / 1920; // thumbnail scale
              return (
                <div
                  key={el.id}
                  className="absolute overflow-hidden"
                  style={{
                    left: el.x * s,
                    top: el.y * s,
                    width: el.width * s,
                    height: el.height * s,
                    fontSize: `${(el.style.fontSize ?? 16) * s}px`,
                    fontFamily: el.style.fontFamily,
                    fontWeight: el.style.fontWeight as React.CSSProperties['fontWeight'],
                    color: el.style.color,
                    opacity: el.opacity,
                  }}
                >
                  {el.type === 'text' && (
                    <span className="line-clamp-2 leading-tight">
                      {el.content.replace(/<[^>]+>/g, '')}
                    </span>
                  )}
                  {el.type === 'image' && (
                    <img src={el.content} alt="" className="w-full h-full object-cover" />
                  )}
                  {el.type === 'shape' && (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundColor: el.style.shapeFill || el.style.backgroundColor,
                        borderRadius: el.style.borderRadius,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3 p-6"
            style={{ backgroundColor: template.colors.bg }}
          >
            <div className="w-3/4 h-4 rounded-full" style={{ backgroundColor: template.colors.primary }} />
            <div className="w-1/2 h-3 rounded-full opacity-60" style={{ backgroundColor: template.colors.secondary }} />
            <div className="flex gap-2 mt-2">
              {[template.colors.primary, template.colors.secondary, template.colors.accent, template.colors.bg].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full ring-1 ring-white/20" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {isHovering && hasImages && template.slideImages.length > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {[template.coverImage, ...template.slideImages].slice(0, 4).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  'h-1 rounded-full transition-all',
                  currentSlide === idx ? 'w-4 bg-white' : 'w-1 bg-white/50'
                )}
              />
            ))}
          </div>
        )}

        {/* Badge for DB templates with real slides */}
        {hasSlides && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-medium rounded-full">
            {template.slides!.length} slides
          </div>
        )}

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shadow-lg"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>

      <div className="p-3 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-white text-sm truncate">{template.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{template.category}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {[template.colors.primary, template.colors.secondary].map((color, idx) => (
              <div key={idx} className="w-3 h-3 rounded-full ring-1 ring-white/20" style={{ backgroundColor: color }} />
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

  // Merge hardcoded + DB templates into unified list
  const allTemplates = useMemo(() => {
    const unified: UnifiedTemplate[] = [];

    // DB templates first (they have real slides)
    if (dbTemplates) {
      for (const t of dbTemplates) {
        const colors = t.colors || t.theme?.tokens?.palette || {};
        unified.push({
          id: t.id,
          name: t.name,
          category: t.category || 'Imported',
          coverImage: t.thumbnail_url || '',
          slideImages: [],
          theme: t.theme as PresentationTheme,
          slides: t.preview_slides as Slide[],
          source: 'db',
          colors: {
            primary: colors.primary || '#6366f1',
            secondary: colors.secondary || '#666666',
            accent: colors.accent || '#f59e0b',
            bg: colors.bg || '#ffffff',
            text: colors.text || '#000000',
          },
        });
      }
    }

    // Hardcoded templates
    for (const t of TEMPLATE_REGISTRY) {
      unified.push({
        id: t.id,
        name: t.name,
        category: t.category,
        coverImage: t.coverImage,
        slideImages: t.slideImages,
        theme: templateToTheme(t),
        source: 'registry',
        colors: t.colors,
      });
    }

    return unified;
  }, [dbTemplates]);

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.category));
    return ['All', ...cats];
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
      className="min-h-screen relative z-10"
    >
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-64 md:w-96 h-64 md:h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-64 md:w-96 h-64 md:h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header with step indicator */}
      <div className="sticky top-0 z-30 bg-[#030305]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <StepIndicator currentStep={1} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back + Title */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Pick your template</h1>
            <p className="text-slate-400 text-sm mt-1">Choose a design that fits your story</p>
          </div>
        </div>

        {/* Mode tabs: Classic / Cinematic */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveTab('classic'); setSelectedCinematicPreset(null); }}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border',
              activeTab === 'classic'
                ? 'bg-purple-500/15 border-purple-500/30 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Classic Templates
          </button>
          <button
            onClick={() => { setActiveTab('cinematic'); setSelectedTemplate(null); }}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border',
              activeTab === 'cinematic'
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            )}
          >
            <Play className="w-4 h-4" />
            Cinematic
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">NEW</span>
          </button>
        </div>

        {activeTab === 'classic' ? (
          <>
            {/* Filter Toolbar */}
            <div className="flex items-center gap-3 mb-6 p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl flex-wrap">
              <div className="relative flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-44 h-8 pl-8 pr-3 bg-white/5 border border-white/10 rounded-md text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/40"
                />
              </div>
              <div className="w-px h-5 bg-white/10" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'h-8 px-3 flex items-center gap-2 rounded-md text-xs font-medium transition-all border',
                    activeCategory === cat
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                      : 'bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500 mb-4">
              {loadingDb && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* Classic Template Grid */}
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

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400">No templates found</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Cinematic Presets */}
            <p className="text-slate-400 text-sm mb-6">
              Modern, animated presentations with video backgrounds and cinematic text reveals. Perfect for pitches, keynotes, and storytelling.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {CINEMATIC_PRESETS.map(preset => (
                <motion.div
                  key={preset.id}
                  whileHover={{ y: -6 }}
                  onClick={() => setSelectedCinematicPreset(preset)}
                  className={cn(
                    'relative group rounded-xl overflow-hidden cursor-pointer transition-all',
                    selectedCinematicPreset?.id === preset.id
                      ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#0a0a0c]'
                      : 'hover:ring-1 hover:ring-white/20'
                  )}
                >
                  {/* Preview */}
                  <div
                    className="aspect-video relative overflow-hidden"
                    style={{ backgroundColor: preset.backgroundColor }}
                  >
                    {/* Simulated slide content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      <div className="w-px h-8 mb-3" style={{ backgroundColor: preset.accentColor }} />
                      <div
                        className="text-2xl font-bold leading-tight mb-2"
                        style={{ color: preset.primaryTextColor, fontFamily: `'${preset.fontHeading}', sans-serif` }}
                      >
                        {preset.name}
                      </div>
                      <div className="text-xs" style={{ color: preset.secondaryTextColor }}>
                        {preset.description}
                      </div>
                    </div>

                    {/* Accent gradient overlay */}
                    <div
                      className="absolute top-0 right-0 w-1/2 h-full opacity-20 blur-3xl"
                      style={{ background: `radial-gradient(circle at top right, ${preset.accentColor}, transparent)` }}
                    />

                    {/* Selected check */}
                    {selectedCinematicPreset?.id === preset.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Info bar */}
                  <div className="p-3 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white">{preset.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{preset.fontHeading} / {preset.fontBody}</p>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accentColor }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primaryTextColor, opacity: 0.6 }} />
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
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/10 py-4 px-6 z-40"
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedCinematicPreset ? (
                  <>
                    <div
                      className="w-16 h-9 rounded-lg ring-2 ring-purple-500 flex items-center justify-center"
                      style={{ backgroundColor: selectedCinematicPreset.backgroundColor }}
                    >
                      <Play className="w-5 h-5" style={{ color: selectedCinematicPreset.accentColor }} />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{selectedCinematicPreset.name}</p>
                      <p className="text-xs text-slate-400">Cinematic presentation with animations</p>
                    </div>
                  </>
                ) : selectedTemplate ? (
                  <>
                    {selectedTemplate.coverImage ? (
                      <img src={selectedTemplate.coverImage} alt={selectedTemplate.name} className="w-16 h-9 rounded-lg ring-2 ring-purple-500 object-cover" />
                    ) : (
                      <div className="w-16 h-9 rounded-lg ring-2 ring-purple-500 flex items-center justify-center" style={{ backgroundColor: selectedTemplate.colors.bg }}>
                        <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: selectedTemplate.colors.primary }} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white text-sm">{selectedTemplate.name}</p>
                      <p className="text-xs text-slate-400">
                        {selectedTemplate.slides ? `${selectedTemplate.slides.length} slides — Use as template` : 'AI will generate slides'}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinue}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg shadow-purple-500/25 flex items-center gap-2"
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
