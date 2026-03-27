import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Loader2, Check, Paintbrush, Upload, Image, Save, RotateCcw, ChevronDown, Search, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { useAssetUpload } from '@/hooks/useAssetUpload';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { produce } from 'immer';
import { PresentationTheme } from '@/types/presentation';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

interface BrandKit {
  brandName: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
  };
  typography: {
    titleFont: string;
    bodyFont: string;
    titleSize: number;
    bodySize: number;
  };
  radii: string;
  shadows: string;
  mood: string;
  recommendations: string[];
}

const BRAND_KIT_KEY = 'slideai-brand-kit';

const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Nunito', 'Playfair Display', 'Merriweather', 'Source Sans 3', 'PT Sans',
  'Oswald', 'Quicksand', 'Mulish', 'Work Sans', 'Rubik', 'Karla', 'Barlow',
  'DM Sans', 'Outfit', 'Space Grotesk', 'Plus Jakarta Sans', 'Figtree',
  'Bricolage Grotesque', 'Sora', 'Manrope', 'Lexend', 'Gabarito',
  'Josefin Sans', 'Bebas Neue', 'Archivo', 'Bitter', 'Crimson Text',
  'EB Garamond', 'Libre Baskerville', 'Cormorant Garamond', 'Lora',
  'Spectral', 'Noto Serif', 'Vidaloka', 'Elsie', 'Concert One',
  'Permanent Marker', 'Pacifico', 'Dancing Script', 'Caveat', 'Satisfy',
  'Sacramento', 'Great Vibes',
];

