import { useState, useEffect, useRef } from 'react';
import { Slide, SlideElement, PresentationTheme } from '@/types/presentation';
import { getPresetById } from '@/lib/cinematic-presets';
import { THEME_CATALOG } from '@/lib/themes';
import { generatePresentation, TemplateBriefSlide, TemplateBriefSlot } from '@/lib/ai-generate';
import { generateId } from '@/lib/slide-utils';
import { loadFontsFromSlides, loadFontsFromTheme } from '@/lib/font-loader';
import { useEditorStore } from '@/stores/editor-store';
import { toast } from 'sonner';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Template analysis helpers (from SlideAI.tsx) ───

function isNumberMarker(text: string): boolean {
  const t = text.trim();
  if (/^[\(\{\[#_\-]?\d{1,3}[\)\}\]]?\.?$/.test(t)) return true;
  if (/^[IVXL]{1,4}\.?$/i.test(t) && /^(I{1,3}|IV|VI{0,3}|IX|XI{0,2}|XII?)\.?$/i.test(t))
    return true;
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
        const minChars = Math.min(...itemSlots.map((s) => s.maxChars));
        textSlots.push({ role: 'item', maxChars: minChars, count: itemSlots.length });
      }
    } else if (type === 'section') {
      for (let i = 0; i < textElements.length; i++) {
        const el = textElements[i];
        const role = classifyTextRole(el, i === 0);
        if (role === 'number' || role === 'body' || role === 'item') continue;
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

// ─── Process raw entry template from sessionStorage ───

interface ProcessedTemplate {
  theme: PresentationTheme;
  templateSlides: Slide[] | null;
  cinematicPresetId: string | null;
}

function processEntryTemplate(raw: string): ProcessedTemplate | null {
  try {
    const parsed = JSON.parse(raw);
    const { type, data } = parsed;

    if (type === 'cinematic') {
      const preset = getPresetById(data.preset_id || 'midnight');
      if (!preset) return null;
      const dbTheme = data.theme || {
        id: preset.id,
        name: preset.name,
        category: 'Cinematic',
        tokens: {
          palette: {
            primary: preset.accentColor,
            secondary: preset.secondaryTextColor,
            accent: preset.accentColor,
            bg: preset.backgroundColor,
            text: preset.primaryTextColor,
          },
          typography: {
            titleFont: preset.fontHeading,
            bodyFont: preset.fontBody,
            titleSize: 42,
            bodySize: 24,
          },
          radii: '16px',
          shadows: 'lg',
        },
        previewColors: [preset.accentColor, preset.secondaryTextColor, preset.backgroundColor],
      };
      const realSlides = data.slides;
      const templateSlides =
        Array.isArray(realSlides) && realSlides.length > 0 && realSlides[0]?.elements
          ? (realSlides as Slide[])
          : null;
      return { theme: dbTheme, templateSlides, cinematicPresetId: preset.id };
    }

    // Classic template
    const theme = data.theme as PresentationTheme;
    if (!theme) return null;
    const slides = data.preview_slides as Slide[];
    const templateSlides = slides && slides.length > 0 ? slides : null;
    loadFontsFromTheme(theme.tokens);
    if (templateSlides) loadFontsFromSlides(templateSlides);
    return { theme, templateSlides, cinematicPresetId: null };
  } catch {
    return null;
  }
}

// ─── Clean and deduplicate template slides (from SlideAI.tsx) ───

function cleanTemplateSlides(rawSlides: Slide[], requestedCount: number): Slide[] {
  const cleanSlides = rawSlides.filter((s, idx) => {
    const allText = (s.elements || []).map((e) => e.content).join(' ').toLowerCase();
    const isCover = idx === 0 || (s as any).layout === 'cover';
    const isClosing = (s as any).layout === 'closing';
    if (isCover || isClosing) return true;
    if (allText.includes('instructions for use') || allText.includes('for more info')) return false;
    if (allText.includes('resources') && allText.includes('freepik')) return false;
    if ((s as any).layout === 'title-only') return false;
    return true;
  });

  const seenLayouts = new Set<string>();
  let sectionCount = 0;
  const deduped = cleanSlides.filter((s, idx) => {
    if (idx === 0 || (s as any).layout === 'cover' || (s as any).layout === 'closing') return true;
    const layoutKey = (s as any).layout || 'unknown';
    if (layoutKey === 'section') {
      sectionCount++;
      if (sectionCount > 1) return false;
    }
    if (layoutKey !== 'unknown' && layoutKey !== 'content') {
      if (seenLayouts.has(layoutKey)) return false;
      seenLayouts.add(layoutKey);
    }
    const texts = (s.elements || []).filter((e) => e.type === 'text');
    const bigTexts = texts.filter((t) => (t.style?.fontSize || 0) > 30).length;
    const structKey = `${texts.length}-${bigTexts}`;
    if (seenLayouts.has('struct:' + structKey) && layoutKey === 'content') return false;
    seenLayouts.add('struct:' + structKey);
    return true;
  });

  const cover = deduped[0];
  const closingSlide = deduped.find((s) => (s as any).layout === 'closing');
  const closing = closingSlide || deduped[deduped.length - 1];
  const middle = deduped.filter((s) => s !== cover && s !== closing);

  if (requestedCount < deduped.length) {
    const middleCount = Math.max(1, requestedCount - 2);
    return [cover, ...middle.slice(0, middleCount), closing];
  }

  if (requestedCount > deduped.length && middle.length > 0) {
    const extraNeeded = requestedCount - deduped.length;
    const extraSlides: Slide[] = [];
    for (let i = 0; i < extraNeeded; i++) {
      const source = middle[i % middle.length];
      extraSlides.push(JSON.parse(JSON.stringify(source)));
    }
    return [cover, ...middle, ...extraSlides, closing];
  }

  return deduped;
}

// ─── Map AI result onto template slides (from SlideAI.tsx) ───

function mapResultOntoTemplate(
  result: any,
  finalSlides: Slide[],
): Slide[] {
  return finalSlides.map((templateSlide, slideIndex) => {
    const aiSlide =
      result.slides.find((s: any) => s.slideIndex === slideIndex) || result.slides[slideIndex];

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
        const closingTags = origContent.match(
          /(<\/em>\s*)?(<\/strong>\s*)?(<\/span>\s*)?(<\/p>)\s*$/,
        );

        if (openingTags && closingTags) {
          const open =
            (openingTags[1] || '') +
            (openingTags[2] || '') +
            (openingTags[3] || '') +
            (openingTags[4] || '');
          const close =
            (closingTags[1] || '') +
            (closingTags[2] || '') +
            (closingTags[3] || '') +
            (closingTags[4] || '');
          el.content = open + aiText + close;
        } else {
          el.content = `<p>${aiText}</p>`;
        }

        const origPlainText = origContent.replace(/<[^>]+>/g, '').trim();
        const newPlainText = aiText.trim();
        if (
          origPlainText.length > 0 &&
          newPlainText.length > origPlainText.length &&
          el.style?.fontSize
        ) {
          const ratio = origPlainText.length / newPlainText.length;
          if (ratio < 0.9) {
            el.style.fontSize = Math.max(8, Math.round(el.style.fontSize * Math.max(0.5, ratio)));
          }
        }

        if (el.style?.textAlign === 'justify') {
          el.style.textAlign = 'left';
        }

        textIdx++;
      }
    }

    return newSlide;
  });
}

// ─── Hook ───

export interface LiveGenState {
  isGenerating: boolean;
  revealedUpTo: number;
  typingSlideIndex: number;
  typingSlide: Slide | null;
  totalSlides: number;
}

interface PendingGeneration {
  prompt: string;
  slideCount: number;
  theme: PresentationTheme;
  templateSlides: Slide[] | null;
  cinematicPresetId: string | null;
  tone: string;
  audience: string;
}

export function useLiveGeneration(
  generationActiveRef: React.MutableRefObject<boolean>,
) {
  const [state, setState] = useState<LiveGenState>({
    isGenerating: false,
    revealedUpTo: 0,
    typingSlideIndex: -1,
    typingSlide: null,
    totalSlides: 0,
  });

  const startedRef = useRef(false);
  const generatedSlidesRef = useRef<Slide[] | null>(null);

  useEffect(() => {
    if (startedRef.current) return;

    let params: PendingGeneration | null = null;

    // Check for processed params from SlideAI wizard
    const pendingGen = sessionStorage.getItem('pendingGeneration');
    if (pendingGen) {
      startedRef.current = true;
      sessionStorage.removeItem('pendingGeneration');
      try {
        params = JSON.parse(pendingGen);
      } catch {
        return;
      }
    }

    // Check for raw params from Entry page
    if (!params) {
      const entryPrompt = sessionStorage.getItem('entryPrompt');
      if (!entryPrompt) return;
      startedRef.current = true;
      sessionStorage.removeItem('entryPrompt');

      const slideCount = parseInt(sessionStorage.getItem('entrySlideCount') || '8', 10);
      sessionStorage.removeItem('entrySlideCount');

      const entryTemplate = sessionStorage.getItem('entryTemplate');
      sessionStorage.removeItem('entryTemplate');

      let theme: PresentationTheme = THEME_CATALOG[0];
      let templateSlides: Slide[] | null = null;
      let cinematicPresetId: string | null = null;

      if (entryTemplate) {
        const processed = processEntryTemplate(entryTemplate);
        if (processed) {
          theme = processed.theme;
          templateSlides = processed.templateSlides;
          cinematicPresetId = processed.cinematicPresetId;
        }
      }

      params = {
        prompt: entryPrompt,
        slideCount,
        theme,
        templateSlides,
        cinematicPresetId,
        tone: 'professional',
        audience: 'general',
      };
    }

    if (!params) return;

    // Signal that generation is active (prevents Editor from creating defaults)
    generationActiveRef.current = true;

    const { prompt, slideCount, theme, templateSlides, cinematicPresetId } = params;

    // Create placeholder slides with template backgrounds
    const placeholders: Slide[] = Array.from({ length: slideCount }, (_, i) => {
      const tmplSlide = templateSlides?.[i % (templateSlides?.length || 1)];
      return {
        id: generateId(),
        elements: [],
        background: tmplSlide?.background || {
          type: 'solid' as const,
          value: theme.tokens.palette.bg,
        },
        videoBackground: tmplSlide?.videoBackground,
      };
    });

    const presId = Math.random().toString(36).substring(2, 11);
    useEditorStore.getState().setPresentation({
      id: presId,
      title: 'Generating...',
      slides: placeholders,
      theme,
      templateType: cinematicPresetId ? 'cinematic' : 'classic',
      cinematicPresetId: cinematicPresetId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    loadFontsFromTheme(theme.tokens);
    if (templateSlides) loadFontsFromSlides(templateSlides);

    setState({
      isGenerating: true,
      revealedUpTo: 0,
      typingSlideIndex: -1,
      typingSlide: null,
      totalSlides: slideCount,
    });

    // Run generation
    let cancelled = false;

    async function run() {
      try {
        const effectiveTemplateSlides = templateSlides;
        let resultSlides: Slide[];

        if (effectiveTemplateSlides && effectiveTemplateSlides.length > 0) {
          // Template-driven flow
          const finalSlides = cleanTemplateSlides(effectiveTemplateSlides, slideCount);
          const templateBrief = buildTemplateBrief(finalSlides);

          const result = await generatePresentation({
            prompt: params!.prompt,
            length:
              slideCount <= 7 ? 'short' : slideCount >= 13 ? 'detailed' : 'informative',
            tone: params!.tone,
            audience: params!.audience,
            templateBrief,
          });

          if (cancelled) return;

          resultSlides = mapResultOntoTemplate(result, finalSlides);

          useEditorStore.setState((s) => ({
            presentation: {
              ...s.presentation,
              title: result.title,
            },
          }));
        } else {
          // Legacy free-form flow
          const { getLayoutById } = await import('@/lib/layout-library');
          const { renderLayout } = await import('@/lib/layout-renderer');

          const result = await generatePresentation({
            prompt: params!.prompt,
            length:
              slideCount <= 7 ? 'short' : slideCount >= 13 ? 'detailed' : 'informative',
            tone: params!.tone,
            audience: params!.audience,
          });

          if (cancelled) return;

          resultSlides = result.slides.map((aiSlide: any, index: number) => {
            const layoutId = aiSlide.layout || 'content-title-body';
            const layout = getLayoutById(layoutId);

            const content = {
              title: aiSlide.title,
              subtitle: aiSlide.subtitle,
              body: aiSlide.body,
              stats: aiSlide.stats,
              bullets: aiSlide.bullets,
              quote: aiSlide.quote,
              quoteAuthor: aiSlide.quoteAuthor,
              labels: aiSlide.labels,
              sectionNumber:
                aiSlide.sectionNumber ||
                (index > 0 ? String(index).padStart(2, '0') : undefined),
            };

            if (layout) {
              const { elements, background } = renderLayout(layout, content, theme.tokens);
              return {
                id: generateId(),
                elements,
                background,
                notes: aiSlide.notes || '',
                layout: layout.category || 'content',
              } as Slide;
            }

            const fallbackLayout = getLayoutById('content-title-body')!;
            const { elements, background } = renderLayout(
              fallbackLayout,
              content,
              theme.tokens,
            );
            return {
              id: generateId(),
              elements,
              background,
              notes: aiSlide.notes || '',
              layout: 'content',
            } as Slide;
          });

          useEditorStore.setState((s) => ({
            presentation: {
              ...s.presentation,
              title: result.title,
            },
          }));
        }

        if (cancelled) return;

        generatedSlidesRef.current = resultSlides;
        loadFontsFromSlides(resultSlides);

        // ── Progressive reveal — all slides are ready, start typing one by one ──

        // Brief pause so the user sees the shimmer state before typing begins
        useEditorStore.getState().setActiveSlideIndex(0);
        await sleep(400);

        for (let i = 0; i < resultSlides.length; i++) {
          if (cancelled) return;

          const slide = resultSlides[i];

          // Navigate to this slide first
          useEditorStore.getState().setActiveSlideIndex(i);
          await sleep(80);

          // Now start the typing overlay
          setState((s) => ({
            ...s,
            typingSlideIndex: i,
            typingSlide: slide,
          }));

          // Calculate reveal duration to match the overlay's mask animation
          const textEls = (slide.elements || []).filter((e) => e.type === 'text' && e.content);
          const numTexts = textEls.length;
          const totalChars = textEls.reduce(
            (sum, e) =>
              sum + e.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim().length,
            0,
          );
          const avgChars = numTexts > 0 ? totalChars / numTexts : 0;
          const perElementDuration = Math.max(350, Math.min(avgChars * 8, 1800));
          const lastElementDelay = Math.max(0, (numTexts - 1) * 150);
          const revealWait = lastElementDelay + perElementDuration + 800;
          await sleep(revealWait);

          if (cancelled) return;

          // Commit real slide to store AFTER the reveal animation finishes
          useEditorStore.setState((s) => {
            const newSlides = [...s.presentation.slides];
            newSlides[i] = slide;
            return {
              presentation: {
                ...s.presentation,
                slides: newSlides,
                updatedAt: new Date().toISOString(),
              },
            };
          });

          setState((s) => ({
            ...s,
            revealedUpTo: i + 1,
            typingSlideIndex: -1,
            typingSlide: null,
          }));

          // Pause between slides so the user sees the committed slide briefly
          await sleep(300);
        }

        if (cancelled) return;

        // Trim any leftover placeholder slides that weren't filled
        useEditorStore.setState((s) => {
          const currentSlides = s.presentation.slides;
          if (currentSlides.length > resultSlides.length) {
            return {
              presentation: {
                ...s.presentation,
                slides: currentSlides.slice(0, resultSlides.length),
                updatedAt: new Date().toISOString(),
              },
            };
          }
          return s;
        });

        // Also persist to sessionStorage for the editor's auto-save
        const finalState = useEditorStore.getState();
        sessionStorage.setItem('presentation', JSON.stringify(finalState.presentation));
        if (cinematicPresetId) {
          const preset = getPresetById(cinematicPresetId);
          if (preset) sessionStorage.setItem('cinematicPreset', JSON.stringify(preset));
        }

        setState((s) => ({
          ...s,
          isGenerating: false,
          typingSlideIndex: -1,
          typingSlide: null,
        }));

        // Navigate back to first slide
        useEditorStore.getState().setActiveSlideIndex(0);
      } catch (error: any) {
        if (cancelled) return;
        console.error('Live generation failed:', error);
        toast.error('Failed to generate presentation. Please try again.');
        setState((s) => ({
          ...s,
          isGenerating: false,
          typingSlideIndex: -1,
          typingSlide: null,
        }));
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
