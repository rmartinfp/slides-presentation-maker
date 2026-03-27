import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Palette, X, Loader2, Check, Upload, Image, Save, RotateCcw, ChevronDown, Search } from 'lucide-react';
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

let _fontsPreloaded = false;
function preloadPopularFonts() {
  if (_fontsPreloaded) return;
  _fontsPreloaded = true;
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
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);
  const [savedKit, setSavedKit] = useState(false);
  const [activeFontPicker, setActiveFontPicker] = useState<'title' | 'body' | null>(null);

  // Store the original palette at mount so we can map old→new colors live
  const originalPaletteRef = useRef<BrandKit['palette'] | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(BRAND_KIT_KEY);
    if (saved) {
      try {
        const kit = JSON.parse(saved) as BrandKit;
        setBrandKit(kit);
        originalPaletteRef.current = { ...kit.palette };
        setLoading(false);
        setSavedKit(true);
        return;
      } catch { /* fall through */ }
    }

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
          body: { slides: lightSlides, currentTheme: presentation.theme.tokens },
        });
        if (error) throw error;
        const kit = data as BrandKit;
        setBrandKit(kit);
        originalPaletteRef.current = { ...kit.palette };
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

  useEffect(() => {
    if (brandKit) preloadPopularFonts();
  }, [brandKit]);

  // ── Live color application ──
  const applyColorToPresentation = useCallback((paletteKey: keyof BrandKit['palette'], newColor: string) => {
    if (!originalPaletteRef.current) return;
    const oldColor = originalPaletteRef.current[paletteKey]?.toLowerCase();
    if (!oldColor) return;
    const newLower = newColor.toLowerCase();
    if (oldColor === newLower) return;

    useEditorStore.setState(produce((state: any) => {
      for (const slide of state.presentation.slides) {
        // Background
        if (slide.background?.type === 'solid') {
          const val = (slide.background.value || '').toLowerCase();
          if (val === oldColor) slide.background.value = newColor;
        }
        // Elements
        for (const el of slide.elements) {
          if (el.type === 'text' && el.style?.color) {
            if (el.style.color.toLowerCase() === oldColor) el.style.color = newColor;
          }
          if (el.style?.backgroundColor) {
            if (el.style.backgroundColor.toLowerCase() === oldColor) el.style.backgroundColor = newColor;
          }
          if (el.style?.shapeFill) {
            if (el.style.shapeFill.toLowerCase() === oldColor) el.style.shapeFill = newColor;
          }
          if (el.style?.shapeStroke) {
            if (el.style.shapeStroke.toLowerCase() === oldColor) el.style.shapeStroke = newColor;
          }
        }
      }
    }));
    // Update the "original" to the new color so chaining works
    originalPaletteRef.current[paletteKey] = newColor;
  }, []);

  const handleColorChange = useCallback((key: keyof BrandKit['palette'], value: string) => {
    setBrandKit(prev => prev ? { ...prev, palette: { ...prev.palette, [key]: value } } : prev);
    applyColorToPresentation(key, value);
  }, [applyColorToPresentation]);

  // ── Live font application ──
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
    toast.success(`${isTitle ? 'Title' : 'Body'} font updated`);
  }, [applyFontToPresentation]);

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
        body: { slides: lightSlides, currentTheme: presentation.theme.tokens },
      });
      if (error) throw error;
      const kit = data as BrandKit;
      setBrandKit(kit);
      originalPaletteRef.current = { ...kit.palette };
    } catch (err) {
      console.error(err);
      toast.error('Failed to extract brand kit');
    } finally {
      setLoading(false);
    }
  };

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

    useEditorStore.getState().pushSnapshot();
    useEditorStore.setState(produce((state: any) => {
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
        className="w-full max-w-[920px] bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-lg shadow-indigo-200">
              <Palette className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 text-[15px]">Brand Kit</h3>
                {savedKit && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-[9px] font-semibold text-emerald-600 uppercase tracking-wide border border-emerald-100">Saved</span>
                )}
              </div>
              <p className="text-xs text-slate-400">{savedKit ? 'Loaded from saved kit' : 'Extracted from your slides'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[72vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              <p className="text-sm text-slate-400">Analyzing your presentation...</p>
            </div>
          ) : (
            <div className="flex divide-x divide-slate-100">
              {/* ── LEFT: Brand Kit ── */}
              <div className="flex-1 p-6 space-y-6">
                {brandKit ? (
                  <>
                    {/* Brand Name */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Brand</p>
                      <p className="text-lg font-bold text-slate-800">{brandKit.brandName}</p>
                    </div>

                    {/* Colors */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Colors</p>
                      <div className="flex items-start gap-4">
                        {paletteLabels.map(({ key, label }) => (
                          <div key={key} className="flex flex-col items-center gap-1.5">
                            <label className="relative cursor-pointer group">
                              <div
                                className="w-10 h-10 rounded-xl border-2 border-white shadow-md ring-1 ring-slate-200/60 group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
                                style={{ backgroundColor: brandKit.palette[key] }}
                              />
                              <input
                                type="color"
                                value={brandKit.palette[key]}
                                onChange={e => handleColorChange(key, e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </label>
                            <span className="text-[9px] font-medium text-slate-400">{label}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-300 mt-2">Click any swatch to change — updates live</p>
                    </div>

                    {/* Typography */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Typography</p>
                      <div className="space-y-2">
                        <div className="relative">
                          <button
                            onClick={() => setActiveFontPicker(activeFontPicker === 'title' ? null : 'title')}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-700" style={{ fontFamily: `"${brandKit.typography.titleFont}", sans-serif` }}>
                                {brandKit.typography.titleFont}
                              </span>
                              <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', activeFontPicker === 'title' && 'rotate-180')} />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{brandKit.typography.titleSize}pt · Titles</span>
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
                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-700" style={{ fontFamily: `"${brandKit.typography.bodyFont}", sans-serif` }}>
                                {brandKit.typography.bodyFont}
                              </span>
                              <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', activeFontPicker === 'body' && 'rotate-180')} />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{brandKit.typography.bodySize}pt · Body</span>
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
                      <p className="text-[9px] text-slate-300 mt-2">Click a font to change it across all slides</p>
                    </div>

                    {/* Actions — clean row */}
                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <Button
                        onClick={handleApply}
                        disabled={applied}
                        className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white rounded-xl h-10 text-sm font-medium shadow-md shadow-indigo-200/50"
                      >
                        {applied
                          ? <><Check className="w-4 h-4 mr-2" />Applied</>
                          : <><Palette className="w-4 h-4 mr-2" />Apply as Theme</>}
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSave}
                          variant="outline"
                          className="flex-1 rounded-xl h-9 text-xs font-medium border-slate-200 hover:bg-slate-50"
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />Save Kit
                        </Button>
                        <Button
                          onClick={handleReset}
                          variant="ghost"
                          className="rounded-xl h-9 text-xs font-medium text-slate-400 hover:text-slate-600"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reset
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 py-12 text-center">No brand kit extracted yet</p>
                )}
              </div>

              {/* ── RIGHT: Logo ── */}
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

// ─── Font Picker Dropdown ───
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

  useEffect(() => {
    fetchAllGoogleFonts().then(setAllFonts);
  }, []);

  const filtered = search
    ? allFonts.filter(f => f.toLowerCase().includes(search.toLowerCase())).slice(0, 60)
    : allFonts.slice(0, 80);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
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

// ─── Logo Section ───
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

  const previewX = corner.includes('right') ? 85 : 5;
  const previewY = corner.includes('bottom') ? 70 : 5;
  const previewW = Math.round(logoSize / 1920 * 100);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-slate-800">Logo</span>
        </div>
        {existingLogos > 0 && (
          <button onClick={handleRemoveLogos} className="text-[10px] text-red-400 hover:text-red-600 hover:underline transition-colors">
            Remove all ({existingLogos})
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />

      {/* Upload area */}
      {logoUrl ? (
        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-12 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex gap-2 text-[11px]">
            <button onClick={() => fileRef.current?.click()} className="text-indigo-500 hover:underline">Change</button>
            <button onClick={() => setLogoUrl('')} className="text-slate-400 hover:text-red-500">Remove</button>
          </div>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="w-full py-5 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-center transition-all">
          {uploading
            ? <span className="text-[11px] text-slate-400">Uploading...</span>
            : <><Upload className="w-4 h-4 mx-auto mb-1.5 text-slate-300" /><span className="text-[11px] text-slate-400 block">Upload logo</span></>}
        </button>
      )}

      {/* Preview */}
      <div>
        <span className="text-[10px] text-slate-400 font-medium block mb-2">Preview</span>
        <div className="w-full aspect-[16/9] bg-slate-800 rounded-xl relative overflow-hidden border border-slate-700/50">
          <div className="absolute top-[15%] left-[10%] w-[50%] h-[3px] bg-white/15 rounded" />
          <div className="absolute top-[25%] left-[10%] w-[35%] h-[2px] bg-white/10 rounded" />
          <div className="absolute top-[40%] left-[10%] w-[40%] h-[2px] bg-white/10 rounded" />
          {logoUrl ? (
            <img src={logoUrl} alt="" className="absolute object-contain" style={{
              left: `${previewX}%`, top: `${previewY}%`,
              width: `${Math.max(8, previewW)}%`, height: 'auto', maxHeight: '20%',
            }} />
          ) : (
            <div className="absolute bg-white/15 rounded-sm" style={{
              left: `${previewX}%`, top: `${previewY}%`,
              width: `${Math.max(8, previewW)}%`, height: '12%',
            }} />
          )}
        </div>
      </div>

      {/* Position */}
      <div>
        <span className="text-[10px] text-slate-400 font-medium block mb-2">Position</span>
        <div className="grid grid-cols-4 gap-1.5">
          {([['top-left', 'TL'], ['top-right', 'TR'], ['bottom-left', 'BL'], ['bottom-right', 'BR']] as [Corner, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setCorner(id)}
              className={cn('py-1.5 rounded-lg text-[10px] font-medium transition-all', corner === id ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 font-medium">Size</span>
          <span className="text-[10px] text-slate-400 font-mono">{logoSize}px</span>
        </div>
        <input type="range" min="40" max="250" step="10" value={logoSize} onChange={e => setLogoSize(parseInt(e.target.value))} className="w-full accent-indigo-500" />
      </div>

      {/* Apply to */}
      <div className="flex gap-1.5">
        <button onClick={() => setApplyTo('all')} className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all', applyTo === 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500')}>
          All slides ({presentation.slides.length})
        </button>
        <button onClick={() => setApplyTo('current')} className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all', applyTo === 'current' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500')}>
          Current only
        </button>
      </div>

      {/* Apply button */}
      <Button onClick={handleApplyLogo} disabled={!logoUrl} className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-10 text-xs font-medium disabled:opacity-30">
        <Image className="w-3.5 h-3.5 mr-1.5" />Add Logo
      </Button>
    </div>
  );
}
