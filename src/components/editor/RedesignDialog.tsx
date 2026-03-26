import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, X, Loader2, Check, LayoutGrid, ImageIcon, Type, Columns2, BarChart3, Quote, Milestone, Users, SplitSquareHorizontal, Image as ImageLucide, Sparkles } from 'lucide-react';
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
  const xPct = (el.x / CANVAS_W) * 100;
  const yPct = (el.y / CANVAS_H) * 100;
  const wPct = (el.width / CANVAS_W) * 100;
  const hPct = (el.height / CANVAS_H) * 100;

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
        left: `${xPct}%`,
        top: `${yPct}%`,
        width: `${Math.max(wPct, 1)}%`,
        height: `${Math.max(hPct, 1)}%`,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {el.type === 'text' && (
        <span className="text-[6px] font-semibold text-blue-500 select-none">Aa</span>
      )}
      {el.type === 'image' && (
        <ImageIcon className="w-2.5 h-2.5 text-purple-500" />
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
        className="relative bg-slate-50 mx-3 my-2 rounded-md overflow-hidden aspect-video"
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
  const [fillPrompt, setFillPrompt] = useState('');
  const [emptyBlockCount, setEmptyBlockCount] = useState(0);
  const [fillingAI, setFillingAI] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<LayoutPreset | null>(null);

  const { presentation, activeSlideIndex, pushSnapshot } = useEditorStore();
  const slide = presentation.slides[activeSlideIndex];

  // ─── Direct layout application (no AI) ───
  const applyPresetDirectly = (preset: LayoutPreset) => {
    if (!slide?.elements) return;

    // Deep clone all elements to avoid mutating Immer-frozen objects
    const elements = slide.elements.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }));
    const texts = elements.filter(e => e.type === 'text' && !e.locked);
    const images = elements.filter(e => e.type === 'image' && !e.locked);

    const titleBlocks = preset.blocks.filter(b => b.type === 'title');
    const bodyBlocks = preset.blocks.filter(b => b.type === 'body');
    const numberBlocks = preset.blocks.filter(b => b.type === 'number');
    const allTextBlocks = [...titleBlocks, ...numberBlocks, ...bodyBlocks];

    const emptyCount = Math.max(0, allTextBlocks.length - texts.length);

    if (emptyCount > 0) {
      // Not enough text elements — ask user what to fill
      setEmptyBlockCount(emptyCount);
      setPendingPreset(preset);
      return;
    }

    // Enough elements — apply directly
    commitLayout(preset, elements);
  };

  const commitLayout = (preset: LayoutPreset, elements: SlideElement[], extraTexts?: string[]) => {
    pushSnapshot();

    const texts = elements.filter(e => e.type === 'text' && !e.locked);
    const images = elements.filter(e => e.type === 'image' && !e.locked);
    const locked = elements.filter(e => e.locked);
    const otherUnlocked = elements.filter(e => !e.locked && e.type !== 'text' && e.type !== 'image');

    // Sort texts: largest fontSize first (title → subtitle → body)
    texts.sort((a, b) => ((b.style?.fontSize || 0) - (a.style?.fontSize || 0)));

    const titleBlocks = preset.blocks.filter(b => b.type === 'title');
    const bodyBlocks = preset.blocks.filter(b => b.type === 'body');
    const imageBlocks = preset.blocks.filter(b => b.type === 'image');
    const numberBlocks = preset.blocks.filter(b => b.type === 'number');
    const allTextBlocks = [...titleBlocks, ...numberBlocks, ...bodyBlocks];

    const theme = useEditorStore.getState().presentation.theme?.tokens;
    const titleFont = theme?.typography?.titleFont || 'Inter';
    const bodyFont = theme?.typography?.bodyFont || 'Inter';
    const textColor = theme?.palette?.text || '#1a1a1a';

    // Map texts to blocks
    const mapped: SlideElement[] = [];
    let textIdx = 0;
    let extraIdx = 0;
    for (const block of allTextBlocks) {
      if (textIdx < texts.length) {
        const el = { ...texts[textIdx] };
        el.x = (block.x / 100) * CANVAS_W;
        el.y = (block.y / 100) * CANVAS_H;
        el.width = (block.w / 100) * CANVAS_W;
        el.height = (block.h / 100) * CANVAS_H;
        if (block.type === 'title' && el.style) {
          el.style = { ...el.style, fontSize: Math.max(el.style.fontSize || 28, 36), fontWeight: 'bold' };
        } else if (block.type === 'number' && el.style) {
          el.style = { ...el.style, fontSize: Math.max(el.style.fontSize || 40, 48), fontWeight: 'bold', textAlign: 'center' as const };
        } else if (block.type === 'body' && el.style) {
          el.style = { ...el.style, fontSize: Math.min(el.style.fontSize || 18, 20) };
        }
        mapped.push(el);
        textIdx++;
      } else {
        // Create new text element for this empty block
        const content = extraTexts?.[extraIdx] || '';
        const fontSize = block.type === 'title' ? 36 : block.type === 'number' ? 48 : 18;
        const font = block.type === 'title' || block.type === 'number' ? titleFont : bodyFont;
        mapped.push({
          id: crypto.randomUUID().slice(0, 9),
          type: 'text',
          content,
          x: (block.x / 100) * CANVAS_W,
          y: (block.y / 100) * CANVAS_H,
          width: (block.w / 100) * CANVAS_W,
          height: (block.h / 100) * CANVAS_H,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          zIndex: 0,
          style: {
            fontSize,
            fontFamily: font + ', sans-serif',
            fontWeight: block.type === 'title' || block.type === 'number' ? 'bold' : '400',
            color: textColor,
            textAlign: (block.type === 'number' ? 'center' : 'left') as any,
          },
        } as SlideElement);
        extraIdx++;
      }
    }
    // Remaining unmapped texts keep position
    for (let i = textIdx; i < texts.length; i++) mapped.push(texts[i]);

    // Map images
    let imgIdx = 0;
    for (const block of imageBlocks) {
      if (imgIdx >= images.length) break;
      const el = { ...images[imgIdx] };
      el.x = (block.x / 100) * CANVAS_W;
      el.y = (block.y / 100) * CANVAS_H;
      el.width = (block.w / 100) * CANVAS_W;
      el.height = (block.h / 100) * CANVAS_H;
      mapped.push(el);
      imgIdx++;
    }
    for (let i = imgIdx; i < images.length; i++) mapped.push(images[i]);

    const final = [...locked, ...mapped, ...otherUnlocked];
    final.forEach((el, i) => { el.zIndex = i + 1; });

    useEditorStore.setState(
      produce((state: any) => {
        state.presentation.slides[state.activeSlideIndex].elements = final;
      }),
    );

    toast.success(`Applied "${preset.label}" layout`);
    setEmptyBlockCount(0);
    setPendingPreset(null);
    setFillPrompt('');
    setTimeout(onClose, 400);
  };

  const handleFillWithAI = async () => {
    if (!pendingPreset || !slide?.elements) return;
    setFillingAI(true);

    try {
      // Get existing text for context
      const existingText = slide.elements
        .filter(e => e.type === 'text')
        .map(e => (e.content || '').replace(/<[^>]+>/g, ''))
        .join(' ')
        .slice(0, 300);

      const { data, error } = await supabase.functions.invoke('redesign-slide', {
        body: {
          mode: 'fill-blocks',
          blockCount: emptyBlockCount,
          topic: fillPrompt.trim() || 'Continue the slide content',
          existingText,
          themeTokens: useEditorStore.getState().presentation.theme.tokens,
        },
      });

      const texts: string[] = data?.texts || [];
      // Pad with placeholders if AI returned fewer
      while (texts.length < emptyBlockCount) texts.push('Add your text here');

      const elements = slide.elements.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }));
      commitLayout(pendingPreset, elements, texts);
    } catch {
      // Fallback: apply with placeholder text
      const placeholders = Array(emptyBlockCount).fill('Add your text here');
      const elements = slide.elements.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }));
      commitLayout(pendingPreset, elements, placeholders);
    } finally {
      setFillingAI(false);
    }
  };

  const handleApplyEmpty = () => {
    if (!pendingPreset || !slide?.elements) return;
    const elements = slide.elements.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }));
    commitLayout(pendingPreset, elements, []);
  };

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
            Click a layout to apply it instantly. Or describe a custom layout below.
          </p>

          {/* Layout presets grid — click = instant apply */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {LAYOUT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPresetDirectly(preset)}
                disabled={loading}
                className="group flex flex-col items-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-white hover:border-[#4F46E5] hover:bg-indigo-50/50 transition-all text-center"
              >
                <LayoutMiniPreview blocks={preset.blocks} selected={false} />
                <span className="text-[10px] font-medium text-slate-500 group-hover:text-[#4F46E5]">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>

          {/* Fill empty blocks prompt */}
          {emptyBlockCount > 0 && pendingPreset && (
            <div className="mb-4 p-4 rounded-xl border-2 border-[#4F46E5]/30 bg-indigo-50/50">
              <p className="text-sm text-slate-700 mb-2">
                This layout needs <span className="font-bold text-[#4F46E5]">{emptyBlockCount} more text block{emptyBlockCount > 1 ? 's' : ''}</span>.
                What should they say?
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={fillPrompt}
                  onChange={(e) => setFillPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !fillingAI && handleFillWithAI()}
                  placeholder="e.g. Key metrics about our Q4 revenue growth..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5]"
                  autoFocus
                  disabled={fillingAI}
                />
                <Button
                  onClick={handleFillWithAI}
                  disabled={fillingAI}
                  size="sm"
                  className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white px-4 rounded-lg shrink-0"
                >
                  {fillingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5 mr-1" />Fill with AI</>}
                </Button>
              </div>
              <button
                onClick={handleApplyEmpty}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Apply without filling (leave empty)
              </button>
            </div>
          )}

          {/* Custom AI layout */}
          {emptyBlockCount === 0 && (
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && instruction.trim() && handleGenerate()}
                placeholder="Or describe a custom layout..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20"
                disabled={loading}
              />
              <Button
                onClick={handleGenerate}
                disabled={loading || !instruction.trim()}
                size="sm"
                className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white px-4 rounded-xl shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </Button>
            </div>
          )}
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
