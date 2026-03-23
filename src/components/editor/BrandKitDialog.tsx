import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, X, Loader2, Check, Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PresentationTheme } from '@/types/presentation';

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
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
              className="w-full bg-gradient-to-r from-rose-600 to-orange-500 text-white rounded-xl h-10"
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
      </motion.div>
    </motion.div>
  );
}
