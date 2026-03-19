import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation, Slide } from '@/types/presentation';
import { THEME_CATALOG } from '@/lib/themes';
import { createEmptySlide, createSampleSlides } from '@/lib/slide-utils';
import SlideCanvas from '@/components/editor/SlideCanvas';
import SlideList from '@/components/editor/SlideList';
import EditorToolbar from '@/components/editor/EditorToolbar';
import { toast } from 'sonner';

export default function EditorPage() {
  const navigate = useNavigate();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  // Load presentation from session or create default
  const [presentation, setPresentation] = useState<Presentation>(() => {
    const stored = sessionStorage.getItem('presentation');
    if (stored) {
      sessionStorage.removeItem('presentation');
      return JSON.parse(stored);
    }
    return {
      id: 'default',
      title: 'Untitled Presentation',
      slides: createSampleSlides(),
      theme: THEME_CATALOG[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = presentation.slides[activeSlideIndex];

  // Auto-scale canvas to fit container
  const updateScale = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const { width, height } = canvasContainerRef.current.getBoundingClientRect();
    const padding = 64;
    const scaleX = (width - padding) / 1920;
    const scaleY = (height - padding) / 1080;
    setScale(Math.min(scaleX, scaleY, 1));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const updateSlide = (updated: Slide) => {
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.map((s, i) => i === activeSlideIndex ? updated : s),
      updatedAt: new Date().toISOString(),
    }));
  };

  const addSlide = () => {
    const newSlide = createEmptySlide('content');
    newSlide.title = 'New Slide';
    setPresentation(prev => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }));
    setActiveSlideIndex(presentation.slides.length);
  };

  const deleteSlide = () => {
    if (presentation.slides.length <= 1) {
      toast.error('Cannot delete the last slide');
      return;
    }
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== activeSlideIndex),
    }));
    setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
  };

  const duplicateSlide = () => {
    const dup = { ...activeSlide, id: Math.random().toString(36).substring(2, 11) };
    setPresentation(prev => ({
      ...prev,
      slides: [
        ...prev.slides.slice(0, activeSlideIndex + 1),
        dup,
        ...prev.slides.slice(activeSlideIndex + 1),
      ],
    }));
    setActiveSlideIndex(activeSlideIndex + 1);
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlideIndex(prev => Math.min(prev + 1, presentation.slides.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSlideIndex(prev => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [presentation.slides.length]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar
        title={presentation.title}
        onTitleChange={title => setPresentation(prev => ({ ...prev, title }))}
        onBack={() => navigate('/')}
        onDuplicate={duplicateSlide}
        onDelete={deleteSlide}
        slideCount={presentation.slides.length}
        activeIndex={activeSlideIndex}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - slide thumbnails */}
        <div className="w-52 shrink-0 border-r border-border bg-card">
          <SlideList
            slides={presentation.slides}
            activeIndex={activeSlideIndex}
            theme={presentation.theme}
            onSelectSlide={setActiveSlideIndex}
            onAddSlide={addSlide}
          />
        </div>

        {/* Center canvas */}
        <div
          ref={canvasContainerRef}
          className="flex-1 flex items-center justify-center bg-slide-canvas overflow-hidden relative"
        >
          {activeSlide && (
            <div style={{ width: 1920 * scale, height: 1080 * scale }}>
              <SlideCanvas
                slide={activeSlide}
                theme={presentation.theme}
                scale={scale}
                isEditing={true}
                onUpdateSlide={updateSlide}
              />
            </div>
          )}

          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-card border border-border text-xs text-muted-foreground font-mono">
            {Math.round(scale * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
