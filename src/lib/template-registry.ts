export interface TemplateDefinition {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  coverImage: string;
  slideImages: string[];
  googleSlidesId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
    text: string;
  };
  fonts: {
    title: string;
    body: string;
  };
  slideCount: number;
  tags: string[];
  isPremium: boolean;
}

const STORAGE_BASE = 'https://okzaoakyasaohohktntd.supabase.co/storage/v1/object/public/templates/covers';

// 15 real templates extracted from Google Slides
export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  {
    id: 'electric-field',
    name: 'Electric Field Concepts',
    slug: 'electric-field',
    category: 'Education',
    description: 'Dark scientific template with wave patterns and blue accents',
    coverImage: `${STORAGE_BASE}/11bajy79bQCK9DdH-uPIeSo8apadjdCudJGezAtFc9h4.png`,
    slideImages: [],
    googleSlidesId: '11bajy79bQCK9DdH-uPIeSo8apadjdCudJGezAtFc9h4',
    colors: { primary: '#708CB6', secondary: '#0097A7', accent: '#0C0E1D', bg: '#0C0E1D', text: '#FFFFFF' },
    fonts: { title: 'Catamaran', body: 'Inter' },
    slideCount: 32,
    tags: ['Science', 'Education', 'Dark'],
    isPremium: false,
  },
  {
    id: 'mentorship',
    name: 'Mentorship',
    slug: 'mentorship',
    category: 'Education',
    description: 'Professional mentorship and coaching template',
    coverImage: `${STORAGE_BASE}/13lzQybWl3lZmDHkjePF1OEUs8RgwaA20iwolqpBlVB8.png`,
    slideImages: [],
    googleSlidesId: '13lzQybWl3lZmDHkjePF1OEUs8RgwaA20iwolqpBlVB8',
    colors: { primary: '#0097A7', secondary: '#191919', accent: '#FFFFFF', bg: '#191919', text: '#FFFFFF' },
    fonts: { title: 'DM Sans', body: 'Inter' },
    slideCount: 38,
    tags: ['Education', 'Coaching', 'Dark'],
    isPremium: false,
  },
  {
    id: 'digital-transformation',
    name: 'Digital Transformation Strategy',
    slug: 'digital-transformation',
    category: 'Technology',
    description: 'Clean tech strategy template with teal accents',
    coverImage: `${STORAGE_BASE}/14b37y3anR0S9PJSiwDpu0EBi1HDsLTxu0bIx1TijrpA.png`,
    slideImages: [],
    googleSlidesId: '14b37y3anR0S9PJSiwDpu0EBi1HDsLTxu0bIx1TijrpA',
    colors: { primary: '#158158', secondary: '#058DC7', accent: '#50B432', bg: '#FFFFFF', text: '#000000' },
    fonts: { title: 'Inter', body: 'Inter' },
    slideCount: 38,
    tags: ['Technology', 'Strategy', 'Business'],
    isPremium: false,
  },
  {
    id: 'modern-gradient',
    name: 'Modern Gradient',
    slug: 'modern-gradient',
    category: 'Creative',
    description: 'Vibrant modern template with gradient backgrounds',
    coverImage: `${STORAGE_BASE}/18dnwN11knzOJKFF0EB9XGaeqBBwwLovhT98pFlOCh9s.png`,
    slideImages: [],
    googleSlidesId: '18dnwN11knzOJKFF0EB9XGaeqBBwwLovhT98pFlOCh9s',
    colors: { primary: '#158158', secondary: '#058DC7', accent: '#50B432', bg: '#FFFFFF', text: '#000000' },
    fonts: { title: 'Albert Sans', body: 'Inter' },
    slideCount: 38,
    tags: ['Creative', 'Modern', 'Gradient'],
    isPremium: false,
  },
  {
    id: 'blue-gradient',
    name: 'Blue Gradient',
    slug: 'blue-gradient',
    category: 'Business',
    description: 'Professional blue gradient with clean layouts',
    coverImage: `${STORAGE_BASE}/1Dcq-I5p5sCjwakxB2vgaj7ZBEEi0mvkE6dXNrdbOTWM.png`,
    slideImages: [],
    googleSlidesId: '1Dcq-I5p5sCjwakxB2vgaj7ZBEEi0mvkE6dXNrdbOTWM',
    colors: { primary: '#083C77', secondary: '#93C4E0', accent: '#9CE3E9', bg: '#EBFCFF', text: '#083C77' },
    fonts: { title: 'Karla', body: 'Inter' },
    slideCount: 32,
    tags: ['Business', 'Professional', 'Blue'],
    isPremium: false,
  },
  {
    id: 'mind-maps-boost',
    name: 'Mind Maps Boost',
    slug: 'mind-maps-boost',
    category: 'Education',
    description: 'Creative mind mapping template with purple tones',
    coverImage: `${STORAGE_BASE}/1EBwzJWx2e36MHMEy22bOtAMkhozui0i0YXJiqGdE1h8.png`,
    slideImages: [],
    googleSlidesId: '1EBwzJWx2e36MHMEy22bOtAMkhozui0i0YXJiqGdE1h8',
    colors: { primary: '#503259', secondary: '#765186', accent: '#B07CC6', bg: '#FAF6E7', text: '#22244E' },
    fonts: { title: 'Funnel Sans', body: 'Inter' },
    slideCount: 32,
    tags: ['Education', 'Creative', 'Purple'],
    isPremium: false,
  },
  {
    id: 'strategic-overview',
    name: 'Strategic Overview',
    slug: 'strategic-overview',
    category: 'Business',
    description: 'Minimal professional template for strategic presentations',
    coverImage: `${STORAGE_BASE}/1fHoDEGCSOZBeImCeMeaKBHSBQTQ2Pin18TEci9dN8RA.png`,
    slideImages: [],
    googleSlidesId: '1fHoDEGCSOZBeImCeMeaKBHSBQTQ2Pin18TEci9dN8RA',
    colors: { primary: '#0A0A0A', secondary: '#484A4B', accent: '#8B8B8B', bg: '#EFEFEF', text: '#0A0A0A' },
    fonts: { title: 'Inter Tight', body: 'Inter' },
    slideCount: 30,
    tags: ['Business', 'Strategy', 'Minimal'],
    isPremium: false,
  },
  {
    id: 'nature-green',
    name: 'Nature Green',
    slug: 'nature-green',
    category: 'Creative',
    description: 'Fresh nature-inspired template with vibrant green',
    coverImage: `${STORAGE_BASE}/1G23Mm2kNNZ1WJ2gHeBtNk4OsVipOvj988_dTETc13to.png`,
    slideImages: [],
    googleSlidesId: '1G23Mm2kNNZ1WJ2gHeBtNk4OsVipOvj988_dTETc13to',
    colors: { primary: '#B3FA4A', secondary: '#0C2103', accent: '#E8F2E4', bg: '#0C2103', text: '#FFFFFF' },
    fonts: { title: 'Inter', body: 'Inter' },
    slideCount: 33,
    tags: ['Creative', 'Nature', 'Green'],
    isPremium: false,
  },
  {
    id: 'code-mono',
    name: 'Code Mono',
    slug: 'code-mono',
    category: 'Technology',
    description: 'Developer-focused template with monospace typography',
    coverImage: `${STORAGE_BASE}/1goALIpg2Q10uFfdnHjjvYvEBX1Q5TOyeaUiQUfZLCyo.png`,
    slideImages: [],
    googleSlidesId: '1goALIpg2Q10uFfdnHjjvYvEBX1Q5TOyeaUiQUfZLCyo',
    colors: { primary: '#158158', secondary: '#058DC7', accent: '#50B432', bg: '#FFFFFF', text: '#000000' },
    fonts: { title: 'Roboto Mono', body: 'Inter' },
    slideCount: 32,
    tags: ['Technology', 'Developer', 'Code'],
    isPremium: false,
  },
  {
    id: 'green-energy',
    name: 'Green Energy',
    slug: 'green-energy',
    category: 'Business',
    description: 'Sustainability and green energy template',
    coverImage: `${STORAGE_BASE}/1hHMWV4sMCX_3_mKrTHlgwRd8tF2S_ffzfaVmA696ep8.png`,
    slideImages: [],
    googleSlidesId: '1hHMWV4sMCX_3_mKrTHlgwRd8tF2S_ffzfaVmA696ep8',
    colors: { primary: '#D7ECCE', secondary: '#1F1F1F', accent: '#0097A7', bg: '#1F1F1F', text: '#D7ECCE' },
    fonts: { title: 'Inconsolata', body: 'Inter' },
    slideCount: 33,
    tags: ['Business', 'Energy', 'Green'],
    isPremium: false,
  },
  {
    id: 'startup',
    name: 'Startup Pitch',
    slug: 'startup',
    category: 'Business',
    description: 'Colorful startup pitch deck with bold accents',
    coverImage: `${STORAGE_BASE}/1JBmJ6NgyhJTww11mDey3E0cfekEc1hr2taiM_jNEDnw.png`,
    slideImages: [],
    googleSlidesId: '1JBmJ6NgyhJTww11mDey3E0cfekEc1hr2taiM_jNEDnw',
    colors: { primary: '#F98329', secondary: '#E34839', accent: '#41DF4F', bg: '#F5F5F5', text: '#000000' },
    fonts: { title: 'Work Sans', body: 'Hubot Sans' },
    slideCount: 38,
    tags: ['Business', 'Startup', 'Pitch'],
    isPremium: false,
  },
  {
    id: 'ethereal',
    name: 'Ethereal',
    slug: 'ethereal',
    category: 'Creative',
    description: 'Dreamy ethereal template with soft purple aesthetics',
    coverImage: `${STORAGE_BASE}/1NiBkPwDFNULbPyWKd5eLeB7_hM-rP7vwOyf3glLM7V0.png`,
    slideImages: [],
    googleSlidesId: '1NiBkPwDFNULbPyWKd5eLeB7_hM-rP7vwOyf3glLM7V0',
    colors: { primary: '#503259', secondary: '#765186', accent: '#B07CC6', bg: '#FAF6E7', text: '#22244E' },
    fonts: { title: 'Playfair', body: 'Inter' },
    slideCount: 35,
    tags: ['Creative', 'Aesthetic', 'Purple'],
    isPremium: false,
  },
  {
    id: 'deep',
    name: 'Deep',
    slug: 'deep',
    category: 'Technology',
    description: 'Deep tech template with modern sans-serif typography',
    coverImage: `${STORAGE_BASE}/1nuVVCHqZyM_U_U-HO0LZsGqg--MP16KGb-cW8ZaMbOs.png`,
    slideImages: [],
    googleSlidesId: '1nuVVCHqZyM_U_U-HO0LZsGqg--MP16KGb-cW8ZaMbOs',
    colors: { primary: '#158158', secondary: '#058DC7', accent: '#50B432', bg: '#FFFFFF', text: '#000000' },
    fonts: { title: 'Work Sans', body: 'Inter' },
    slideCount: 32,
    tags: ['Technology', 'Deep', 'Modern'],
    isPremium: false,
  },
  {
    id: 'pastel-elegant',
    name: 'Pastel Elegant',
    slug: 'pastel-elegant',
    category: 'Creative',
    description: 'Soft pastel template with elegant purple tones',
    coverImage: `${STORAGE_BASE}/1sDlaMHLp8sqS-uDx3AhA6sVWfIenOy-hB2GSPBa4h5E.png`,
    slideImages: [],
    googleSlidesId: '1sDlaMHLp8sqS-uDx3AhA6sVWfIenOy-hB2GSPBa4h5E',
    colors: { primary: '#503259', secondary: '#765186', accent: '#B07CC6', bg: '#FAF6E7', text: '#22244E' },
    fonts: { title: 'Inter', body: 'Inter' },
    slideCount: 33,
    tags: ['Creative', 'Pastel', 'Elegant'],
    isPremium: false,
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    slug: 'ocean-blue',
    category: 'Business',
    description: 'Professional ocean-blue template with clean structure',
    coverImage: `${STORAGE_BASE}/1zrAvd3bySGZgJtonBV7D0KfojiDl69CHrQhz7Tttuws.png`,
    slideImages: [],
    googleSlidesId: '1zrAvd3bySGZgJtonBV7D0KfojiDl69CHrQhz7Tttuws',
    colors: { primary: '#29416B', secondary: '#467DB8', accent: '#F4FDFF', bg: '#F4FDFF', text: '#29416B' },
    fonts: { title: 'Manjari', body: 'Inter' },
    slideCount: 38,
    tags: ['Business', 'Professional', 'Blue'],
    isPremium: false,
  },
];

export function getTemplateBySlug(slug: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find(t => t.slug === slug);
}

export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  if (category === 'All') return TEMPLATE_REGISTRY;
  return TEMPLATE_REGISTRY.filter(t => t.category === category);
}

export function getAllCategories(): string[] {
  return ['All', ...new Set(TEMPLATE_REGISTRY.map(t => t.category))];
}

// Convert template definition to the PresentationTheme format used by the editor
export function templateToTheme(template: TemplateDefinition) {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    tokens: {
      palette: {
        primary: template.colors.primary,
        secondary: template.colors.secondary,
        accent: template.colors.accent,
        bg: template.colors.bg,
        text: template.colors.text,
      },
      typography: {
        titleFont: template.fonts.title,
        bodyFont: template.fonts.body,
        titleSize: 42,
        bodySize: 24,
      },
      radii: '16px',
      shadows: 'lg',
    },
    previewColors: [template.colors.primary, template.colors.secondary, template.colors.accent, template.colors.bg],
  };
}
