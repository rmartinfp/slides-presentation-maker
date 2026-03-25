import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, X, Loader2, Check, LayoutGrid, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { produce } from 'immer';
import { SlideElement } from '@/types/presentation';

interface Props {
  onClose: () => void;
}

type Mode = 'redesign' | 'reorganize';

interface Variant {
  name: string;
  elements: SlideElement[];
}

const PREVIEW_W = 320;
const PREVIEW_H = 180;
const CANVAS_W = 1920;
const CANVAS_H = 1080;

function ElementBlock({ el }: { el: SlideElement }) {
  const x = (el.x / CANVAS_W) * PREVIEW_W;
  const y = (el.y / CANVAS_H) * PREVIEW_H;
  const w = (el.width / CANVAS_W) * PREVIEW_W;
  const h = (el.height / CANVAS_H) * PREVIEW_H;

  const colorMap: Record<string, { bg: string; border: string }> = {
    text: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)' },
    image: { bg: 'rgba(147, 51, 234, 0.15)', border: 'rgba(147, 51, 234, 0.4)' },
    shape: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.4)' },
  };

  const colors = colorMap[el.type] || colorMap.shape;

  return (
    <div
      className="absolute flex items-center justify-center rounded-sm overflow-hidden"
      style={{
        left: x,
        top: y,
        width: Math.max(w, 4),
        height: Math.max(h, 4),
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {el.type === 'text' && (
        <span className="text-[8px] font-semibold text-blue-500 select-none">Aa</span>
      )}
      {el.type === 'image' && (
        <ImageIcon className="w-3 h-3 text-purple-500" />
      )}
    </div>
  );
}

function VariantCard({
  variant,
  onApply,
  applied,
}: {
  variant: Variant;
  onApply: () => void;
  applied: boolean;
}) {
  return (
    <div className="flex-1 min-w-0 border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-indigo-300 transition-colors">
      <div className="px-3 py-2 border-b border-slate-100">
        <p className="text-xs font-medium text-slate-700 truncate">{variant.name}</p>
        <p className="text-[10px] text-slate-400">{variant.elements.length} elements</p>
      </div>
      <div
        className="relative bg-slate-50 mx-3 my-2 rounded-md overflow-hidden"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
      >
        {variant.elements.map((el) => (
          <ElementBlock key={el.id} el={el} />
        ))}
      </div>
      <div className="px-3 pb-3">
        <Button
          onClick={onApply}
          size="sm"
          className={
            applied
              ? 'w-full bg-green-600 hover:bg-green-700 text-white text-xs'
              : 'w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white text-xs'
          }
        >
          {applied ? (
            <>
              <Check className="w-3 h-3 mr-1" /> Applied
            </>
          ) : (
            'Apply'
          )}
        </Button>
      </div>
    </div>
  );
}

export default function RedesignDialog({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('redesign');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const { presentation, activeSlideIndex } = useEditorStore();
  const slide = presentation.slides[activeSlideIndex];

  const handleGenerate = async () => {
    if (!slide) return;

    setLoading(true);
    setVariants([]);
    setAppliedIndex(null);

    try {
      const { data, error } = await supabase.functions.invoke('redesign-slide', {
        body: {
          mode,
          elements: slide.elements || [],
          themeTokens: useEditorStore.getState().presentation.theme.tokens,
          instruction: instruction.trim() || undefined,
        },
      });

      if (error) throw error;

      const returned = data?.variants;
      if (!Array.isArray(returned) || returned.length === 0) {
        toast.error('No variants returned');
        return;
      }

      setVariants(
        returned.map((v: { name?: string; elements?: SlideElement[] }, i: number) => ({
          name: v.name || `Variant ${i + 1}`,
          elements: v.elements || [],
        })),
      );

      toast.success(`Generated ${returned.length} variant${returned.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate variants');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (index: number) => {
    const variant = variants[index];
    if (!variant) return;

    useEditorStore.setState(
      produce((state: { presentation: { slides: { elements: SlideElement[] }[] }; activeSlideIndex: number }) => {
        state.presentation.slides[state.activeSlideIndex].elements = variant.elements;
      }),
    );

    setAppliedIndex(index);
    toast.success(`Applied "${variant.name}"`);
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
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Redesign Slide</h3>
              <p className="text-xs text-slate-400">
                Editing: {slide?.title || `Slide ${activeSlideIndex + 1}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Description + optional instruction */}
        <div className="px-6 pt-4">
          <p className="text-xs text-slate-400 mb-3">
            Generates 3 different layout variants. Your content stays the same — only positions change.
          </p>

          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
            placeholder="Optional: e.g. Make the title bigger, center the image, more whitespace..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 mb-3"
            disabled={loading}
          />

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white px-6 rounded-xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Variants
              </>
            )}
          </Button>
        </div>

        {/* Variants grid */}
        {loading && (
          <div className="px-6 py-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400">Generating layout variants...</p>
          </div>
        )}

        {!loading && variants.length > 0 && (
          <div className="px-6 py-4">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {variants.map((variant, i) => (
                <VariantCard
                  key={i}
                  variant={variant}
                  onApply={() => handleApply(i)}
                  applied={appliedIndex === i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}
