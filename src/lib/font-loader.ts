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

export function loadGoogleFont(fontFamily: string): void {
  // Clean font family name (remove quotes, fallbacks)
  const clean = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  if (!clean || SYSTEM_FONTS.has(clean) || loadedFonts.has(clean)) return;

  loadedFonts.add(clean);

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
