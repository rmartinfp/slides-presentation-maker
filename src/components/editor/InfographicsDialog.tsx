import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LayoutGrid, ArrowRight, Circle, Triangle, Layers, GitBranch, Target, TrendingUp, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';
import type { SlideElement } from '@/types/presentation';

interface InfographicTemplate {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  preview: { type: string; color: string; x: number; y: number; w: number; h: number }[];
  generate: (palette: { primary: string; secondary: string; accent: string; text: string; bg: string }) => Partial<SlideElement>[];
}

const uid = () => uuid().slice(0, 9);

const TEMPLATES: InfographicTemplate[] = [
  {
    id: 'process-4',
    name: '4-Step Process',
    category: 'Process',
    icon: <ArrowRight className="w-4 h-4" />,
    description: 'Horizontal flow with numbered steps',
    preview: [
      { type: 'circle', color: '#4F46E5', x: 10, y: 40, w: 18, h: 30 },
      { type: 'circle', color: '#7C3AED', x: 30, y: 40, w: 18, h: 30 },
      { type: 'circle', color: '#9333EA', x: 50, y: 40, w: 18, h: 30 },
      { type: 'circle', color: '#A855F7', x: 70, y: 40, w: 18, h: 30 },
    ],
    generate: (p) => {
      const steps = ['Research', 'Plan', 'Execute', 'Review'];
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Our Process', x: 80, y: 60, width: 600, height: 80, style: { fontSize: 36, fontWeight: 'bold', color: p.text } },
      ];
      steps.forEach((step, i) => {
        const cx = 180 + i * 400;
        elements.push(
          { type: 'shape', content: '', x: cx, y: 300, width: 140, height: 140, style: { shapeType: 'circle', shapeFill: i === 0 ? p.primary : i === 1 ? p.secondary : i === 2 ? p.accent : p.primary, borderRadius: 70 } },
          { type: 'text', content: String(i + 1), x: cx + 20, y: 330, width: 100, height: 60, style: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' } },
          { type: 'text', content: step, x: cx - 20, y: 470, width: 180, height: 50, style: { fontSize: 18, color: p.text, textAlign: 'center' } },
          { type: 'text', content: 'Description of this step goes here.', x: cx - 40, y: 520, width: 220, height: 60, style: { fontSize: 12, color: p.text, textAlign: 'center', opacity: 0.6 } },
        );
        if (i < 3) {
          elements.push(
            { type: 'shape', content: '', x: cx + 160, y: 355, width: 200, height: 30, style: { shapeType: 'line', shapeFill: 'transparent', shapeStroke: p.primary, shapeStrokeWidth: 2, lineTailEnd: 'arrow' } },
          );
        }
      });
      return elements;
    },
  },
  {
    id: 'pyramid-3',
    name: 'Pyramid / Hierarchy',
    category: 'Hierarchy',
    icon: <Triangle className="w-4 h-4" />,
    description: '3-level pyramid with labels',
    preview: [
      { type: 'rect', color: '#4F46E5', x: 35, y: 15, w: 30, h: 20 },
      { type: 'rect', color: '#7C3AED', x: 25, y: 40, w: 50, h: 20 },
      { type: 'rect', color: '#9333EA', x: 15, y: 65, w: 70, h: 20 },
    ],
    generate: (p) => {
      const levels = [
        { label: 'Vision', desc: 'Strategic direction', w: 400 },
        { label: 'Strategy', desc: 'Tactical planning', w: 600 },
        { label: 'Execution', desc: 'Daily operations', w: 800 },
      ];
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Organization Structure', x: 80, y: 60, width: 600, height: 70, style: { fontSize: 36, fontWeight: 'bold', color: p.text } },
      ];
      levels.forEach((level, i) => {
        const cx = 960 - level.w / 2;
        const cy = 250 + i * 220;
        const colors = [p.primary, p.secondary, p.accent];
        elements.push(
          { type: 'shape', content: '', x: cx, y: cy, width: level.w, height: 160, style: { shapeType: 'rectangle', shapeFill: colors[i], borderRadius: 16 } },
          { type: 'text', content: level.label, x: cx + 30, y: cy + 30, width: level.w - 60, height: 50, style: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' } },
          { type: 'text', content: level.desc, x: cx + 30, y: cy + 85, width: level.w - 60, height: 40, style: { fontSize: 14, color: '#ffffff', textAlign: 'center', opacity: 0.8 } },
        );
      });
      return elements;
    },
  },
  {
    id: 'comparison-2',
    name: 'Side by Side',
    category: 'Comparison',
    icon: <Layers className="w-4 h-4" />,
    description: 'Two-column comparison layout',
    preview: [
      { type: 'rect', color: '#4F46E5', x: 5, y: 20, w: 42, h: 70 },
      { type: 'rect', color: '#9333EA', x: 53, y: 20, w: 42, h: 70 },
    ],
    generate: (p) => {
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Before vs After', x: 80, y: 60, width: 600, height: 70, style: { fontSize: 36, fontWeight: 'bold', color: p.text } },
        // Left column
        { type: 'shape', content: '', x: 80, y: 200, width: 840, height: 700, style: { shapeType: 'rectangle', shapeFill: p.primary, borderRadius: 20 } },
        { type: 'text', content: 'Before', x: 140, y: 240, width: 720, height: 60, style: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' } },
        { type: 'text', content: '• Pain point one\n• Pain point two\n• Pain point three\n• Pain point four', x: 140, y: 320, width: 720, height: 300, style: { fontSize: 18, color: '#ffffff', opacity: 0.9, lineHeight: 2 } },
        // Right column
        { type: 'shape', content: '', x: 1000, y: 200, width: 840, height: 700, style: { shapeType: 'rectangle', shapeFill: p.accent, borderRadius: 20 } },
        { type: 'text', content: 'After', x: 1060, y: 240, width: 720, height: 60, style: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' } },
        { type: 'text', content: '• Solution one\n• Solution two\n• Solution three\n• Solution four', x: 1060, y: 320, width: 720, height: 300, style: { fontSize: 18, color: '#ffffff', opacity: 0.9, lineHeight: 2 } },
      ];
      return elements;
    },
  },
  {
    id: 'timeline-5',
    name: 'Timeline',
    category: 'Timeline',
    icon: <GitBranch className="w-4 h-4" />,
    description: 'Horizontal timeline with 5 milestones',
    preview: [
      { type: 'rect', color: '#4F46E5', x: 5, y: 48, w: 90, h: 4 },
      { type: 'circle', color: '#4F46E5', x: 10, y: 42, w: 10, h: 16 },
      { type: 'circle', color: '#7C3AED', x: 30, y: 42, w: 10, h: 16 },
      { type: 'circle', color: '#9333EA', x: 50, y: 42, w: 10, h: 16 },
      { type: 'circle', color: '#A855F7', x: 70, y: 42, w: 10, h: 16 },
      { type: 'circle', color: '#C084FC', x: 90, y: 42, w: 10, h: 16 },
    ],
    generate: (p) => {
      const milestones = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'];
      const labels = ['Research', 'Development', 'Beta Launch', 'Public Release', 'Scale'];
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Roadmap', x: 80, y: 60, width: 400, height: 70, style: { fontSize: 36, fontWeight: 'bold', color: p.text } },
        // Main line
        { type: 'shape', content: '', x: 120, y: 490, width: 1680, height: 4, style: { shapeType: 'rectangle', shapeFill: p.primary, borderRadius: 2 } },
      ];
      milestones.forEach((date, i) => {
        const cx = 200 + i * 340;
        const isTop = i % 2 === 0;
        elements.push(
          { type: 'shape', content: '', x: cx, y: 465, width: 54, height: 54, style: { shapeType: 'circle', shapeFill: p.primary, borderRadius: 27 } },
          { type: 'text', content: String(i + 1), x: cx + 5, y: 475, width: 44, height: 34, style: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' } },
          { type: 'text', content: date, x: cx - 40, y: isTop ? 380 : 540, width: 134, height: 30, style: { fontSize: 13, color: p.text, textAlign: 'center', opacity: 0.5 } },
          { type: 'text', content: labels[i], x: cx - 40, y: isTop ? 340 : 570, width: 134, height: 40, style: { fontSize: 16, fontWeight: 'bold', color: p.text, textAlign: 'center' } },
        );
      });
      return elements;
    },
  },
  {
    id: 'funnel-4',
    name: 'Funnel',
    category: 'Conversion',
    icon: <Target className="w-4 h-4" />,
    description: '4-stage conversion funnel',
    preview: [
      { type: 'rect', color: '#4F46E5', x: 10, y: 10, w: 80, h: 18 },
      { type: 'rect', color: '#7C3AED', x: 18, y: 32, w: 64, h: 18 },
      { type: 'rect', color: '#9333EA', x: 26, y: 54, w: 48, h: 18 },
      { type: 'rect', color: '#A855F7', x: 34, y: 76, w: 32, h: 18 },
    ],
    generate: (p) => {
      const stages = ['Awareness', 'Interest', 'Decision', 'Action'];
      const values = ['10,000', '4,500', '1,200', '800'];
      const widths = [1400, 1100, 800, 500];
      const colors = [p.primary, p.secondary, p.accent, p.primary];
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Conversion Funnel', x: 80, y: 60, width: 600, height: 70, style: { fontSize: 36, fontWeight: 'bold', color: p.text } },
      ];
      stages.forEach((stage, i) => {
        const cx = 960 - widths[i] / 2;
        const cy = 220 + i * 180;
        elements.push(
          { type: 'shape', content: '', x: cx, y: cy, width: widths[i], height: 140, style: { shapeType: 'rectangle', shapeFill: colors[i], borderRadius: 16 } },
          { type: 'text', content: stage, x: cx + 40, y: cy + 25, width: widths[i] - 200, height: 40, style: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' } },
          { type: 'text', content: values[i], x: cx + widths[i] - 200, y: cy + 25, width: 160, height: 40, style: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', textAlign: 'right' } },
          { type: 'text', content: 'Stage description goes here', x: cx + 40, y: cy + 75, width: widths[i] - 80, height: 30, style: { fontSize: 13, color: '#ffffff', opacity: 0.7 } },
        );
      });
      return elements;
    },
  },
  {
    id: 'grid-4',
    name: '4-Feature Grid',
    category: 'Features',
    icon: <LayoutGrid className="w-4 h-4" />,
    description: '2x2 grid of feature cards',
    preview: [
      { type: 'rect', color: '#4F46E5', x: 5, y: 5, w: 43, h: 43 },
      { type: 'rect', color: '#7C3AED', x: 52, y: 5, w: 43, h: 43 },
      { type: 'rect', color: '#9333EA', x: 5, y: 52, w: 43, h: 43 },
      { type: 'rect', color: '#A855F7', x: 52, y: 52, w: 43, h: 43 },
    ],
    generate: (p) => {
      const features = ['Fast & Reliable', 'Secure by Default', 'Easy to Scale', 'Great Support'];
      const descs = ['Lightning-fast performance you can depend on.', 'Enterprise-grade security built in.', 'Grow from startup to enterprise seamlessly.', '24/7 expert support when you need it.'];
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Why Choose Us', x: 80, y: 60, width: 600, height: 70, style: { fontSize: 36, fontWeight: 'bold', color: p.text } },
      ];
      features.forEach((feat, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 120 + col * 880;
        const cy = 220 + row * 380;
        const colors = [p.primary, p.secondary, p.accent, p.primary];
        elements.push(
          { type: 'shape', content: '', x: cx, y: cy, width: 800, height: 320, style: { shapeType: 'rectangle', shapeFill: colors[i], borderRadius: 20 } },
          { type: 'text', content: feat, x: cx + 40, y: cy + 40, width: 720, height: 60, style: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' } },
          { type: 'text', content: descs[i], x: cx + 40, y: cy + 120, width: 720, height: 100, style: { fontSize: 16, color: '#ffffff', opacity: 0.85, lineHeight: 1.6 } },
        );
      });
      return elements;
    },
  },
  {
    id: 'stats-3',
    name: 'Big Numbers',
    category: 'Statistics',
    icon: <TrendingUp className="w-4 h-4" />,
    description: '3 large statistics with labels',
    preview: [
      { type: 'rect', color: '#4F46E5', x: 5, y: 30, w: 28, h: 50 },
      { type: 'rect', color: '#7C3AED', x: 36, y: 30, w: 28, h: 50 },
      { type: 'rect', color: '#9333EA', x: 67, y: 30, w: 28, h: 50 },
    ],
    generate: (p) => {
      const stats = [
        { value: '98%', label: 'Customer Satisfaction' },
        { value: '2.5x', label: 'Revenue Growth' },
        { value: '50+', label: 'Countries Served' },
      ];
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Key Metrics', x: 80, y: 80, width: 600, height: 70, style: { fontSize: 36, fontWeight: 'bold', color: p.text } },
        { type: 'text', content: 'Our numbers speak for themselves.', x: 80, y: 160, width: 600, height: 40, style: { fontSize: 16, color: p.text, opacity: 0.5 } },
      ];
      stats.forEach((stat, i) => {
        const cx = 120 + i * 580;
        elements.push(
          { type: 'shape', content: '', x: cx, y: 320, width: 500, height: 500, style: { shapeType: 'rectangle', shapeFill: i === 0 ? p.primary : i === 1 ? p.secondary : p.accent, borderRadius: 24 } },
          { type: 'text', content: stat.value, x: cx + 40, y: 400, width: 420, height: 180, style: { fontSize: 80, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' } },
          { type: 'text', content: stat.label, x: cx + 40, y: 620, width: 420, height: 50, style: { fontSize: 18, color: '#ffffff', textAlign: 'center', opacity: 0.85 } },
        );
      });
      return elements;
    },
  },
  {
    id: 'cycle-4',
    name: 'Cycle Diagram',
    category: 'Process',
    icon: <Workflow className="w-4 h-4" />,
    description: 'Circular process with 4 stages',
    preview: [
      { type: 'circle', color: '#4F46E5', x: 35, y: 5, w: 30, h: 30 },
      { type: 'circle', color: '#7C3AED', x: 65, y: 35, w: 30, h: 30 },
      { type: 'circle', color: '#9333EA', x: 35, y: 65, w: 30, h: 30 },
      { type: 'circle', color: '#A855F7', x: 5, y: 35, w: 30, h: 30 },
    ],
    generate: (p) => {
      const stages = ['Discover', 'Design', 'Develop', 'Deploy'];
      const positions = [
        { x: 760, y: 180 }, // top
        { x: 1200, y: 420 }, // right
        { x: 760, y: 660 }, // bottom
        { x: 320, y: 420 }, // left
      ];
      const colors = [p.primary, p.secondary, p.accent, p.primary];
      const elements: Partial<SlideElement>[] = [
        { type: 'text', content: 'Development Cycle', x: 700, y: 430, width: 520, height: 60, style: { fontSize: 24, fontWeight: 'bold', color: p.text, textAlign: 'center' } },
      ];
      stages.forEach((stage, i) => {
        const pos = positions[i];
        elements.push(
          { type: 'shape', content: '', x: pos.x, y: pos.y, width: 200, height: 200, style: { shapeType: 'circle', shapeFill: colors[i], borderRadius: 100 } },
          { type: 'text', content: stage, x: pos.x + 10, y: pos.y + 70, width: 180, height: 60, style: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' } },
        );
      });
      return elements;
    },
  },
];

interface Props {
  onClose: () => void;
}

export default function InfographicsDialog({ onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { addElement, presentation } = useEditorStore();
  const palette = presentation.theme.tokens.palette;

  const handleInsert = () => {
    const template = TEMPLATES.find(t => t.id === selected);
    if (!template) return;

    const elements = template.generate(palette);
    elements.forEach(el => {
      addElement({
        type: el.type as any || 'text',
        content: el.content || '',
        x: el.x || 0,
        y: el.y || 0,
        width: el.width || 100,
        height: el.height || 100,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        style: el.style || {},
      });
    });

    toast.success(`${template.name} added!`);
    onClose();
  };

  const categories = [...new Set(TEMPLATES.map(t => t.category))];

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
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Infographics</h3>
              <p className="text-xs text-slate-400">Pre-designed layouts using your theme colors</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`relative group rounded-xl border-2 p-3 text-left transition-all ${
                  selected === t.id
                    ? 'border-[#4F46E5] bg-indigo-50/50 shadow-md shadow-[#4F46E5]/10'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Mini preview */}
                <div className="w-full aspect-[16/10] bg-slate-100 rounded-lg mb-2 relative overflow-hidden">
                  {t.preview.map((block, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${block.x}%`,
                        top: `${block.y}%`,
                        width: `${block.w}%`,
                        height: `${block.h}%`,
                        backgroundColor: block.color,
                        borderRadius: block.type === 'circle' ? '50%' : 4,
                        opacity: 0.9,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{t.icon}</span>
                  <span className="text-xs font-semibold text-slate-700">{t.name}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 shrink-0">
          <Button
            onClick={handleInsert}
            disabled={!selected}
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white rounded-xl shadow-lg shadow-[#4F46E5]/20 disabled:opacity-50"
          >
            Insert Infographic
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
