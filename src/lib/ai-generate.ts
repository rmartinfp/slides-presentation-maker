import { supabase } from './supabase';

interface GenerateOptions {
  prompt: string;
  length?: 'short' | 'informative' | 'detailed';
  tone?: string;
  audience?: string;
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
  const { data, error } = await supabase.functions.invoke('generate-presentation', {
    body: {
      prompt: options.prompt,
      length: options.length || 'informative',
      tone: options.tone || 'professional',
      audience: options.audience || 'general',
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate presentation');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  // Map slide types to our layout system
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
