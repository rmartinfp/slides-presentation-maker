/**
 * Dynamically load Google Fonts by injecting <link> tags.
 * Tracks which fonts have been loaded to avoid duplicates.
 */
const loadedFonts = new Set<string>();

// System fonts that don't need loading
const SYSTEM_FONTS = new Set([
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New',
  'Courier', 'Verdana', 'Georgia', 'Palatino', 'Garamond',
  'Comic Sans MS', 'Impact', 'Lucida Console', 'Tahoma', 'Trebuchet MS',
  'sans-serif', 'serif', 'monospace',
]);

// Map PPTX font names (with weight suffixes) to valid Google Fonts names
const FONT_NAME_MAP: Record<string, string> = {
  'Playfair Medium': 'Playfair Display',
  'Playfair Bold': 'Playfair Display',
  'Playfair Regular': 'Playfair Display',
  'Playfair SemiBold': 'Playfair Display',
  'Inter Tight SemiBold': 'Inter Tight',
  'Inter Tight Bold': 'Inter Tight',
  'Inter Tight Medium': 'Inter Tight',
  'Bricolage Grotesque SemiBold': 'Bricolage Grotesque',
  'Bricolage Grotesque Bold': 'Bricolage Grotesque',
  'Montserrat Medium': 'Montserrat',
  'Montserrat Bold': 'Montserrat',
  'Montserrat SemiBold': 'Montserrat',
  'Lato Medium': 'Lato',
  'Lato Bold': 'Lato',
  'Poppins Medium': 'Poppins',
  'Poppins Bold': 'Poppins',
  'Poppins SemiBold': 'Poppins',
  'Raleway Medium': 'Raleway',
  'Raleway Bold': 'Raleway',
  'Open Sans Medium': 'Open Sans',
  'Open Sans Bold': 'Open Sans',
  'Roboto Medium': 'Roboto',
  'Roboto Bold': 'Roboto',
  'Roboto Light': 'Roboto',
  'Source Sans Pro Medium': 'Source Sans 3',
  'Source Sans Pro Bold': 'Source Sans 3',
  'Nunito SemiBold': 'Nunito',
  'Nunito Bold': 'Nunito',
  'Work Sans Medium': 'Work Sans',
  'Work Sans Bold': 'Work Sans',
  'DM Sans Medium': 'DM Sans',
  'DM Sans Bold': 'DM Sans',
  'Josefin Sans Medium': 'Josefin Sans',
  'Josefin Sans Bold': 'Josefin Sans',
};

const WEIGHT_SUFFIXES = ['ExtraBold', 'SemiBold', 'Bold', 'Medium', 'Regular', 'Light', 'Thin', 'Black', 'ExtraLight', 'Heavy'];

function resolveGoogleFontName(name: string): string {
  if (FONT_NAME_MAP[name]) return FONT_NAME_MAP[name];
  for (const suffix of WEIGHT_SUFFIXES) {
    if (name.endsWith(` ${suffix}`)) {
      const base = name.slice(0, -(suffix.length + 1));
      if (base.length > 1) return base;
    }
  }
  return name;
}

export function loadGoogleFont(fontFamily: string): void {
  // Clean font family name (remove quotes, fallbacks)
  const raw = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  // Resolve PPTX font names to valid Google Fonts names
  const clean = resolveGoogleFontName(raw);
  if (!clean || SYSTEM_FONTS.has(clean) || loadedFonts.has(clean)) return;

  loadedFonts.add(clean);
  // Also mark the raw name so we don't try again
  if (raw !== clean) loadedFonts.add(raw);

  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(clean)}:wght@300;400;500;600;700;800&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

/**
 * Load all fonts referenced in a set of slides.
 */
export function loadFontsFromSlides(slides: Array<{ elements?: Array<{ style?: Record<string, any> }> }>): void {
  const fonts = new Set<string>();

  for (const slide of slides) {
    for (const el of slide.elements || []) {
      if (el.style?.fontFamily) {
        fonts.add(el.style.fontFamily);
      }
      // Also scan HTML content for inline font-family styles
      if (typeof (el as any).content === 'string') {
        const matches = (el as any).content.matchAll(/font-family:\s*([^;"]+)/g);
        for (const m of matches) {
          fonts.add(m[1].trim());
        }
      }
    }
  }

  for (const font of fonts) {
    loadGoogleFont(font);
  }
}

/**
 * Load fonts from theme tokens.
 */
export function loadFontsFromTheme(tokens: { typography?: { titleFont?: string; bodyFont?: string } }): void {
  if (tokens.typography?.titleFont) loadGoogleFont(tokens.typography.titleFont);
  if (tokens.typography?.bodyFont) loadGoogleFont(tokens.typography.bodyFont);
}
