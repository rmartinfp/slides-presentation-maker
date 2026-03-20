/**
 * Layout Library — Structural templates independent of visual theme.
 *
 * Each layout defines WHERE elements go (positions, sizes) and WHAT goes in them
 * (title, body, stats, images). The visual theme (colors, fonts, backgrounds)
 * is applied on top at render time.
 *
 * Coordinates are in the 1920x1080 canvas space.
 */

// ============ Layout Element Definitions ============

export type LayoutElementRole =
  | 'title'           // Main heading
  | 'subtitle'        // Secondary heading
  | 'body'            // Paragraph text
  | 'bullet-item'     // Single bullet point
  | 'stat-value'      // Big number (80%, $4.2B)
  | 'stat-label'      // Label under stat
  | 'image'           // Image placeholder
  | 'section-number'  // "01", "02"
  | 'quote'           // Quote text
  | 'quote-author'    // Quote attribution
  | 'label'           // Small label/tag
  | 'divider'         // Line separator
  | 'icon-placeholder' // Space for an icon/shape
  ;

export interface LayoutElement {
  role: LayoutElementRole;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Style hints — actual values come from the theme */
  style: {
    fontSizeRatio: number;    // 1 = body size, 2 = 2x body, 0.8 = smaller
    fontWeight?: 'bold' | 'normal';
    textAlign?: 'left' | 'center' | 'right';
    opacity?: number;
    maxChars?: number;        // Max characters for AI generation
    maxWords?: number;        // Max words for AI generation
  };
  /** Index for multiple items of same role (e.g., 3 stat cards) */
  index?: number;
}

export interface LayoutDefinition {
  id: string;
  name: string;
  description: string;
  category: LayoutCategory;
  elements: LayoutElement[];
  /** Suggested for these content types */
  bestFor: string[];
  /** How many content items this layout handles (for AI to know) */
  contentSlots: {
    titles: number;
    bodies: number;
    stats: number;
    images: number;
    bullets: number;
  };
}

export type LayoutCategory =
  | 'cover'          // Title slides
  | 'section'        // Section dividers
  | 'content'        // Text-heavy slides
  | 'data'           // Stats, charts, numbers
  | 'comparison'     // Side-by-side
  | 'visual'         // Image-focused
  | 'list'           // Bullet points, features
  | 'closing'        // Thank you, CTA
  ;

// ============ Layout Definitions ============

