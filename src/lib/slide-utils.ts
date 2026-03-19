import { Slide } from '@/types/presentation';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function createEmptySlide(layout: string = 'blank'): Slide {
  return {
    id: generateId(),
    layout,
    title: '',
    subtitle: '',
    body: '',
    bullets: [],
    notes: '',
  };
}

export function createSampleSlides(): Slide[] {
  return [
    {
      id: generateId(),
      layout: 'cover',
      title: 'Your Presentation Title',
      subtitle: 'Add a subtitle here',
      body: '',
      notes: '',
    },
    {
      id: generateId(),
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
      layout: 'two-column',
      title: 'Comparison',
      subtitle: '',
      body: 'Use this slide to compare two concepts, approaches, or options side by side.',
      bullets: ['Left column content', 'Right column content'],
      notes: '',
    },
    {
      id: generateId(),
      layout: 'statement',
      title: '"The best way to predict the future is to create it."',
      subtitle: '— Peter Drucker',
      body: '',
      notes: '',
    },
    {
      id: generateId(),
      layout: 'closing',
      title: 'Thank You',
      subtitle: 'Questions?',
      body: 'Contact: your@email.com',
      notes: '',
    },
  ];
}
