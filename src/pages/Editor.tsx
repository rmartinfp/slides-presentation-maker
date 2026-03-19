import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Presentation, Slide } from '@/types/presentation';
import { THEME_CATALOG } from '@/lib/themes';
import { createSampleSlides } from '@/lib/slide-utils';
import { migrateAllSlides, migrateSlideToElements } from '@/lib/slide-migration';
import { useEditorStore } from '@/stores/editor-store';
import SlideCanvas from '@/components/editor/SlideCanvas';
import SlideList from '@/components/editor/SlideList';
import EditorToolbar from '@/components/editor/EditorToolbar';
import ElementToolbar from '@/components/editor/ElementToolbar';
import SpeakerNotes from '@/components/editor/SpeakerNotes';
import CompactRightPanel from '@/components/editor/CompactRightPanel';
import PresentationMode from '@/components/editor/PresentationMode';
import AIRewriteDialog from '@/components/editor/AIRewriteDialog';
import CanvasContextMenu from '@/components/editor/ContextMenu';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import { exportToPptx } from '@/lib/pptx-export';
import { exportToPdfFromSlides } from '@/lib/pdf-export';
import { AnimatePresence } from 'framer-motion';

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const initializedRef = useRef(false);

  const {
    presentation,
    activeSlideIndex,
    selectedElementIds,
    isPresentationMode,
    showAIRewrite,
    saveStatus,
    scale,
    setPresentation,
    loadFromSupabase,
    saveToSupabase,
    setTitle,
    setTheme,
    setActiveSlideIndex,
    addSlide,
    deleteSlide,
    duplicateSlide,
    updateSlideNotes,
    updateElement,
    setScale,
    setIsPresentationMode,
    setShowAIRewrite,
    setSaveStatus,
    undo,
    redo,
    deleteElements,
    clearSelection,
  } = useEditorStore();

  const activeSlide = presentation.slides[activeSlideIndex];

  // Additional keyboard shortcuts (copy/paste/select-all)
  useKeyboardShortcuts();

  // ---- Initialize presentation ----
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (idFromUrl) {
      loadFromSupabase(idFromUrl);
    } else {
      const stored = sessionStorage.getItem('presentation');
      if (stored) {
        sessionStorage.removeItem('presentation');
        const parsed = JSON.parse(stored);
        setPresentation(parsed);
      } else {
        const theme = THEME_CATALOG[0];
        const slides = migrateAllSlides(createSampleSlides() as Slide[], theme.tokens);
        setPresentation({
          id: 'default',
          title: 'Untitled Presentation',
          slides,
          theme,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [idFromUrl, loadFromSupabase, setPresentation]);

  // ---- Debounced auto-save (3s) ----
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToSupabase();
    }, 3000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [presentation, saveToSupabase]);

  // ---- Canvas scaling ----
  const updateScale = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const { width, height } = canvasContainerRef.current.getBoundingClientRect();
    const padding = 64;
    const scaleX = (width - padding) / 1920;
    const scaleY = (height - padding) / 1080;
    setScale(Math.min(scaleX, scaleY, 1));
  }, [setScale]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      // Undo / Redo (always active)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Don't capture if editing text
      if (isEditing) return;

      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          deleteElements();
        }
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        clearSelection();
      }

      // Arrow keys for slide navigation (no selection) or element nudge (with selection)
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          const nudge = e.shiftKey ? 10 : 1;
          for (const id of selectedElementIds) {
            const el = activeSlide?.elements?.find(el => el.id === id);
            if (el && !el.locked) {
              const dx = e.key === 'ArrowRight' ? nudge : e.key === 'ArrowLeft' ? -nudge : 0;
              const dy = e.key === 'ArrowDown' ? nudge : e.key === 'ArrowUp' ? -nudge : 0;
              updateElement(id, { x: el.x + dx, y: el.y + dy });
            }
          }
        } else {
          e.preventDefault();
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            setActiveSlideIndex(Math.min(activeSlideIndex + 1, presentation.slides.length - 1));
          } else {
            setActiveSlideIndex(Math.max(activeSlideIndex - 1, 0));
          }
        }
      }

      // Duplicate: Ctrl+D
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedElementIds.length > 0) {
          useEditorStore.getState().duplicateElements();
        } else {
          duplicateSlide();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSlideIndex, presentation.slides.length, selectedElementIds, activeSlide, undo, redo, deleteElements, clearSelection, setActiveSlideIndex, updateElement, duplicateSlide]);

  // Legacy updateSlide for AIRewriteDialog compatibility
  const handleAIUpdate = (updated: Slide) => {
    const state = useEditorStore.getState();
    const theme = state.presentation.theme.tokens;
    const migrated = migrateSlideToElements(updated, theme);
    useEditorStore.setState({
      presentation: {
        ...state.presentation,
        slides: state.presentation.slides.map((s, i) =>
          i === state.activeSlideIndex ? migrated : s,
        ),
        updatedAt: new Date().toISOString(),
      },
    });
  };

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
          onTitleChange={setTitle}
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
          onExportPdf={async () => {
            try {
              toast.info('Generating PDF...');
              await exportToPdfFromSlides(presentation);
              toast.success('PDF downloaded!');
            } catch (e) {
              console.error(e);
              toast.error('Failed to export PDF');
            }
          }}
          slideCount={presentation.slides.length}
          activeIndex={activeSlideIndex}
          saveStatus={saveStatus}
          onPresent={() => setIsPresentationMode(true)}
          onUndo={undo}
          onRedo={redo}
        />

        <ElementToolbar />

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
            <CanvasContextMenu>
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
                  />
                </div>
              )}

              {/* Zoom indicator */}
              <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-500 font-mono shadow-sm">
                {Math.round(scale * 100)}%
              </div>
            </div>
            </CanvasContextMenu>

            <SpeakerNotes
              notes={activeSlide?.notes ?? ''}
              onChange={updateSlideNotes}
            />
          </div>

          {/* Right panel */}
          <CompactRightPanel
            theme={presentation.theme}
            onThemeChange={setTheme}
            onLayoutChange={() => {}} // layouts are now element-based
            currentLayout="canvas"
            onAIRewrite={() => setShowAIRewrite(true)}
          />
        </div>
      </div>

      {/* AI Rewrite Dialog */}
      <AnimatePresence>
        {showAIRewrite && activeSlide && (
          <AIRewriteDialog
            slide={activeSlide}
            presentationTitle={presentation.title}
            onUpdate={handleAIUpdate}
            onClose={() => setShowAIRewrite(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
