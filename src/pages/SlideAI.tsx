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

          // Find text elements sorted by font size (largest = title)
          const textElements = (templateSlide.elements || [])
            .filter((el: any) => el.type === 'text')
            .sort((a: any, b: any) => (b.style?.fontSize || 0) - (a.style?.fontSize || 0));

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

          // Additional text elements get bullets
          if (aiSlide.bullets) {
            for (let j = 2; j < textElements.length && j - 2 < aiSlide.bullets.length; j++) {
              textElements[j].content = `<p>${aiSlide.bullets[j - 2]}</p>`;
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
        // Hardcoded template: generate slides from scratch
        const result = await generatePresentation({
          prompt: contentText,
          length: 'informative',
          tone: 'professional',
          audience: 'general',
        });

        const slides = migrateAllSlides(
          result.slides as Slide[],
          theme.tokens,
        );

        sessionStorage.setItem('presentation', JSON.stringify({
          id: Math.random().toString(36).substring(2, 11),
          title: result.title,
          slides,
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
