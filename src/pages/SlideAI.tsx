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

export default function SlideAIPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('template');
  const [cinematicPreset, setCinematicPreset] = useState<CinematicPreset | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<PresentationTheme | null>(null);
  const [templateSlides, setTemplateSlides] = useState<Slide[] | null>(null);
  const [contentText, setContentText] = useState('');

  const handleSelectTheme = (theme: PresentationTheme, slides?: Slide[]) => {
    setSelectedTheme(theme);
    setCinematicPreset(null);
    setTemplateSlides(slides && slides.length > 0 ? slides : null);
    setStep('content');
  };

  const handleSelectCinematic = (preset: CinematicPreset) => {
    setCinematicPreset(preset);
    setSelectedTheme({
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
    setTemplateSlides(null);
    setStep('content');
  };

  // ─── Template analysis helpers ───

  /** Classify a text element's role based on font size and content */
  const classifyTextRole = (
    el: SlideElement,
    isLargest: boolean,
  ): 'title' | 'subtitle' | 'body' | 'number' | 'item' => {
    const plainText = el.content.replace(/<[^>]+>/g, '').trim();
    const fontSize = el.style?.fontSize || 24;

    // Numbers like "01", "02", "1", "2" etc — keep unchanged
    if (/^\d{1,3}$/.test(plainText)) return 'number';

    // Largest text element = title
    if (isLargest) return 'title';

    // Second largest or medium font = subtitle
    if (fontSize >= 28) return 'subtitle';

    // Everything else = body
    return 'body';
  };

  /** Calculate max characters for a text box based on dimensions and font size */
  const calcMaxChars = (el: SlideElement): number => {
    const fontSize = el.style?.fontSize || 24;
    const area = el.width * el.height;
    return Math.floor(area / (fontSize * 0.8));
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
          if (/^\d{1,3}$/.test(plainText)) continue; // skip numbers

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
      } else {
        // Non-TOC slides: classify each element
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

  const handleGenerate = async () => {
    setStep('generating');
    const theme = selectedTheme || THEME_CATALOG[0];

    try {
      // ─── TEMPLATE-DRIVEN FLOW ───
      // If we have template slides, analyze them and send a brief to the AI
      // so it generates content that maps 1:1 to the template's text boxes.
      if (templateSlides && templateSlides.length > 0) {
        const templateBrief = buildTemplateBrief(templateSlides);

        const result = await generatePresentation({
          prompt: contentText,
          length: 'informative',
          tone: 'professional',
          audience: 'general',
          templateBrief,
        });

        // Map AI content back onto template slides
        const slides: Slide[] = templateSlides.map((templateSlide, slideIndex) => {
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
            if (/^\d{1,3}$/.test(plainText)) continue; // number — skip
            replaceableElements.push(el);
          }

          // Map AI texts 1:1 to replaceable elements
          let textIdx = 0;
          for (const el of replaceableElements) {
            if (textIdx < aiSlide.texts.length) {
              const aiText = aiSlide.texts[textIdx].content || '';
              el.content = `<p>${aiText}</p>`;
              textIdx++;
            }

            // Fix justify alignment
            if (el.style?.textAlign === 'justify') {
              el.style.textAlign = 'left';
            }
          }

          return newSlide;
        });

        // Store presentation
        sessionStorage.setItem('presentation', JSON.stringify({
          id: Math.random().toString(36).substring(2, 11),
          title: result.title,
          slides,
          theme,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        if (cinematicPreset) {
          sessionStorage.setItem('cinematicPreset', JSON.stringify(cinematicPreset));
        }
        navigate('/editor');
        return;
      }

      // ─── LEGACY FREE-FORM FLOW (no template) ───
      const result = await generatePresentation({
        prompt: contentText,
        length: 'informative',
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      if (cinematicPreset) {
        sessionStorage.setItem('cinematicPreset', JSON.stringify(cinematicPreset));
      }
      navigate('/editor');
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
              <GeneratingView theme={selectedTheme!} />
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
