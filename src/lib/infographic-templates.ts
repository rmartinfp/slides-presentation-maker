import type { SlideElement } from '@/types/presentation';

// ============ Helpers ============

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}

function contrastText(bg: string): string {
  return isDark(bg) ? '#FFFFFF' : '#1E1E1E';
}

function tint(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

/** Pick the most vibrant color from a palette — avoids the dull "primary" trap */
function vibrant(palette: Palette): string {
  const candidates = [palette.primary, palette.secondary, palette.accent, palette.text];
  let best = palette.accent;
  let bestSat = 0;
  for (const c of candidates) {
    if (!c || c.length < 7) continue;
    const r = parseInt(c.slice(1, 3), 16) / 255;
    const g = parseInt(c.slice(3, 5), 16) / 255;
    const b = parseInt(c.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const sat = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    if (sat > bestSat) {
      bestSat = sat;
      best = c;
    }
  }
  return best;
}

function maxCharsForBox(widthPx: number, heightPx: number, fontSizePt: number, lineHeight = 1.4): number {
  const fontSizePx = fontSizePt * 2.666;
  const charsPerLine = Math.floor(widthPx / (fontSizePx * 0.52));
  const lines = Math.floor(heightPx / (fontSizePx * lineHeight));
  return charsPerLine * Math.max(1, lines);
}

// ============ Interfaces ============

type Palette = { primary: string; secondary: string; accent: string; bg: string; text: string };
type Typography = { titleFont: string; bodyFont: string };
type El = Omit<SlideElement, 'id' | 'zIndex'>;

export interface InfographicSlot {
  id: string;
  purpose: string;
  maxChars: number;
  type: 'text' | 'number' | 'percentage';
  example: string;
}

export interface InfographicTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  slots: InfographicSlot[];
  generate: (
    palette: Palette,
    typography: Typography,
    slotValues: Record<string, string>,
  ) => El[];
}

// ============ Shared element builder ============

function el(partial: Partial<El> & Pick<El, 'type' | 'x' | 'y' | 'width' | 'height'>): El {
  return {
    type: partial.type,
    content: partial.content ?? '',
    x: partial.x,
    y: partial.y,
    width: partial.width,
    height: partial.height,
    rotation: 0,
    opacity: partial.opacity ?? 1,
    locked: false,
    visible: true,
    style: partial.style ?? {},
  };
}

function textEl(
  x: number, y: number, w: number, h: number,
  content: string,
  style: SlideElement['style'],
): El {
  return el({
    type: 'text',
    content: `<p>${content}</p>`,
    x, y, width: w, height: h,
    style,
  });
}

function shapeEl(
  x: number, y: number, w: number, h: number,
  style: SlideElement['style'],
): El {
  return el({
    type: 'shape',
    content: '',
    x, y, width: w, height: h,
    style,
  });
}

// ============ 1. Big Numbers ============

const bigNumbers: InfographicTemplate = {
  id: 'big-numbers',
  name: 'Big Numbers',
  category: 'data',
  icon: '🔢',
  description: '3 large KPI numbers with labels',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Key Performance Indicators' },
    { id: 'subtitle', purpose: 'Subtitle', maxChars: 80, type: 'text', example: 'Q4 2025 Results' },
    { id: 'num1', purpose: 'First number', maxChars: 8, type: 'number', example: '2.4M' },
    { id: 'label1', purpose: 'First label', maxChars: 30, type: 'text', example: 'Active Users' },
    { id: 'num2', purpose: 'Second number', maxChars: 8, type: 'number', example: '98%' },
    { id: 'label2', purpose: 'Second label', maxChars: 30, type: 'text', example: 'Uptime' },
    { id: 'num3', purpose: 'Third number', maxChars: 8, type: 'number', example: '$12M' },
    { id: 'label3', purpose: 'Third label', maxChars: 30, type: 'text', example: 'Revenue' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Background accent bar at top
    elements.push(shapeEl(0, 0, 1920, 8, { shapeType: 'rectangle', shapeFill: accent }));

    // Title
    elements.push(textEl(100, 60, 1000, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'left',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Subtitle
    elements.push(textEl(100, 150, 1000, 50, v.subtitle, {
      fontFamily: `${t.bodyFont}, sans-serif`,
      fontSize: 20,
      fontWeight: 'normal',
      color: tint(p.text, 0.6),
      textAlign: 'left',
      lineHeight: 1.3,
      verticalAlign: 'top',
    }));

    // 3 KPI cards
    const cardW = 480;
    const cardH = 340;
    const cardY = 380;
    const gap = 40;
    const startX = (1920 - 3 * cardW - 2 * gap) / 2;

    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + gap);

      // Card background
      elements.push(shapeEl(cx, cardY, cardW, cardH, {
        shapeType: 'rectangle',
        shapeFill: tint(accent, 0.08),
        borderRadius: 20,
      }));

      // Large number
      elements.push(textEl(cx, cardY + 60, cardW, 140, v[`num${i + 1}`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 72,
        fontWeight: 'bold',
        color: accent,
        textAlign: 'center',
        lineHeight: 1.1,
        verticalAlign: 'center',
      }));

      // Label
      elements.push(textEl(cx + 40, cardY + 220, cardW - 80, 60, v[`label${i + 1}`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 22,
        fontWeight: 'normal',
        color: p.text,
        textAlign: 'center',
        lineHeight: 1.3,
        verticalAlign: 'top',
      }));

      // Separator bar between cards
      if (i < 2) {
        elements.push(shapeEl(cx + cardW + gap / 2 - 2, cardY + 40, 4, cardH - 80, {
          shapeType: 'rectangle',
          shapeFill: tint(accent, 0.2),
        }));
      }
    }

    return elements;
  },
};

// ============ 2. Process Steps ============

const processSteps: InfographicTemplate = {
  id: 'process-steps',
  name: 'Process Steps',
  category: 'process',
  icon: '➡️',
  description: '4 numbered steps connected by arrows',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Our Process' },
    { id: 'step1_title', purpose: 'Step 1 title', maxChars: 25, type: 'text', example: 'Research' },
    { id: 'step1_desc', purpose: 'Step 1 description', maxChars: 60, type: 'text', example: 'Analyze market trends and user needs' },
    { id: 'step2_title', purpose: 'Step 2 title', maxChars: 25, type: 'text', example: 'Design' },
    { id: 'step2_desc', purpose: 'Step 2 description', maxChars: 60, type: 'text', example: 'Create wireframes and prototypes' },
    { id: 'step3_title', purpose: 'Step 3 title', maxChars: 25, type: 'text', example: 'Develop' },
    { id: 'step3_desc', purpose: 'Step 3 description', maxChars: 60, type: 'text', example: 'Build and test the solution' },
    { id: 'step4_title', purpose: 'Step 4 title', maxChars: 25, type: 'text', example: 'Launch' },
    { id: 'step4_desc', purpose: 'Step 4 description', maxChars: 60, type: 'text', example: 'Deploy and monitor performance' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Title
    elements.push(textEl(100, 60, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    const circleR = 70;
    const circleY = 380;
    const stepW = 340;
    const gap = 60;
    const startX = (1920 - 4 * stepW - 3 * gap) / 2;

    for (let i = 0; i < 4; i++) {
      const cx = startX + i * (stepW + gap) + stepW / 2;

      // Numbered circle
      elements.push(shapeEl(cx - circleR, circleY - circleR, circleR * 2, circleR * 2, {
        shapeType: 'circle',
        shapeFill: accent,
        borderRadius: circleR,
      }));

      // Number in circle
      elements.push(textEl(cx - circleR, circleY - circleR, circleR * 2, circleR * 2, `${i + 1}`, {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 36,
        fontWeight: 'bold',
        color: contrastText(accent),
        textAlign: 'center',
        lineHeight: 1,
        verticalAlign: 'center',
      }));

      // Arrow connector between circles
      if (i < 3) {
        const arrowX = cx + circleR + 10;
        const arrowW = gap + stepW - circleR * 2 - 20;
        elements.push(textEl(arrowX, circleY - 20, arrowW, 40, '→', {
          fontFamily: `${t.bodyFont}, sans-serif`,
          fontSize: 32,
          fontWeight: 'bold',
          color: tint(accent, 0.5),
          textAlign: 'center',
          lineHeight: 1,
          verticalAlign: 'center',
        }));
      }

      // Step title
      const stepStartX = startX + i * (stepW + gap);
      elements.push(textEl(stepStartX, circleY + circleR + 30, stepW, 50, v[`step${i + 1}_title`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 22,
        fontWeight: 'bold',
        color: p.text,
        textAlign: 'center',
        lineHeight: 1.2,
        verticalAlign: 'top',
      }));

      // Step description
      elements.push(textEl(stepStartX + 10, circleY + circleR + 90, stepW - 20, 100, v[`step${i + 1}_desc`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 16,
        fontWeight: 'normal',
        color: tint(p.text, 0.7),
        textAlign: 'center',
        lineHeight: 1.4,
        verticalAlign: 'top',
      }));
    }

    return elements;
  },
};

// ============ 3. Comparison ============

const comparison: InfographicTemplate = {
  id: 'comparison',
  name: 'Comparison',
  category: 'compare',
  icon: '⚖️',
  description: '2-column comparison with bullet points',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Plan A vs Plan B' },
    { id: 'left_title', purpose: 'Left column title', maxChars: 25, type: 'text', example: 'Plan A' },
    { id: 'left_1', purpose: 'Left point 1', maxChars: 50, type: 'text', example: 'Lower upfront cost' },
    { id: 'left_2', purpose: 'Left point 2', maxChars: 50, type: 'text', example: 'Faster implementation' },
    { id: 'left_3', purpose: 'Left point 3', maxChars: 50, type: 'text', example: 'Proven technology' },
    { id: 'left_4', purpose: 'Left point 4', maxChars: 50, type: 'text', example: 'Easy to maintain' },
    { id: 'right_title', purpose: 'Right column title', maxChars: 25, type: 'text', example: 'Plan B' },
    { id: 'right_1', purpose: 'Right point 1', maxChars: 50, type: 'text', example: 'Higher scalability' },
    { id: 'right_2', purpose: 'Right point 2', maxChars: 50, type: 'text', example: 'Better long-term ROI' },
    { id: 'right_3', purpose: 'Right point 3', maxChars: 50, type: 'text', example: 'Modern architecture' },
    { id: 'right_4', purpose: 'Right point 4', maxChars: 50, type: 'text', example: 'Future-proof' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Title
    elements.push(textEl(100, 60, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    const panelW = 800;
    const panelH = 720;
    const panelY = 200;
    const leftX = 80;
    const rightX = 1040;

    // Left panel bg
    elements.push(shapeEl(leftX, panelY, panelW, panelH, {
      shapeType: 'rectangle',
      shapeFill: tint(accent, 0.08),
      borderRadius: 16,
    }));

    // Right panel bg
    elements.push(shapeEl(rightX, panelY, panelW, panelH, {
      shapeType: 'rectangle',
      shapeFill: tint(p.secondary, 0.08),
      borderRadius: 16,
    }));

    // Center divider
    elements.push(shapeEl(957, panelY + 20, 6, panelH - 40, {
      shapeType: 'rectangle',
      shapeFill: tint(p.text, 0.15),
    }));

    // Left column title
    elements.push(textEl(leftX + 40, panelY + 30, panelW - 80, 60, v.left_title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 30,
      fontWeight: 'bold',
      color: accent,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Right column title
    elements.push(textEl(rightX + 40, panelY + 30, panelW - 80, 60, v.right_title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 30,
      fontWeight: 'bold',
      color: p.secondary,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Left bullets
    for (let i = 0; i < 4; i++) {
      const by = panelY + 120 + i * 140;
      // Bullet marker
      elements.push(shapeEl(leftX + 50, by + 8, 12, 12, {
        shapeType: 'circle',
        shapeFill: accent,
      }));
      elements.push(textEl(leftX + 80, by, panelW - 130, 120, v[`left_${i + 1}`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 20,
        fontWeight: 'normal',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.4,
        verticalAlign: 'top',
      }));
    }

    // Right bullets
    for (let i = 0; i < 4; i++) {
      const by = panelY + 120 + i * 140;
      elements.push(shapeEl(rightX + 50, by + 8, 12, 12, {
        shapeType: 'circle',
        shapeFill: p.secondary,
      }));
      elements.push(textEl(rightX + 80, by, panelW - 130, 120, v[`right_${i + 1}`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 20,
        fontWeight: 'normal',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.4,
        verticalAlign: 'top',
      }));
    }

    return elements;
  },
};

// ============ 4. Timeline ============

const timeline: InfographicTemplate = {
  id: 'timeline',
  name: 'Timeline',
  category: 'process',
  icon: '📅',
  description: '4 milestones on a horizontal timeline',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Project Timeline' },
    { id: 'date1', purpose: 'Date 1', maxChars: 15, type: 'text', example: 'Jan 2025' },
    { id: 'milestone1', purpose: 'Milestone 1 title', maxChars: 25, type: 'text', example: 'Kickoff' },
    { id: 'desc1', purpose: 'Milestone 1 description', maxChars: 50, type: 'text', example: 'Project initiated and team assembled' },
    { id: 'date2', purpose: 'Date 2', maxChars: 15, type: 'text', example: 'Apr 2025' },
    { id: 'milestone2', purpose: 'Milestone 2 title', maxChars: 25, type: 'text', example: 'Alpha Release' },
    { id: 'desc2', purpose: 'Milestone 2 description', maxChars: 50, type: 'text', example: 'First internal release for testing' },
    { id: 'date3', purpose: 'Date 3', maxChars: 15, type: 'text', example: 'Jul 2025' },
    { id: 'milestone3', purpose: 'Milestone 3 title', maxChars: 25, type: 'text', example: 'Beta Launch' },
    { id: 'desc3', purpose: 'Milestone 3 description', maxChars: 50, type: 'text', example: 'Public beta with early adopters' },
    { id: 'date4', purpose: 'Date 4', maxChars: 15, type: 'text', example: 'Oct 2025' },
    { id: 'milestone4', purpose: 'Milestone 4 title', maxChars: 25, type: 'text', example: 'GA' },
    { id: 'desc4', purpose: 'Milestone 4 description', maxChars: 50, type: 'text', example: 'General availability and marketing push' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Title
    elements.push(textEl(100, 60, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Horizontal line
    const lineY = 530;
    elements.push(shapeEl(140, lineY - 3, 1640, 6, {
      shapeType: 'rectangle',
      shapeFill: tint(accent, 0.3),
    }));

    const dotR = 16;
    const spacing = 420;
    const startX = 280;

    for (let i = 0; i < 4; i++) {
      const cx = startX + i * spacing;
      const above = i % 2 === 0; // Alternate above/below

      // Dot on line
      elements.push(shapeEl(cx - dotR, lineY - dotR, dotR * 2, dotR * 2, {
        shapeType: 'circle',
        shapeFill: accent,
      }));

      // Vertical connector line from dot
      const connH = 60;
      if (above) {
        elements.push(shapeEl(cx - 2, lineY - dotR - connH, 4, connH, {
          shapeType: 'rectangle',
          shapeFill: tint(accent, 0.4),
        }));
      } else {
        elements.push(shapeEl(cx - 2, lineY + dotR, 4, connH, {
          shapeType: 'rectangle',
          shapeFill: tint(accent, 0.4),
        }));
      }

      const blockW = 320;
      const blockX = cx - blockW / 2;

      if (above) {
        // Date
        elements.push(textEl(blockX, lineY - dotR - connH - 180, blockW, 40, v[`date${i + 1}`], {
          fontFamily: `${t.bodyFont}, sans-serif`,
          fontSize: 16,
          fontWeight: 'bold',
          color: accent,
          textAlign: 'center',
          lineHeight: 1.2,
          verticalAlign: 'bottom',
        }));
        // Milestone title
        elements.push(textEl(blockX, lineY - dotR - connH - 140, blockW, 50, v[`milestone${i + 1}`], {
          fontFamily: `${t.titleFont}, sans-serif`,
          fontSize: 22,
          fontWeight: 'bold',
          color: p.text,
          textAlign: 'center',
          lineHeight: 1.2,
          verticalAlign: 'bottom',
        }));
        // Description
        elements.push(textEl(blockX, lineY - dotR - connH - 90, blockW, 80, v[`desc${i + 1}`], {
          fontFamily: `${t.bodyFont}, sans-serif`,
          fontSize: 15,
          fontWeight: 'normal',
          color: tint(p.text, 0.7),
          textAlign: 'center',
          lineHeight: 1.4,
          verticalAlign: 'top',
        }));
      } else {
        // Date
        elements.push(textEl(blockX, lineY + dotR + connH + 10, blockW, 40, v[`date${i + 1}`], {
          fontFamily: `${t.bodyFont}, sans-serif`,
          fontSize: 16,
          fontWeight: 'bold',
          color: accent,
          textAlign: 'center',
          lineHeight: 1.2,
          verticalAlign: 'top',
        }));
        // Milestone title
        elements.push(textEl(blockX, lineY + dotR + connH + 50, blockW, 50, v[`milestone${i + 1}`], {
          fontFamily: `${t.titleFont}, sans-serif`,
          fontSize: 22,
          fontWeight: 'bold',
          color: p.text,
          textAlign: 'center',
          lineHeight: 1.2,
          verticalAlign: 'top',
        }));
        // Description
        elements.push(textEl(blockX, lineY + dotR + connH + 100, blockW, 80, v[`desc${i + 1}`], {
          fontFamily: `${t.bodyFont}, sans-serif`,
          fontSize: 15,
          fontWeight: 'normal',
          color: tint(p.text, 0.7),
          textAlign: 'center',
          lineHeight: 1.4,
          verticalAlign: 'top',
        }));
      }
    }

    return elements;
  },
};

// ============ 5. Feature Grid ============

const featureGrid: InfographicTemplate = {
  id: 'feature-grid',
  name: 'Feature Grid',
  category: 'features',
  icon: '🔲',
  description: '6 feature cards in a 3x2 grid',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Key Features' },
    { id: 'f1_title', purpose: 'Feature 1 title', maxChars: 25, type: 'text', example: 'Fast Setup' },
    { id: 'f1_desc', purpose: 'Feature 1 description', maxChars: 60, type: 'text', example: 'Get started in minutes with guided onboarding' },
    { id: 'f2_title', purpose: 'Feature 2 title', maxChars: 25, type: 'text', example: 'Secure' },
    { id: 'f2_desc', purpose: 'Feature 2 description', maxChars: 60, type: 'text', example: 'End-to-end encryption for all data' },
    { id: 'f3_title', purpose: 'Feature 3 title', maxChars: 25, type: 'text', example: 'Scalable' },
    { id: 'f3_desc', purpose: 'Feature 3 description', maxChars: 60, type: 'text', example: 'Handles millions of users seamlessly' },
    { id: 'f4_title', purpose: 'Feature 4 title', maxChars: 25, type: 'text', example: 'Analytics' },
    { id: 'f4_desc', purpose: 'Feature 4 description', maxChars: 60, type: 'text', example: 'Real-time dashboards and reports' },
    { id: 'f5_title', purpose: 'Feature 5 title', maxChars: 25, type: 'text', example: 'API' },
    { id: 'f5_desc', purpose: 'Feature 5 description', maxChars: 60, type: 'text', example: 'RESTful API with full documentation' },
    { id: 'f6_title', purpose: 'Feature 6 title', maxChars: 25, type: 'text', example: 'Support' },
    { id: 'f6_desc', purpose: 'Feature 6 description', maxChars: 60, type: 'text', example: '24/7 priority support for all plans' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Title
    elements.push(textEl(100, 50, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    const cols = 3;
    const rows = 2;
    const cardW = 520;
    const cardH = 320;
    const gapX = 50;
    const gapY = 40;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const gridStartX = (1920 - gridW) / 2;
    const gridStartY = 180;

    for (let idx = 0; idx < 6; idx++) {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const cx = gridStartX + col * (cardW + gapX);
      const cy = gridStartY + row * (cardH + gapY);

      // Card bg
      elements.push(shapeEl(cx, cy, cardW, cardH, {
        shapeType: 'rectangle',
        shapeFill: tint(accent, 0.06),
        borderRadius: 16,
      }));

      // Number badge (circle)
      elements.push(shapeEl(cx + 30, cy + 30, 56, 56, {
        shapeType: 'circle',
        shapeFill: accent,
      }));
      elements.push(textEl(cx + 30, cy + 30, 56, 56, `${idx + 1}`, {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 22,
        fontWeight: 'bold',
        color: contrastText(accent),
        textAlign: 'center',
        lineHeight: 1,
        verticalAlign: 'center',
      }));

      // Feature title
      elements.push(textEl(cx + 100, cy + 35, cardW - 140, 46, v[`f${idx + 1}_title`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 22,
        fontWeight: 'bold',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.2,
        verticalAlign: 'center',
      }));

      // Feature description
      elements.push(textEl(cx + 30, cy + 110, cardW - 60, 180, v[`f${idx + 1}_desc`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 17,
        fontWeight: 'normal',
        color: tint(p.text, 0.7),
        textAlign: 'left',
        lineHeight: 1.5,
        verticalAlign: 'top',
      }));
    }

    return elements;
  },
};

// ============ 6. Funnel ============

const funnel: InfographicTemplate = {
  id: 'funnel',
  name: 'Funnel',
  category: 'data',
  icon: '🔻',
  description: '4-stage funnel chart with values',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Sales Funnel' },
    { id: 'stage1', purpose: 'Stage 1 label', maxChars: 25, type: 'text', example: 'Awareness' },
    { id: 'val1', purpose: 'Stage 1 value', maxChars: 10, type: 'number', example: '10,000' },
    { id: 'stage2', purpose: 'Stage 2 label', maxChars: 25, type: 'text', example: 'Interest' },
    { id: 'val2', purpose: 'Stage 2 value', maxChars: 10, type: 'number', example: '5,200' },
    { id: 'stage3', purpose: 'Stage 3 label', maxChars: 25, type: 'text', example: 'Decision' },
    { id: 'val3', purpose: 'Stage 3 value', maxChars: 10, type: 'number', example: '1,800' },
    { id: 'stage4', purpose: 'Stage 4 label', maxChars: 25, type: 'text', example: 'Conversion' },
    { id: 'val4', purpose: 'Stage 4 value', maxChars: 10, type: 'number', example: '620' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Title
    elements.push(textEl(100, 60, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    const barMaxW = 1400;
    const barH = 140;
    const gap = 24;
    const startY = 200;
    const widths = [1.0, 0.78, 0.54, 0.32];
    const alphas = [1.0, 0.8, 0.6, 0.45];

    for (let i = 0; i < 4; i++) {
      const bw = barMaxW * widths[i];
      const bx = (1920 - bw) / 2;
      const by = startY + i * (barH + gap);

      // Bar
      elements.push(shapeEl(bx, by, bw, barH, {
        shapeType: 'rectangle',
        shapeFill: tint(accent, alphas[i]),
        borderRadius: 12,
      }));

      // Stage label (left side inside bar)
      elements.push(textEl(bx + 40, by, bw / 2, barH, v[`stage${i + 1}`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 24,
        fontWeight: 'bold',
        color: contrastText(accent),
        textAlign: 'left',
        lineHeight: 1,
        verticalAlign: 'center',
      }));

      // Value (right side inside bar)
      elements.push(textEl(bx + bw / 2, by, bw / 2 - 40, barH, v[`val${i + 1}`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 30,
        fontWeight: 'bold',
        color: contrastText(accent),
        textAlign: 'right',
        lineHeight: 1,
        verticalAlign: 'center',
      }));
    }

    return elements;
  },
};

// ============ 7. Pros & Cons ============

const prosAndCons: InfographicTemplate = {
  id: 'pros-cons',
  name: 'Pros & Cons',
  category: 'compare',
  icon: '✅',
  description: 'Two-column pros and cons with green/red accents',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Pros & Cons' },
    { id: 'pro1', purpose: 'Pro 1', maxChars: 50, type: 'text', example: 'Increased productivity' },
    { id: 'pro2', purpose: 'Pro 2', maxChars: 50, type: 'text', example: 'Lower costs' },
    { id: 'pro3', purpose: 'Pro 3', maxChars: 50, type: 'text', example: 'Better user experience' },
    { id: 'pro4', purpose: 'Pro 4', maxChars: 50, type: 'text', example: 'Easy integration' },
    { id: 'con1', purpose: 'Con 1', maxChars: 50, type: 'text', example: 'Learning curve' },
    { id: 'con2', purpose: 'Con 2', maxChars: 50, type: 'text', example: 'Migration effort' },
    { id: 'con3', purpose: 'Con 3', maxChars: 50, type: 'text', example: 'Limited customization' },
    { id: 'con4', purpose: 'Con 4', maxChars: 50, type: 'text', example: 'Vendor lock-in risk' },
  ],
  generate(p, t, v) {
    const elements: El[] = [];
    const green = '#22C55E';
    const red = '#EF4444';

    // Title
    elements.push(textEl(100, 60, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    const colW = 800;
    const colH = 760;
    const colY = 190;
    const leftX = 80;
    const rightX = 1040;

    // Left panel
    elements.push(shapeEl(leftX, colY, colW, colH, {
      shapeType: 'rectangle',
      shapeFill: tint(green, 0.06),
      borderRadius: 16,
    }));

    // PROS header
    elements.push(textEl(leftX + 40, colY + 20, colW - 80, 60, 'PROS', {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 28,
      fontWeight: 'bold',
      color: green,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Right panel
    elements.push(shapeEl(rightX, colY, colW, colH, {
      shapeType: 'rectangle',
      shapeFill: tint(red, 0.06),
      borderRadius: 16,
    }));

    // CONS header
    elements.push(textEl(rightX + 40, colY + 20, colW - 80, 60, 'CONS', {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 28,
      fontWeight: 'bold',
      color: red,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    for (let i = 0; i < 4; i++) {
      const ry = colY + 100 + i * 155;

      // Pro checkmark
      elements.push(textEl(leftX + 40, ry, 50, 50, '✓', {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 28,
        fontWeight: 'bold',
        color: green,
        textAlign: 'center',
        lineHeight: 1,
        verticalAlign: 'center',
      }));

      // Pro text
      elements.push(textEl(leftX + 100, ry, colW - 150, 50, v[`pro${i + 1}`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 20,
        fontWeight: 'normal',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.4,
        verticalAlign: 'center',
      }));

      // Divider
      if (i < 3) {
        elements.push(shapeEl(leftX + 40, ry + 70, colW - 80, 2, {
          shapeType: 'rectangle',
          shapeFill: tint(green, 0.15),
        }));
      }

      // Con X mark
      elements.push(textEl(rightX + 40, ry, 50, 50, '✕', {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 28,
        fontWeight: 'bold',
        color: red,
        textAlign: 'center',
        lineHeight: 1,
        verticalAlign: 'center',
      }));

      // Con text
      elements.push(textEl(rightX + 100, ry, colW - 150, 50, v[`con${i + 1}`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 20,
        fontWeight: 'normal',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.4,
        verticalAlign: 'center',
      }));

      // Divider
      if (i < 3) {
        elements.push(shapeEl(rightX + 40, ry + 70, colW - 80, 2, {
          shapeType: 'rectangle',
          shapeFill: tint(red, 0.15),
        }));
      }
    }

    return elements;
  },
};

// ============ 8. Quote Spotlight ============

const quoteSpotlight: InfographicTemplate = {
  id: 'quote-spotlight',
  name: 'Quote Spotlight',
  category: 'content',
  icon: '💬',
  description: 'Large centered quote with author attribution',
  slots: [
    { id: 'quote', purpose: 'Quote text', maxChars: 200, type: 'text', example: 'The only way to do great work is to love what you do.' },
    { id: 'author', purpose: 'Author name', maxChars: 40, type: 'text', example: 'Steve Jobs' },
    { id: 'role', purpose: 'Author role/title', maxChars: 50, type: 'text', example: 'Co-founder, Apple Inc.' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Top accent bar
    elements.push(shapeEl(760, 140, 400, 6, {
      shapeType: 'rectangle',
      shapeFill: accent,
    }));

    // Large watermark quotation mark
    elements.push(textEl(120, 100, 400, 400, '\u201C', {
      fontFamily: `Georgia, serif`,
      fontSize: 200,
      fontWeight: 'bold',
      color: tint(accent, 0.1),
      textAlign: 'left',
      lineHeight: 1,
      verticalAlign: 'top',
    }));

    // Quote text
    elements.push(textEl(200, 260, 1520, 360, v.quote, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 38,
      fontWeight: 'normal',
      fontStyle: 'italic',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.6,
      verticalAlign: 'center',
    }));

    // Bottom accent bar
    elements.push(shapeEl(760, 680, 400, 6, {
      shapeType: 'rectangle',
      shapeFill: accent,
    }));

    // Author name
    elements.push(textEl(200, 720, 1520, 60, v.author, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 26,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Author role
    elements.push(textEl(200, 790, 1520, 50, v.role, {
      fontFamily: `${t.bodyFont}, sans-serif`,
      fontSize: 18,
      fontWeight: 'normal',
      color: tint(p.text, 0.6),
      textAlign: 'center',
      lineHeight: 1.3,
      verticalAlign: 'top',
    }));

    return elements;
  },
};

// ============ 9. Percentage Bars ============

const percentageBars: InfographicTemplate = {
  id: 'percentage-bars',
  name: 'Percentage Bars',
  category: 'data',
  icon: '📊',
  description: '5 horizontal bars showing percentages',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Market Share' },
    { id: 'label1', purpose: 'Bar 1 label', maxChars: 25, type: 'text', example: 'Product A' },
    { id: 'pct1', purpose: 'Bar 1 percentage', maxChars: 4, type: 'percentage', example: '85' },
    { id: 'label2', purpose: 'Bar 2 label', maxChars: 25, type: 'text', example: 'Product B' },
    { id: 'pct2', purpose: 'Bar 2 percentage', maxChars: 4, type: 'percentage', example: '72' },
    { id: 'label3', purpose: 'Bar 3 label', maxChars: 25, type: 'text', example: 'Product C' },
    { id: 'pct3', purpose: 'Bar 3 percentage', maxChars: 4, type: 'percentage', example: '58' },
    { id: 'label4', purpose: 'Bar 4 label', maxChars: 25, type: 'text', example: 'Product D' },
    { id: 'pct4', purpose: 'Bar 4 percentage', maxChars: 4, type: 'percentage', example: '41' },
    { id: 'label5', purpose: 'Bar 5 label', maxChars: 25, type: 'text', example: 'Product E' },
    { id: 'pct5', purpose: 'Bar 5 percentage', maxChars: 4, type: 'percentage', example: '29' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Title
    elements.push(textEl(100, 60, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'left',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    const barMaxW = 1200;
    const barH = 44;
    const rowH = 150;
    const startY = 200;
    const labelX = 140;
    const labelW = 300;
    const barX = 480;
    const pctX = 1720;

    for (let i = 0; i < 5; i++) {
      const ry = startY + i * rowH;
      const pct = Math.min(100, Math.max(0, parseInt(v[`pct${i + 1}`]) || 0));
      const filledW = Math.max(20, (pct / 100) * barMaxW);

      // Label
      elements.push(textEl(labelX, ry, labelW, 50, v[`label${i + 1}`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 22,
        fontWeight: 'bold',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.2,
        verticalAlign: 'center',
      }));

      // Bar track (background)
      elements.push(shapeEl(barX, ry + 5, barMaxW, barH, {
        shapeType: 'rectangle',
        shapeFill: tint(accent, 0.1),
        borderRadius: 8,
      }));

      // Bar fill
      elements.push(shapeEl(barX, ry + 5, filledW, barH, {
        shapeType: 'rectangle',
        shapeFill: accent,
        borderRadius: 8,
      }));

      // Percentage text
      elements.push(textEl(pctX, ry, 100, 50, `${pct}%`, {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 22,
        fontWeight: 'bold',
        color: accent,
        textAlign: 'left',
        lineHeight: 1.2,
        verticalAlign: 'center',
      }));

      // Subtle divider
      if (i < 4) {
        elements.push(shapeEl(labelX, ry + rowH - 20, 1640, 1, {
          shapeType: 'rectangle',
          shapeFill: tint(p.text, 0.08),
        }));
      }
    }

    return elements;
  },
};

// ============ 10. Numbered List ============

const numberedList: InfographicTemplate = {
  id: 'numbered-list',
  name: 'Numbered List',
  category: 'content',
  icon: '🔟',
  description: 'Top 5 items with large numbers',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Top 5 Priorities' },
    { id: 'item1_title', purpose: 'Item 1 title', maxChars: 35, type: 'text', example: 'Customer Experience' },
    { id: 'item1_desc', purpose: 'Item 1 description', maxChars: 70, type: 'text', example: 'Redesign onboarding flow to reduce churn by 30%' },
    { id: 'item2_title', purpose: 'Item 2 title', maxChars: 35, type: 'text', example: 'Performance' },
    { id: 'item2_desc', purpose: 'Item 2 description', maxChars: 70, type: 'text', example: 'Achieve sub-200ms response time for all API endpoints' },
    { id: 'item3_title', purpose: 'Item 3 title', maxChars: 35, type: 'text', example: 'Security' },
    { id: 'item3_desc', purpose: 'Item 3 description', maxChars: 70, type: 'text', example: 'Complete SOC2 Type II certification by Q3' },
    { id: 'item4_title', purpose: 'Item 4 title', maxChars: 35, type: 'text', example: 'Mobile App' },
    { id: 'item4_desc', purpose: 'Item 4 description', maxChars: 70, type: 'text', example: 'Launch native iOS and Android apps' },
    { id: 'item5_title', purpose: 'Item 5 title', maxChars: 35, type: 'text', example: 'Partnerships' },
    { id: 'item5_desc', purpose: 'Item 5 description', maxChars: 70, type: 'text', example: 'Establish 10 strategic integration partnerships' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    // Title
    elements.push(textEl(100, 50, 1720, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'left',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    const rowH = 155;
    const startY = 175;
    const numX = 120;
    const numW = 100;
    const textX = 260;
    const textW = 1500;

    for (let i = 0; i < 5; i++) {
      const ry = startY + i * rowH;

      // Large number
      elements.push(textEl(numX, ry + 10, numW, 100, `${i + 1}`, {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 54,
        fontWeight: 'bold',
        color: accent,
        textAlign: 'center',
        lineHeight: 1,
        verticalAlign: 'center',
      }));

      // Item title
      elements.push(textEl(textX, ry + 10, textW, 50, v[`item${i + 1}_title`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 24,
        fontWeight: 'bold',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.2,
        verticalAlign: 'center',
      }));

      // Item description
      elements.push(textEl(textX, ry + 65, textW, 60, v[`item${i + 1}_desc`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 17,
        fontWeight: 'normal',
        color: tint(p.text, 0.7),
        textAlign: 'left',
        lineHeight: 1.4,
        verticalAlign: 'top',
      }));

      // Divider
      if (i < 4) {
        elements.push(shapeEl(numX, ry + rowH - 10, 1660, 2, {
          shapeType: 'rectangle',
          shapeFill: tint(p.text, 0.08),
        }));
      }
    }

    return elements;
  },
};

// ============ 11. Donut + Legend ============

const donutLegend: InfographicTemplate = {
  id: 'donut-legend',
  name: 'Donut + Legend',
  category: 'data',
  icon: '🍩',
  description: 'Donut chart with legend items on the side',
  slots: [
    { id: 'title', purpose: 'Slide title', maxChars: 50, type: 'text', example: 'Revenue Breakdown' },
    { id: 'center_num', purpose: 'Center number/text', maxChars: 10, type: 'number', example: '$48M' },
    { id: 'center_label', purpose: 'Center label', maxChars: 20, type: 'text', example: 'Total Revenue' },
    { id: 'seg1_label', purpose: 'Segment 1 label', maxChars: 25, type: 'text', example: 'Enterprise' },
    { id: 'seg1_val', purpose: 'Segment 1 value', maxChars: 8, type: 'number', example: '45' },
    { id: 'seg2_label', purpose: 'Segment 2 label', maxChars: 25, type: 'text', example: 'SMB' },
    { id: 'seg2_val', purpose: 'Segment 2 value', maxChars: 8, type: 'number', example: '28' },
    { id: 'seg3_label', purpose: 'Segment 3 label', maxChars: 25, type: 'text', example: 'Startup' },
    { id: 'seg3_val', purpose: 'Segment 3 value', maxChars: 8, type: 'number', example: '18' },
    { id: 'seg4_label', purpose: 'Segment 4 label', maxChars: 25, type: 'text', example: 'Consumer' },
    { id: 'seg4_val', purpose: 'Segment 4 value', maxChars: 8, type: 'number', example: '9' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];
    const segColors = [accent, p.secondary || '#6366F1', p.primary, tint(accent, 0.5)];

    // Title
    elements.push(textEl(100, 50, 800, 80, v.title, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 42,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'left',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Donut chart (using chart element type)
    const chartData = [];
    for (let i = 1; i <= 4; i++) {
      chartData.push({
        name: v[`seg${i}_label`] || `Segment ${i}`,
        value: parseInt(v[`seg${i}_val`]) || 0,
      });
    }

    elements.push({
      type: 'chart',
      content: JSON.stringify({
        chartType: 'doughnut',
        data: chartData,
        dataKeys: ['value'],
        nameKey: 'name',
        colors: segColors,
        showLegend: false,
        showGrid: false,
      }),
      x: 140,
      y: 200,
      width: 700,
      height: 700,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: {},
    });

    // Center number (overlaid on donut)
    elements.push(textEl(290, 460, 400, 100, v.center_num, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 54,
      fontWeight: 'bold',
      color: p.text,
      textAlign: 'center',
      lineHeight: 1,
      verticalAlign: 'center',
    }));

    // Center label
    elements.push(textEl(290, 560, 400, 50, v.center_label, {
      fontFamily: `${t.bodyFont}, sans-serif`,
      fontSize: 18,
      fontWeight: 'normal',
      color: tint(p.text, 0.6),
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'top',
    }));

    // Legend items on the right
    const legendX = 1020;
    const legendStartY = 300;
    const legendRowH = 120;

    for (let i = 0; i < 4; i++) {
      const ly = legendStartY + i * legendRowH;

      // Color swatch
      elements.push(shapeEl(legendX, ly + 6, 28, 28, {
        shapeType: 'circle',
        shapeFill: segColors[i],
      }));

      // Label
      elements.push(textEl(legendX + 50, ly, 500, 40, v[`seg${i + 1}_label`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 22,
        fontWeight: 'bold',
        color: p.text,
        textAlign: 'left',
        lineHeight: 1.2,
        verticalAlign: 'center',
      }));

      // Value
      elements.push(textEl(legendX + 50, ly + 40, 500, 40, `${v[`seg${i + 1}_val`]}%`, {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 28,
        fontWeight: 'bold',
        color: segColors[i],
        textAlign: 'left',
        lineHeight: 1.2,
        verticalAlign: 'top',
      }));
    }

    return elements;
  },
};

// ============ 12. Mind Map ============

const mindMap: InfographicTemplate = {
  id: 'mind-map',
  name: 'Mind Map',
  category: 'structure',
  icon: '🧠',
  description: 'Central topic with 4 connected branches',
  slots: [
    { id: 'center', purpose: 'Central topic', maxChars: 25, type: 'text', example: 'Strategy' },
    { id: 'branch1', purpose: 'Branch 1 title', maxChars: 20, type: 'text', example: 'Growth' },
    { id: 'branch1_desc', purpose: 'Branch 1 description', maxChars: 40, type: 'text', example: 'Expand to new markets' },
    { id: 'branch2', purpose: 'Branch 2 title', maxChars: 20, type: 'text', example: 'Product' },
    { id: 'branch2_desc', purpose: 'Branch 2 description', maxChars: 40, type: 'text', example: 'Launch v2.0 features' },
    { id: 'branch3', purpose: 'Branch 3 title', maxChars: 20, type: 'text', example: 'Team' },
    { id: 'branch3_desc', purpose: 'Branch 3 description', maxChars: 40, type: 'text', example: 'Hire 20 engineers' },
    { id: 'branch4', purpose: 'Branch 4 title', maxChars: 20, type: 'text', example: 'Revenue' },
    { id: 'branch4_desc', purpose: 'Branch 4 description', maxChars: 40, type: 'text', example: 'Hit $50M ARR target' },
  ],
  generate(p, t, v) {
    const accent = vibrant(p);
    const elements: El[] = [];

    const cx = 960;
    const cy = 540;
    const centerR = 100;

    // Connecting lines (placed first = lower z)
    const branchPositions = [
      { x: 280, y: 220 },   // top-left
      { x: 1640, y: 220 },  // top-right
      { x: 280, y: 860 },   // bottom-left
      { x: 1640, y: 860 },  // bottom-right
    ];

    for (const bp of branchPositions) {
      // Draw line from center to branch using a thin rectangle (rotated lines not supported, use shape)
      const dx = bp.x - cx;
      const dy = bp.y - cy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const midX = (cx + bp.x) / 2;
      const midY = (cy + bp.y) / 2;

      elements.push({
        type: 'shape',
        content: '',
        x: midX - len / 2,
        y: midY - 2,
        width: len,
        height: 4,
        rotation: angle,
        opacity: 1,
        locked: false,
        visible: true,
        style: {
          shapeType: 'rectangle',
          shapeFill: tint(accent, 0.25),
        },
      });
    }

    // Center circle
    elements.push(shapeEl(cx - centerR, cy - centerR, centerR * 2, centerR * 2, {
      shapeType: 'circle',
      shapeFill: accent,
    }));

    // Center text
    elements.push(textEl(cx - centerR, cy - centerR, centerR * 2, centerR * 2, v.center, {
      fontFamily: `${t.titleFont}, sans-serif`,
      fontSize: 26,
      fontWeight: 'bold',
      color: contrastText(accent),
      textAlign: 'center',
      lineHeight: 1.2,
      verticalAlign: 'center',
    }));

    // Branch circles + text
    const branchR = 70;
    const branchColors = [accent, p.secondary || '#6366F1', p.primary, tint(accent, 0.7)];

    for (let i = 0; i < 4; i++) {
      const bp = branchPositions[i];

      // Branch circle
      elements.push(shapeEl(bp.x - branchR, bp.y - branchR, branchR * 2, branchR * 2, {
        shapeType: 'circle',
        shapeFill: tint(branchColors[i], 0.15),
        borderColor: branchColors[i],
        borderWidth: 3,
      }));

      // Branch title inside circle
      elements.push(textEl(bp.x - branchR, bp.y - branchR, branchR * 2, branchR * 2, v[`branch${i + 1}`], {
        fontFamily: `${t.titleFont}, sans-serif`,
        fontSize: 18,
        fontWeight: 'bold',
        color: p.text,
        textAlign: 'center',
        lineHeight: 1.2,
        verticalAlign: 'center',
      }));

      // Description below/above branch
      const descY = bp.y < cy ? bp.y + branchR + 10 : bp.y - branchR - 60;
      elements.push(textEl(bp.x - 140, descY, 280, 50, v[`branch${i + 1}_desc`], {
        fontFamily: `${t.bodyFont}, sans-serif`,
        fontSize: 15,
        fontWeight: 'normal',
        color: tint(p.text, 0.7),
        textAlign: 'center',
        lineHeight: 1.4,
        verticalAlign: 'top',
      }));
    }

    return elements;
  },
};

// ============ Export ============

export const INFOGRAPHIC_TEMPLATES: InfographicTemplate[] = [
  bigNumbers,
  processSteps,
  comparison,
  timeline,
  featureGrid,
  funnel,
  prosAndCons,
  quoteSpotlight,
  percentageBars,
  numberedList,
  donutLegend,
  mindMap,
];

// Re-export helpers for use by AI generation
export { maxCharsForBox, isDark, contrastText, tint, vibrant };
