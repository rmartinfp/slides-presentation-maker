import { Presentation, PresentationTheme, Slide, SlideElement } from '@/types/presentation';
import { CinematicPreset } from '@/types/cinematic';
import { getPresetById } from '@/lib/cinematic-presets';
import { THEME_CATALOG } from '@/lib/themes';
import { generatePresentation, TemplateBriefSlide, TemplateBriefSlot } from '@/lib/ai-generate';
import { getLayoutById } from '@/lib/layout-library';
import { renderLayout, SlideContent } from '@/lib/layout-renderer';
import { generateId } from '@/lib/slide-utils';
import { loadFontsFromSlides, loadFontsFromTheme } from '@/lib/font-loader';

// ─── Template analysis helpers ───

function isNumberMarker(text: string): boolean {
  const t = text.trim();
  if (/^[\(\{\[#_\-]?\d{1,3}[\)\}\]]?\.?$/.test(t)) return true;
  if (/^[IVXL]{1,4}\.?$/i.test(t) && /^(I{1,3}|IV|VI{0,3}|IX|XI{0,2}|XII?)\.?$/i.test(t)) return true;
  if (/^[A-Z]\.?$/i.test(t)) return true;
  return false;
}

function classifyTextRole(
  el: SlideElement,
  isLargest: boolean,
): 'title' | 'subtitle' | 'body' | 'number' | 'item' {
  const plainText = el.content.replace(/<[^>]+>/g, '').trim();
  const fontSize = el.style?.fontSize || 24;
  if (isNumberMarker(plainText)) return 'number';
  if (isLargest) return 'title';
  if (fontSize >= 28) return 'subtitle';
  return 'body';
}

function calcMaxChars(el: SlideElement): number {
  const plainText = el.content.replace(/<[^>]+>/g, '').trim();
  return Math.max(10, Math.floor(plainText.length * 0.9));
}

function buildTemplateBrief(slides: Slide[]): TemplateBriefSlide[] {
  return slides.map((slide, slideIndex) => {
    const type = (slide as any).layout || 'content';
    const textElements = (slide.elements || [])
      .filter((el) => el.type === 'text')
      .sort((a, b) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0));

    const textSlots: TemplateBriefSlot[] = [];
    const isToc = type === 'toc';

    if (isToc) {
      let titleDone = false;
      const itemSlots: { maxChars: number }[] = [];
      for (const el of textElements) {
        const plainText = el.content.replace(/<[^>]+>/g, '').trim();
        if (isNumberMarker(plainText)) continue;
        if (!titleDone) {
          textSlots.push({ role: 'title', maxChars: calcMaxChars(el) });
          titleDone = true;
        } else {
          itemSlots.push({ maxChars: calcMaxChars(el) });
        }
      }
      if (itemSlots.length > 0) {
        const minChars = Math.min(...itemSlots.map(s => s.maxChars));
        textSlots.push({ role: 'item', maxChars: minChars, count: itemSlots.length });
      }
    } else if (type === 'section') {
      for (let i = 0; i < textElements.length; i++) {
        const el = textElements[i];
        const role = classifyTextRole(el, i === 0);
        if (role === 'number') continue;
        if (role === 'body' || role === 'item') continue;
        textSlots.push({ role, maxChars: calcMaxChars(el) });
      }
    } else {
      for (let i = 0; i < textElements.length; i++) {
        const el = textElements[i];
        const role = classifyTextRole(el, i === 0);
        if (role === 'number') continue;
        textSlots.push({ role, maxChars: calcMaxChars(el) });
      }
    }

    return { slideIndex, type, textSlots };
  });
}

// ─── Template resolution ───

export interface ResolvedTemplate {
  theme: PresentationTheme;
  templateSlides: Slide[] | null;
  cinematicPreset: CinematicPreset | null;
}

export function resolveTemplate(templateJson: string | null): ResolvedTemplate {
  if (!templateJson) {
    return { theme: THEME_CATALOG[0], templateSlides: null, cinematicPreset: null };
  }

  try {
    const parsed = JSON.parse(templateJson);
    const { type, data } = parsed;

    if (type === 'cinematic') {
      const preset = getPresetById(data.preset_id || 'midnight');
      if (!preset) return { theme: THEME_CATALOG[0], templateSlides: null, cinematicPreset: null };

      const dbTheme: PresentationTheme = data.theme || {
        id: preset.id, name: preset.name, category: 'Cinematic',
        tokens: {
          palette: { primary: preset.accentColor, secondary: preset.secondaryTextColor, accent: preset.accentColor, bg: preset.backgroundColor, text: preset.primaryTextColor },
          typography: { titleFont: preset.fontHeading, bodyFont: preset.fontBody, titleSize: 42, bodySize: 24 },
          radii: '16px', shadows: 'lg',
        },
        previewColors: [preset.accentColor, preset.secondaryTextColor, preset.backgroundColor],
      };

      const realSlides = data.slides;
      const slides = Array.isArray(realSlides) && realSlides.length > 0 && realSlides[0]?.elements
        ? (realSlides as Slide[]) : null;

      return { theme: dbTheme, templateSlides: slides, cinematicPreset: preset };
    }

    // Classic template
    const theme = data.theme as PresentationTheme;
    if (!theme) return { theme: THEME_CATALOG[0], templateSlides: null, cinematicPreset: null };

    const slides = data.preview_slides as Slide[];
    const templateSlides = slides && slides.length > 0 ? slides : null;

    loadFontsFromTheme(theme.tokens);
    if (templateSlides) loadFontsFromSlides(templateSlides);

    return { theme, templateSlides, cinematicPreset: null };
  } catch {
    return { theme: THEME_CATALOG[0], templateSlides: null, cinematicPreset: null };
  }
}

// ─── Main generation function ───

export interface GenerateInput {
  prompt: string;
  slideCount: number;
  templateJson: string | null;
}

export async function runSlideGeneration(input: GenerateInput): Promise<Presentation> {
  const { prompt, slideCount } = input;
  const { theme, templateSlides, cinematicPreset } = resolveTemplate(input.templateJson);

  // ─── TEMPLATE-DRIVEN FLOW ───
  if (templateSlides && templateSlides.length > 0) {
    const cleanSlides = templateSlides.filter((s, idx) => {
      const elCount = s.elements?.length || 0;
      const allText = (s.elements || []).map(e => e.content).join(' ').toLowerCase();
      const isCover = idx === 0 || (s as any).layout === 'cover';
      const isClosing = (s as any).layout === 'closing';
      if (isCover || isClosing) return true;
      if (allText.includes('instructions for use') || allText.includes('for more info')) return false;
      if (allText.includes('resources') && allText.includes('freepik') && elCount > 25) return false;
      if ((s as any).layout === 'title-only') return false;
      return true;
    });

    const seenLayouts = new Set<string>();
    let sectionCount = 0;
    const deduped = cleanSlides.filter((s, idx) => {
      if (idx === 0 || (s as any).layout === 'cover' || (s as any).layout === 'closing') return true;
      const layoutKey = (s as any).layout || 'unknown';
      const isSection = layoutKey === 'section';
      if (isSection) {
        sectionCount++;
        if (sectionCount > 1) return false;
      }
      if (layoutKey !== 'unknown' && layoutKey !== 'content') {
        if (seenLayouts.has(layoutKey)) return false;
        seenLayouts.add(layoutKey);
      }
      const texts = (s.elements || []).filter(e => e.type === 'text');
      const bigTexts = texts.filter(t => (t.style?.fontSize || 0) > 30).length;
      const structKey = `${texts.length}-${bigTexts}`;
      if (seenLayouts.has('struct:' + structKey) && layoutKey === 'content') return false;
      seenLayouts.add('struct:' + structKey);
      return true;
    });

    const requestedCount = slideCount || deduped.length;
    let finalSlides = deduped;
    if (requestedCount < deduped.length) {
      const cover = deduped[0];
      const closing = deduped.find(s => (s as any).layout === 'closing') || deduped[deduped.length - 1];
      const middle = deduped.filter(s => s !== cover && s !== closing);
      const middleCount = Math.max(1, requestedCount - 2);
      finalSlides = [cover, ...middle.slice(0, middleCount), closing];
    }

    const templateBrief = buildTemplateBrief(finalSlides);

    const result = await generatePresentation({
      prompt,
      length: requestedCount <= 7 ? 'short' : requestedCount >= 13 ? 'detailed' : 'informative',
      tone: 'professional',
      audience: 'general',
      templateBrief,
    });

    const slides: Slide[] = finalSlides.map((templateSlide, slideIndex) => {
      const aiSlide = result.slides.find((s: any) => s.slideIndex === slideIndex)
        || result.slides[slideIndex];

      const newSlide = JSON.parse(JSON.stringify(templateSlide)) as Slide;
      newSlide.id = generateId();
      newSlide.notes = aiSlide?.notes || '';

      if (!aiSlide?.texts || !Array.isArray(aiSlide.texts)) return newSlide;

      const textElements = (newSlide.elements || [])
        .filter((el) => el.type === 'text')
        .sort((a, b) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0));

      const replaceableElements: SlideElement[] = [];
      for (const el of textElements) {
        const plainText = el.content.replace(/<[^>]+>/g, '').trim();
        if (isNumberMarker(plainText)) continue;
        replaceableElements.push(el);
      }

      let textIdx = 0;
      for (const el of replaceableElements) {
        if (textIdx < aiSlide.texts.length) {
          const aiText = aiSlide.texts[textIdx].content || '';
          const origContent = el.content;
          const openingTags = origContent.match(/^(<p>)(\s*<span[^>]*>)?(\s*<strong>)?(\s*<em>)?/);
          const closingTags = origContent.match(/(<\/em>\s*)?(<\/strong>\s*)?(<\/span>\s*)?(<\/p>)\s*$/);

          if (openingTags && closingTags) {
            const open = (openingTags[1] || '') + (openingTags[2] || '') + (openingTags[3] || '') + (openingTags[4] || '');
            const close = (closingTags[1] || '') + (closingTags[2] || '') + (closingTags[3] || '') + (closingTags[4] || '');
            el.content = open + aiText + close;
          } else {
            el.content = `<p>${aiText}</p>`;
          }

          const origPlainText = origContent.replace(/<[^>]+>/g, '').trim();
          const newPlainText = aiText.trim();
          if (origPlainText.length > 0 && newPlainText.length > origPlainText.length && el.style?.fontSize) {
            const ratio = origPlainText.length / newPlainText.length;
            if (ratio < 0.9) {
              el.style.fontSize = Math.max(8, Math.round(el.style.fontSize * Math.max(0.5, ratio)));
            }
          }
          textIdx++;
        }
        if (el.style?.textAlign === 'justify') {
          el.style.textAlign = 'left';
        }
      }

      return newSlide;
    });

    const pres: Presentation = {
      id: Math.random().toString(36).substring(2, 11),
      title: result.title, slides, theme,
      templateType: cinematicPreset ? 'cinematic' as const : 'classic' as const,
      cinematicPresetId: cinematicPreset?.id || undefined,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    if (cinematicPreset) sessionStorage.setItem('cinematicPreset', JSON.stringify(cinematicPreset));
    loadFontsFromSlides(slides);
    loadFontsFromTheme(theme.tokens);
    return pres;
  }

  // ─── LEGACY FREE-FORM FLOW (no template) ───
  const result = await generatePresentation({
    prompt,
    length: slideCount <= 7 ? 'short' : slideCount >= 13 ? 'detailed' : 'informative',
    tone: 'professional',
    audience: 'general',
  });

  const slides: Slide[] = result.slides.map((aiSlide: any, index: number) => {
    const layoutId = aiSlide.layout || 'content-title-body';
    const layout = getLayoutById(layoutId);
    const category = layout?.category || 'content';

    const content: SlideContent = {
      title: aiSlide.title,
      subtitle: aiSlide.subtitle,
      body: aiSlide.body,
      stats: aiSlide.stats,
      bullets: aiSlide.bullets,
      quote: aiSlide.quote,
      quoteAuthor: aiSlide.quoteAuthor,
      labels: aiSlide.labels,
      sectionNumber: aiSlide.sectionNumber || (index > 0 ? String(index).padStart(2, '0') : undefined),
    };

    if (layout) {
      const { elements, background } = renderLayout(layout, content, theme.tokens);
      return { id: generateId(), elements, background, notes: aiSlide.notes || '', layout: category } as Slide;
    }

    const fallbackLayout = getLayoutById('content-title-body')!;
    const { elements, background } = renderLayout(fallbackLayout, content, theme.tokens);
    return { id: generateId(), elements, background, notes: aiSlide.notes || '', layout: 'content' } as Slide;
  });

  const pres: Presentation = {
    id: Math.random().toString(36).substring(2, 11),
    title: result.title, slides, theme,
    templateType: cinematicPreset ? 'cinematic' as const : 'classic' as const,
    cinematicPresetId: cinematicPreset?.id || undefined,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  if (cinematicPreset) sessionStorage.setItem('cinematicPreset', JSON.stringify(cinematicPreset));
  loadFontsFromSlides(slides);
  loadFontsFromTheme(theme.tokens);
  return pres;
}
