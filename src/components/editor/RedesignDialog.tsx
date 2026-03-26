import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, X, Loader2, Check, LayoutGrid, ImageIcon, Type, Columns2, BarChart3, Quote, Milestone, Users, SplitSquareHorizontal, Image as ImageLucide } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { produce } from 'immer';
import { SlideElement } from '@/types/presentation';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

type Mode = 'redesign' | 'reorganize';

// ─── Layout presets ───
interface LayoutPreset {
  id: string;
  label: string;
  icon: React.ReactNode;
  instruction: string;
  // Mini preview blocks (percentages of slide)
  blocks: { x: number; y: number; w: number; h: number; type: 'title' | 'body' | 'image' | 'accent' | 'divider' | 'number' }[];
}

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'title-content',
    label: 'Title + Content',
    icon: <Type className="w-3.5 h-3.5" />,
    instruction: 'Reorganize as a clean title at the top (large, bold) with body text below. Left-aligned. Leave right side open.',
    blocks: [
      { type: 'title', x: 5, y: 8, w: 55, h: 10 },
      { type: 'body', x: 5, y: 25, w: 50, h: 5 },
      { type: 'body', x: 5, y: 33, w: 45, h: 5 },
      { type: 'body', x: 5, y: 41, w: 48, h: 5 },
    ],
  },
  {
    id: 'two-column',
    label: 'Two Columns',
    icon: <Columns2 className="w-3.5 h-3.5" />,
    instruction: 'Reorganize into two equal columns. Title spans full width at top. Split body text evenly between left and right columns with a clear vertical separation.',
    blocks: [
      { type: 'title', x: 5, y: 8, w: 90, h: 10 },
      { type: 'divider', x: 50, y: 24, w: 0.5, h: 55 },
      { type: 'body', x: 5, y: 26, w: 40, h: 5 },
      { type: 'body', x: 5, y: 34, w: 38, h: 5 },
      { type: 'body', x: 55, y: 26, w: 40, h: 5 },
      { type: 'body', x: 55, y: 34, w: 38, h: 5 },
    ],
  },
  {
    id: 'image-left',
    label: 'Image Left',
    icon: <SplitSquareHorizontal className="w-3.5 h-3.5" />,
    instruction: 'Place the main image on the left half (50% width, full height). Title and text on the right side, vertically centered.',
    blocks: [
      { type: 'image', x: 0, y: 0, w: 48, h: 100 },
      { type: 'title', x: 54, y: 20, w: 42, h: 12 },
      { type: 'body', x: 54, y: 38, w: 38, h: 5 },
      { type: 'body', x: 54, y: 46, w: 35, h: 5 },
    ],
  },
  {
    id: 'image-right',
    label: 'Image Right',
    icon: <ImageLucide className="w-3.5 h-3.5" />,
    instruction: 'Title and text on the left side. Place the main image on the right half (50% width, full height). Vertically center the text.',
    blocks: [
      { type: 'title', x: 5, y: 20, w: 42, h: 12 },
      { type: 'body', x: 5, y: 38, w: 38, h: 5 },
      { type: 'body', x: 5, y: 46, w: 35, h: 5 },
      { type: 'image', x: 52, y: 0, w: 48, h: 100 },
    ],
  },
  {
    id: 'big-statement',
    label: 'Big Statement',
    icon: <Quote className="w-3.5 h-3.5" />,
    instruction: 'Center the most important text as a large bold statement in the middle of the slide. Small subtitle or attribution below. Minimal, dramatic, lots of whitespace.',
    blocks: [
      { type: 'title', x: 12, y: 28, w: 76, h: 16 },
      { type: 'body', x: 25, y: 55, w: 50, h: 5 },
    ],
  },
  {
    id: 'three-stats',
    label: '3 Key Numbers',
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    instruction: 'Reorganize as 3 large key numbers/stats in a row (evenly spaced). Each stat has a big bold number and a small label below. Title at top.',
    blocks: [
      { type: 'title', x: 5, y: 8, w: 50, h: 10 },
      { type: 'number', x: 8, y: 32, w: 22, h: 16 },
      { type: 'number', x: 38, y: 32, w: 22, h: 16 },
      { type: 'number', x: 68, y: 32, w: 22, h: 16 },
      { type: 'accent', x: 14, y: 52, w: 10, h: 1.5 },
      { type: 'accent', x: 44, y: 52, w: 10, h: 1.5 },
      { type: 'accent', x: 74, y: 52, w: 10, h: 1.5 },
      { type: 'body', x: 8, y: 57, w: 22, h: 4 },
      { type: 'body', x: 38, y: 57, w: 22, h: 4 },
      { type: 'body', x: 68, y: 57, w: 22, h: 4 },
    ],
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: <Milestone className="w-3.5 h-3.5" />,
    instruction: 'Reorganize as a horizontal timeline with 3-4 milestones. Title at top. A horizontal line in the middle with circular markers. Milestone labels above/below alternating.',
    blocks: [
      { type: 'title', x: 5, y: 6, w: 40, h: 10 },
      { type: 'divider', x: 5, y: 50, w: 90, h: 0.8 },
      { type: 'accent', x: 14, y: 47, w: 5, h: 5 },
      { type: 'accent', x: 38, y: 47, w: 5, h: 5 },
      { type: 'accent', x: 62, y: 47, w: 5, h: 5 },
      { type: 'accent', x: 84, y: 47, w: 5, h: 5 },
      { type: 'body', x: 8, y: 30, w: 18, h: 4 },
      { type: 'body', x: 32, y: 58, w: 18, h: 4 },
      { type: 'body', x: 56, y: 30, w: 18, h: 4 },
      { type: 'body', x: 78, y: 58, w: 18, h: 4 },
    ],
  },
  {
    id: 'team',
    label: 'Team / Grid',
    icon: <Users className="w-3.5 h-3.5" />,
    instruction: 'Reorganize as a grid of 3-4 cards in a row. Each card has an image/icon at top and name/description below. Title at top left.',
    blocks: [
      { type: 'title', x: 5, y: 6, w: 40, h: 10 },
      { type: 'image', x: 6, y: 24, w: 19, h: 32 },
      { type: 'image', x: 28, y: 24, w: 19, h: 32 },
      { type: 'image', x: 50, y: 24, w: 19, h: 32 },
      { type: 'image', x: 72, y: 24, w: 19, h: 32 },
      { type: 'body', x: 6, y: 60, w: 19, h: 4 },
      { type: 'body', x: 28, y: 60, w: 19, h: 4 },
      { type: 'body', x: 50, y: 60, w: 19, h: 4 },
      { type: 'body', x: 72, y: 60, w: 19, h: 4 },
    ],
  },
];

