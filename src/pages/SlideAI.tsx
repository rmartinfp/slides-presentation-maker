import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import TemplateGallery from '@/components/slideai/TemplateGallery';
import ContentStep from '@/components/slideai/ContentStep';
import GeneratingView from '@/components/slideai/GeneratingView';
import { PresentationTheme, Slide, SlideElement, WizardStep } from '@/types/presentation';
import { CinematicPreset } from '@/types/cinematic';
import { THEME_CATALOG } from '@/lib/themes';
import { generatePresentation, TemplateBriefSlide, TemplateBriefSlot } from '@/lib/ai-generate';
import { migrateAllSlides } from '@/lib/slide-migration';
import { getLayoutById } from '@/lib/layout-library';
import { renderLayout, SlideContent } from '@/lib/layout-renderer';
import { generateId } from '@/lib/slide-utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { loadFontsFromSlides, loadFontsFromTheme } from '@/lib/font-loader';

export default function SlideAIPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('template');
  const [cinematicPreset, setCinematicPreset] = useState<CinematicPreset | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<PresentationTheme | null>(null);
  const [templateSlides, setTemplateSlides] = useState<Slide[] | null>(null);
  const [contentText, setContentText] = useState('');
  const [generatedPresentation, setGeneratedPresentation] = useState<{ title: string; slides: Slide[]; theme: PresentationTheme } | null>(null);

  const handleSelectTheme = (theme: PresentationTheme, slides?: Slide[]) => {
    setSelectedTheme(theme);
    setCinematicPreset(null);
    setTemplateSlides(slides && slides.length > 0 ? slides : null);
    // Start loading fonts immediately when template is selected
    loadFontsFromTheme(theme.tokens);
    if (slides) loadFontsFromSlides(slides);
    setStep('content');
  };

  const handleSelectCinematic = (preset: CinematicPreset, templateData?: any) => {
    setCinematicPreset(preset);

    // Use theme from DB template if available, otherwise build from preset
    const dbTheme = templateData?.theme;
    setSelectedTheme(dbTheme || {
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
    });

    // Use real template slides if available (new format with positioned elements)
    const realSlides = templateData?.slides;
    if (Array.isArray(realSlides) && realSlides.length > 0 && realSlides[0]?.elements) {
      // New format: real Slide[] with elements, videoBackground, animationConfig
      setTemplateSlides(realSlides as Slide[]);
    } else {
      setTemplateSlides(null);
    }

    setStep('content');
  };

  // ─── Template analysis helpers ───

  /** Check if plain text is a number/index marker that should be preserved unchanged.
   *  Covers: "01", "1", "01.", "1.", "(01)", "(1)", "{01}", "#01", "01)",
   *  roman numerals "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
   *  letters "A", "B", "C", "A.", "B.", etc. */
  const isNumberMarker = (text: string): boolean => {
    const t = text.trim();
    // Arabic digits with optional prefix/suffix: 01, 01., (01), {01}, #01, _01, -01, 01)
    if (/^[\(\{\[#_\-]?\d{1,3}[\)\}\]]?\.?$/.test(t)) return true;
    // Roman numerals (I-XII) with optional period
    if (/^[IVXL]{1,4}\.?$/i.test(t) && /^(I{1,3}|IV|VI{0,3}|IX|XI{0,2}|XII?)\.?$/i.test(t)) return true;
    // Single letters A-Z with optional period (used as list markers)
    if (/^[A-Z]\.?$/i.test(t)) return true;
    return false;
  };

  /** Classify a text element's role based on font size and content */
  const classifyTextRole = (
    el: SlideElement,
    isLargest: boolean,
  ): 'title' | 'subtitle' | 'body' | 'number' | 'item' => {
    const plainText = el.content.replace(/<[^>]+>/g, '').trim();
    const fontSize = el.style?.fontSize || 24;

    // Numbers/markers — keep unchanged
    if (isNumberMarker(plainText)) return 'number';

    // Largest text element = title
    if (isLargest) return 'title';

    // Second largest or medium font = subtitle
    if (fontSize >= 28) return 'subtitle';

    // Everything else = body
    return 'body';
  };

  /** Get max characters for a text box — based on the original text length.
   *  Use 90% of original to leave safety margin (different fonts/words wrap differently). */
  const calcMaxChars = (el: SlideElement): number => {
    const plainText = el.content.replace(/<[^>]+>/g, '').trim();
    return Math.max(10, Math.floor(plainText.length * 0.9));
  };

  /** Build a template brief from the template slides */
  const buildTemplateBrief = (slides: Slide[]): TemplateBriefSlide[] => {
    return slides.map((slide, slideIndex) => {
      const type = (slide as any).layout || 'content';
      const textElements = (slide.elements || [])
        .filter((el) => el.type === 'text')
        .sort((a, b) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0));

      const textSlots: TemplateBriefSlot[] = [];
      const isToc = type === 'toc';

      // For TOC slides, group similar small-text elements as repeated "item" slots
      if (isToc) {
        let titleDone = false;
        const itemSlots: { maxChars: number }[] = [];

        for (const el of textElements) {
          const plainText = el.content.replace(/<[^>]+>/g, '').trim();
          if (isNumberMarker(plainText)) continue; // skip numbers

          if (!titleDone) {
            textSlots.push({ role: 'title', maxChars: calcMaxChars(el) });
            titleDone = true;
          } else {
            itemSlots.push({ maxChars: calcMaxChars(el) });
          }
        }

        if (itemSlots.length > 0) {
          // Use the smallest maxChars among items as the limit, count = how many
          const minChars = Math.min(...itemSlots.map(s => s.maxChars));
          textSlots.push({ role: 'item', maxChars: minChars, count: itemSlots.length });
        }
      } else if (type === 'section') {
        // Section headers: only title + subtitle (no body text)
        for (let i = 0; i < textElements.length; i++) {
          const el = textElements[i];
          const role = classifyTextRole(el, i === 0);
          if (role === 'number') continue;
          if (role === 'body' || role === 'item') continue; // Skip body in section headers
          textSlots.push({ role, maxChars: calcMaxChars(el) });
        }
      } else {
        // Content slides: classify each element
        for (let i = 0; i < textElements.length; i++) {
          const el = textElements[i];
          const role = classifyTextRole(el, i === 0);
          if (role === 'number') continue; // skip number slots
          textSlots.push({ role, maxChars: calcMaxChars(el) });
        }
      }

      return { slideIndex, type, textSlots };
    });
  };

  const [genOptions, setGenOptions] = useState<{ slideCount?: number; audience?: string; tone?: string }>({});

  const handleGenerate = async (options?: { slideCount?: number; audience?: string; tone?: string }) => {
    if (options) setGenOptions(options);
    const opts = options || genOptions;
    setStep('generating');
    const theme = selectedTheme || THEME_CATALOG[0];

    try {
      // ─── TEMPLATE-DRIVEN FLOW ───
      // If we have template slides, analyze them and send a brief to the AI
      // so it generates content that maps 1:1 to the template's text boxes.
      if (templateSlides && templateSlides.length > 0) {
        // Filter out leaked final pages (instructions, resources — have 20+ elements)
        const cleanSlides = templateSlides.filter((s, idx) => {
          const elCount = s.elements?.length || 0;
          const allText = (s.elements || []).map(e => e.content).join(' ').toLowerCase();
          // Never filter the cover slide (index 0) or closing slides
          const isCover = idx === 0 || (s as any).layout === 'cover';
          const isClosing = (s as any).layout === 'closing';
          if (isCover || isClosing) return true;
          // Filter instruction/resource pages by text content, not element count
          // (templates like Halloween have 100+ decorative shapes on normal slides)
          if (allText.includes('instructions for use') || allText.includes('for more info')) return false;
          if (allText.includes('resources') && allText.includes('freepik') && elCount > 25) return false;
          // Skip title-only slides (no real content structure)
          if ((s as any).layout === 'title-only') return false;
          return true;
        });

        // Deduplicate similar slides:
        // 1. Same layout name → keep first only
        // 2. Similar structure (same text count, similar sizes) → keep first
        // 3. Max 1 section header per presentation
        const seenLayouts = new Set<string>();
        let sectionCount = 0;
        const deduped = cleanSlides.filter((s, idx) => {
          if (idx === 0 || (s as any).layout === 'cover' || (s as any).layout === 'closing') return true;
          const layoutKey = (s as any).layout || 'unknown';
          const isSection = layoutKey === 'section';

          // Max 1 section header
          if (isSection) {
            sectionCount++;
            if (sectionCount > 1) return false;
          }

          // Dedup by layout name (skip 'content' and 'unknown' — too generic)
          if (layoutKey !== 'unknown' && layoutKey !== 'content') {
            if (seenLayouts.has(layoutKey)) return false;
            seenLayouts.add(layoutKey);
          }

          // Dedup by structure fingerprint: text count + number of large texts
          const texts = (s.elements || []).filter(e => e.type === 'text');
          const bigTexts = texts.filter(t => (t.style?.fontSize || 0) > 30).length;
          const structKey = `${texts.length}-${bigTexts}`;
          if (seenLayouts.has('struct:' + structKey) && layoutKey === 'content') return false;
          seenLayouts.add('struct:' + structKey);

          return true;
        });

        // Respect slideCount: keep cover (first) + closing (last) + fill middle from content slides
        const requestedCount = opts.slideCount || deduped.length;
        let finalSlides = deduped;
        if (requestedCount < deduped.length) {
          const cover = deduped[0];
          const closing = deduped.find(s => (s as any).layout === 'closing') || deduped[deduped.length - 1];
          const middle = deduped.filter(s => s !== cover && s !== closing);
          const middleCount = Math.max(1, requestedCount - 2); // reserve 2 for cover + closing
          finalSlides = [cover, ...middle.slice(0, middleCount), closing];
        }

        const templateBrief = buildTemplateBrief(finalSlides);

        const result = await generatePresentation({
          prompt: contentText,
          length: requestedCount <= 7 ? 'short' : requestedCount >= 13 ? 'detailed' : 'informative',
          tone: opts.tone?.toLowerCase() || 'professional',
          audience: opts.audience?.toLowerCase() || 'general',
          templateBrief,
        });

        // Map AI content back onto clean template slides
        const slides: Slide[] = finalSlides.map((templateSlide, slideIndex) => {
          const aiSlide = result.slides.find((s: any) => s.slideIndex === slideIndex)
            || result.slides[slideIndex];

          const newSlide = JSON.parse(JSON.stringify(templateSlide)) as Slide;
          newSlide.id = generateId();
          newSlide.notes = aiSlide?.notes || '';

          if (!aiSlide?.texts || !Array.isArray(aiSlide.texts)) {
            return newSlide;
          }

          // Get text elements sorted by fontSize desc (same order used for brief)
          const textElements = (newSlide.elements || [])
            .filter((el) => el.type === 'text')
            .sort((a, b) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0));

          // Filter out number elements — they keep their original content
          const replaceableElements: SlideElement[] = [];
          for (const el of textElements) {
            const plainText = el.content.replace(/<[^>]+>/g, '').trim();
            if (isNumberMarker(plainText)) continue; // number/marker — skip
            replaceableElements.push(el);
          }

          // Map AI texts 1:1 to replaceable elements, truncating if too long
          let textIdx = 0;
          for (const el of replaceableElements) {
            if (textIdx < aiSlide.texts.length) {
              const aiText = aiSlide.texts[textIdx].content || '';

              // Preserve original formatting: extract the inline style wrapper from
              // the first run of the original content and wrap AI text in it.
              // Original might be: <p><span style="color:#FFF;font-size:48px"><strong>Text</strong></span></p>
              // We want:           <p><span style="color:#FFF;font-size:48px"><strong>AI Text</strong></span></p>
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
              // Auto-fit: if AI text is longer than original, reduce fontSize proportionally
              // This ensures text never overflows its container in ANY renderer
              const origPlainText = origContent.replace(/<[^>]+>/g, '').trim();
              const newPlainText = aiText.trim();
              if (origPlainText.length > 0 && newPlainText.length > origPlainText.length && el.style?.fontSize) {
                const ratio = origPlainText.length / newPlainText.length;
                // Only shrink if significantly longer (>10% overflow)
                if (ratio < 0.9) {
                  el.style.fontSize = Math.max(8, Math.round(el.style.fontSize * Math.max(0.5, ratio)));
                }
              }

              textIdx++;
            }

            // Fix justify alignment
            if (el.style?.textAlign === 'justify') {
              el.style.textAlign = 'left';
            }
          }

          return newSlide;
        });

        // Store & show reveal animation
        const pres = {
          id: Math.random().toString(36).substring(2, 11),
          title: result.title, slides, theme,
          templateType: cinematicPreset ? 'cinematic' as const : 'classic' as const,
          cinematicPresetId: cinematicPreset?.id || undefined,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        sessionStorage.setItem('presentation', JSON.stringify(pres));
        if (cinematicPreset) sessionStorage.setItem('cinematicPreset', JSON.stringify(cinematicPreset));
        loadFontsFromSlides(slides);
        loadFontsFromTheme(theme.tokens);
        setGeneratedPresentation({ title: result.title, slides, theme });
        return;
      }

      // ─── LEGACY FREE-FORM FLOW (no template) ───
      const result = await generatePresentation({
        prompt: contentText,
        length: (opts.slideCount || 10) <= 7 ? 'short' : (opts.slideCount || 10) >= 13 ? 'detailed' : 'informative',
        tone: opts.tone?.toLowerCase() || 'professional',
        audience: opts.audience?.toLowerCase() || 'general',
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
          return {
            id: generateId(),
            elements,
            background,
            notes: aiSlide.notes || '',
            layout: category,
          } as Slide;
        }

        const fallbackLayout = getLayoutById('content-title-body')!;
        const { elements, background } = renderLayout(fallbackLayout, content, theme.tokens);
        return {
          id: generateId(),
          elements,
          background,
          notes: aiSlide.notes || '',
          layout: 'content',
        } as Slide;
      });

      // Store presentation
      sessionStorage.setItem('presentation', JSON.stringify({
        id: Math.random().toString(36).substring(2, 11),
        title: result.title,
        slides,
        theme,
        templateType: cinematicPreset ? 'cinematic' as const : 'classic' as const,
        cinematicPresetId: cinematicPreset?.id || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      if (cinematicPreset) sessionStorage.setItem('cinematicPreset', JSON.stringify(cinematicPreset));
      loadFontsFromSlides(slides);
      loadFontsFromTheme(theme.tokens);
      setGeneratedPresentation({ title: result.title, slides, theme });
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate presentation. Please try again.');
      setStep('content');
    }
  };

  const handleBack = () => {
    if (step === 'content') setStep('template');
    else if (step === 'generating') setStep('content');
  };

  return (
    <div className="min-h-screen mesh-gradient text-slate-900 overflow-hidden font-body">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

        <AnimatePresence mode="wait">
          {step === 'template' && (
            <motion.div
              key="template"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TemplateGallery onSelect={handleSelectTheme} onSelectCinematic={handleSelectCinematic} selectedTheme={selectedTheme} />
            </motion.div>
          )}
          {step === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ContentStep
                theme={selectedTheme!}
                contentText={contentText}
                onContentChange={setContentText}
                onGenerate={handleGenerate}
                onBack={handleBack}
              />
            </motion.div>
          )}
          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GeneratingView
                theme={selectedTheme!}
                generatedSlides={generatedPresentation?.slides || null}
                generatedTitle={generatedPresentation?.title || null}
                userPrompt={contentText}
                templateSlides={templateSlides}
                onComplete={() => navigate('/editor')}
              />
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
