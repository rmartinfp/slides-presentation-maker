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
