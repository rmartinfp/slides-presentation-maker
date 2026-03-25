import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { toast } from 'sonner';
import type { SlideElement } from '@/types/presentation';

type P = { primary: string; secondary: string; accent: string; text: string; bg: string };
type Typo = { titleFont: string; bodyFont: string; titleSize: number; bodySize: number };
type El = Partial<SlideElement>;

/** Returns true if the color is dark (needs light text on top) */
function isDark(hex: string): boolean {
  const c = hex.replace('#', '').slice(0, 6);
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
}

/** Get contrasting text color for a given background */
function contrastText(bgColor: string, lightOption = '#ffffff', darkOption?: string): string {
  return isDark(bgColor) ? lightOption : (darkOption || '#1e293b');
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  generate: (p: P, t: Typo) => El[];
}

// ── Helpers ──
const txt = (content: string, x: number, y: number, w: number, h: number, style: Record<string, any>): El => ({
  type: 'text', content, x, y, width: w, height: h, style: { textAlign: 'left', ...style },
});
const box = (x: number, y: number, w: number, h: number, fill: string, radius = 20): El => ({
  type: 'shape', content: '', x, y, width: w, height: h, style: { shapeType: 'rectangle', shapeFill: fill, borderRadius: radius },
});
const circle = (x: number, y: number, size: number, fill: string): El => ({
  type: 'shape', content: '', x, y, width: size, height: size, style: { shapeType: 'circle', shapeFill: fill, borderRadius: size / 2 },
});
const line = (x: number, y: number, w: number, h: number, color: string, width = 2): El => ({
  type: 'shape', content: '', x, y, width: w, height: h, style: { shapeType: 'line', shapeFill: 'transparent', shapeStroke: color, shapeStrokeWidth: width },
});

/** Light tint of a hex color (appends hex opacity) */
const tint = (color: string, opacity: string) => color + opacity;

