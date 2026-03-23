import { supabase } from './supabase';

export interface TemplateBriefSlot {
  role: 'title' | 'subtitle' | 'body' | 'number' | 'item';
  maxChars: number;
  count?: number; // for repeated slots like TOC items
}

export interface TemplateBriefSlide {
  slideIndex: number;
  type: string; // cover, toc, section, content, closing
  textSlots: TemplateBriefSlot[];
}

interface GenerateOptions {
  prompt: string;
  length?: 'short' | 'informative' | 'detailed';
  tone?: string;
  audience?: string;
  templateBrief?: TemplateBriefSlide[];
}

interface GeneratedSlide {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  notes?: string;
}

interface GeneratedPresentation {
  title: string;
  slides: GeneratedSlide[];
}

export async function generatePresentation(options: GenerateOptions): Promise<GeneratedPresentation> {
  const body: Record<string, unknown> = {
    prompt: options.prompt,
    length: options.length || 'informative',
    tone: options.tone || 'professional',
    audience: options.audience || 'general',
  };

  if (options.templateBrief) {
    body.templateBrief = options.templateBrief;
  }

  const { data, error } = await supabase.functions.invoke('generate-presentation', {
    body,
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate presentation');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  // When template brief is used, the AI returns texts arrays — pass through directly
  if (options.templateBrief) {
    return {
      title: data.title,
      slides: data.slides,
    };
  }

  // Legacy path: Map slide types to our layout system
  const slides = data.slides.map((slide: GeneratedSlide) => ({
    id: slide.id,
    layout: mapSlideType(slide.type),
    title: slide.title || '',
    subtitle: slide.subtitle || '',
    body: slide.body || '',
    bullets: slide.bullets || [],
    notes: slide.notes || '',
  }));

  return {
    title: data.title,
    slides,
  };
}

function mapSlideType(type: string): string {
  const typeMap: Record<string, string> = {
    'title': 'cover',
    'cover': 'cover',
    'content': 'content',
    'two-column': 'two-column',
    'two_column': 'two-column',
    'statement': 'statement',
    'quote': 'statement',
    'closing': 'closing',
    'thanks': 'closing',
    'thank_you': 'closing',
  };
  return typeMap[type] || 'content';
}

export async function rewriteSlide(
  slide: Record<string, unknown>,
  instruction: string,
  presentationContext?: string
) {
  const { data, error } = await supabase.functions.invoke('rewrite-slide', {
    body: { slide, instruction, presentationContext },
  });

  if (error) throw new Error(error.message || 'Failed to rewrite slide');
  if (data.error) throw new Error(data.error);

  return {
    id: slide.id,
    layout: data.layout || slide.layout,
    title: data.title || '',
    subtitle: data.subtitle || '',
    body: data.body || '',
    bullets: data.bullets || [],
    notes: data.notes || slide.notes || '',
  };
}

/**
 * Generate a single slide with AI, returning positioned SlideElement[].
 */
export async function generateSlide(options: {
  prompt: string;
  context?: string;
  themeTokens?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke('generate-slide', {
    body: options,
  });

  if (error) throw new Error(error.message || 'Failed to generate slide');
  if (data.error) throw new Error(data.error);

  return data.elements || [];
}

/**
 * Generate an image with AI (DALL-E 3).
 */
export async function generateImage(options: {
  prompt: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
}) {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: options,
  });

  if (error) throw new Error(error.message || 'Failed to generate image');
  if (data.error) throw new Error(data.error);

  return { url: data.url, revisedPrompt: data.revisedPrompt };
}

/**
 * Import PDF and convert to slides with AI.
 */
export async function importPdf(options: {
  pdfBase64: string;
  fileName?: string;
  themeTokens?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke('import-pdf', {
    body: options,
  });

  if (error) throw new Error(error.message || 'Failed to import PDF');
  if (data.error) throw new Error(data.error);

  return data.slides || [];
}

// ─── AI FEATURES ────────────────────────────────────────────

/**
 * #4 — Generate speaker notes for a slide.
 */
export async function generateNotes(options: {
  elements: unknown[];
  slideIndex: number;
  totalSlides: number;
  presentationTitle: string;
  language?: string;
}) {
  const { data, error } = await supabase.functions.invoke('generate-notes', { body: options });
  if (error) throw new Error(error.message || 'Failed to generate notes');
  if (data?.error) throw new Error(data.error);
  return data.notes as string;
}

/**
 * #9 — Translate entire presentation.
 */
export async function translatePresentation(options: {
  slides: unknown[];
  targetLanguage: string;
  title?: string;
}) {
  const { data, error } = await supabase.functions.invoke('translate-presentation', { body: options });
  if (error) throw new Error(error.message || 'Failed to translate');
  if (data?.error) throw new Error(data.error);
  return { slides: data.slides, title: data.title } as { slides: unknown[]; title: string };
}

/**
 * #13 — AI Presentation Coach.
 */
export async function coachPresentation(options: {
  slides: unknown[];
  title: string;
  language?: string;
}) {
  const { data, error } = await supabase.functions.invoke('coach-presentation', { body: options });
  if (error) throw new Error(error.message || 'Failed to analyze');
  if (data?.error) throw new Error(data.error);
  return data as {
    overallScore: number;
    summary: string;
    strengths: string[];
    issues: { slide: number; severity: string; category: string; title: string; description: string }[];
    tips: string[];
  };
}

/**
 * #1 + #2 — Redesign / Reorganize slide layout.
 */
export async function redesignSlide(options: {
  elements: unknown[];
  mode: 'redesign' | 'reorganize';
  themeTokens?: unknown;
  instruction?: string;
}) {
  const { data, error } = await supabase.functions.invoke('redesign-slide', { body: options });
  if (error) throw new Error(error.message || 'Failed to redesign');
  if (data?.error) throw new Error(data.error);
  return data.variants as { name: string; elements: unknown[] }[];
}

/**
 * #8 — Extract brand kit from presentation.
 */
export async function extractBrand(options: {
  slides: unknown[];
  currentTheme?: unknown;
}) {
  const { data, error } = await supabase.functions.invoke('extract-brand', { body: options });
  if (error) throw new Error(error.message || 'Failed to extract brand');
  if (data?.error) throw new Error(data.error);
  return data as {
    brandName: string;
    palette: { primary: string; secondary: string; accent: string; bg: string; text: string };
    typography: { titleFont: string; bodyFont: string; titleSize: number; bodySize: number };
    style: { radii: string; shadows: string; mood: string };
    recommendations: string[];
  };
}

/**
 * #7 — Generate chart configuration from data/prompt.
 */
export async function generateChart(options: {
  prompt?: string;
  data?: string;
  chartType?: string;
  themeTokens?: unknown;
}) {
  const { data, error } = await supabase.functions.invoke('generate-chart', { body: options });
  if (error) throw new Error(error.message || 'Failed to generate chart');
  if (data?.error) throw new Error(data.error);
  return data as {
    chartType: string;
    title: string;
    data: { name: string; value: number; value2?: number }[];
    config: { xKey: string; yKeys: string[]; colors: string[]; showGrid: boolean; showLegend: boolean; unit?: string; stacked: boolean };
  };
}

/**
 * #3 — Edit image with AI.
 */
export async function editImage(options: {
  imageUrl: string;
  instruction: string;
  mode?: 'edit' | 'remove-bg' | 'extend';
}) {
  const { data, error } = await supabase.functions.invoke('edit-image', { body: options });
  if (error) throw new Error(error.message || 'Failed to edit image');
  if (data?.error) throw new Error(data.error);
  return { url: data.url as string };
}
