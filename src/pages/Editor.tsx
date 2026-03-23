import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Presentation, Slide } from '@/types/presentation';
import { THEME_CATALOG } from '@/lib/themes';
import { createSampleSlides } from '@/lib/slide-utils';
import { migrateAllSlides, migrateSlideToElements } from '@/lib/slide-migration';
import { useEditorStore } from '@/stores/editor-store';
import SlideCanvas from '@/components/editor/SlideCanvas';
import SlideList from '@/components/editor/SlideList';
import SpeakerNotes from '@/components/editor/SpeakerNotes';
import PresentationMode from '@/components/editor/PresentationMode';
import PresenterView from '@/components/editor/PresenterView';
import CinematicPresentation from '@/components/cinematic/CinematicPresentation';
import { CinematicPreset } from '@/types/cinematic';
import AIRewriteDialog from '@/components/editor/AIRewriteDialog';
import CanvasContextMenu from '@/components/editor/ContextMenu';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import ErrorBoundary from '@/components/editor/ErrorBoundary';
import EditorSkeleton from '@/components/editor/EditorSkeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { loadFontsFromSlides, loadFontsFromTheme } from '@/lib/font-loader';
import { toast } from 'sonner';
import { exportToPptx } from '@/lib/pptx-export';
import { exportToPdfFromSlides } from '@/lib/pdf-export';
import { AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Undo2, Redo2, Share2, Download, Play, ChevronLeft, ChevronRight,
  Type, Square, Circle, Triangle, Image, ArrowRight as ArrowRightIcon, Minus,
  Trash2, Copy, Lock, Unlock, ArrowUpToLine, ArrowDownToLine, Sparkles,
  FileText, FileDown, ChevronDown, Plus, MoreVertical, Star, Pentagon, Hexagon,
  Heart, MoveLeft, ArrowUp, ArrowDown, Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useEditorStore as useStore } from '@/stores/editor-store';