// ── Templates ──
const TEMPLATES: Template[] = [
  {
    id: 'big-numbers',
    name: 'Big Numbers',
    category: 'Statistics',
    description: '3 large statistics with labels and colored accent underlines',
    generate: (p, t) => {
      const els: El[] = [];
      // Title
      els.push(txt('Key Results', 120, 80, 800, 80, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(box(120, 170, 80, 4, p.text, 2));

      const stats = [
        { value: '2.4M', label: 'Total Revenue' },
        { value: '98%', label: 'Customer Satisfaction' },
        { value: '150+', label: 'Global Partners' },
      ];

      stats.forEach((s, i) => {
        const cx = 160 + i * 560;
        const cy = 340;
        // Huge number
        els.push(txt(s.value, cx, cy, 480, 160, { fontSize: 80, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont, textAlign: 'center' }));
        // Colored underline
        els.push(box(cx + 140, cy + 170, 200, 5, p.text, 3));
        // Label
        els.push(txt(s.label, cx, cy + 210, 480, 60, { fontSize: t.bodySize, color: p.text, opacity: 0.6, fontFamily: t.bodyFont, textAlign: 'center' }));
      });
      return els;
    },
  },
  {
    id: 'process-steps',
    name: 'Process Steps',
    category: 'Process',
    description: '4 numbered steps connected by arrows in a horizontal flow',
    generate: (p, t) => {
      const els: El[] = [];
      // Title
      els.push(txt('Our Process', 120, 80, 800, 80, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(box(120, 170, 80, 4, p.text, 2));

      const steps = [
        { num: '1', title: 'Research', desc: 'Gather data and audience insights' },
        { num: '2', title: 'Strategy', desc: 'Define goals and action plan' },
        { num: '3', title: 'Execute', desc: 'Implement with the team' },
        { num: '4', title: 'Measure', desc: 'Track results and optimize' },
      ];

      steps.forEach((s, i) => {
        const cx = 120 + i * 450;
        const cy = 380;
        // Number circle
        els.push(circle(cx + 60, cy, 90, p.text));
        els.push(txt(s.num, cx + 64, cy + 16, 82, 60, { fontSize: 40, fontWeight: 'bold', color: contrastText(p.text), textAlign: 'center', fontFamily: t.titleFont }));
        // Title
        els.push(txt(s.title, cx, cy + 120, 210, 50, { fontSize: Math.round(t.titleSize * 0.65), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text, textAlign: 'center' }));
        // Description
        els.push(txt(s.desc, cx, cy + 180, 210, 60, { fontSize: t.bodySize, color: p.text, opacity: 0.6, fontFamily: t.bodyFont, textAlign: 'center', lineHeight: 1.5 }));
        // Arrow connector
        if (i < 3) {
          els.push(txt('\u2192', cx + 250, cy + 22, 80, 50, { fontSize: 36, color: tint(p.text, '30'), textAlign: 'center' }));
        }
      });
      return els;
    },
  },
  {
    id: 'comparison',
    name: 'Comparison',
    category: 'Comparison',
    description: 'Two-column layout with titles and bullet points separated by a divider',
    generate: (p, t) => {
      const els: El[] = [];
      // Title
      els.push(txt('Comparison', 120, 80, 800, 80, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(box(120, 170, 80, 4, p.text, 2));

      // Center divider
      els.push(box(940, 250, 4, 740, tint(p.text, '15'), 0));

      // Left column
      els.push(txt('Option A', 160, 280, 700, 60, { fontSize: Math.round(t.titleSize * 0.7), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text }));
      els.push(box(160, 350, 60, 4, p.text, 2));
      const leftItems = ['High performance under load', 'Built-in analytics dashboard', 'Scales to millions of users', 'Full API access included'];
      leftItems.forEach((item, i) => {
        const iy = 400 + i * 100;
        els.push(box(160, iy + 8, 8, 8, p.text, 4));
        els.push(txt(item, 195, iy, 680, 40, { fontSize: t.bodySize, fontFamily: t.bodyFont, color: p.text, opacity: 0.7 }));
      });

      // Right column
      els.push(txt('Option B', 1020, 280, 700, 60, { fontSize: Math.round(t.titleSize * 0.7), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text }));
      els.push(box(1020, 350, 60, 4, p.accent, 2));
      const rightItems = ['Simple setup in minutes', 'Lower upfront cost', 'Great for small teams', 'Community-driven support'];
      rightItems.forEach((item, i) => {
        const iy = 400 + i * 100;
        els.push(box(1020, iy + 8, 8, 8, p.accent, 4));
        els.push(txt(item, 1055, iy, 680, 40, { fontSize: t.bodySize, fontFamily: t.bodyFont, color: p.text, opacity: 0.7 }));
      });

      return els;
    },
  },
  {
    id: 'timeline',
    name: 'Timeline',
    category: 'Timeline',
    description: '4 milestones on a horizontal line, alternating top and bottom',
    generate: (p, t) => {
      const els: El[] = [];
      // Title
      els.push(txt('Timeline', 120, 60, 800, 80, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(box(120, 148, 80, 4, p.text, 2));

      // Horizontal timeline line
      const lineY = 540;
      els.push(box(120, lineY - 2, 1680, 4, p.text, 2));

      const milestones = [
        { date: 'Q1 2026', title: 'Research Phase', desc: 'Market analysis and user interviews' },
        { date: 'Q2 2026', title: 'Development', desc: 'Build core product features' },
        { date: 'Q3 2026', title: 'Beta Launch', desc: 'Early access for first users' },
        { date: 'Q4 2026', title: 'Public Release', desc: 'Full launch and marketing push' },
      ];

      milestones.forEach((m, i) => {
        const cx = 240 + i * 400;
        const isTop = i % 2 === 0;

        // Dot on line
        els.push(circle(cx - 10, lineY - 10, 20, p.text));

        // Vertical connector
        if (isTop) {
          els.push(box(cx - 1, lineY - 130, 2, 120, tint(p.text, '30'), 0));
        } else {
          els.push(box(cx - 1, lineY + 12, 2, 120, tint(p.text, '30'), 0));
        }

        const textY = isTop ? 240 : 680;
        // Date
        els.push(txt(m.date, cx - 100, textY, 200, 36, { fontSize: Math.round(t.bodySize * 0.8), fontWeight: 'bold', color: p.text, fontFamily: t.bodyFont, textAlign: 'center' }));
        // Title
        els.push(txt(m.title, cx - 130, textY + 45, 260, 44, { fontSize: Math.round(t.titleSize * 0.55), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text, textAlign: 'center' }));
        // Description
        els.push(txt(m.desc, cx - 130, textY + 95, 260, 50, { fontSize: t.bodySize, fontFamily: t.bodyFont, color: p.text, opacity: 0.55, textAlign: 'center', lineHeight: 1.5 }));
      });
      return els;
    },
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    category: 'Hierarchy',
    description: '3 horizontal bars stacked and narrowing upward showing hierarchy',
    generate: (p, t) => {
      const els: El[] = [];
      // Title
      els.push(txt('Priority Pyramid', 120, 80, 800, 80, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(box(120, 170, 80, 4, p.text, 2));

      const levels = [
        { label: 'Vision & Strategy', desc: 'Long-term direction and goals' },
        { label: 'Execution & Operations', desc: 'Day-to-day processes and delivery' },
        { label: 'Foundation & Infrastructure', desc: 'Tools, systems, and team capabilities' },
      ];
      const widths = [700, 1050, 1400];
      const opacities = ['FF', 'BB', '77'];

      levels.forEach((lv, i) => {
        const w = widths[i];
        const h = 180;
        const cx = (1920 - w) / 2;
        const cy = 280 + i * 230;
        const fillColor = tint(p.text, opacities[i]);

        // Bar
        els.push(box(cx, cy, w, h, fillColor, 16));
        // Label
        els.push(txt(lv.label, cx + 40, cy + 30, w - 80, 60, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: contrastText(fillColor), textAlign: 'center' }));
        // Description
        els.push(txt(lv.desc, cx + 40, cy + 100, w - 80, 50, { fontSize: t.bodySize, fontFamily: t.bodyFont, color: contrastText(fillColor), opacity: 0.75, textAlign: 'center' }));
      });
      return els;
    },
  },
  {
    id: 'feature-list',
    name: 'Feature List',
    category: 'Features',
    description: '2\u00D73 grid with numbered items, titles, and short descriptions',
    generate: (p, t) => {
      const els: El[] = [];
      // Title
      els.push(txt('Key Features', 120, 80, 800, 80, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(box(120, 170, 80, 4, p.text, 2));

      const features = [
        { num: '01', title: 'Fast Setup', desc: 'Get started in under five minutes' },
        { num: '02', title: 'Real-Time Sync', desc: 'Changes appear instantly everywhere' },
        { num: '03', title: 'Smart Analytics', desc: 'Insights that drive better decisions' },
        { num: '04', title: 'Team Collaboration', desc: 'Work together without friction' },
        { num: '05', title: 'Secure by Default', desc: 'Enterprise-grade data protection' },
        { num: '06', title: 'Flexible API', desc: 'Integrate with any existing tool' },
      ];

      features.forEach((f, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 140 + col * 560;
        const cy = 280 + row * 370;

        // Number circle
        els.push(circle(cx, cy, 64, p.text));
        els.push(txt(f.num, cx + 6, cy + 14, 52, 38, { fontSize: 22, fontWeight: 'bold', color: contrastText(p.text), textAlign: 'center', fontFamily: t.titleFont }));
        // Title
        els.push(txt(f.title, cx + 85, cy + 4, 400, 50, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text }));
        // Description
        els.push(txt(f.desc, cx + 85, cy + 55, 400, 40, { fontSize: t.bodySize, color: p.text, opacity: 0.6, fontFamily: t.bodyFont }));
      });
      return els;
    },
  },
  {
    id: 'quote',
    name: 'Quote',
    category: 'Quote',
    description: 'Large centered quote with author name and accent line',
    generate: (p, t) => {
      const els: El[] = [];
      // Top accent line
      els.push(box(810, 200, 300, 5, p.text, 3));
      // Large opening quote mark
      els.push(txt('\u201C', 720, 220, 100, 120, { fontSize: 120, color: tint(p.text, '25'), fontFamily: t.titleFont, textAlign: 'center' }));
      // Quote text
      els.push(txt('The best way to predict the future is to create it.', 260, 340, 1400, 200, { fontSize: Math.round(t.titleSize * 0.85), fontWeight: 'bold', color: p.text, fontFamily: t.titleFont, textAlign: 'center', lineHeight: 1.5 }));
      // Bottom accent line
      els.push(box(860, 590, 200, 4, p.text, 2));
      // Author
      els.push(txt('Peter Drucker', 260, 630, 1400, 60, { fontSize: Math.round(t.bodySize * 1.2), color: p.text, opacity: 0.6, fontFamily: t.bodyFont, textAlign: 'center' }));
      // Role / attribution
      els.push(txt('Management Consultant & Author', 260, 695, 1400, 50, { fontSize: t.bodySize, color: p.text, opacity: 0.4, fontFamily: t.bodyFont, textAlign: 'center' }));
      return els;
    },
  },
  {
    id: 'team',
    name: 'Team',
    category: 'Team',
    description: '4 circles with initials, names, and roles in a clean row',
    generate: (p, t) => {
      const els: El[] = [];
      // Title
      els.push(txt('Our Team', 120, 80, 800, 80, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(box(120, 170, 80, 4, p.text, 2));

      const members = [
        { initials: 'SC', name: 'Sarah Chen', role: 'CEO' },
        { initials: 'MR', name: 'Marcus Rivera', role: 'CTO' },
        { initials: 'LP', name: 'Lisa Park', role: 'Design Lead' },
        { initials: 'JW', name: 'James Wilson', role: 'VP Sales' },
      ];

      members.forEach((m, i) => {
        const cx = 170 + i * 420;
        const cy = 340;
        const circleSize = 160;

        // Avatar circle
        els.push(circle(cx, cy, circleSize, tint(p.text, '15')));
        // Initials
        els.push(txt(m.initials, cx + 16, cy + 40, circleSize - 32, 80, { fontSize: 48, fontWeight: 'bold', color: p.text, textAlign: 'center', fontFamily: t.titleFont }));
        // Name
        els.push(txt(m.name, cx - 40, cy + circleSize + 30, circleSize + 80, 50, { fontSize: Math.round(t.titleSize * 0.55), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text, textAlign: 'center' }));
        // Role
        els.push(txt(m.role, cx - 40, cy + circleSize + 85, circleSize + 80, 40, { fontSize: t.bodySize, color: p.text, opacity: 0.55, fontFamily: t.bodyFont, textAlign: 'center' }));
      });
      return els;
    },
  },
];

// ── Component ──
interface Props { onClose: () => void; }

export default function InfographicsDialog({ onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { addElement, presentation } = useEditorStore();
  const palette = presentation.theme.tokens.palette;
  const typo: Typo = presentation.theme.tokens.typography;

  const handleInsert = () => {
    const template = TEMPLATES.find(t => t.id === selected);
    if (!template) return;
    const elements = template.generate(palette, typo);
    elements.forEach(el => {
      addElement({
        type: (el.type as any) || 'text',
        content: el.content || '',
        x: el.x || 0, y: el.y || 0,
        width: el.width || 100, height: el.height || 100,
        rotation: 0, opacity: 1, locked: false, visible: true,
        style: el.style || {},
      });
    });
    toast.success(`${template.name} added!`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Infographics</h3>
              <p className="text-xs text-slate-400">Ready-to-use layouts with your theme colors — just edit the text</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {TEMPLATES.map(t => {
              const isSelected = selected === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-[#4F46E5] bg-indigo-50/50 shadow-lg shadow-[#4F46E5]/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  {/* Mini live preview */}
                  <div className="w-full aspect-[16/9] bg-slate-100 rounded-lg mb-3 relative overflow-hidden p-2">
                    {(() => {
                      const els = t.generate(palette, typo);
                      return els.map((el, i) => {
                        if (el.type === 'shape') {
                          return (
                            <div
                              key={i}
                              className="absolute"
                              style={{
                                left: `${((el.x || 0) / 1920) * 100}%`,
                                top: `${((el.y || 0) / 1080) * 100}%`,
                                width: `${((el.width || 0) / 1920) * 100}%`,
                                height: `${((el.height || 0) / 1080) * 100}%`,
                                backgroundColor: el.style?.shapeFill || '#ccc',
                                borderRadius: el.style?.shapeType === 'circle' ? '50%' : Math.min((el.style?.borderRadius as number || 0) * 0.3, 6),
                                opacity: (el.style?.opacity as number) ?? 1,
                              }}
                            />
                          );
                        }
                        if (el.type === 'text' && (el.style?.fontSize as number) >= 20) {
                          return (
                            <div
                              key={i}
                              className="absolute truncate"
                              style={{
                                left: `${((el.x || 0) / 1920) * 100}%`,
                                top: `${((el.y || 0) / 1080) * 100}%`,
                                width: `${((el.width || 0) / 1920) * 100}%`,
                                fontSize: Math.max(5, ((el.style?.fontSize as number) || 12) * 0.22),
                                fontWeight: el.style?.fontWeight as string,
                                color: el.style?.color as string || '#333',
                                opacity: (el.style?.opacity as number) ?? 1,
                              }}
                            >
                              {el.content}
                            </div>
                          );
                        }
                        return null;
                      });
                    })()}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">{t.name}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.description}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">{t.category}</span>
                  </div>
                </button>
              );
            })}
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
