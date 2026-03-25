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

/** Light tint of a hex color (appends hex opacity) */
const tint = (color: string, opacity: string) => color + opacity;

// ── Templates ──
const TEMPLATES: Template[] = [
  {
    id: 'process-horizontal',
    name: 'Process Flow',
    category: 'Process',
    description: '4 connected step cards with numbered circles and accent borders',
    generate: (p, t) => {
      const els: El[] = [];
      // Full slide subtle background
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '08'), 0));
      // Top accent stripe
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      // Title area
      els.push(txt('Your Process Title', 120, 70, 900, 70, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('Describe the overall process in one line.', 120, 148, 900, 36, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      // Decorative accent line under subtitle
      els.push(box(120, 196, 80, 3, p.primary, 2));

      const steps = [
        { num: '01', title: 'Research', desc: 'Gather data and insights from your target audience and market.' },
        { num: '02', title: 'Strategy', desc: 'Define goals, KPIs and the action plan for execution.' },
        { num: '03', title: 'Execute', desc: 'Implement the plan with your cross-functional team.' },
        { num: '04', title: 'Measure', desc: 'Track results, iterate and optimize for growth.' },
      ];
      const colors = [p.primary, p.secondary, p.accent, p.primary];

      steps.forEach((s, i) => {
        const cx = 120 + i * 430;
        const cy = 310;
        const cardW = 390;
        const cardH = 580;
        const color = colors[i];

        // Card shadow (offset rect)
        els.push(box(cx + 6, cy + 6, cardW, cardH, tint(p.text, '08'), 18));
        // Card background (white)
        els.push(box(cx, cy, cardW, cardH, '#ffffff', 18));
        // Left accent border
        els.push(box(cx, cy, 6, cardH, color, 18));
        // Number circle
        els.push(circle(cx + 30, cy + 35, 56, color));
        els.push(txt(s.num, cx + 34, cy + 47, 48, 34, { fontSize: 20, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', fontFamily: t.titleFont }));
        // Title
        els.push(txt(s.title, cx + 105, cy + 42, 260, 44, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text }));
        // Divider
        els.push(box(cx + 30, cy + 118, 330, 2, tint(p.text, '10'), 1));
        // Description
        els.push(txt(s.desc, cx + 30, cy + 145, 330, 140, { fontSize: t.bodySize, color: p.text, opacity: 0.65, lineHeight: 1.7, fontFamily: t.bodyFont }));

        // Connector arrow between cards
        if (i < 3) {
          // Horizontal line
          els.push(box(cx + cardW + 8, cy + 62, 28, 3, tint(p.text, '25'), 0));
          // Arrow head
          els.push(txt('\u203A', cx + cardW + 18, cy + 40, 30, 44, { fontSize: 32, color: tint(p.text, '30'), textAlign: 'center' }));
        }
      });
      return els;
    },
  },
  {
    id: 'stats-dashboard',
    name: 'Key Metrics',
    category: 'Statistics',
    description: '2\u00D72 metric cards with large numbers and colored underlines',
    generate: (p, t) => {
      const els: El[] = [];
      // Full background tint
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '06'), 0));
      // Top accent
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      // Title
      els.push(txt('Key Metrics', 120, 65, 700, 70, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('Performance overview for the current quarter.', 120, 143, 700, 36, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      els.push(box(120, 191, 80, 3, p.primary, 2));

      const stats = [
        { value: '$2.4M', label: 'Revenue', change: '+24% vs last quarter' },
        { value: '12,847', label: 'Active Users', change: '+18% vs last quarter' },
        { value: '94.2%', label: 'Satisfaction', change: '+3.1% vs last quarter' },
        { value: '47 days', label: 'Avg. Sales Cycle', change: '\u221212% vs last quarter' },
      ];
      const colors = [p.primary, p.accent, p.secondary, p.primary];

      // Central divider lines
      els.push(box(960, 270, 2, 720, tint(p.text, '10'), 0)); // vertical
      els.push(box(140, 630, 1640, 2, tint(p.text, '10'), 0)); // horizontal

      stats.forEach((s, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 180 + col * 860;
        const cy = 310 + row * 360;

        // Value
        els.push(txt(s.value, cx, cy, 600, 100, { fontSize: 72, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
        // Colored underline accent
        els.push(box(cx, cy + 105, 100, 4, colors[i], 2));
        // Label
        els.push(txt(s.label, cx, cy + 130, 400, 36, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text, opacity: 0.8 }));
        // Change
        els.push(txt(s.change, cx, cy + 175, 400, 28, { fontSize: Math.round(t.bodySize * 0.45), fontFamily: t.bodyFont, color: colors[i], opacity: 0.7 }));
      });
      return els;
    },
  },
  {
    id: 'comparison-vs',
    name: 'Before / After',
    category: 'Comparison',
    description: 'Clean two-column comparison with a central VS divider',
    generate: (p, t) => {
      const els: El[] = [];
      // Full background
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '06'), 0));
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      // Title
      els.push(txt('Before vs After', 120, 55, 800, 65, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('See the transformation at a glance.', 120, 128, 800, 34, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      els.push(box(120, 174, 80, 3, p.primary, 2));

      // Center VS divider — vertical line
      els.push(box(956, 240, 3, 780, tint(p.text, '15'), 0));
      // VS circle
      els.push(circle(920, 530, 72, p.accent));
      els.push(txt('VS', 928, 546, 56, 36, { fontSize: Math.round(t.bodySize * 0.75), fontWeight: 'bold', fontFamily: t.titleFont, color: '#ffffff', textAlign: 'center' }));

      // ── Left column (Before) ──
      // Card shadow
      els.push(box(96, 246, 810, 730, tint(p.text, '06'), 20));
      // Card
      els.push(box(90, 240, 810, 730, '#ffffff', 20));
      // Header bar
      els.push(box(90, 240, 810, 70, tint(p.primary, '12'), 20));
      els.push(txt('Before', 140, 252, 300, 46, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: p.primary }));

      const beforeItems = ['Manual data entry', 'Slow decision making', 'Scattered communication', 'No real-time visibility', 'High error rate'];
      beforeItems.forEach((item, i) => {
        const iy = 350 + i * 110;
        // X icon circle
        els.push(circle(135, iy, 36, tint(p.primary, '15')));
        els.push(txt('\u2717', 140, iy + 3, 28, 28, { fontSize: 18, color: p.primary, textAlign: 'center', fontWeight: 'bold' }));
        // Text
        els.push(txt(item, 190, iy + 4, 650, 32, { fontSize: t.bodySize, fontFamily: t.bodyFont, color: p.text, opacity: 0.75 }));
        // Separator
        if (i < beforeItems.length - 1) {
          els.push(box(135, iy + 72, 700, 1, tint(p.text, '08'), 0));
        }
      });

      // ── Right column (After) ──
      els.push(box(1016, 246, 810, 730, tint(p.text, '06'), 20));
      els.push(box(1010, 240, 810, 730, '#ffffff', 20));
      els.push(box(1010, 240, 810, 70, tint(p.accent, '12'), 20));
      els.push(txt('After', 1060, 252, 300, 46, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: p.accent }));

      const afterItems = ['Automated workflows', 'AI-powered insights', 'Unified platform', 'Real-time dashboards', 'Near-zero errors'];
      afterItems.forEach((item, i) => {
        const iy = 350 + i * 110;
        els.push(circle(1055, iy, 36, tint(p.accent, '18')));
        els.push(txt('\u2713', 1060, iy + 3, 28, 28, { fontSize: 18, color: p.accent, textAlign: 'center', fontWeight: 'bold' }));
        els.push(txt(item, 1110, iy + 4, 650, 32, { fontSize: t.bodySize, fontFamily: t.bodyFont, color: p.text, opacity: 0.75 }));
        if (i < afterItems.length - 1) {
          els.push(box(1055, iy + 72, 700, 1, tint(p.text, '08'), 0));
        }
      });

      return els;
    },
  },
  {
    id: 'timeline-roadmap',
    name: 'Roadmap Timeline',
    category: 'Timeline',
    description: 'Alternating top/bottom milestone cards on a horizontal axis',
    generate: (p, t) => {
      const els: El[] = [];
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '06'), 0));
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      els.push(txt('Product Roadmap', 120, 65, 700, 65, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('Key milestones for the next 12 months.', 120, 138, 700, 34, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      els.push(box(120, 184, 80, 3, p.primary, 2));

      // Main horizontal timeline line
      const lineY = 540;
      els.push(box(100, lineY - 2, 1720, 4, p.primary, 2));
      // Endpoint dots
      els.push(circle(88, lineY - 8, 16, p.primary));
      els.push(circle(1816, lineY - 8, 16, p.primary));

      const milestones = [
        { date: 'Q1 2026', title: 'Beta Launch', desc: 'Release beta to early adopters and gather feedback from first users.' },
        { date: 'Q2 2026', title: 'Public Launch', desc: 'Full public release with a comprehensive marketing campaign.' },
        { date: 'Q3 2026', title: 'Enterprise', desc: 'Enterprise features including SSO, audit logs and compliance.' },
        { date: 'Q4 2026', title: 'Scale', desc: 'International expansion and strategic partnerships worldwide.' },
      ];
      const colors = [p.primary, p.secondary, p.accent, p.primary];

      milestones.forEach((m, i) => {
        const cx = 200 + i * 400;
        const isTop = i % 2 === 0;
        const cardW = 320;
        const cardH = 220;
        const cardY = isTop ? 250 : 600;
        const color = colors[i];

        // Dot on timeline
        els.push(circle(cx + 18, lineY - 14, 28, '#ffffff'));
        els.push(circle(cx + 22, lineY - 10, 20, color));

        // Vertical connector
        if (isTop) {
          els.push(box(cx + 30, cardY + cardH, 2, lineY - cardY - cardH - 14, tint(color, '50'), 0));
        } else {
          els.push(box(cx + 30, lineY + 16, 2, cardY - lineY - 16, tint(color, '50'), 0));
        }

        // Card shadow
        els.push(box(cx - 50 + 5, cardY + 5, cardW, cardH, tint(p.text, '06'), 16));
        // Card
        els.push(box(cx - 50, cardY, cardW, cardH, '#ffffff', 16));
        // Top accent line on card
        els.push(box(cx - 50, cardY, cardW, 5, color, 16));

        // Date badge
        els.push(box(cx - 20, cardY + 22, 110, 30, tint(color, '15'), 8));
        els.push(txt(m.date, cx - 15, cardY + 25, 100, 24, { fontSize: Math.round(t.bodySize * 0.45), fontWeight: 'bold', color: color, textAlign: 'center', fontFamily: t.bodyFont }));
        // Title
        els.push(txt(m.title, cx - 30, cardY + 68, 280, 38, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text }));
        // Description
        els.push(txt(m.desc, cx - 30, cardY + 116, 280, 80, { fontSize: Math.round(t.bodySize * 0.45), fontFamily: t.bodyFont, color: p.text, opacity: 0.55, lineHeight: 1.6 }));
      });
      return els;
    },
  },
  {
    id: 'funnel-conversion',
    name: 'Conversion Funnel',
    category: 'Conversion',
    description: 'Tapered funnel stages with percentage indicators on the side',
    generate: (p, t) => {
      const els: El[] = [];
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '06'), 0));
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      els.push(txt('Conversion Funnel', 120, 65, 700, 65, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('How visitors become customers.', 120, 138, 700, 34, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      els.push(box(120, 184, 80, 3, p.primary, 2));

      const stages = [
        { label: 'Visitors', value: '50,000', pct: '100%', desc: 'Total website visitors this period' },
        { label: 'Leads', value: '12,500', pct: '25%', desc: 'Signed up or submitted a form' },
        { label: 'Qualified', value: '3,750', pct: '7.5%', desc: 'Met criteria for sales outreach' },
        { label: 'Customers', value: '1,125', pct: '2.25%', desc: 'Completed purchase or contract' },
      ];
      const colors = [p.primary, p.secondary, p.accent, p.primary];
      const stageCount = stages.length;

      stages.forEach((s, i) => {
        const maxW = 1100;
        const minW = 400;
        const w = maxW - (maxW - minW) * (i / (stageCount - 1));
        const h = 150;
        const cy = 250 + i * 190;
        const cx = 700 - w / 2; // Left-aligned funnel center at ~700

        // Tapered bar shadow
        els.push(box(cx + 5, cy + 5, w, h, tint(p.text, '06'), 16));
        // Tapered bar
        els.push(box(cx, cy, w, h, colors[i], 16));

        // Stage label
        els.push(txt(s.label, cx + 35, cy + 18, 300, 40, { fontSize: Math.round(t.titleSize * 0.5), fontWeight: 'bold', fontFamily: t.titleFont, color: '#ffffff' }));
        // Description
        els.push(txt(s.desc, cx + 35, cy + 65, w - 80, 30, { fontSize: Math.round(t.bodySize * 0.45), fontFamily: t.bodyFont, color: '#ffffff', opacity: 0.7 }));
        // Value
        els.push(txt(s.value, cx + 35, cy + 100, 200, 36, { fontSize: 28, fontWeight: 'bold', color: '#ffffff', opacity: 0.9 }));

        // Side percentage indicator (right side)
        const indicatorX = 1380;
        els.push(box(indicatorX, cy + 30, 120, 50, tint(colors[i], '15'), 12));
        els.push(txt(s.pct, indicatorX + 10, cy + 38, 100, 34, { fontSize: 22, fontWeight: 'bold', color: colors[i], textAlign: 'center', fontFamily: t.titleFont }));

        // Connector line from bar to indicator
        els.push(box(cx + w + 10, cy + 54, indicatorX - cx - w - 10, 2, tint(colors[i], '30'), 0));

        // Drop-off arrow between stages
        if (i < stageCount - 1) {
          els.push(txt('\u25BE', 700, cy + h + 4, 30, 30, { fontSize: 22, color: tint(p.text, '20'), textAlign: 'center' }));
        }
      });

      return els;
    },
  },
  {
    id: 'features-grid',
    name: 'Feature Grid',
    category: 'Features',
    description: '6 numbered feature cards in a clean 3\u00D72 grid layout',
    generate: (p, t) => {
      const els: El[] = [];
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '06'), 0));
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      els.push(txt('What We Offer', 120, 50, 700, 60, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('Everything you need in one platform.', 120, 118, 700, 32, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      els.push(box(120, 162, 80, 3, p.primary, 2));

      const features = [
        { num: '01', title: 'Lightning Fast', desc: 'Sub-second response times across all features and endpoints.' },
        { num: '02', title: 'Enterprise Security', desc: 'Bank-grade encryption, SOC2 compliance, and audit trails.' },
        { num: '03', title: 'Deep Analytics', desc: 'Actionable insights with real-time dashboards and reports.' },
        { num: '04', title: 'Integrations', desc: 'Connect with 100+ tools your team already uses daily.' },
        { num: '05', title: 'Collaboration', desc: 'Work together in real-time with comments and approvals.' },
        { num: '06', title: 'Automation', desc: 'Set rules once, let the system handle the rest automatically.' },
      ];
      const colors = [p.primary, p.secondary, p.accent, p.accent, p.primary, p.secondary];

      features.forEach((f, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 100 + col * 590;
        const cy = 210 + row * 420;
        const cardW = 550;
        const cardH = 380;
        const color = colors[i];

        // Card shadow
        els.push(box(cx + 5, cy + 5, cardW, cardH, tint(p.text, '05'), 18));
        // Card
        els.push(box(cx, cy, cardW, cardH, '#ffffff', 18));
        // Thin top border
        els.push(box(cx, cy, cardW, 4, color, 18));

        // Number circle
        els.push(circle(cx + 35, cy + 35, 52, color));
        els.push(txt(f.num, cx + 39, cy + 46, 44, 32, { fontSize: 18, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', fontFamily: t.titleFont }));

        // Title
        els.push(txt(f.title, cx + 105, cy + 44, 410, 38, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text }));

        // Divider
        els.push(box(cx + 35, cy + 115, 480, 1, tint(p.text, '10'), 0));

        // Description
        els.push(txt(f.desc, cx + 35, cy + 145, 480, 100, { fontSize: t.bodySize, color: p.text, fontFamily: t.bodyFont, opacity: 0.6, lineHeight: 1.7 }));
      });
      return els;
    },
  },
  {
    id: 'pricing-table',
    name: 'Pricing Cards',
    category: 'Pricing',
    description: '3 pricing tiers with the middle card highlighted and elevated',
    generate: (p, t) => {
      const els: El[] = [];
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '06'), 0));
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      els.push(txt('Simple, Transparent Pricing', 120, 50, 900, 60, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('No hidden fees. Cancel anytime.', 120, 118, 700, 32, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      els.push(box(120, 162, 80, 3, p.primary, 2));

      const plans = [
        { name: 'Starter', price: '$9', period: '/month', features: ['5 projects', '10GB storage', 'Email support', 'Basic analytics'], cta: 'Get Started', featured: false },
        { name: 'Pro', price: '$29', period: '/month', features: ['Unlimited projects', '100GB storage', 'Priority support', 'Advanced analytics', 'Custom domain'], cta: 'Start Free Trial', featured: true },
        { name: 'Enterprise', price: '$99', period: '/month', features: ['Everything in Pro', 'Unlimited storage', 'Dedicated support', 'SSO & SAML', 'SLA guarantee', 'Custom integrations'], cta: 'Contact Sales', featured: false },
      ];

      plans.forEach((plan, i) => {
        const cx = 110 + i * 590;
        const isFeatured = plan.featured;
        const cy = isFeatured ? 195 : 225;
        const cardH = isFeatured ? 830 : 780;
        const cardW = 540;

        if (isFeatured) {
          // Glow shadow for featured
          els.push(box(cx - 4, cy - 4, cardW + 8, cardH + 8, tint(p.primary, '18'), 28));
        }
        // Card shadow
        els.push(box(cx + 5, cy + 5, cardW, cardH, tint(p.text, isFeatured ? '10' : '05'), 24));
        // Card
        els.push(box(cx, cy, cardW, cardH, isFeatured ? p.primary : '#ffffff', 24));

        const textColor = isFeatured ? '#ffffff' : p.text;

        if (isFeatured) {
          // "Most Popular" badge
          els.push(box(cx + 155, cy + 16, 230, 32, '#ffffff30', 16));
          els.push(txt('MOST POPULAR', cx + 160, cy + 19, 220, 26, { fontSize: Math.round(t.bodySize * 0.45), fontWeight: 'bold', color: '#ffffff', textAlign: 'center', fontFamily: t.bodyFont }));
        }

        const topOffset = isFeatured ? 65 : 30;

        // Plan name
        els.push(txt(plan.name, cx + 40, cy + topOffset, 460, 40, { fontSize: Math.round(t.titleSize * 0.6), fontWeight: 'bold', fontFamily: t.titleFont, color: textColor }));
        // Price
        els.push(txt(plan.price, cx + 40, cy + topOffset + 55, 200, 80, { fontSize: 64, fontWeight: 'bold', color: textColor, fontFamily: t.titleFont }));
        els.push(txt(plan.period, cx + 220, cy + topOffset + 85, 100, 28, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: textColor, opacity: 0.55 }));

        // Divider
        els.push(box(cx + 40, cy + topOffset + 150, 460, 1, isFeatured ? '#ffffff25' : tint(p.text, '10'), 0));

        // Features with checkmarks
        plan.features.forEach((feat, fi) => {
          const fy = cy + topOffset + 175 + fi * 50;
          // Check circle
          els.push(circle(cx + 45, fy + 2, 26, isFeatured ? '#ffffff20' : tint(p.primary, '12')));
          els.push(txt('\u2713', cx + 49, fy + 4, 20, 20, { fontSize: 13, color: isFeatured ? '#ffffff' : p.primary, textAlign: 'center', fontWeight: 'bold' }));
          els.push(txt(feat, cx + 85, fy + 3, 420, 28, { fontSize: t.bodySize, fontFamily: t.bodyFont, color: textColor, opacity: isFeatured ? 0.9 : 0.65 }));
        });

        // CTA button
        const btnY = cy + cardH - 85;
        const btnBg = isFeatured ? '#ffffff' : p.primary;
        const btnColor = isFeatured ? p.primary : '#ffffff';
        els.push(box(cx + 40, btnY, 460, 54, btnBg, 14));
        els.push(txt(plan.cta, cx + 40, btnY + 12, 460, 30, { fontSize: Math.round(t.bodySize * 0.6), fontWeight: 'bold', color: btnColor, textAlign: 'center', fontFamily: t.bodyFont }));
      });
      return els;
    },
  },
  {
    id: 'team-cards',
    name: 'Team Showcase',
    category: 'Team',
    description: '4 team member cards with photo placeholders, names, and roles',
    generate: (p, t) => {
      const els: El[] = [];
      els.push(box(0, 0, 1920, 1080, tint(p.primary, '06'), 0));
      els.push(box(0, 0, 1920, 6, p.primary, 0));
      els.push(txt('Meet Our Team', 120, 50, 700, 60, { fontSize: t.titleSize, fontWeight: 'bold', color: p.text, fontFamily: t.titleFont }));
      els.push(txt('The people behind the product.', 120, 118, 700, 32, { fontSize: Math.round(t.bodySize * 0.5), fontFamily: t.bodyFont, color: p.text, opacity: 0.45 }));
      els.push(box(120, 162, 80, 3, p.primary, 2));

      const members = [
        { name: 'Sarah Chen', initials: 'SC', role: 'CEO & Co-founder', bio: 'Previously VP at Google. Stanford MBA. 12 years of leadership experience.' },
        { name: 'Marcus Rivera', initials: 'MR', role: 'CTO', bio: '15 years in distributed systems. Ex-AWS. Built platforms serving 100M+ users.' },
        { name: 'Lisa Park', initials: 'LP', role: 'Head of Design', bio: 'Design lead at Figma, Apple alumna. Passionate about accessible design.' },
        { name: 'James Wilson', initials: 'JW', role: 'VP Sales', bio: '10 years enterprise sales at Salesforce. Grew ARR from $5M to $50M.' },
      ];
      const colors = [p.primary, p.secondary, p.accent, p.primary];

      members.forEach((m, i) => {
        const cx = 100 + i * 440;
        const cardW = 400;
        const cardH = 730;
        const color = colors[i];

        const cardY = 230;
        // Card shadow
        els.push(box(cx + 5, cardY + 5, cardW, cardH, tint(p.text, '05'), 20));
        // Card
        els.push(box(cx, cardY, cardW, cardH, '#ffffff', 20));

        // Colored header area
        els.push(box(cx, 230, cardW, 140, color, 20));
        // Overlay to square off bottom of header
        els.push(box(cx, 330, cardW, 40, color, 0));

        // Photo circle (white ring + colored circle)
        els.push(circle(cx + 135, 330, 130, '#ffffff'));
        els.push(circle(cx + 140, 335, 120, tint(color, '20')));
        // Initials
        els.push(txt(m.initials, cx + 148, 362, 104, 64, { fontSize: 40, fontWeight: 'bold', color: color, textAlign: 'center', fontFamily: t.titleFont }));

        // Name
        els.push(txt(m.name, cx + 20, 490, 360, 40, { fontSize: Math.round(t.titleSize * 0.5), fontWeight: 'bold', fontFamily: t.titleFont, color: p.text, textAlign: 'center' }));
        // Role badge
        els.push(box(cx + 100, 542, 200, 30, tint(color, '12'), 15));
        els.push(txt(m.role, cx + 20, 545, 360, 24, { fontSize: Math.round(t.bodySize * 0.45), fontWeight: 'bold', color: color, textAlign: 'center', fontFamily: t.bodyFont }));

        // Divider
        els.push(box(cx + 60, 595, 280, 1, tint(p.text, '10'), 0));

        // Bio
        els.push(txt(m.bio, cx + 35, 618, 330, 110, { fontSize: Math.round(t.bodySize * 0.45), fontFamily: t.bodyFont, color: p.text, opacity: 0.55, textAlign: 'center', lineHeight: 1.6 }));

        // Social placeholder circles
        const socY = 750;
        [0, 1, 2].forEach((si) => {
          els.push(circle(cx + 145 + si * 44, socY, 32, tint(color, '12')));
        });
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
