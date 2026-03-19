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
import AIRewriteDialog from '@/components/editor/AIRewriteDialog';
import CanvasContextMenu from '@/components/editor/ContextMenu';
import ErrorBoundary from '@/components/editor/ErrorBoundary';
import EditorSkeleton from '@/components/editor/EditorSkeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { loadFontsFromSlides, loadFontsFromTheme } from '@/lib/font-loader';
import { toast } from 'sonner';
import { exportToPptx } from '@/lib/pptx-export';
import { exportToPdfFromSlides } from '@/lib/pdf-export';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Undo2, Redo2, Share2, Download, Play, ChevronLeft, ChevronRight,
  Type, Square, Circle, Triangle, Image, ArrowRight as ArrowRightIcon, Minus,
  Trash2, Copy, Lock, Unlock, ArrowUpToLine, ArrowDownToLine, Sparkles,
  FileText, FileDown, ChevronDown, Plus, MoreVertical,
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
  } = useEditorStore();

  const activeSlide = presentation.slides[activeSlideIndex];
  const selectedElements = activeSlide?.elements?.filter(e => selectedElementIds.includes(e.id)) ?? [];
  const singleSelected = selectedElements.length === 1 ? selectedElements[0] : null;
  const theme = presentation.theme.tokens;

  useKeyboardShortcuts();

  // Load fonts
  useEffect(() => {
    if (presentation.slides.length > 0) {
      loadFontsFromSlides(presentation.slides);
      loadFontsFromTheme(presentation.theme.tokens);
    }
  }, [presentation.slides, presentation.theme]);

  // Initialize
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (idFromUrl) {
      loadFromSupabase(idFromUrl);
    } else {
      const stored = sessionStorage.getItem('presentation');
      if (stored) {
        sessionStorage.removeItem('presentation');
        setPresentation(JSON.parse(stored));
      } else {
        const t = THEME_CATALOG[0];
        setPresentation({
          id: 'default', title: 'Untitled Presentation',
          slides: migrateAllSlides(createSampleSlides() as Slide[], t.tokens),
          theme: t, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [idFromUrl, loadFromSupabase, setPresentation]);

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

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);

  if (idFromUrl && presentation.slides.length === 0) return <EditorSkeleton />;

  const handleAddShape = (shapeType: ShapeType) => {
    const sizes: Record<string, { w: number; h: number }> = {
      rectangle: { w: 300, h: 200 }, circle: { w: 200, h: 200 },
      triangle: { w: 200, h: 200 }, 'arrow-right': { w: 250, h: 100 }, line: { w: 400, h: 4 },
    };
    const s = sizes[shapeType] ?? { w: 200, h: 200 };
    addElement({ type: 'shape', content: '', x: 600, y: 400, width: s.w, height: s.h, rotation: 0, opacity: 1, locked: false, visible: true, style: { shapeType, shapeFill: theme.palette.primary, borderRadius: shapeType === 'rectangle' ? 8 : 0 } });
  };

  return (
    <>
      {isPresentationMode && (
        <PresentationMode slides={presentation.slides} theme={presentation.theme} startIndex={activeSlideIndex} onExit={() => setIsPresentationMode(false)} />
      )}

      <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
        {/* Top bar — minimal */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-400 hover:text-white h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            {isEditingTitle ? (
              <Input
                value={presentation.title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                className="h-7 text-sm font-medium bg-white/10 border-white/20 text-white max-w-xs"
                autoFocus
              />
            ) : (
              <button onClick={() => setIsEditingTitle(true)} className="text-sm font-medium text-white/80 hover:text-white truncate max-w-xs">
                {presentation.title || 'Untitled'}
              </button>
            )}
            {saveStatus !== 'idle' && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full', saveStatus === 'saving' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10')}>
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 w-8 p-0" onClick={redo}><Redo2 className="w-4 h-4" /></Button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 gap-1.5"><Share2 className="w-3.5 h-3.5" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8 gap-1.5">
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
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 gap-1.5 ml-1" onClick={() => setIsPresentationMode(true)}>
              <Play className="w-3.5 h-3.5" />Present
            </Button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Slide list — dark */}
          <div className="w-48 bg-[#0f0f15] border-r border-white/10 flex flex-col overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">{presentation.slides.length} slides</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-400 hover:text-indigo-300 gap-1 px-2" onClick={addSlide}>
                <Plus className="w-3 h-3" />Add
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
              {presentation.slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={cn(
                    'relative rounded-lg cursor-pointer transition-all group',
                    activeSlideIndex === idx ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-white/20'
                  )}
                  onClick={() => setActiveSlideIndex(idx)}
                >
                  <div className="absolute top-1 left-1 z-10 text-[9px] font-bold text-white/60 bg-black/40 rounded px-1">{idx + 1}</div>
                  <div
                    className="w-full aspect-[16/9] rounded-md overflow-hidden relative"
                    style={{
                      backgroundColor: slide.background?.type === 'solid' ? slide.background.value : '#111',
                      background: slide.background?.type === 'gradient' ? slide.background.value : undefined,
                    }}
                  >
                    {slide.background?.type === 'image' && (
                      <img src={slide.background.value} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {slide.elements?.slice(0, 6).map((el) => {
                      const ts = 168 / 1920;
                      return (
                        <div key={el.id} className="absolute overflow-hidden" style={{
                          left: el.x * ts, top: el.y * ts, width: el.width * ts, height: el.height * ts,
                          fontSize: `${(el.style.fontSize ?? 16) * ts}px`, fontFamily: el.style.fontFamily,
                          fontWeight: el.style.fontWeight as any, color: el.style.color, textAlign: el.style.textAlign as any,
                          opacity: el.opacity,
                          backgroundColor: el.type === 'shape' && el.style.shapeFill !== 'transparent' ? el.style.shapeFill : undefined,
                          borderRadius: el.type === 'shape' && el.style.shapeType === 'circle' ? '50%' : (el.style.borderRadius ?? 0) * ts,
                          border: el.type === 'shape' && el.style.shapeStroke !== 'transparent' ? `1px solid ${el.style.shapeStroke}` : undefined,
                        }}>
                          {el.type === 'text' && <span className="line-clamp-2 leading-tight">{el.content.replace(/<[^>]+>/g, ' ').trim()}</span>}
                          {el.type === 'image' && el.content && <img src={el.content} alt="" className="w-full h-full object-cover" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <CanvasContextMenu>
              <div ref={canvasContainerRef} className="flex-1 flex items-center justify-center bg-[#111118] overflow-hidden relative">
                {/* Nav arrows */}
                {activeSlideIndex > 0 && (
                  <button onClick={() => setActiveSlideIndex(activeSlideIndex - 1)} className="absolute left-3 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                {activeSlideIndex < presentation.slides.length - 1 && (
                  <button onClick={() => setActiveSlideIndex(activeSlideIndex + 1)} className="absolute right-3 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {activeSlide && (
                  <ErrorBoundary>
                    <div style={{ width: 1920 * scale, height: 1080 * scale }}>
                      <SlideCanvas slide={activeSlide} theme={presentation.theme} scale={scale} isEditing={true} />
                    </div>
                  </ErrorBoundary>
                )}
              </div>
            </CanvasContextMenu>

            {/* Bottom floating toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-3 py-2 bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
              {/* Add elements */}
              <ToolBtn icon={<Type className="w-4 h-4" />} label="Text" onClick={() => addElement({ type: 'text', content: 'New text', x: 400, y: 400, width: 500, height: 120, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontFamily: theme.typography.bodyFont, fontSize: theme.typography.bodySize, color: theme.palette.text, textAlign: 'left' } })} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild><ToolBtn icon={<Square className="w-4 h-4" />} label="Shape" /></DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="mb-2">
                  <DropdownMenuItem onClick={() => handleAddShape('rectangle')}><Square className="w-4 h-4 mr-2" />Rectangle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('circle')}><Circle className="w-4 h-4 mr-2" />Circle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('triangle')}><Triangle className="w-4 h-4 mr-2" />Triangle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('arrow-right')}><ArrowRightIcon className="w-4 h-4 mr-2" />Arrow</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddShape('line')}><Minus className="w-4 h-4 mr-2" />Line</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ToolBtn icon={<Image className="w-4 h-4" />} label="Image" onClick={() => { const url = prompt('Image URL:'); if (url) addElement({ type: 'image', content: url, x: 400, y: 250, width: 600, height: 400, rotation: 0, opacity: 1, locked: false, visible: true, style: { objectFit: 'cover', borderRadius: 8 } }); }} />

              <div className="w-px h-6 bg-white/10 mx-1" />

              {/* AI */}
              <ToolBtn icon={<Sparkles className="w-4 h-4" />} label="AI" highlight onClick={() => setShowAIRewrite(true)} />

              {selectedElementIds.length > 0 && (
                <>
                  <div className="w-px h-6 bg-white/10 mx-1" />
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

              <div className="w-px h-6 bg-white/10 mx-1" />
              <span className="text-[11px] text-slate-500 font-mono px-2">{activeSlideIndex + 1} / {presentation.slides.length}</span>
            </div>
          </div>
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
        'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all text-slate-400 hover:text-white hover:bg-white/10',
        highlight && 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10',
        danger && 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
      )}
      title={label}
    >
      {icon}
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  );
}
