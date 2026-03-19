import React, { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import TemplateGallery from '@/components/slideai/TemplateGallery';
import ContentStep from '@/components/slideai/ContentStep';
import GeneratingView from '@/components/slideai/GeneratingView';
import { PresentationTheme, Slide, WizardStep } from '@/types/presentation';
import { THEME_CATALOG } from '@/lib/themes';
import { generatePresentation } from '@/lib/ai-generate';
import { migrateAllSlides } from '@/lib/slide-migration';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function SlideAIPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>('template');
  const [selectedTheme, setSelectedTheme] = useState<PresentationTheme | null>(null);
  const [templateSlides, setTemplateSlides] = useState<Slide[] | null>(null);
  const [contentText, setContentText] = useState('');

  const handleSelectTheme = (theme: PresentationTheme, slides?: Slide[]) => {
    setSelectedTheme(theme);
    setTemplateSlides(slides && slides.length > 0 ? slides : null);
    // Always go to content step — user enters prompt, AI fills in the template
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
        const filledSlides = templateSlides.map((slide, i) => {
          const aiSlide = result.slides[i];
          if (!aiSlide) return slide; // Keep original if AI didn't generate enough

          // Clone slide deeply
          const newSlide = JSON.parse(JSON.stringify(slide));

          // Find text elements sorted by Y position (top to bottom)
          const textElements = (newSlide.elements || [])
            .filter((el: any) => el.type === 'text')
            .sort((a: any, b: any) => a.y - b.y);

          // Replace text content: first text = title, rest = body/bullets
          if (textElements.length > 0 && aiSlide.title) {
            textElements[0].content = aiSlide.title;
          }
          if (textElements.length > 1) {
            const bodyContent = aiSlide.bullets?.length
              ? aiSlide.bullets.map((b: string) => `<p>${b}</p>`).join('')
              : aiSlide.body
                ? `<p>${aiSlide.body}</p>`
                : textElements[1].content;
            textElements[1].content = bodyContent;
          }
          // Fill remaining text elements with bullets
          if (textElements.length > 2 && aiSlide.bullets) {
            for (let j = 2; j < textElements.length && j - 2 < aiSlide.bullets.length; j++) {
              textElements[j].content = aiSlide.bullets[j - 2];
            }
          }

          return newSlide;
        });

        const migrated = migrateAllSlides(filledSlides as Slide[], theme.tokens);

        sessionStorage.setItem('presentation', JSON.stringify({
          id: Math.random().toString(36).substring(2, 11),
          title: result.title,
          slides: migrated,
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
              <TemplateGallery onSelect={handleSelectTheme} selectedTheme={selectedTheme} />
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
