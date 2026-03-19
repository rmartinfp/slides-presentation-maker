import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Presentation, Slide } from '@/types/presentation';
import { supabase } from '@/lib/supabase';
import { THEME_CATALOG } from '@/lib/themes';
import { createEmptySlide, createSampleSlides } from '@/lib/slide-utils';
import SlideCanvas from '@/components/editor/SlideCanvas';
import SlideList from '@/components/editor/SlideList';
import EditorToolbar from '@/components/editor/EditorToolbar';
import SpeakerNotes from '@/components/editor/SpeakerNotes';
import CompactRightPanel from '@/components/editor/CompactRightPanel';
import { toast } from 'sonner';
import { exportToPptx } from '@/lib/pptx-export';
import PresentationMode from '@/components/editor/PresentationMode';

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [scale, setScale] = useState(0.5);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [presentation, setPresentation] = useState<Presentation>(() => {
    // If loading by ID from URL, start with a placeholder — the useEffect will populate it
    if (idFromUrl) {
      return {
        id: idFromUrl,
        title: 'Loading...',
        slides: [],
        theme: THEME_CATALOG[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

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
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const activeSlide = presentation.slides[activeSlideIndex];

  // ---- Load from Supabase if URL has ?id=xxx ----
  useEffect(() => {
    if (!idFromUrl) return;
    supabase
      .from('presentations')
      .select('*')
      .eq('id', idFromUrl)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setPresentation({
            id: data.id,
            title: data.title,
            slides: data.slides as Slide[],
            theme: data.theme as Presentation['theme'],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      });
  }, [idFromUrl]);

  // ---- Save to Supabase ----
  const saveToSupabase = async (pres: Presentation) => {
    // Don't save the loading placeholder
    if (pres.slides.length === 0) return;

    setSaveStatus('saving');
    try {
      if (pres.id === 'default' || !pres.id.match(/^[0-9a-f-]{36}$/)) {
        // New presentation — insert
        const { data, error } = await supabase
          .from('presentations')
          .insert({
            title: pres.title,
            slides: pres.slides,
            theme: pres.theme,
          })
          .select('id')
          .single();

        if (!error && data) {
          setPresentation(prev => ({ ...prev, id: data.id }));
          window.history.replaceState({}, '', `/editor?id=${data.id}`);
        }
      } else {
        // Existing — update
        await supabase
          .from('presentations')
          .update({
            title: pres.title,
            slides: pres.slides,
            theme: pres.theme,
          })
          .eq('id', pres.id);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('idle');
    }
  };

  // ---- Debounced auto-save (3 seconds) ----
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToSupabase(presentation);
    }, 3000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [presentation]);

  // ---- Canvas scaling ----
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

  const deleteSlide = (index?: number) => {
    const idx = index ?? activeSlideIndex;
    if (presentation.slides.length <= 1) {
      toast.error('Cannot delete the last slide');
      return;
    }
    setPresentation(prev => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== idx),
    }));
    setActiveSlideIndex(Math.max(0, idx - 1));
  };

  const duplicateSlide = (index?: number) => {
    const idx = index ?? activeSlideIndex;
    const dup = { ...presentation.slides[idx], id: Math.random().toString(36).substring(2, 11) };
    setPresentation(prev => ({
      ...prev,
      slides: [
        ...prev.slides.slice(0, idx + 1),
        dup,
        ...prev.slides.slice(idx + 1),
      ],
    }));
    setActiveSlideIndex(idx + 1);
  };

  const handleNotesChange = (notes: string) => {
    if (!activeSlide) return;
    updateSlide({ ...activeSlide, notes });
  };

  const handleThemeChange = (theme: Presentation['theme']) => {
    setPresentation(prev => ({ ...prev, theme, updatedAt: new Date().toISOString() }));
  };

  const handleLayoutChange = (layout: string) => {
    if (!activeSlide) return;
    updateSlide({ ...activeSlide, layout });
  };

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
    <>
    {isPresentationMode && (
      <PresentationMode
        slides={presentation.slides}
        theme={presentation.theme}
        startIndex={activeSlideIndex}
        onExit={() => setIsPresentationMode(false)}
      />
    )}
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <EditorToolbar
        title={presentation.title}
        onTitleChange={title => setPresentation(prev => ({ ...prev, title }))}
        onBack={() => navigate('/')}
        onDuplicate={() => duplicateSlide()}
        onDelete={() => deleteSlide()}
        onExportPptx={async () => {
          try {
            toast.info('Generating PPTX...');
            await exportToPptx(presentation);
            toast.success('PPTX downloaded!');
          } catch (e) {
            console.error(e);
            toast.error('Failed to export PPTX');
          }
        }}
        slideCount={presentation.slides.length}
        activeIndex={activeSlideIndex}
        saveStatus={saveStatus}
        onPresent={() => setIsPresentationMode(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <SlideList
          slides={presentation.slides}
          activeIndex={activeSlideIndex}
          theme={presentation.theme}
          onSelectSlide={setActiveSlideIndex}
          onAddSlide={addSlide}
          onDeleteSlide={deleteSlide}
          onDuplicateSlide={duplicateSlide}
        />

        {/* Center: canvas + speaker notes */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-center justify-center bg-slate-100 overflow-hidden relative"
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
            <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-500 font-mono shadow-sm">
              {Math.round(scale * 100)}%
            </div>
          </div>

          <SpeakerNotes
            notes={activeSlide?.notes ?? ''}
            onChange={handleNotesChange}
          />
        </div>

        {/* Right panel */}
        <CompactRightPanel
          theme={presentation.theme}
          onThemeChange={handleThemeChange}
          onLayoutChange={handleLayoutChange}
          currentLayout={activeSlide?.layout ?? 'content'}
        />
      </div>
    </div>
    </>
  );
}