const L: LayoutDefinition[] = [

  // ---- COVER LAYOUTS ----
  {
    id: 'cover-centered',
    name: 'Cover — Centered',
    description: 'Title and subtitle centered on the slide',
    category: 'cover',
    bestFor: ['title', 'opening'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 200, y: 300, width: 1520, height: 250, style: { fontSizeRatio: 4, fontWeight: 'bold', textAlign: 'center', maxWords: 5 } },
      { role: 'subtitle', x: 400, y: 580, width: 1120, height: 100, style: { fontSizeRatio: 1.2, textAlign: 'center', opacity: 0.7, maxWords: 15 } },
    ],
  },
  {
    id: 'cover-left',
    name: 'Cover — Left Aligned',
    description: 'Title left with large text, subtitle below',
    category: 'cover',
    bestFor: ['title', 'opening'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 250, width: 1200, height: 350, style: { fontSizeRatio: 5, fontWeight: 'bold', textAlign: 'left', maxWords: 4 } },
      { role: 'subtitle', x: 120, y: 650, width: 800, height: 100, style: { fontSizeRatio: 1, textAlign: 'left', opacity: 0.6, maxWords: 20 } },
    ],
  },
  {
    id: 'cover-bottom',
    name: 'Cover — Bottom Heavy',
    description: 'Title at bottom, great with background images',
    category: 'cover',
    bestFor: ['title', 'visual opening'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 650, width: 1400, height: 250, style: { fontSizeRatio: 4.5, fontWeight: 'bold', textAlign: 'left', maxWords: 5 } },
      { role: 'subtitle', x: 120, y: 920, width: 800, height: 60, style: { fontSizeRatio: 0.9, textAlign: 'left', opacity: 0.6, maxWords: 15 } },
    ],
  },

  // ---- SECTION LAYOUTS ----
  {
    id: 'section-centered',
    name: 'Section — Centered',
    description: 'Section title centered with number',
    category: 'section',
    bestFor: ['section divider', 'topic introduction'],
    contentSlots: { titles: 1, bodies: 0, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'section-number', x: 860, y: 300, width: 200, height: 150, style: { fontSizeRatio: 5, fontWeight: 'bold', textAlign: 'center', opacity: 0.3 } },
      { role: 'title', x: 300, y: 440, width: 1320, height: 200, style: { fontSizeRatio: 3.5, fontWeight: 'bold', textAlign: 'center', maxWords: 5 } },
    ],
  },
  {
    id: 'section-left-number',
    name: 'Section — Left with Number',
    description: 'Big number left, title right',
    category: 'section',
    bestFor: ['section divider', 'chapter'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'section-number', x: 120, y: 250, width: 400, height: 400, style: { fontSizeRatio: 8, fontWeight: 'bold', textAlign: 'left', opacity: 0.15 } },
      { role: 'title', x: 120, y: 400, width: 1000, height: 200, style: { fontSizeRatio: 3, fontWeight: 'bold', textAlign: 'left', maxWords: 5 } },
      { role: 'body', x: 120, y: 620, width: 800, height: 100, style: { fontSizeRatio: 1, textAlign: 'left', opacity: 0.6, maxChars: 100 } },
    ],
  },

  // ---- CONTENT LAYOUTS ----
  {
    id: 'content-title-body',
    name: 'Content — Title + Body',
    description: 'Standard content slide with title and paragraph',
    category: 'content',
    bestFor: ['explanation', 'description', 'detail'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 120, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 8 } },
      { role: 'divider', x: 120, y: 220, width: 200, height: 4, style: { fontSizeRatio: 0 } },
      { role: 'body', x: 120, y: 260, width: 1680, height: 700, style: { fontSizeRatio: 1.2, textAlign: 'left', maxChars: 400 } },
    ],
  },
  {
    id: 'content-image-left',
    name: 'Content — Image Left',
    description: 'Image on the left, title and text on the right',
    category: 'content',
    bestFor: ['explanation with visual', 'feature', 'case study'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 1, bullets: 0 },
    elements: [
      { role: 'image', x: 60, y: 60, width: 860, height: 960, style: { fontSizeRatio: 0 } },
      { role: 'title', x: 1000, y: 120, width: 840, height: 120, style: { fontSizeRatio: 2.2, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'body', x: 1000, y: 280, width: 840, height: 650, style: { fontSizeRatio: 1, textAlign: 'left', maxChars: 350 } },
    ],
  },
  {
    id: 'content-image-right',
    name: 'Content — Image Right',
    description: 'Title and text on the left, image on the right',
    category: 'content',
    bestFor: ['explanation with visual', 'product feature'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 1, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 120, width: 840, height: 120, style: { fontSizeRatio: 2.2, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'body', x: 120, y: 280, width: 840, height: 650, style: { fontSizeRatio: 1, textAlign: 'left', maxChars: 350 } },
      { role: 'image', x: 1000, y: 60, width: 860, height: 960, style: { fontSizeRatio: 0 } },
    ],
  },
  {
    id: 'content-full-image-overlay',
    name: 'Content — Full Image + Text Overlay',
    description: 'Background image with text overlay',
    category: 'visual',
    bestFor: ['impactful statement', 'photo slide', 'mood'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 1, bullets: 0 },
    elements: [
      { role: 'image', x: 0, y: 0, width: 1920, height: 1080, style: { fontSizeRatio: 0, opacity: 0.5 } },
      { role: 'title', x: 120, y: 400, width: 1200, height: 200, style: { fontSizeRatio: 3.5, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'body', x: 120, y: 640, width: 900, height: 100, style: { fontSizeRatio: 1, textAlign: 'left', opacity: 0.8, maxChars: 150 } },
    ],
  },

  // ---- DATA LAYOUTS ----
  {
    id: 'stats-three-cards',
    name: 'Stats — Three Cards',
    description: 'Three big numbers with labels',
    category: 'data',
    bestFor: ['statistics', 'KPIs', 'metrics', 'highlights'],
    contentSlots: { titles: 1, bodies: 0, stats: 3, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'stat-value', x: 120, y: 350, width: 500, height: 200, style: { fontSizeRatio: 5, fontWeight: 'bold', textAlign: 'left' }, index: 0 },
      { role: 'stat-label', x: 120, y: 560, width: 500, height: 60, style: { fontSizeRatio: 1, textAlign: 'left', opacity: 0.6 }, index: 0 },
      { role: 'stat-value', x: 710, y: 350, width: 500, height: 200, style: { fontSizeRatio: 5, fontWeight: 'bold', textAlign: 'left' }, index: 1 },
      { role: 'stat-label', x: 710, y: 560, width: 500, height: 60, style: { fontSizeRatio: 1, textAlign: 'left', opacity: 0.6 }, index: 1 },
      { role: 'stat-value', x: 1300, y: 350, width: 500, height: 200, style: { fontSizeRatio: 5, fontWeight: 'bold', textAlign: 'left' }, index: 2 },
      { role: 'stat-label', x: 1300, y: 560, width: 500, height: 60, style: { fontSizeRatio: 1, textAlign: 'left', opacity: 0.6 }, index: 2 },
    ],
  },
  {
    id: 'stats-big-number',
    name: 'Stats — Big Number',
    description: 'One huge number with context',
    category: 'data',
    bestFor: ['key metric', 'highlight', 'impact'],
    contentSlots: { titles: 1, bodies: 1, stats: 1, images: 0, bullets: 0 },
    elements: [
      { role: 'stat-value', x: 120, y: 200, width: 1680, height: 350, style: { fontSizeRatio: 10, fontWeight: 'bold', textAlign: 'left' } },
      { role: 'title', x: 120, y: 580, width: 1200, height: 100, style: { fontSizeRatio: 2, fontWeight: 'bold', textAlign: 'left', maxWords: 8 } },
      { role: 'body', x: 120, y: 700, width: 1000, height: 100, style: { fontSizeRatio: 1, textAlign: 'left', opacity: 0.6, maxChars: 150 } },
    ],
  },

  // ---- COMPARISON LAYOUTS ----
  {
    id: 'comparison-two-columns',
    name: 'Comparison — Two Columns',
    description: 'Side by side comparison',
    category: 'comparison',
    bestFor: ['comparison', 'before/after', 'pros/cons', 'vs'],
    contentSlots: { titles: 1, bodies: 2, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'divider', x: 120, y: 200, width: 200, height: 4, style: { fontSizeRatio: 0 } },
      { role: 'subtitle', x: 120, y: 260, width: 820, height: 80, style: { fontSizeRatio: 1.5, fontWeight: 'bold', textAlign: 'left', maxWords: 4 }, index: 0 },
      { role: 'body', x: 120, y: 360, width: 820, height: 600, style: { fontSizeRatio: 1, textAlign: 'left', maxChars: 300 }, index: 0 },
      { role: 'subtitle', x: 1000, y: 260, width: 820, height: 80, style: { fontSizeRatio: 1.5, fontWeight: 'bold', textAlign: 'left', maxWords: 4 }, index: 1 },
      { role: 'body', x: 1000, y: 360, width: 820, height: 600, style: { fontSizeRatio: 1, textAlign: 'left', maxChars: 300 }, index: 1 },
    ],
  },
  {
    id: 'comparison-three-columns',
    name: 'Comparison — Three Columns',
    description: 'Three items side by side',
    category: 'comparison',
    bestFor: ['three options', 'three features', 'pricing tiers'],
    contentSlots: { titles: 1, bodies: 3, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'subtitle', x: 120, y: 260, width: 520, height: 80, style: { fontSizeRatio: 1.4, fontWeight: 'bold', textAlign: 'left', maxWords: 3 }, index: 0 },
      { role: 'body', x: 120, y: 360, width: 520, height: 600, style: { fontSizeRatio: 0.9, textAlign: 'left', maxChars: 200 }, index: 0 },
      { role: 'subtitle', x: 700, y: 260, width: 520, height: 80, style: { fontSizeRatio: 1.4, fontWeight: 'bold', textAlign: 'left', maxWords: 3 }, index: 1 },
      { role: 'body', x: 700, y: 360, width: 520, height: 600, style: { fontSizeRatio: 0.9, textAlign: 'left', maxChars: 200 }, index: 1 },
      { role: 'subtitle', x: 1280, y: 260, width: 520, height: 80, style: { fontSizeRatio: 1.4, fontWeight: 'bold', textAlign: 'left', maxWords: 3 }, index: 2 },
      { role: 'body', x: 1280, y: 360, width: 520, height: 600, style: { fontSizeRatio: 0.9, textAlign: 'left', maxChars: 200 }, index: 2 },
    ],
  },

  // ---- LIST LAYOUTS ----
  {
    id: 'list-bullets',
    name: 'List — Bullet Points',
    description: 'Title with bullet point list',
    category: 'list',
    bestFor: ['features', 'benefits', 'steps', 'key points'],
    contentSlots: { titles: 1, bodies: 0, stats: 0, images: 0, bullets: 5 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'bullet-item', x: 160, y: 260, width: 1600, height: 80, style: { fontSizeRatio: 1.2, textAlign: 'left', maxChars: 80 }, index: 0 },
      { role: 'bullet-item', x: 160, y: 370, width: 1600, height: 80, style: { fontSizeRatio: 1.2, textAlign: 'left', maxChars: 80 }, index: 1 },
      { role: 'bullet-item', x: 160, y: 480, width: 1600, height: 80, style: { fontSizeRatio: 1.2, textAlign: 'left', maxChars: 80 }, index: 2 },
      { role: 'bullet-item', x: 160, y: 590, width: 1600, height: 80, style: { fontSizeRatio: 1.2, textAlign: 'left', maxChars: 80 }, index: 3 },
      { role: 'bullet-item', x: 160, y: 700, width: 1600, height: 80, style: { fontSizeRatio: 1.2, textAlign: 'left', maxChars: 80 }, index: 4 },
    ],
  },
  {
    id: 'list-two-column-bullets',
    name: 'List — Two Column Bullets',
    description: 'Bullet points in two columns',
    category: 'list',
    bestFor: ['many features', 'pros and cons', 'checklist'],
    contentSlots: { titles: 1, bodies: 0, stats: 0, images: 0, bullets: 6 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'bullet-item', x: 160, y: 260, width: 780, height: 80, style: { fontSizeRatio: 1.1, textAlign: 'left', maxChars: 60 }, index: 0 },
      { role: 'bullet-item', x: 160, y: 370, width: 780, height: 80, style: { fontSizeRatio: 1.1, textAlign: 'left', maxChars: 60 }, index: 1 },
      { role: 'bullet-item', x: 160, y: 480, width: 780, height: 80, style: { fontSizeRatio: 1.1, textAlign: 'left', maxChars: 60 }, index: 2 },
      { role: 'bullet-item', x: 1000, y: 260, width: 780, height: 80, style: { fontSizeRatio: 1.1, textAlign: 'left', maxChars: 60 }, index: 3 },
      { role: 'bullet-item', x: 1000, y: 370, width: 780, height: 80, style: { fontSizeRatio: 1.1, textAlign: 'left', maxChars: 60 }, index: 4 },
      { role: 'bullet-item', x: 1000, y: 480, width: 780, height: 80, style: { fontSizeRatio: 1.1, textAlign: 'left', maxChars: 60 }, index: 5 },
    ],
  },

  // ---- QUOTE LAYOUTS ----
  {
    id: 'quote-centered',
    name: 'Quote — Centered',
    description: 'Big centered quote with attribution',
    category: 'content',
    bestFor: ['quote', 'testimonial', 'statement', 'key message'],
    contentSlots: { titles: 0, bodies: 0, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'quote', x: 200, y: 250, width: 1520, height: 350, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'center', maxChars: 200 } },
      { role: 'quote-author', x: 500, y: 650, width: 920, height: 60, style: { fontSizeRatio: 1, textAlign: 'center', opacity: 0.6, maxWords: 5 } },
    ],
  },

  // ---- TIMELINE ----
  {
    id: 'timeline-horizontal',
    name: 'Timeline — Horizontal',
    description: 'Horizontal timeline with 4 milestones',
    category: 'data',
    bestFor: ['timeline', 'roadmap', 'process', 'history'],
    contentSlots: { titles: 1, bodies: 4, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 5 } },
      { role: 'divider', x: 120, y: 500, width: 1680, height: 4, style: { fontSizeRatio: 0 } },
      { role: 'label', x: 120, y: 420, width: 350, height: 60, style: { fontSizeRatio: 1.3, fontWeight: 'bold', textAlign: 'center', maxWords: 2 }, index: 0 },
      { role: 'body', x: 120, y: 540, width: 350, height: 200, style: { fontSizeRatio: 0.85, textAlign: 'center', maxChars: 80 }, index: 0 },
      { role: 'label', x: 540, y: 420, width: 350, height: 60, style: { fontSizeRatio: 1.3, fontWeight: 'bold', textAlign: 'center', maxWords: 2 }, index: 1 },
      { role: 'body', x: 540, y: 540, width: 350, height: 200, style: { fontSizeRatio: 0.85, textAlign: 'center', maxChars: 80 }, index: 1 },
      { role: 'label', x: 960, y: 420, width: 350, height: 60, style: { fontSizeRatio: 1.3, fontWeight: 'bold', textAlign: 'center', maxWords: 2 }, index: 2 },
      { role: 'body', x: 960, y: 540, width: 350, height: 200, style: { fontSizeRatio: 0.85, textAlign: 'center', maxChars: 80 }, index: 2 },
      { role: 'label', x: 1380, y: 420, width: 350, height: 60, style: { fontSizeRatio: 1.3, fontWeight: 'bold', textAlign: 'center', maxWords: 2 }, index: 3 },
      { role: 'body', x: 1380, y: 540, width: 350, height: 200, style: { fontSizeRatio: 0.85, textAlign: 'center', maxChars: 80 }, index: 3 },
    ],
  },

  // ---- TEAM / GRID ----
  {
    id: 'grid-four-items',
    name: 'Grid — Four Items',
    description: '2x2 grid of items with titles and descriptions',
    category: 'list',
    bestFor: ['team members', 'four features', 'four pillars', 'four values'],
    contentSlots: { titles: 1, bodies: 4, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 5 } },
      { role: 'subtitle', x: 120, y: 260, width: 820, height: 60, style: { fontSizeRatio: 1.4, fontWeight: 'bold', textAlign: 'left', maxWords: 3 }, index: 0 },
      { role: 'body', x: 120, y: 330, width: 820, height: 150, style: { fontSizeRatio: 0.9, textAlign: 'left', maxChars: 120 }, index: 0 },
      { role: 'subtitle', x: 1000, y: 260, width: 820, height: 60, style: { fontSizeRatio: 1.4, fontWeight: 'bold', textAlign: 'left', maxWords: 3 }, index: 1 },
      { role: 'body', x: 1000, y: 330, width: 820, height: 150, style: { fontSizeRatio: 0.9, textAlign: 'left', maxChars: 120 }, index: 1 },
      { role: 'subtitle', x: 120, y: 560, width: 820, height: 60, style: { fontSizeRatio: 1.4, fontWeight: 'bold', textAlign: 'left', maxWords: 3 }, index: 2 },
      { role: 'body', x: 120, y: 630, width: 820, height: 150, style: { fontSizeRatio: 0.9, textAlign: 'left', maxChars: 120 }, index: 2 },
      { role: 'subtitle', x: 1000, y: 560, width: 820, height: 60, style: { fontSizeRatio: 1.4, fontWeight: 'bold', textAlign: 'left', maxWords: 3 }, index: 3 },
      { role: 'body', x: 1000, y: 630, width: 820, height: 150, style: { fontSizeRatio: 0.9, textAlign: 'left', maxChars: 120 }, index: 3 },
    ],
  },
  {
    id: 'grid-six-items',
    name: 'Grid — Six Items',
    description: '3x2 grid for features or team',
    category: 'list',
    bestFor: ['six features', 'team', 'services', 'values'],
    contentSlots: { titles: 1, bodies: 6, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 80, width: 1680, height: 100, style: { fontSizeRatio: 2.5, fontWeight: 'bold', textAlign: 'left', maxWords: 5 } },
      ...[0,1,2,3,4,5].map(i => ({
        role: 'subtitle' as LayoutElementRole,
        x: 120 + (i % 3) * 580,
        y: 260 + Math.floor(i / 3) * 300,
        width: 520, height: 50,
        style: { fontSizeRatio: 1.3, fontWeight: 'bold' as const, textAlign: 'left' as const, maxWords: 3 },
        index: i,
      })),
      ...[0,1,2,3,4,5].map(i => ({
        role: 'body' as LayoutElementRole,
        x: 120 + (i % 3) * 580,
        y: 320 + Math.floor(i / 3) * 300,
        width: 520, height: 130,
        style: { fontSizeRatio: 0.85, textAlign: 'left' as const, maxChars: 100 },
        index: i,
      })),
    ],
  },

  // ---- CLOSING ----
  {
    id: 'closing-thankyou',
    name: 'Closing — Thank You',
    description: 'Thank you slide with contact info',
    category: 'closing',
    bestFor: ['thank you', 'closing', 'contact', 'questions'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 200, y: 300, width: 1520, height: 200, style: { fontSizeRatio: 4, fontWeight: 'bold', textAlign: 'center', maxWords: 3 } },
      { role: 'body', x: 400, y: 550, width: 1120, height: 100, style: { fontSizeRatio: 1.2, textAlign: 'center', opacity: 0.6, maxChars: 100 } },
    ],
  },
  {
    id: 'closing-cta',
    name: 'Closing — Call to Action',
    description: 'Strong CTA with subtitle',
    category: 'closing',
    bestFor: ['call to action', 'next steps', 'investment ask'],
    contentSlots: { titles: 1, bodies: 1, stats: 0, images: 0, bullets: 0 },
    elements: [
      { role: 'title', x: 120, y: 300, width: 1200, height: 250, style: { fontSizeRatio: 3.5, fontWeight: 'bold', textAlign: 'left', maxWords: 6 } },
      { role: 'body', x: 120, y: 600, width: 900, height: 100, style: { fontSizeRatio: 1.2, textAlign: 'left', opacity: 0.7, maxChars: 150 } },
    ],
  },
];

// ============ Exports ============

export const LAYOUT_LIBRARY = L;

export function getLayoutById(id: string): LayoutDefinition | undefined {
  return L.find(l => l.id === id);
}

export function getLayoutsByCategory(category: LayoutCategory): LayoutDefinition[] {
  return L.filter(l => l.category === category);
}

export function getAllLayoutIds(): string[] {
  return L.map(l => l.id);
}

/**
 * Get a summary of all layouts for the AI prompt.
 * The AI uses this to know what layouts are available.
 */
export function getLayoutSummaryForPrompt(): string {
  return L.map(l => {
    const slots = [];
    if (l.contentSlots.titles) slots.push(`${l.contentSlots.titles} title`);
    if (l.contentSlots.bodies) slots.push(`${l.contentSlots.bodies} body`);
    if (l.contentSlots.stats) slots.push(`${l.contentSlots.stats} stats`);
    if (l.contentSlots.images) slots.push(`${l.contentSlots.images} image`);
    if (l.contentSlots.bullets) slots.push(`${l.contentSlots.bullets} bullets`);
    return `- ${l.id}: ${l.name} (${slots.join(', ')}) — best for: ${l.bestFor.join(', ')}`;
  }).join('\n');
}
