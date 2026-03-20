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
      if (templateSlides && templateSlides.length > 0) {
        // DB template: use AI to replace text content while keeping layout/design
        const result = await generatePresentation({
          prompt: contentText,
          length: 'informative',
          tone: 'professional',
          audience: 'general',
        });

        // Map AI-generated content onto the template slides
        // Use template slides as visual layouts, replace text with AI content
        const aiSlides = result.slides;
        const filledSlides: Slide[] = [];

        for (let i = 0; i < Math.min(templateSlides.length, aiSlides.length); i++) {
          const templateSlide = JSON.parse(JSON.stringify(templateSlides[i]));
          const aiSlide = aiSlides[i];
          const slideLayout = (templateSlide as any).layout || 'content';

          // Find text elements sorted by font size (largest = title)
          const textElements = (templateSlide.elements || [])
            .filter((el: any) => el.type === 'text')
            .sort((a: any, b: any) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0));

          // Detect template placeholder text — generic filler that should be replaced
          const isPlaceholderText = (html: string): boolean => {
            const plain = html.replace(/<[^>]+>/g, '').trim().toLowerCase();
            if (!plain || plain.length < 3) return false;
            // Common Slidesgo/template placeholder patterns
            const placeholderPatterns = [
              /mercury is the closest/i,
              /venus has a beautiful/i,
              /jupiter is the biggest/i,
              /saturn is the ringed/i,
              /mars is actually a cold/i,
              /neptune is the farthest/i,
              /name of the section/i,
              /write the title here/i,
              /write your subtitle here/i,
              /you can describe the topic/i,
              /despite being red/i,
              /lorem ipsum/i,
              /placeholder/i,
              /your text here/i,
              /click to edit/i,
              /insert text/i,
              /add text/i,
              /subtitle here/i,
              /title of (?:your|the) (?:presentation|section)/i,
            ];
            return placeholderPatterns.some(p => p.test(plain));
          };

          // Handle TOC slides differently
          if (slideLayout === 'toc' && aiSlide.bullets?.length) {
            // Title = first/largest text element
            if (textElements.length > 0 && aiSlide.title) {
              textElements[0].content = `<p>${aiSlide.title}</p>`;
            }
            // Fill remaining text elements with TOC items (bullet points)
            for (let j = 1; j < textElements.length && j - 1 < aiSlide.bullets.length; j++) {
              textElements[j].content = `<p>${aiSlide.bullets[j - 1]}</p>`;
            }
          } else {
            // Largest text = title
            if (textElements.length > 0 && aiSlide.title) {
              textElements[0].content = `<p>${aiSlide.title}</p>`;
            }

            // Second largest = body or bullets
            if (textElements.length > 1) {
              if (aiSlide.bullets?.length) {
                textElements[1].content = aiSlide.bullets.map((b: string) => `<p>${b}</p>`).join('');
              } else if (aiSlide.body) {
                textElements[1].content = `<p>${aiSlide.body}</p>`;
              }
            }

            // Replace ALL remaining text elements that contain placeholder/template text
            const usedBullets = new Set<number>();
            for (let j = 2; j < textElements.length; j++) {
              const el = textElements[j];
              if (isPlaceholderText(el.content)) {
                // Try to fill with a bullet point
                if (aiSlide.bullets) {
                  // Find next unused bullet
                  let bulletIdx = 0;
                  while (usedBullets.has(bulletIdx) && bulletIdx < aiSlide.bullets.length) bulletIdx++;
                  if (bulletIdx < aiSlide.bullets.length) {
                    el.content = `<p>${aiSlide.bullets[bulletIdx]}</p>`;
                    usedBullets.add(bulletIdx);
                    continue;
                  }
                }
                // Fall back to body text or subtitle
                if (aiSlide.body) {
                  el.content = `<p>${aiSlide.body}</p>`;
                } else if (aiSlide.subtitle) {
                  el.content = `<p>${aiSlide.subtitle}</p>`;
                }
              }
            }
          }

          filledSlides.push(templateSlide);
        }

        // Don't re-migrate — slides already have proper elements from the template
        sessionStorage.setItem('presentation', JSON.stringify({
          id: Math.random().toString(36).substring(2, 11),
          title: result.title,
          slides: filledSlides,
          theme,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      } else {
        // No PPTX template — use layout library to build slides
        const result = await generatePresentation({
          prompt: contentText,
          length: 'informative',
          tone: 'professional',
          audience: 'general',
        });

        // Convert AI output to slides using layout renderer
        const slides: Slide[] = result.slides.map((aiSlide: any) => {
          const layoutId = aiSlide.layout || 'content-title-body';
          const layout = getLayoutById(layoutId);

          if (layout) {
            // Use layout library to position elements
            const content: SlideContent = {
              title: aiSlide.title,
              subtitle: aiSlide.subtitle,
              body: aiSlide.body,
              stats: aiSlide.stats,
              bullets: aiSlide.bullets,
              quote: aiSlide.quote,
              quoteAuthor: aiSlide.quoteAuthor,
              labels: aiSlide.labels,
              sectionNumber: aiSlide.sectionNumber,
            };

            const { elements, background } = renderLayout(layout, content, theme.tokens);

            return {
              id: generateId(),
              elements,
              background,
              notes: aiSlide.notes || '',
              layout: layout.category,
            } as Slide;
          }

          // Fallback: migrate legacy format
          return {
            id: generateId(),
            elements: [],
            background: { type: 'solid' as const, value: theme.tokens.palette.bg },
            layout: 'content',
            title: aiSlide.title || '',
            body: aiSlide.body || '',
            bullets: aiSlide.bullets || [],
            notes: aiSlide.notes || '',
          } as Slide;
        });

        // Migrate any fallback slides
        const migrated = migrateAllSlides(slides, theme.tokens);

        sessionStorage.setItem('presentation', JSON.stringify({
          id: Math.random().toString(36).substring(2, 11),
          title: result.title,
          slides: migrated,
          theme,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }

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
    <div className="min-h-screen bg-[#030305] text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030305]/50 to-[#030305]" />
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