function loadGoogleFont(fontName: string) {
  const id = `gfont-${fontName.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

// Preload all popular fonts for preview rendering
let _fontsPreloaded = false;
function preloadPopularFonts() {
  if (_fontsPreloaded) return;
  _fontsPreloaded = true;
  // Load in batches to avoid too many parallel requests
  const families = POPULAR_FONTS.map(f => `family=${encodeURIComponent(f)}:wght@400;700`).join('&');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

const paletteLabels: { key: keyof BrandKit['palette']; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'bg', label: 'Background' },
  { key: 'text', label: 'Text' },
];

export default function BrandKitDialog({ onClose }: Props) {
  const presentation = useEditorStore((s) => s.presentation);
  const setTheme = useEditorStore((s) => s.setTheme);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);
  const [savedKit, setSavedKit] = useState(false);
  const [activeFontPicker, setActiveFontPicker] = useState<'title' | 'body' | null>(null);

  useEffect(() => {
    // Check localStorage first
    const saved = localStorage.getItem(BRAND_KIT_KEY);
    if (saved) {
      try {
        setBrandKit(JSON.parse(saved));
        setLoading(false);
        setSavedKit(true);
        return;
      } catch { /* fall through to extract */ }
    }

    // Only extract if no saved kit — send only style data, not full slide content
    const extract = async () => {
      try {
        const lightSlides = presentation.slides.map(s => ({
          background: s.background,
          elements: (s.elements || []).map(el => ({
            type: el.type,
            style: el.type === 'text' ? {
              fontFamily: el.style?.fontFamily,
              fontSize: el.style?.fontSize,
              color: el.style?.color,
              backgroundColor: el.style?.backgroundColor,
              shapeFill: el.style?.shapeFill,
            } : {
              backgroundColor: el.style?.backgroundColor,
              shapeFill: el.style?.shapeFill,
            },
          })),
        }));
        const { data, error } = await supabase.functions.invoke('extract-brand', {
          body: {
            slides: lightSlides,
            currentTheme: presentation.theme.tokens,
          },
        });
        if (error) throw error;
        setBrandKit(data as BrandKit);
      } catch (err) {
        console.error(err);
        toast.error('Failed to extract brand kit');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    extract();
  }, []);

  // Preload popular fonts when dialog opens with brand kit
  useEffect(() => {
    if (brandKit) preloadPopularFonts();
  }, [brandKit]);

  const handleSave = () => {
    if (!brandKit) return;
    localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(brandKit));
    setSavedKit(true);
    toast.success('Brand kit saved!');
  };

  const handleReset = async () => {
    localStorage.removeItem(BRAND_KIT_KEY);
    setSavedKit(false);
    setLoading(true);
    setBrandKit(null);
    try {
      const lightSlides = presentation.slides.map(s => ({
        background: s.background,
        elements: (s.elements || []).map(el => ({
          type: el.type,
          style: el.type === 'text' ? {
            fontFamily: el.style?.fontFamily,
            fontSize: el.style?.fontSize,
            color: el.style?.color,
            backgroundColor: el.style?.backgroundColor,
            shapeFill: el.style?.shapeFill,
          } : {
            backgroundColor: el.style?.backgroundColor,
            shapeFill: el.style?.shapeFill,
          },
        })),
      }));
      const { data, error } = await supabase.functions.invoke('extract-brand', {
        body: {
          slides: lightSlides,
          currentTheme: presentation.theme.tokens,
        },
      });
      if (error) throw error;
      setBrandKit(data as BrandKit);
    } catch (err) {
      console.error(err);
      toast.error('Failed to extract brand kit');
    } finally {
      setLoading(false);
    }
  };

  const applyFontToPresentation = useCallback((fontName: string, isTitle: boolean) => {
    loadGoogleFont(fontName);
    useEditorStore.setState(produce((state: any) => {
      for (const slide of state.presentation.slides) {
        for (const el of slide.elements) {
          if (el.type !== 'text') continue;
          const fontSize = el.style?.fontSize || 12;
          if (isTitle && fontSize >= 24) {
            el.style.fontFamily = `${fontName}, sans-serif`;
          } else if (!isTitle && fontSize < 24) {
            el.style.fontFamily = `${fontName}, sans-serif`;
          }
        }
      }
    }));
  }, []);

  const handleFontSelect = useCallback((fontName: string, isTitle: boolean) => {
    applyFontToPresentation(fontName, isTitle);
    setBrandKit(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        typography: {
          ...prev.typography,
          [isTitle ? 'titleFont' : 'bodyFont']: fontName,
        },
      };
    });
    setActiveFontPicker(null);
    toast.success(`${isTitle ? 'Title' : 'Body'} font changed to ${fontName}`);
  }, [applyFontToPresentation]);

  const handleApply = () => {
    if (!brandKit) return;

    const theme: PresentationTheme = {
      id: 'custom-brand',
      name: brandKit.brandName,
      category: 'Custom',
      tokens: {
        palette: brandKit.palette,
        typography: brandKit.typography,
        radii: brandKit.style?.radii || '16px',
        shadows: brandKit.style?.shadows || 'lg',
      },
      previewColors: [
        brandKit.palette.primary,
        brandKit.palette.secondary,
        brandKit.palette.accent,
      ],
    };

    const oldPalette = presentation.theme.tokens.palette;
    const newPalette = brandKit.palette;
    const colorMap = new Map<string, string>();
    for (const key of ['primary', 'secondary', 'accent', 'bg', 'text'] as const) {
      const oldColor = (oldPalette[key] || '').toLowerCase();
      const newColor = newPalette[key];
      if (oldColor && newColor && oldColor !== newColor.toLowerCase()) {
        colorMap.set(oldColor, newColor);
      }
    }

    useEditorStore.getState().pushSnapshot();

    useEditorStore.setState(produce((state: any) => {
      if (colorMap.size > 0) {
        for (const slide of state.presentation.slides) {
          if (slide.background?.type === 'solid') {
            const val = (slide.background.value || '').toLowerCase();
            if (colorMap.has(val)) slide.background.value = colorMap.get(val);
          }
          for (const el of slide.elements) {
            if (el.type === 'text' && el.style?.color) {
              const c = el.style.color.toLowerCase();
              if (colorMap.has(c)) el.style.color = colorMap.get(c);
            }
            if (el.style?.backgroundColor) {
              const c = el.style.backgroundColor.toLowerCase();
              if (colorMap.has(c)) el.style.backgroundColor = colorMap.get(c);
            }
            if (el.style?.shapeFill) {
              const c = el.style.shapeFill.toLowerCase();
              if (colorMap.has(c)) el.style.shapeFill = colorMap.get(c);
            }
            if (el.style?.shapeStroke) {
              const c = el.style.shapeStroke.toLowerCase();
              if (colorMap.has(c)) el.style.shapeStroke = colorMap.get(c);
            }
          }
        }
      }
      state.presentation.theme = theme;
      state.presentation.updatedAt = new Date().toISOString();
    }));

    setApplied(true);
    toast.success('Brand theme applied!');
    setTimeout(onClose, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">Brand Kit</h3>
                {savedKit && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-[9px] font-semibold text-emerald-700 uppercase tracking-wide">Saved</span>
                )}
              </div>
              <p className="text-xs text-slate-400">{savedKit ? 'Loaded from saved kit' : 'Extracted from your slides'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body — two columns: Brand Kit left, Logo right */}
        <div className="max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Analyzing your presentation...</p>
            </div>
          ) : (
            <div className="flex">
              {/* ── LEFT COLUMN: Brand Kit ── */}
              <div className="flex-1 px-6 py-5 border-r border-slate-200 space-y-4">
                {brandKit ? (
                  <>
                    {/* Brand Name */}
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Brand</p>
                      <p className="text-base font-semibold text-slate-800">{brandKit.brandName}</p>
                    </div>

                    {/* Colors — editable */}
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Colors</p>
                      <p className="text-[9px] text-slate-400 mb-2">Click to change</p>
                      <div className="flex items-center gap-2.5">
                        {paletteLabels.map(({ key, label }) => (
                          <div key={key} className="flex flex-col items-center gap-1">
                            <label className="relative cursor-pointer group">
                              <div className="w-9 h-9 rounded-full border-2 border-white shadow-md group-hover:ring-2 group-hover:ring-[#4F46E5] transition-all"
                                style={{ backgroundColor: brandKit.palette[key] }} />
                              <input type="color" value={brandKit.palette[key]}
                                onChange={e => setBrandKit(prev => prev ? { ...prev, palette: { ...prev.palette, [key]: e.target.value } } : prev)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </label>
                            <span className="text-[8px] text-slate-400">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Typography */}
                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Typography</p>
                      <div className="space-y-1.5">
                        <div className="relative">
                          <button
                            onClick={() => setActiveFontPicker(activeFontPicker === 'title' ? null : 'title')}
                            className="w-full flex items-baseline justify-between px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-700" style={{ fontFamily: `"${brandKit.typography.titleFont}", sans-serif` }}>
                                {brandKit.typography.titleFont}
                              </span>
                              <ChevronDown className={cn('w-3 h-3 text-slate-400 transition-transform', activeFontPicker === 'title' && 'rotate-180')} />
                            </div>
                            <span className="text-[10px] text-slate-400">{brandKit.typography.titleSize}pt &middot; Titles</span>
                          </button>
                          {activeFontPicker === 'title' && (
                            <FontPickerDropdown
                              currentFont={brandKit.typography.titleFont}
                              onSelect={(f) => handleFontSelect(f, true)}
                              onClose={() => setActiveFontPicker(null)}
                            />
                          )}
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setActiveFontPicker(activeFontPicker === 'body' ? null : 'body')}
                            className="w-full flex items-baseline justify-between px-3 py-1.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-700" style={{ fontFamily: `"${brandKit.typography.bodyFont}", sans-serif` }}>
                                {brandKit.typography.bodyFont}
                              </span>
                              <ChevronDown className={cn('w-3 h-3 text-slate-400 transition-transform', activeFontPicker === 'body' && 'rotate-180')} />
                            </div>
                            <span className="text-[10px] text-slate-400">{brandKit.typography.bodySize}pt &middot; Body</span>
                          </button>
                          {activeFontPicker === 'body' && (
                            <FontPickerDropdown
                              currentFont={brandKit.typography.bodyFont}
                              onSelect={(f) => handleFontSelect(f, false)}
                              onClose={() => setActiveFontPicker(null)}
                            />
                          )}
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1">Click a font to change it across all slides</p>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2">
                      <Button onClick={handleApply} disabled={applied}
                        className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white rounded-xl h-9 text-xs">
                        {applied
                          ? <><Check className="w-3.5 h-3.5 mr-1.5" />Applied</>
                          : <><Palette className="w-3.5 h-3.5 mr-1.5" />Apply as Theme</>}
                      </Button>
                      <div className="flex gap-2">
                        <Button onClick={handleSave} variant="outline"
                          className="flex-1 rounded-xl h-8 text-xs border-slate-200">
                          <Save className="w-3 h-3 mr-1.5" />Save Brand Kit
                        </Button>
                        <Button onClick={handleReset} variant="ghost"
                          className="rounded-xl h-8 text-xs text-slate-500 hover:text-slate-700">
                          <RotateCcw className="w-3 h-3 mr-1.5" />Reset
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 py-8 text-center">No brand kit extracted yet</p>
                )}
              </div>

              {/* ── RIGHT COLUMN: Logo ── */}
              <div className="w-[320px] shrink-0">
                <LogoSection onClose={onClose} />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Font Picker Dropdown (with full Google Fonts catalog) ───
let _gfCache: string[] | null = null;
let _gfLoading = false;
async function fetchAllGoogleFonts(): Promise<string[]> {
  if (_gfCache) return _gfCache;
  if (_gfLoading) return POPULAR_FONTS;
  _gfLoading = true;
  try {
    const key = import.meta.env.VITE_GOOGLE_FONTS_API_KEY;
    if (!key) return POPULAR_FONTS;
    const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${key}&sort=popularity`);
    const data = await res.json();
    _gfCache = (data.items || []).map((f: any) => f.family as string);
    return _gfCache;
  } catch {
    return POPULAR_FONTS;
  } finally {
    _gfLoading = false;
  }
}

