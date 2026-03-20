import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import TemplateGallery from '@/components/slideai/TemplateGallery';
import ContentStep from '@/components/slideai/ContentStep';
import GeneratingView from '@/components/slideai/GeneratingView';
import { PresentationTheme, Slide, WizardStep } from '@/types/presentation';
import { CinematicPreset } from '@/types/cinematic';
import { THEME_CATALOG } from '@/lib/themes';
import { generatePresentation } from '@/lib/ai-generate';
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

  const handleGenerate = async () => {
    setStep('generating');
    const theme = selectedTheme || THEME_CATALOG[0];

    try {
      // HYBRID FLOW:
      // 1. AI generates content with layout IDs from the library
      // 2. For each AI slide, try to match a real template slide (by type)
      //    → If match: use template slide visuals + replace text with AI content
      //    → If no match: use Layout Library to create the slide with theme colors
      const result = await generatePresentation({
        prompt: contentText,
        length: 'informative',
        tone: 'professional',
        audience: 'general',
      });

      // Build a pool of template slides indexed by type
      const templatePool: Record<string, any[]> = {};
      if (templateSlides) {
        for (const s of templateSlides) {
          const type = (s as any).layout || 'content';
          if (!templatePool[type]) templatePool[type] = [];
          templatePool[type].push(JSON.parse(JSON.stringify(s)));
        }
      }
      const usedTemplateSlides = new Set<number>();

      // Placeholder detection for template text replacement
      const isPlaceholderText = (html: string): boolean => {
        const plain = html.replace(/<[^>]+>/g, '').trim().toLowerCase();
        if (!plain || plain.length < 3) return false;
        const patterns = [
          /mercury|venus|jupiter|saturn|mars|neptune/i,
          /name of the section/i, /lorem ipsum/i, /placeholder/i,
          /your text here/i, /click to edit/i, /subtitle here/i,
          /write.*title.*here/i, /you can describe/i, /despite being red/i,
        ];
        return patterns.some(p => p.test(plain));
      };

      // Map layout categories to template slide types
      const categoryToType: Record<string, string[]> = {
        'cover': ['cover'],
        'section': ['section'],
        'content': ['content', 'two-column'],
        'data': ['content'],
        'comparison': ['two-column', 'content'],
        'visual': ['image', 'content'],
        'list': ['content'],
        'closing': ['closing'],
        'toc': ['toc', 'content'],
      };

      const slides: Slide[] = result.slides.map((aiSlide: any, index: number) => {
        const layoutId = aiSlide.layout || 'content-title-body';
        const layout = getLayoutById(layoutId);
        const category = layout?.category || 'content';

        // Try to find a matching template slide
        const matchTypes = categoryToType[category] || ['content'];
        let matchedTemplate: any = null;

        for (const type of matchTypes) {
          const pool = templatePool[type];
          if (pool && pool.length > 0) {
            // Pick first unused from pool
            const idx = pool.findIndex((_: any, i: number) => !usedTemplateSlides.has(i));
            if (idx !== -1) {
              matchedTemplate = JSON.parse(JSON.stringify(pool[idx]));
              usedTemplateSlides.add(idx);
              break;
            }
            // If all used, reuse first
            matchedTemplate = JSON.parse(JSON.stringify(pool[0]));
            break;
          }
        }

        if (matchedTemplate) {
          // USE TEMPLATE SLIDE: keep visuals, replace ALL text intelligently
          const textElements = (matchedTemplate.elements || [])
            .filter((el: any) => el.type === 'text')
            .sort((a: any, b: any) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0));

          // Classify text elements by role based on size
          // Largest = title, numbers (short text <4 chars with big font) = keep as numbers
          // Rest = body content that needs replacing
          const aiContent = {
            title: aiSlide.title || '',
            subtitle: Array.isArray(aiSlide.subtitle) ? aiSlide.subtitle : [aiSlide.subtitle].filter(Boolean),
            body: typeof aiSlide.body === 'string' ? aiSlide.body : (Array.isArray(aiSlide.body) ? aiSlide.body[0] : ''),
            bullets: aiSlide.bullets || [],
          };

          let bulletIdx = 0;
          let subtitleIdx = 0;

          for (let j = 0; j < textElements.length; j++) {
            const el = textElements[j];
            const plainText = el.content.replace(/<[^>]+>/g, '').trim();
            const fontSize = el.style?.fontSize || 24;
            const isNumber = /^\d{1,3}$/.test(plainText); // "01", "02", etc — keep as-is
            const isShortLabel = plainText.length <= 5 && fontSize < 40; // Small labels like "01", arrows

            if (isNumber || isShortLabel) {
              // Keep numbers and tiny labels unchanged
              continue;
            }

            if (j === 0 && aiContent.title) {
              // Largest text = title
              el.content = `<p>${aiContent.title}</p>`;
            } else if (fontSize >= 40 && aiContent.title) {
              // Other large text = could be a section title variant
              el.content = `<p>${aiContent.title}</p>`;
            } else if (aiContent.bullets.length > 0 && bulletIdx < aiContent.bullets.length) {
              // Medium text = use a bullet point (unique per box)
              el.content = `<p>${aiContent.bullets[bulletIdx]}</p>`;
              bulletIdx++;
            } else if (aiContent.body) {
              // Remaining = body text
              el.content = `<p>${aiContent.body}</p>`;
            } else if (aiContent.subtitle.length > subtitleIdx) {
              el.content = `<p>${aiContent.subtitle[subtitleIdx]}</p>`;
              subtitleIdx++;
            }

            // Fix justify alignment — use left instead
            if (el.style?.textAlign === 'justify') {
              el.style.textAlign = 'left';
            }
          }

          return {
            ...matchedTemplate,
            id: generateId(),
            notes: aiSlide.notes || '',
          } as Slide;
        }

        // NO TEMPLATE MATCH: use Layout Library + Theme
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

      // Store cinematic preset if selected
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

      <LayoutGroup>
        <AnimatePresence mode="wait">
          {step === 'template' && (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <TemplateGallery onSelect={handleSelectTheme} onSelectCinematic={handleSelectCinematic} selectedTheme={selectedTheme} />
            </motion.div>
          )}
          {step === 'content' && (
            <motion.div
              key="content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <GeneratingView theme={selectedTheme!} />
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
}
