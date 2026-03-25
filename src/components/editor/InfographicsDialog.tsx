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

// ── Templates ──
const TEMPLATES: Template[] = [
  {
    id: 'process-horizontal',
    name: 'Process Flow',
    category: 'Process',
    description: '4 steps with arrows — edit each step title and description',
    generate: (p, t) => {
      const els: El[] = [
        // Full-slide background card
        box(60, 40, 1800, 1000, p.bg === '#ffffff' || p.bg === '#FFFFFF' ? '#f8fafc' : p.bg, 24),
        txt('Your Process Title', 100, 80, 800, 70, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('Describe the overall process in one line.', 100, 155, 800, 40, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
      ];
      const steps = [
        { num: '01', title: 'Research', desc: 'Gather data and insights from your target audience.' },
        { num: '02', title: 'Strategy', desc: 'Define goals, KPIs and the action plan.' },
        { num: '03', title: 'Execute', desc: 'Implement the plan with your team.' },
        { num: '04', title: 'Measure', desc: 'Track results and optimize for growth.' },
      ];
      steps.forEach((s, i) => {
        const cx = 120 + i * 420;
        const cy = 300;
        // Card
        els.push(box(cx, cy, 370, 560, i === 0 ? p.primary : i === 1 ? p.secondary : i === 2 ? p.accent : p.primary, 20));
        // Number
        els.push(txt(s.num, cx + 30, cy + 30, 100, 70, { fontSize: 48, fontWeight: 'bold', color: '#ffffff', opacity: 0.3 }));
        // Title
        els.push(txt(s.title, cx + 30, cy + 120, 310, 50, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: '#ffffff' }));
        // Divider
        els.push(box(cx + 30, cy + 185, 60, 3, '#ffffff', 2));
        // Description
        els.push(txt(s.desc, cx + 30, cy + 210, 310, 120, { fontSize: 14, color: '#ffffff', opacity: 0.85, lineHeight: 1.6 }));
        // Arrow between cards
        if (i < 3) {
          els.push(txt('→', cx + 380, cy + 250, 40, 50, { fontSize: 28, color: p.text, opacity: 0.3, textAlign: 'center' }));
        }
      });
      return els;
    },
  },
  {
    id: 'stats-dashboard',
    name: 'Key Metrics',
    category: 'Statistics',
    description: '4 big numbers with labels — just replace the values',
    generate: (p, t) => {
      const els: El[] = [
        txt('Key Metrics', 100, 80, 600, 70, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('Performance overview for the current quarter.', 100, 155, 600, 40, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
      ];
      const stats = [
        { value: '$2.4M', label: 'Revenue', change: '+24% vs last quarter' },
        { value: '12,847', label: 'Active Users', change: '+18% vs last quarter' },
        { value: '94.2%', label: 'Satisfaction', change: '+3.1% vs last quarter' },
        { value: '47 days', label: 'Avg. Sales Cycle', change: '-12% vs last quarter' },
      ];
      stats.forEach((s, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 100 + col * 880;
        const cy = 280 + row * 360;
        const colors = [p.primary, p.accent, p.secondary, p.primary];
        // Card
        els.push(box(cx, cy, 820, 300, colors[i], 20));
        // Value
        els.push(txt(s.value, cx + 50, cy + 40, 600, 110, { fontSize: 64, fontWeight: 'bold', color: '#ffffff' }));
        // Label
        els.push(txt(s.label, cx + 50, cy + 160, 400, 40, { fontSize: 20, color: '#ffffff', opacity: 0.9 }));
        // Change
        els.push(txt(s.change, cx + 50, cy + 210, 400, 30, { fontSize: 14, color: '#ffffff', opacity: 0.6 }));
      });
      return els;
    },
  },
  {
    id: 'comparison-vs',
    name: 'Before / After',
    category: 'Comparison',
    description: 'Two columns to compare — edit titles and bullet points',
    generate: (p, t) => {
      const els: El[] = [
        txt('Before vs After', 100, 80, 800, 70, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('See the transformation at a glance.', 100, 155, 800, 40, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
        // VS circle
        circle(900, 480, 80, p.accent),
        txt('VS', 912, 497, 56, 40, { fontSize: Math.round(t.bodySize * 0.75), fontWeight: 'bold', fontFamily: t.titleFont, color: '#ffffff', textAlign: 'center' }),
      ];
      // Left column — Before
      els.push(box(80, 260, 800, 700, p.primary, 20));
      els.push(txt('Before', 130, 300, 700, 50, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: '#ffffff' }));
      els.push(box(130, 370, 60, 3, '#ffffff', 2));
      const beforeItems = ['Manual data entry', 'Slow decision making', 'Scattered communication', 'No real-time visibility'];
      beforeItems.forEach((item, i) => {
        els.push(txt(`×  ${item}`, 130, 400 + i * 65, 700, 40, { fontSize: Math.round(t.bodySize * 0.7), fontFamily: t.bodyFont, color: '#ffffff', opacity: 0.9 }));
      });
      // Right column — After
      els.push(box(1040, 260, 800, 700, p.secondary, 20));
      els.push(txt('After', 1090, 300, 700, 50, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: '#ffffff' }));
      els.push(box(1090, 370, 60, 3, '#ffffff', 2));
      const afterItems = ['Automated workflows', 'AI-powered insights', 'Unified platform', 'Real-time dashboards'];
      afterItems.forEach((item, i) => {
        els.push(txt(`✓  ${item}`, 1090, 400 + i * 65, 700, 40, { fontSize: Math.round(t.bodySize * 0.7), fontFamily: t.bodyFont, color: '#ffffff', opacity: 0.9 }));
      });
      return els;
    },
  },
  {
    id: 'timeline-roadmap',
    name: 'Roadmap Timeline',
    category: 'Timeline',
    description: 'Horizontal roadmap with milestones — edit dates and titles',
    generate: (p, t) => {
      const els: El[] = [
        txt('Product Roadmap', 100, 80, 600, 70, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('Key milestones for the next 12 months.', 100, 155, 600, 40, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
        // Main timeline line
        box(140, 520, 1640, 4, p.primary, 2),
      ];
      const milestones = [
        { date: 'Q1 2026', title: 'Beta Launch', desc: 'Release beta to early adopters and gather feedback.' },
        { date: 'Q2 2026', title: 'Public Launch', desc: 'Full release with marketing campaign.' },
        { date: 'Q3 2026', title: 'Enterprise', desc: 'Enterprise features, SSO, and audit logs.' },
        { date: 'Q4 2026', title: 'Scale', desc: 'International expansion and partnerships.' },
      ];
      milestones.forEach((m, i) => {
        const cx = 200 + i * 400;
        const isTop = i % 2 === 0;
        const cardY = isTop ? 260 : 580;
        const dotY = 508;
        // Dot on line
        els.push(circle(cx + 15, dotY, 28, p.primary));
        // Connector line
        els.push(box(cx + 27, isTop ? cardY + 200 : 536, 3, isTop ? dotY - cardY - 200 : cardY - 536, p.primary, 0));
        // Card
        els.push(box(cx - 60, cardY, 320, 200, p.bg === '#ffffff' || p.bg === '#FFFFFF' ? '#f1f5f9' : p.primary + '18', 16));
        // Date
        els.push(txt(m.date, cx - 30, cardY + 20, 260, 30, { fontSize: 12, fontWeight: 'bold', color: p.primary, textAlign: 'center' }));
        // Title
        els.push(txt(m.title, cx - 30, cardY + 55, 260, 40, { fontSize: Math.round(t.bodySize * 0.75), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text, textAlign: 'center' }));
        // Description
        els.push(txt(m.desc, cx - 30, cardY + 105, 260, 70, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.6, textAlign: 'center', lineHeight: 1.5 }));
      });
      return els;
    },
  },
  {
    id: 'funnel-conversion',
    name: 'Conversion Funnel',
    category: 'Conversion',
    description: 'Funnel showing conversion stages — edit labels and numbers',
    generate: (p, t) => {
      const els: El[] = [
        txt('Conversion Funnel', 100, 80, 600, 70, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('How visitors become customers.', 100, 155, 600, 40, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
      ];
      const stages = [
        { label: 'Visitors', value: '50,000', pct: '100%', w: 1600 },
        { label: 'Leads', value: '12,500', pct: '25%', w: 1200 },
        { label: 'Qualified', value: '3,750', pct: '7.5%', w: 800 },
        { label: 'Customers', value: '1,125', pct: '2.25%', w: 500 },
      ];
      const colors = [p.primary, p.secondary, p.accent, p.primary];
      stages.forEach((s, i) => {
        const cx = 960 - s.w / 2;
        const cy = 260 + i * 180;
        els.push(box(cx, cy, s.w, 140, colors[i], 16));
        els.push(txt(s.label, cx + 40, cy + 20, 300, 40, { fontSize: Math.round(t.titleSize * 0.48), fontWeight: 'bold', fontFamily: t.titleFont, color: '#ffffff' }));
        els.push(txt(s.value, cx + s.w - 300, cy + 15, 260, 50, { fontSize: 36, fontWeight: 'bold', color: '#ffffff', textAlign: 'right' }));
        els.push(txt(s.pct, cx + s.w - 300, cy + 70, 260, 30, { fontSize: 14, color: '#ffffff', opacity: 0.7, textAlign: 'right' }));
        els.push(txt('Description of this stage.', cx + 40, cy + 75, 500, 30, { fontSize: Math.round(t.bodySize * 0.54), fontFamily: t.bodyFont, color: '#ffffff', opacity: 0.7 }));
      });
      return els;
    },
  },
  {
    id: 'features-grid',
    name: 'Feature Grid',
    category: 'Features',
    description: '6 feature cards in a grid — edit icon, title and description',
    generate: (p, t) => {
      const els: El[] = [
        txt('What We Offer', 100, 60, 600, 60, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('Everything you need in one platform.', 100, 125, 600, 35, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
      ];
      const features = [
        { icon: '⚡', title: 'Lightning Fast', desc: 'Sub-second response times across all features.' },
        { icon: '🔒', title: 'Secure', desc: 'Enterprise-grade encryption and compliance.' },
        { icon: '📊', title: 'Analytics', desc: 'Deep insights with real-time dashboards.' },
        { icon: '🔄', title: 'Integrations', desc: 'Connect with 100+ tools you already use.' },
        { icon: '👥', title: 'Collaboration', desc: 'Work together in real-time, anywhere.' },
        { icon: '🎯', title: 'Automation', desc: 'Set rules once, let the system handle the rest.' },
      ];
      const cardBg = p.bg === '#ffffff' || p.bg === '#FFFFFF' ? '#f8fafc' : p.bg;
      features.forEach((f, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 100 + col * 590;
        const cy = 210 + row * 400;
        // Card with subtle border
        els.push(box(cx, cy, 550, 350, cardBg, 20));
        // Accent bar at top
        els.push(box(cx, cy, 550, 6, [p.primary, p.secondary, p.accent, p.primary, p.secondary, p.accent][i], 20));
        // Icon circle
        els.push(circle(cx + 40, cy + 40, 60, [p.primary, p.secondary, p.accent, p.primary, p.secondary, p.accent][i]));
        els.push(txt(f.icon, cx + 48, cy + 50, 44, 40, { fontSize: 24, textAlign: 'center', color: '#ffffff' }));
        // Title
        els.push(txt(f.title, cx + 40, cy + 130, 470, 40, { fontSize: Math.round(t.titleSize * 0.48), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text }));
        // Desc
        els.push(txt(f.desc, cx + 40, cy + 185, 470, 80, { fontSize: Math.round(t.bodySize * 0.58), color: p.text, fontFamily: t.bodyFont, opacity: 0.6, lineHeight: 1.6 }));
      });
      return els;
    },
  },
  {
    id: 'pricing-table',
    name: 'Pricing Cards',
    category: 'Pricing',
    description: '3 pricing tiers side by side — edit plan names, prices and features',
    generate: (p, t) => {
      const els: El[] = [
        txt('Simple, Transparent Pricing', 100, 60, 800, 60, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('No hidden fees. Cancel anytime.', 100, 125, 600, 35, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
      ];
      const plans = [
        { name: 'Starter', price: '$9', period: '/month', features: ['5 projects', '10GB storage', 'Email support', 'Basic analytics'], cta: 'Get Started', featured: false },
        { name: 'Pro', price: '$29', period: '/month', features: ['Unlimited projects', '100GB storage', 'Priority support', 'Advanced analytics', 'Custom domain'], cta: 'Start Free Trial', featured: true },
        { name: 'Enterprise', price: '$99', period: '/month', features: ['Everything in Pro', 'Unlimited storage', 'Dedicated support', 'SSO & SAML', 'SLA guarantee', 'Custom integrations'], cta: 'Contact Sales', featured: false },
      ];
      plans.forEach((plan, i) => {
        const cx = 110 + i * 590;
        const cy = 210;
        const cardH = plan.featured ? 780 : 740;
        const cardBg = plan.featured ? p.primary : (p.bg === '#ffffff' || p.bg === '#FFFFFF' ? '#f8fafc' : p.bg);
        const textColor = plan.featured ? '#ffffff' : p.text;
        // Card
        els.push(box(cx, cy, 540, cardH, cardBg, 24));
        if (plan.featured) {
          els.push(txt('MOST POPULAR', cx + 160, cy + 20, 220, 25, { fontSize: 10, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', opacity: 0.7 }));
        }
        // Plan name
        els.push(txt(plan.name, cx + 40, cy + (plan.featured ? 55 : 35), 460, 40, { fontSize: Math.round(t.titleSize * 0.48), fontWeight: 'bold', fontFamily: t.titleFont, color: textColor }));
        // Price
        els.push(txt(plan.price, cx + 40, cy + (plan.featured ? 105 : 85), 200, 80, { fontSize: 56, fontWeight: 'bold', color: textColor }));
        els.push(txt(plan.period, cx + 200, cy + (plan.featured ? 140 : 120), 100, 30, { fontSize: Math.round(t.bodySize * 0.67), fontFamily: t.bodyFont, color: textColor, opacity: 0.6 }));
        // Divider
        els.push(box(cx + 40, cy + (plan.featured ? 200 : 180), 460, 1, plan.featured ? '#ffffff30' : '#e2e8f0', 0));
        // Features
        plan.features.forEach((feat, fi) => {
          els.push(txt(`✓  ${feat}`, cx + 40, cy + (plan.featured ? 220 : 200) + fi * 45, 460, 35, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: textColor, opacity: plan.featured ? 0.9 : 0.7 }));
        });
        // CTA button shape
        const btnY = cy + cardH - 80;
        els.push(box(cx + 40, btnY, 460, 50, plan.featured ? '#ffffff' : p.primary, 12));
        els.push(txt(plan.cta, cx + 40, btnY + 8, 460, 35, { fontSize: 15, fontWeight: 'bold', color: plan.featured ? p.primary : '#ffffff', textAlign: 'center' }));
      });
      return els;
    },
  },
  {
    id: 'team-cards',
    name: 'Team Showcase',
    category: 'Team',
    description: '4 team member cards — replace names, roles and photos',
    generate: (p, t) => {
      const els: El[] = [
        txt('Meet Our Team', 100, 60, 600, 60, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }),
        txt('The people behind the product.', 100, 125, 600, 35, { fontSize: Math.round(t.bodySize * 0.63), fontFamily: t.bodyFont, color: p.text, opacity: 0.5 }),
      ];
      const members = [
        { name: 'Sarah Chen', role: 'CEO & Co-founder', bio: 'Previously VP at Google. Stanford MBA.' },
        { name: 'Marcus Rivera', role: 'CTO', bio: '15 years in distributed systems. Ex-AWS.' },
        { name: 'Lisa Park', role: 'Head of Design', bio: 'Design lead at Figma, Apple alumna.' },
        { name: 'James Wilson', role: 'VP Sales', bio: '10 years enterprise sales. Ex-Salesforce.' },
      ];
      members.forEach((m, i) => {
        const cx = 100 + i * 440;
        const cardBg = p.bg === '#ffffff' || p.bg === '#FFFFFF' ? '#f8fafc' : p.bg;
        // Card
        els.push(box(cx, 230, 400, 720, cardBg, 20));
        // Photo placeholder circle
        els.push(circle(cx + 125, 280, 150, [p.primary, p.secondary, p.accent, p.primary][i]));
        els.push(txt(m.name[0], cx + 155, 310, 80, 80, { fontSize: 48, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }));
        // Name
        els.push(txt(m.name, cx + 30, 470, 340, 40, { fontSize: Math.round(t.titleSize * 0.5), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text, textAlign: 'center' }));
        // Role
        els.push(txt(m.role, cx + 30, 520, 340, 30, { fontSize: 14, fontWeight: 'bold', color: p.primary, textAlign: 'center' }));
        // Divider
        els.push(box(cx + 150, 570, 100, 2, p.primary, 1));
        // Bio
        els.push(txt(m.bio, cx + 30, 595, 340, 80, { fontSize: Math.round(t.bodySize * 0.54), fontFamily: t.bodyFont, color: p.text, opacity: 0.6, textAlign: 'center', lineHeight: 1.5 }));
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
