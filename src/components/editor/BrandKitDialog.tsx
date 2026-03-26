import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Palette, X, Loader2, Check, Paintbrush, Upload, Image } from 'lucide-react';
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

  useEffect(() => {
    const extract = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('extract-brand', {
          body: {
            slides: presentation.slides,
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

    setTheme(theme);
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
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Brand Kit</h3>
              <p className="text-xs text-slate-400">Extracted from your slides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-sm text-slate-500">Analyzing your presentation...</p>
            </div>
          ) : brandKit ? (
            <div className="space-y-5">
              {/* Brand Name */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Brand</p>
                <p className="text-lg font-semibold text-slate-800">{brandKit.brandName}</p>
              </div>

              {/* Color Palette */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Colors</p>
                <div className="flex items-center gap-3">
                  {paletteLabels.map(({ key, label }) => (
                    <div key={key} className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: brandKit.palette[key] }}
                        title={label}
                      />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {brandKit.palette[key]}
                      </span>
                      <span className="text-[10px] text-slate-400">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Typography</p>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <span
                      className="text-base font-semibold text-slate-700"
                      style={{ fontFamily: `"${brandKit.typography.titleFont}", sans-serif` }}
                    >
                      {brandKit.typography.titleFont}
                    </span>
                    <span className="text-xs text-slate-400">{brandKit.typography.titleSize}pt title</span>
                  </div>
                  <div className="flex items-baseline justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <span
                      className="text-sm text-slate-700"
                      style={{ fontFamily: `"${brandKit.typography.bodyFont}", sans-serif` }}
                    >
                      {brandKit.typography.bodyFont}
                    </span>
                    <span className="text-xs text-slate-400">{brandKit.typography.bodySize}pt body</span>
                  </div>
                </div>
              </div>

              {/* Style */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Style</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-xs text-indigo-700 font-medium">
                    {brandKit.style?.mood}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-600">
                    Radii: {brandKit.style?.radii}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-600">
                    Shadows: {brandKit.style?.shadows}
                  </span>
                </div>
              </div>

              {/* Recommendations */}
              {brandKit.recommendations && brandKit.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Recommendations
                  </p>
                  <ul className="space-y-1.5">
                    {brandKit.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <Paintbrush className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && brandKit && (
          <div className="px-6 py-4 border-t border-slate-200">
            <Button
              onClick={handleApply}
              disabled={applied}
              className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white rounded-xl h-10"
            >
              {applied ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Applied
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Apply as Theme
                </span>
              )}
            </Button>
          </div>
        )}

        {/* ── ADD LOGO SECTION ── */}
        <LogoSection onClose={onClose} />
      </motion.div>
    </motion.div>
  );
}

// ─── Logo Section inside Brand Kit ───
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

    const slideIndices = applyTo === 'all'
      ? presentation.slides.map((_, i) => i)
      : [activeSlideIndex];

    let count = 0;
    for (const idx of slideIndices) {
      const slide = presentation.slides[idx];
      if (slide.elements.some(e => e.type === 'image' && e.content === logoUrl && e.width <= 250)) continue;

      useEditorStore.setState(
        produce((state: any) => {
          state.presentation.slides[idx].elements.push({
            id: crypto.randomUUID(),
            type: 'image',
            content: logoUrl,
            x, y, width: logoSize, height,
            rotation: 0, opacity: 1,
            locked: true, visible: true,
            zIndex: 100,
            style: { objectFit: 'contain', borderRadius: 0 },
          });
        })
      );
      count++;
    }

    toast.success(`Logo added to ${count} slide${count !== 1 ? 's' : ''}`);
    onClose();
  };

  return (
    <div className="px-6 py-4 border-t border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <Image className="w-4 h-4 text-[#4F46E5]" />
        <span className="text-sm font-semibold text-slate-800">Add Logo</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />

      {logoUrl ? (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-[#4F46E5] hover:underline">Change</button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#4F46E5] text-center mb-3 transition-colors">
          {uploading
            ? <span className="text-xs text-slate-500">Uploading...</span>
            : <><Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" /><span className="text-xs text-slate-500 block">Upload logo</span></>}
        </button>
      )}

      {/* Corner */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {([['top-left','↖'], ['top-right','↗'], ['bottom-left','↙'], ['bottom-right','↘']] as [Corner, string][]).map(([id, icon]) => (
          <button key={id} onClick={() => setCorner(id)}
            className={cn('py-1.5 rounded-lg text-xs font-medium transition-all', corner === id ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {icon}
          </button>
        ))}
      </div>

      {/* Size + Apply */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-slate-500 shrink-0">Size</span>
        <input type="range" min="40" max="250" step="10" value={logoSize} onChange={e => setLogoSize(parseInt(e.target.value))} className="flex-1 accent-[#4F46E5]" />
        <span className="text-[10px] text-slate-500 w-8">{logoSize}px</span>
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={() => setApplyTo('all')} className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-medium', applyTo === 'all' ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600')}>
          All slides
        </button>
        <button onClick={() => setApplyTo('current')} className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-medium', applyTo === 'current' ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600')}>
          Current only
        </button>
      </div>

      <Button onClick={handleApplyLogo} disabled={!logoUrl} className="w-full bg-slate-900 text-white rounded-xl h-9 text-xs disabled:opacity-40">
        <Image className="w-3.5 h-3.5 mr-1.5" />Add Logo
      </Button>
    </div>
  );
}
