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
      // UNIFIED FLOW: Layout Library + Theme for ALL presentations
      // The AI picks layouts from the library, the renderer applies the theme
      // Template PPTX only contributes: background images for cover/section slides
      const result = await generatePresentation({
        prompt: contentText,
        length: 'informative',
        tone: 'professional',
        audience: 'general',
      });

      // Extract background images from template for cover/section slides
      const templateBackgrounds: Record<string, string> = {};
      if (templateSlides) {
        for (let i = 0; i < Math.min(templateSlides.length, 5); i++) {
          const s = templateSlides[i];
          const type = (s as any).layout || '';
          if (s.background?.type === 'image' && s.background.value) {
            if (type === 'cover' || i === 0) templateBackgrounds['cover'] = s.background.value;
            else if (type === 'section') templateBackgrounds['section'] = s.background.value;
            else if (type === 'image') templateBackgrounds['image'] = s.background.value;
            else if (type === 'closing') templateBackgrounds['closing'] = s.background.value;
          }
        }
      }

      // Convert AI output to slides using Layout Library + Theme
      const slides: Slide[] = result.slides.map((aiSlide: any, index: number) => {
        const layoutId = aiSlide.layout || 'content-title-body';
        const layout = getLayoutById(layoutId);

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

          // Apply template background images where appropriate
          let finalBg = background;
          if (layout.category === 'cover' && templateBackgrounds['cover']) {
            finalBg = { type: 'image', value: templateBackgrounds['cover'] };
          } else if (layout.category === 'section' && templateBackgrounds['section']) {
            finalBg = { type: 'image', value: templateBackgrounds['section'] };
          } else if (layout.category === 'visual' && templateBackgrounds['image']) {
            finalBg = { type: 'image', value: templateBackgrounds['image'] };
          } else if (layout.category === 'closing' && templateBackgrounds['closing']) {
            finalBg = { type: 'image', value: templateBackgrounds['closing'] };
          }

          return {
            id: generateId(),
            elements,
            background: finalBg,
            notes: aiSlide.notes || '',
            layout: layout.category,
          } as Slide;
        }

        // Fallback for unknown layouts
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
