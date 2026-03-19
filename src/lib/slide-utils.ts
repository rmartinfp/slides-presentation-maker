import { Slide, SlideElement, SlideBackground } from '@/types/presentation';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function createEmptySlide(layout: string = 'blank'): Slide {
  return {
    id: generateId(),
    elements: [],
    background: { type: 'solid', value: '#ffffff' },
    notes: '',
    // Keep legacy fields for backward compat during migration
    layout,
    title: '',
    subtitle: '',
    body: '',
    bullets: [],
  };
}

export function createSampleSlides(): Slide[] {
  return [
    {
      id: generateId(),
      elements: [],
      background: { type: 'solid', value: '#ffffff' },
      layout: 'cover',
      title: 'Your Presentation Title',
      subtitle: 'Add a subtitle here',
      body: '',
      notes: '',
    },
    {
      id: generateId(),
      elements: [],
      background: { type: 'solid', value: '#ffffff' },
      layout: 'content',
      title: 'Key Points',
      subtitle: '',
      body: '',
      bullets: [
        'First important point to discuss',
        'Second key insight or finding',
        'Third supporting argument',
      ],
      notes: '',
    },
    {
      id: generateId(),
      elements: [],
      background: { type: 'solid', value: '#ffffff' },
      layout: 'two-column',
      title: 'Comparison',
      subtitle: '',
      body: 'Use this slide to compare two concepts, approaches, or options side by side.',
      bullets: ['Left column content', 'Right column content'],
      notes: '',
    },
    {
      id: generateId(),
      elements: [],
      background: { type: 'solid', value: '#ffffff' },
      layout: 'statement',
      title: '"The best way to predict the future is to create it."',
      subtitle: '— Peter Drucker',
      body: '',
      notes: '',
    },
    {
      id: generateId(),
      elements: [],
      background: { type: 'solid', value: '#ffffff' },
      layout: 'closing',
      title: 'Thank You',
      subtitle: 'Questions?',
      body: 'Contact: your@email.com',
      notes: '',
    },
  ];
}

/**
 * Extract a display title from a slide.
 * Looks at the first text element, or falls back to legacy title field.
 */
export function getSlideTitle(slide: Slide): string {
  if (slide.elements?.length) {
    const firstText = slide.elements
      .sort((a, b) => a.y - b.y)
      .find(e => e.type === 'text');
    if (firstText?.content) {
      return firstText.content.slice(0, 80);
    }
  }
  return slide.title || '';
}