function LayoutMiniPreview({ blocks, selected }: { blocks: LayoutPreset['blocks']; selected: boolean }) {
  const colorMap: Record<string, string> = {
    title: selected ? 'bg-indigo-400' : 'bg-slate-300',
    body: selected ? 'bg-indigo-300/60' : 'bg-slate-200',
    image: selected ? 'bg-purple-300/50' : 'bg-slate-100',
    accent: selected ? 'bg-indigo-500' : 'bg-slate-400',
    divider: selected ? 'bg-indigo-400/60' : 'bg-slate-200',
    number: selected ? 'bg-indigo-400' : 'bg-slate-300',
  };
  return (
    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-white border border-slate-100">
      {blocks.map((b, i) => (
        <div key={i} className={cn('absolute rounded-[1px]', colorMap[b.type] || 'bg-slate-200')}
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }} />
      ))}
    </div>
  );
}

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
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
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
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
        <div className="px-6 pt-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-400 mb-3">
            Generates 3 different layout variants. Your content stays the same — only positions change.
          </p>

          <input
            type="text"
            value={instruction}
            onChange={(e) => { setInstruction(e.target.value); setSelectedPreset(null); }}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
            placeholder="Describe the layout you want, or pick one below..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 mb-3"
            disabled={loading}
          />

          {/* Layout presets grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {LAYOUT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset.id === selectedPreset ? null : preset.id);
                  setInstruction(preset.id === selectedPreset ? '' : preset.instruction);
                }}
                disabled={loading}
                className={cn(
                  'group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-center',
                  selectedPreset === preset.id
                    ? 'border-[#4F46E5] bg-indigo-50/80 ring-1 ring-[#4F46E5]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <LayoutMiniPreview blocks={preset.blocks} selected={selectedPreset === preset.id} />
                <div className="flex items-center gap-1">
                  <span className={cn('text-[10px] font-medium', selectedPreset === preset.id ? 'text-[#4F46E5]' : 'text-slate-500')}>
                    {preset.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || (!instruction.trim() && !selectedPreset)}
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
                {selectedPreset ? 'Apply Layout' : 'Generate Variants'}
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