function FontPickerDropdown({
  currentFont,
  onSelect,
  onClose,
}: {
  currentFont: string;
  onSelect: (font: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [allFonts, setAllFonts] = useState<string[]>(POPULAR_FONTS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load full catalog on mount
  useEffect(() => {
    fetchAllGoogleFonts().then(setAllFonts);
  }, []);

  const filtered = search
    ? allFonts.filter(f => f.toLowerCase().includes(search.toLowerCase())).slice(0, 60)
    : allFonts.slice(0, 80);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
    >
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-lg">
          <Search className="w-3 h-3 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search 1500+ fonts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
      {/* Font list */}
      <div className="max-h-[280px] overflow-y-auto">
        {filtered.length === 0 && search ? (
          <button onClick={() => { loadGoogleFont(search); onSelect(search); }}
            className="w-full text-left px-3 py-2 text-xs text-[#4F46E5] hover:bg-indigo-50">
            Use "{search}" from Google Fonts
          </button>
        ) : (
          filtered.map(font => (
            <button
              key={font}
              onClick={() => { loadGoogleFont(font); onSelect(font); }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-indigo-50 transition-colors flex items-center justify-between',
                font === currentFont && 'bg-indigo-50 text-indigo-700'
              )}
              style={{ fontFamily: `"${font}", sans-serif` }}
            >
              <span>{font}</span>
              {font === currentFont && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Logo Section — two-column layout with live preview ───
type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function LogoSection({ onClose }: { onClose: () => void }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [applyTo, setApplyTo] = useState<'all' | 'current'>('all');
  const [logoSize, setLogoSize] = useState(120);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload: uploadAsset } = useAssetUpload();
  const { presentation, activeSlideIndex } = useEditorStore();

  // Count existing logos across slides
  const existingLogos = presentation.slides.reduce((acc, s) => {
    return acc + s.elements.filter(e => e.type === 'image' && e.zIndex >= 100 && e.width <= 250 && e.locked).length;
  }, 0);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadAsset(file);
      if (result) setLogoUrl(result.url);
      else toast.error('Upload failed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyLogo = () => {
    if (!logoUrl) { toast.error('Upload a logo first'); return; }
    const x = corner.includes('right') ? 1920 - 48 - logoSize : 48;
    const y = corner.includes('bottom') ? 1080 - 40 - Math.round(logoSize * 0.5) : 40;
    const height = Math.round(logoSize * 0.5);
    const slideIndices = applyTo === 'all' ? presentation.slides.map((_, i) => i) : [activeSlideIndex];
    let count = 0;
    for (const idx of slideIndices) {
      const slide = presentation.slides[idx];
      if (slide.elements.some(e => e.type === 'image' && e.content === logoUrl && e.width <= 250)) continue;
      useEditorStore.setState(produce((state: any) => {
        state.presentation.slides[idx].elements.push({
          id: crypto.randomUUID(), type: 'image', content: logoUrl,
          x, y, width: logoSize, height, rotation: 0, opacity: 1,
          locked: true, visible: true, zIndex: 100,
          style: { objectFit: 'contain', borderRadius: 0 },
        });
      }));
      count++;
    }
    toast.success(`Logo added to ${count} slide${count !== 1 ? 's' : ''}`);
  };

  const handleRemoveLogos = () => {
    useEditorStore.setState(produce((state: any) => {
      for (const slide of state.presentation.slides) {
        slide.elements = slide.elements.filter((e: any) =>
          !(e.type === 'image' && e.zIndex >= 100 && e.width <= 250 && e.locked)
        );
      }
    }));
    toast.success('Logos removed from all slides');
  };

  // Preview: mini slide with logo positioned
  const previewX = corner.includes('right') ? 85 : 5;
  const previewY = corner.includes('bottom') ? 70 : 5;
  const previewW = Math.round(logoSize / 1920 * 100);

  return (
    <div className="px-6 py-5 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-[#4F46E5]" />
          <span className="text-sm font-semibold text-slate-800">Logo</span>
        </div>
        {existingLogos > 0 && (
          <button onClick={handleRemoveLogos} className="text-[10px] text-red-500 hover:text-red-700 hover:underline">
            Remove all logos ({existingLogos})
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />

      {/* Two-column: controls left, preview right */}
      <div className="flex gap-4">
        {/* Left: controls */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Upload */}
          {logoUrl ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
              <button onClick={() => fileRef.current?.click()} className="text-[11px] text-[#4F46E5] hover:underline">Change</button>
              <button onClick={() => setLogoUrl('')} className="text-[11px] text-slate-400 hover:text-red-500">Remove</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#4F46E5] text-center transition-colors">
              {uploading
                ? <span className="text-[11px] text-slate-500">Uploading...</span>
                : <><Upload className="w-3.5 h-3.5 mx-auto mb-1 text-slate-400" /><span className="text-[11px] text-slate-500 block">Upload logo</span></>}
            </button>
          )}

          {/* Position */}
          <div>
            <span className="text-[10px] text-slate-500 font-medium block mb-1.5">Position</span>
            <div className="grid grid-cols-4 gap-1">
              {([['top-left','↖ TL'], ['top-right','↗ TR'], ['bottom-left','↙ BL'], ['bottom-right','↘ BR']] as [Corner, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setCorner(id)}
                  className={cn('py-1 rounded text-[10px] font-medium transition-all', corner === id ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 font-medium">Size</span>
              <span className="text-[10px] text-slate-400 font-mono">{logoSize}px</span>
            </div>
            <input type="range" min="40" max="250" step="10" value={logoSize} onChange={e => setLogoSize(parseInt(e.target.value))} className="w-full accent-[#4F46E5]" />
          </div>

          {/* Apply to */}
          <div className="flex gap-1.5">
            <button onClick={() => setApplyTo('all')} className={cn('flex-1 py-1.5 rounded text-[10px] font-medium transition-all', applyTo === 'all' ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-500')}>
              All slides ({presentation.slides.length})
            </button>
            <button onClick={() => setApplyTo('current')} className={cn('flex-1 py-1.5 rounded text-[10px] font-medium transition-all', applyTo === 'current' ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-500')}>
              Current only
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="w-28 shrink-0">
          <span className="text-[10px] text-slate-500 font-medium block mb-1.5">Preview</span>
          <div className="w-full aspect-[16/9] bg-slate-800 rounded-lg relative overflow-hidden border border-slate-700">
            {/* Fake slide content lines */}
            <div className="absolute top-[15%] left-[10%] w-[50%] h-[3px] bg-white/20 rounded" />
            <div className="absolute top-[25%] left-[10%] w-[35%] h-[2px] bg-white/10 rounded" />
            <div className="absolute top-[40%] left-[10%] w-[40%] h-[2px] bg-white/10 rounded" />
            {/* Logo preview */}
            {logoUrl ? (
              <img src={logoUrl} alt="" className="absolute object-contain" style={{
                left: `${previewX}%`, top: `${previewY}%`,
                width: `${Math.max(8, previewW)}%`, height: 'auto', maxHeight: '20%',
              }} />
            ) : (
              <div className="absolute bg-white/20 rounded-sm" style={{
                left: `${previewX}%`, top: `${previewY}%`,
                width: `${Math.max(8, previewW)}%`, height: '12%',
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Apply button */}
      <Button onClick={handleApplyLogo} disabled={!logoUrl} className="w-full mt-4 bg-slate-900 text-white rounded-xl h-9 text-xs disabled:opacity-40">
        <Image className="w-3.5 h-3.5 mr-1.5" />Add Logo
      </Button>
    </div>
  );
}