import { ShapeType } from '@/types/presentation';
import { Input } from '@/components/ui/input';

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const initializedRef = useRef(false);

  const {
    presentation, activeSlideIndex, selectedElementIds,
    isPresentationMode, showAIRewrite, saveStatus, scale,
    setPresentation, loadFromSupabase, saveToSupabase, setTitle, setTheme,
    setActiveSlideIndex, addSlide, deleteSlide, duplicateSlide,
    updateSlideNotes, updateElement, setScale,
    setIsPresentationMode, setShowAIRewrite, setSaveStatus,
    undo, redo, deleteElements, clearSelection, addElement,
    duplicateElements, lockElement, bringToFront, sendToBack,
    reorderSlides,
  } = useEditorStore();

  const activeSlide = presentation.slides[activeSlideIndex];
  const selectedElements = activeSlide?.elements?.filter(e => selectedElementIds.includes(e.id)) ?? [];
  const singleSelected = selectedElements.length === 1 ? selectedElements[0] : null;
  const theme = presentation.theme.tokens;

  useKeyboardShortcuts();

  const [cinematicPreset, setCinematicPreset] = React.useState<CinematicPreset | null>(() => {
    const stored = sessionStorage.getItem('cinematicPreset');
    if (stored) {
      sessionStorage.removeItem('cinematicPreset');
      return JSON.parse(stored);
    }
    return null;
  });

  // Auto-launch cinematic mode when content arrives
  useEffect(() => {
    if (cinematicPreset && presentation.slides.length > 0 && !isPresentationMode) {
      setIsPresentationMode(true);
    }
  }, [cinematicPreset, presentation.slides.length]);

  // Load fonts
  useEffect(() => {
    if (presentation.slides.length > 0) {
      loadFontsFromSlides(presentation.slides);
      loadFontsFromTheme(presentation.theme.tokens);
    }
  }, [presentation.slides, presentation.theme]);

  // Initialize — load sessionStorage synchronously to avoid gray flash,
  // only use async loading for Supabase (URL-based) presentations
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (idFromUrl) {
      loadFromSupabase(idFromUrl);
    } else if (presentation.slides.length === 0) {
      // Fallback: if sessionStorage wasn't loaded synchronously below
      const t = THEME_CATALOG[0];
      setPresentation({
        id: 'default', title: 'Untitled Presentation',
        slides: migrateAllSlides(createSampleSlides() as Slide[], t.tokens),
        theme: t, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
  }, [idFromUrl, loadFromSupabase, setPresentation, presentation.slides.length]);

  // Load from sessionStorage synchronously on mount (before first paint)
  useEffect(() => {
    const stored = sessionStorage.getItem('presentation');
    if (stored) {
      sessionStorage.removeItem('presentation');
      setPresentation(JSON.parse(stored));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToSupabase(), 3000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [presentation, saveToSupabase]);

  // Canvas scaling
  const updateScale = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const { width, height } = canvasContainerRef.current.getBoundingClientRect();
    const padding = 80;
    setScale(Math.min((width - padding) / 1920, (height - padding) / 1080, 1));
  }, [setScale]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); return; }
      if (isEditing) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) { e.preventDefault(); deleteElements(); }
      if (e.key === 'Escape') clearSelection();
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          const nudge = e.shiftKey ? 10 : 1;
          for (const id of selectedElementIds) {
            const el = activeSlide?.elements?.find(el => el.id === id);
            if (el && !el.locked) {
              updateElement(id, {
                x: el.x + (e.key === 'ArrowRight' ? nudge : e.key === 'ArrowLeft' ? -nudge : 0),
                y: el.y + (e.key === 'ArrowDown' ? nudge : e.key === 'ArrowUp' ? -nudge : 0),
              });
            }
          }
        } else {
          e.preventDefault();
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') setActiveSlideIndex(Math.min(activeSlideIndex + 1, presentation.slides.length - 1));
          else setActiveSlideIndex(Math.max(activeSlideIndex - 1, 0));
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); selectedElementIds.length > 0 ? duplicateElements() : duplicateSlide(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSlideIndex, presentation.slides.length, selectedElementIds, activeSlide, undo, redo, deleteElements, clearSelection, setActiveSlideIndex, updateElement, duplicateSlide, duplicateElements]);

  const handleAIUpdate = (updated: Slide) => {
    const state = useEditorStore.getState();
    const migrated = migrateSlideToElements(updated, state.presentation.theme.tokens);
    useEditorStore.setState({
      presentation: { ...state.presentation, slides: state.presentation.slides.map((s, i) => i === state.activeSlideIndex ? migrated : s), updatedAt: new Date().toISOString() },
    });
  };

  const [isPresenterView, setIsPresenterView] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);

  if (idFromUrl && presentation.slides.length === 0) return <EditorSkeleton />;

  const handleAddShape = (shapeType: ShapeType) => {
    const sizes: Record<string, { w: number; h: number }> = {
      rectangle: { w: 300, h: 200 }, circle: { w: 200, h: 200 },
      triangle: { w: 200, h: 200 }, 'arrow-right': { w: 250, h: 100 },
      'arrow-left': { w: 250, h: 100 }, 'arrow-up': { w: 100, h: 250 },
      'arrow-down': { w: 100, h: 250 }, line: { w: 400, h: 4 },
      star: { w: 200, h: 200 }, pentagon: { w: 200, h: 200 },
      hexagon: { w: 200, h: 200 }, heart: { w: 200, h: 200 },
    };
    const s = sizes[shapeType] ?? { w: 200, h: 200 };
    addElement({ type: 'shape', content: '', x: 600, y: 400, width: s.w, height: s.h, rotation: 0, opacity: 1, locked: false, visible: true, style: { shapeType, shapeFill: theme.palette.primary, borderRadius: shapeType === 'rectangle' ? 8 : 0 } });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    reorderSlides(result.source.index, result.destination.index);
  };

  return (
    <>
      {isPresentationMode && !cinematicPreset && !isPresenterView && (
        <PresentationMode slides={presentation.slides} theme={presentation.theme} startIndex={activeSlideIndex} onExit={() => setIsPresentationMode(false)} />
      )}
      {isPresenterView && (
        <PresenterView slides={presentation.slides} theme={presentation.theme} startIndex={activeSlideIndex} onExit={() => setIsPresenterView(false)} />
      )}
      {cinematicPreset && isPresentationMode && (
        <CinematicPresentation
          slides={presentation.slides}
          theme={presentation.theme}
          preset={cinematicPreset}
          startIndex={activeSlideIndex}
          onExit={() => setIsPresentationMode(false)}
        />
      )}

      <div className="h-screen flex flex-col mesh-gradient text-slate-900 overflow-hidden">
        {/* Top bar — minimal */}
        <div className="h-12 flex items-center justify-between px-4 nav-glass border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            {isEditingTitle ? (
              <Input
                value={presentation.title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                className="h-7 text-sm font-medium bg-slate-50 border-slate-200 text-slate-900 max-w-xs"
                autoFocus
              />
            ) : (
              <button onClick={() => setIsEditingTitle(true)} className="text-sm font-medium text-slate-700 hover:text-slate-900 truncate max-w-xs">
                {presentation.title || 'Untitled'}
              </button>
            )}
            {saveStatus !== 'idle' && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full', saveStatus === 'saving' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50')}>
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 h-8 w-8 p-0" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
            <div className="w-px h-5 bg-slate-200/60 mx-1" />
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 h-8 gap-1.5"><Share2 className="w-3.5 h-3.5" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 h-8 gap-1.5">
                  <Download className="w-3.5 h-3.5" /><ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={async () => { toast.info('Generating PPTX...'); try { await exportToPptx(presentation); toast.success('Downloaded!'); } catch { toast.error('Failed'); } }}>
                  <FileText className="w-4 h-4 mr-2" />PowerPoint
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { toast.info('Generating PDF...'); try { await exportToPdfFromSlides(presentation); toast.success('Downloaded!'); } catch { toast.error('Failed'); } }}>
                  <FileDown className="w-4 h-4 mr-2" />PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className={cn(
                    'text-white h-8 gap-1.5 ml-1',
                    cinematicPreset
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      : 'bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE]'
                  )}
                >
                  <Play className="w-3.5 h-3.5" />{cinematicPreset ? cinematicPreset.name : 'Present'}<ChevronDown className="w-3 h-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsPresentationMode(true)}>
                  <Play className="w-4 h-4 mr-2" />Present
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsPresenterView(true)}>
                  <Monitor className="w-4 h-4 mr-2" />Presenter View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Slide list — dark */}
          <div className="w-48 bg-white/60 backdrop-blur-xl border-r border-slate-200/60 flex flex-col overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">{presentation.slides.length} slides</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-[#4F46E5] hover:text-[#4338CA] gap-1 px-2" onClick={addSlide}>
                <Plus className="w-3 h-3" />Add
              </Button>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="slide-list">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 overflow-y-auto px-2 pb-2 space-y-2"
                  >
                    {presentation.slides.map((slide, idx) => (
                      <Draggable key={slide.id} draggableId={slide.id} index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'relative rounded-lg cursor-pointer transition-all group',
                              activeSlideIndex === idx ? 'ring-2 ring-[#4F46E5]' : 'hover:ring-1 hover:ring-slate-300',
                              snapshot.isDragging && 'ring-2 ring-[#4F46E5] opacity-90 shadow-lg shadow-indigo-500/20'
                            )}
                            onClick={() => setActiveSlideIndex(idx)}
                          >
                            <div className="absolute top-1 left-1 z-10 text-[9px] font-bold text-slate-600 bg-white/80 rounded px-1">{idx + 1}</div>
                            {/* Slide actions on hover */}
                            <div className="absolute top-1 right-1 z-10 hidden group-hover:flex gap-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); duplicateSlide(idx); }}
                                className="w-5 h-5 rounded bg-white/90 shadow-sm flex items-center justify-center text-slate-500 hover:text-[#4F46E5]"
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }}
                                className="w-5 h-5 rounded bg-white/90 shadow-sm flex items-center justify-center text-slate-500 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="w-full aspect-[16/9] rounded-md overflow-hidden relative">
                              <div style={{ width: 1920 * 0.09, height: 1080 * 0.09 }}>
                                <SlideCanvas
                                  slide={slide}
                                  theme={presentation.theme}
                                  scale={0.09}
                                  isEditing={false}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <CanvasContextMenu>
              <div ref={canvasContainerRef} className="flex-1 bg-slate-100/50 overflow-auto relative">
                {/* Nav arrows */}
                {activeSlideIndex > 0 && (
                  <button onClick={() => setActiveSlideIndex(activeSlideIndex - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {activeSlideIndex < presentation.slides.length - 1 && (
                  <button onClick={() => setActiveSlideIndex(activeSlideIndex + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {activeSlide && (
                  <ErrorBoundary>
                    <div style={{
                      width: 1920 * scale,
                      height: 1080 * scale,
                      margin: '0 auto',
                      marginTop: Math.max(20, (canvasContainerRef.current?.clientHeight || 0) / 2 - (1080 * scale) / 2),
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
                      borderRadius: 4,
                    }}>
                      <SlideCanvas slide={activeSlide} theme={presentation.theme} scale={scale} isEditing={true} />
                    </div>
                  </ErrorBoundary>
                )}
              </div>
            </CanvasContextMenu>

            {/* Bottom floating toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-3 py-2 glass-effect border border-slate-200/60 rounded-2xl shadow-2xl">
              {/* Add elements */}
              <ToolBtn icon={<Type className="w-4 h-4" />} label="Text" onClick={() => addElement({ type: 'text', content: 'New text', x: 400, y: 400, width: 500, height: 120, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontFamily: theme.typography.bodyFont, fontSize: theme.typography.bodySize, color: theme.palette.text, textAlign: 'left' } })} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild><ToolBtn icon={<Square className="w-4 h-4" />} label="Shape" /></DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="mb-2">
                  <DropdownMenuItem onClick={() => handleAddShape('rectangle')}><Square className="w-4 h-4 mr-2" />Rectangle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('circle')}><Circle className="w-4 h-4 mr-2" />Circle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('triangle')}><Triangle className="w-4 h-4 mr-2" />Triangle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('star')}><Star className="w-4 h-4 mr-2" />Star</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('pentagon')}><Pentagon className="w-4 h-4 mr-2" />Pentagon</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('hexagon')}><Hexagon className="w-4 h-4 mr-2" />Hexagon</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('heart')}><Heart className="w-4 h-4 mr-2" />Heart</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAddShape('arrow-right')}><ArrowRightIcon className="w-4 h-4 mr-2" />Arrow Right</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('arrow-left')}><MoveLeft className="w-4 h-4 mr-2" />Arrow Left</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('arrow-up')}><ArrowUp className="w-4 h-4 mr-2" />Arrow Up</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('arrow-down')}><ArrowDown className="w-4 h-4 mr-2" />Arrow Down</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAddShape('line')}><Minus className="w-4 h-4 mr-2" />Line</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ToolBtn icon={<Image className="w-4 h-4" />} label="Image" onClick={() => { const url = prompt('Image URL:'); if (url) addElement({ type: 'image', content: url, x: 400, y: 250, width: 600, height: 400, rotation: 0, opacity: 1, locked: false, visible: true, style: { objectFit: 'cover', borderRadius: 8 } }); }} />

              <div className="w-px h-6 bg-slate-200/60 mx-1" />

              {/* AI */}
              <ToolBtn icon={<Sparkles className="w-4 h-4" />} label="AI" highlight onClick={() => setShowAIRewrite(true)} />

              {selectedElementIds.length > 0 && (
                <>
                  <div className="w-px h-6 bg-slate-200/60 mx-1" />
                  <ToolBtn icon={<Copy className="w-4 h-4" />} label="Duplicate" onClick={() => duplicateElements()} />
                  <ToolBtn icon={<Trash2 className="w-4 h-4" />} label="Delete" onClick={() => deleteElements()} danger />
                  {singleSelected && (
                    <>
                      <ToolBtn icon={<ArrowUpToLine className="w-4 h-4" />} label="Front" onClick={() => bringToFront(singleSelected.id)} />
                      <ToolBtn icon={<ArrowDownToLine className="w-4 h-4" />} label="Back" onClick={() => sendToBack(singleSelected.id)} />
                    </>
                  )}
                </>
              )}

              <div className="w-px h-6 bg-slate-200/60 mx-1" />
              <span className="text-[11px] text-slate-500 font-mono px-2">{activeSlideIndex + 1} / {presentation.slides.length}</span>

              <div className="w-px h-6 bg-slate-200/60 mx-1" />
              {/* Zoom controls */}
              <button onClick={() => setScale(Math.max(0.15, scale - 0.1))} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 text-sm font-bold">−</button>
              <button onClick={updateScale} className="text-[11px] text-slate-500 font-mono px-1 hover:text-slate-900 hover:bg-slate-100 rounded min-w-[40px] text-center">{Math.round(scale * 100)}%</button>
              <button onClick={() => setScale(Math.min(2, scale + 0.1))} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 text-sm font-bold">+</button>
            </div>
          </div>

          {/* Right panel — properties */}
          <PropertiesPanel />
        </div>
      </div>

      <AnimatePresence>
        {showAIRewrite && activeSlide && (
          <AIRewriteDialog slide={activeSlide} presentationTitle={presentation.title} onUpdate={handleAIUpdate} onClose={() => setShowAIRewrite(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

/** Toolbar button */
function ToolBtn({ icon, label, onClick, highlight, danger }: { icon: React.ReactNode; label: string; onClick?: () => void; highlight?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        highlight && 'text-[#4F46E5] hover:text-[#4338CA] hover:bg-indigo-50',
        danger && 'text-red-500 hover:text-red-600 hover:bg-red-50',
      )}
      title={label}
    >
      {icon}
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  );
}
