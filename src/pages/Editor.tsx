import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssetUpload } from '@/hooks/useAssetUpload';
import { Presentation, Slide } from '@/types/presentation';
import { THEME_CATALOG } from '@/lib/themes';
import { createSampleSlides } from '@/lib/slide-utils';
import { migrateAllSlides, migrateSlideToElements } from '@/lib/slide-migration';
import { useEditorStore } from '@/stores/editor-store';
import SlideCanvas from '@/components/editor/SlideCanvas';
import SlideList from '@/components/editor/SlideList';
import SpeakerNotes from '@/components/editor/SpeakerNotes';
import PresentationMode from '@/components/editor/PresentationMode';
import CinematicPresentation from '@/components/cinematic/CinematicPresentation';
import { getPresetById } from '@/lib/cinematic-presets';
import { CinematicPreset } from '@/types/cinematic';
import PresenterView from '@/components/editor/PresenterView';
import AIRewriteDialog from '@/components/editor/AIRewriteDialog';
import AIImageDialog from '@/components/editor/AIImageDialog';
import TranslateDialog from '@/components/editor/TranslateDialog';
import CoachDialog from '@/components/editor/CoachDialog';
import RedesignDialog from '@/components/editor/RedesignDialog';
import BrandKitDialog from '@/components/editor/BrandKitDialog';
import ChartDialog from '@/components/editor/ChartDialog';
import SaveAsTemplateDialog from '@/components/editor/SaveAsTemplateDialog';
import AddLogoDialog from '@/components/editor/AddLogoDialog';
import TemplateModePicker from '@/components/editor/TemplateModePicker';
import ImageEditDialog from '@/components/editor/ImageEditDialog';
import VoiceToSlidesDialog from '@/components/editor/VoiceToSlidesDialog';
import SmartSuggest from '@/components/editor/SmartSuggest';
import AddSlideDialog from '@/components/editor/AddSlideDialog';
import InfographicsDialog from '@/components/editor/InfographicsDialog';
import AIInfographicDialog from '@/components/editor/AIInfographicDialog';
import CanvasContextMenu from '@/components/editor/ContextMenu';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import ErrorBoundary from '@/components/editor/ErrorBoundary';
import EditorSkeleton from '@/components/editor/EditorSkeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { loadFontsFromSlides, loadFontsFromTheme } from '@/lib/font-loader';
import { toast } from 'sonner';
import { exportToPptx } from '@/lib/pptx-export';
import { exportToPdfFromSlides } from '@/lib/pdf-export';
import { AnimatePresence, motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Undo2, Redo2, Share2, Download, Play, ChevronLeft, ChevronRight,
  Type, Square, Circle, Triangle, Image, ArrowRight as ArrowRightIcon, Minus,
  Trash2, Copy, Lock, Unlock, ArrowUpToLine, ArrowDownToLine, Sparkles,
  FileText, FileDown, ChevronDown, Plus, MoreVertical, Star, Pentagon, Hexagon,
  Heart, MoveLeft, ArrowUp, ArrowDown, Monitor, Grid3X3, Upload, Video,
  Languages, GraduationCap, Wand2, Palette, BarChart3, Mic, ImagePlus, LayoutGrid, Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ShapeType } from '@/types/presentation';
import { Input } from '@/components/ui/input';

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const isTemplateMode = searchParams.get('mode') === 'template';
  const [showTemplatePicker, setShowTemplatePicker] = useState(isTemplateMode && !idFromUrl);
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

  // Cinematic preset: loaded from sessionStorage or presentation data
  const [cinematicPreset, setCinematicPreset] = useState<CinematicPreset | null>(() => {
    try {
      const stored = sessionStorage.getItem('cinematicPreset');
      if (stored) return JSON.parse(stored);
      return null;
    } catch { return null; }
  });
  useEffect(() => {
    if (!cinematicPreset && presentation.cinematicPresetId) {
      const found = getPresetById(presentation.cinematicPresetId);
      if (found) setCinematicPreset(found);
    }
  }, [presentation.cinematicPresetId, cinematicPreset]);

  // Detect actual font sizes/families used in this presentation for text presets
  const detectedStyles = React.useMemo(() => {
    const allText = presentation.slides.flatMap(s => (s.elements || []).filter(e => e.type === 'text'));
    if (allText.length === 0) {
      // Fallback to theme defaults
      return {
        title:    { font: theme.typography.titleFont, size: theme.typography.titleSize, weight: 'bold' as const, color: theme.palette.text },
        subtitle: { font: theme.typography.bodyFont, size: Math.round(theme.typography.titleSize * 0.6), weight: undefined, color: theme.palette.text },
        body:     { font: theme.typography.bodyFont, size: theme.typography.bodySize, weight: undefined, color: theme.palette.text },
        caption:  { font: theme.typography.bodyFont, size: Math.round(theme.typography.bodySize * 0.45), weight: undefined, color: theme.palette.text },
      };
    }
    // Collect unique font sizes, sorted descending
    const sizeEntries = allText.map(e => ({
      size: e.style.fontSize ?? 16,
      font: e.style.fontFamily || theme.typography.bodyFont,
      weight: e.style.fontWeight,
      color: e.style.color || theme.palette.text,
    }));
    // Group by size and pick the most common font for each size bucket
    const sizeMap = new Map<number, { font: string; weight?: string; color: string; count: number }>();
    for (const e of sizeEntries) {
      const existing = sizeMap.get(e.size);
      if (!existing || existing.count < 1) {
        sizeMap.set(e.size, { font: e.font, weight: e.weight, color: e.color, count: (existing?.count || 0) + 1 });
      } else {
        existing.count++;
      }
    }
    const sorted = [...sizeMap.entries()].sort((a, b) => b[0] - a[0]); // largest first
    const titleEntry = sorted[0];
    const subtitleEntry = sorted[1] || sorted[0];
    const bodyEntry = sorted[2] || sorted[1] || sorted[0];
    const captionEntry = sorted[sorted.length - 1] || sorted[0];
    return {
      title:    { font: titleEntry[1].font, size: titleEntry[0], weight: titleEntry[1].weight || 'bold', color: titleEntry[1].color },
      subtitle: { font: subtitleEntry[1].font, size: subtitleEntry[0] === titleEntry[0] ? Math.round(titleEntry[0] * 0.6) : subtitleEntry[0], weight: subtitleEntry[1].weight, color: subtitleEntry[1].color },
      body:     { font: bodyEntry[1].font, size: bodyEntry[0] === titleEntry[0] ? Math.round(titleEntry[0] * 0.35) : bodyEntry[0], weight: bodyEntry[1].weight, color: bodyEntry[1].color },
      caption:  { font: captionEntry[1].font, size: captionEntry[0] === titleEntry[0] ? Math.round(titleEntry[0] * 0.25) : Math.min(captionEntry[0], bodyEntry[0] * 0.7), weight: captionEntry[1].weight, color: captionEntry[1].color },
    };
  }, [presentation.slides, theme]);

  useKeyboardShortcuts();


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
      // Don't remove in template mode — need it for refresh persistence
      if (!isTemplateMode) sessionStorage.removeItem('presentation');
      setPresentation(JSON.parse(stored));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save — immediate on first load (so reload doesn't lose data), then debounced
  const hasSavedOnce = useRef(false);
  useEffect(() => {
    // In template mode, save to sessionStorage instead of Supabase
    if (isTemplateMode) {
      sessionStorage.setItem('presentation', JSON.stringify(presentation));
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const delay = hasSavedOnce.current ? 3000 : 500; // Fast first save
    saveTimerRef.current = setTimeout(() => {
      saveToSupabase();
      hasSavedOnce.current = true;
    }, delay);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [presentation, saveToSupabase, isTemplateMode]);

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
      if (e.key === 'Escape') { setConnectorMode(null); clearSelection(); }
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
    // If the response already has elements (new rewrite format), use them directly
    const finalSlide = updated.elements?.length
      ? { ...state.presentation.slides[state.activeSlideIndex], elements: updated.elements, notes: updated.notes }
      : migrateSlideToElements(updated, state.presentation.theme.tokens);
    useEditorStore.setState({
      presentation: { ...state.presentation, slides: state.presentation.slides.map((s, i) => i === state.activeSlideIndex ? finalSlide : s), updatedAt: new Date().toISOString() },
    });
  };

  const [isPresenterView, setIsPresenterView] = React.useState(false);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [showRightPanel, setShowRightPanel] = React.useState(false);
  const [showAIImage, setShowAIImage] = React.useState(false);
  const [showTranslate, setShowTranslate] = React.useState(false);
  const [showCoach, setShowCoach] = React.useState(false);
  const [showRedesign, setShowRedesign] = React.useState(false);
  const [showBrandKit, setShowBrandKit] = React.useState(false);
  const [showChart, setShowChart] = React.useState(false);
  const [showImageEdit, setShowImageEdit] = React.useState(false);
  const [showVoiceToSlides, setShowVoiceToSlides] = React.useState(false);
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [showAddSlide, setShowAddSlide] = React.useState(false);
  const [showInfographics, setShowInfographics] = React.useState(false);
  const [showAIInfographic, setShowAIInfographic] = React.useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = React.useState(false);
  const [showAddLogo, setShowAddLogo] = React.useState(false);
  const [connectorMode, setConnectorMode] = React.useState<string | null>(null); // null=off, string=startElementId
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadAsset } = useAssetUpload();
  const { addConnector } = useEditorStore();

  // Auto-open right panel when element is selected, auto-close when deselected
  useEffect(() => {
    if (selectedElementIds.length > 0) {
      setShowRightPanel(true);
    }
  }, [selectedElementIds]);

  // Recalculate canvas scale when right panel toggles
  useEffect(() => {
    const t = setTimeout(updateScale, 250);
    return () => clearTimeout(t);
  }, [showRightPanel, updateScale]);

  // Listen for AI image / replace image / chart edit requests from ContextToolbar
  const replaceTargetRef = useRef<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const editChartRef = useRef<string | null>(null);
  useEffect(() => {
    const handleAI = () => setShowAIImage(true);
    const handleReplace = (e: Event) => {
      replaceTargetRef.current = (e as CustomEvent).detail;
      replaceInputRef.current?.click();
    };
    const handleEditChart = (e: Event) => {
      editChartRef.current = (e as CustomEvent).detail;
      setShowChart(true);
    };
    window.addEventListener('slideai-open-ai-image', handleAI);
    window.addEventListener('slideai-replace-image', handleReplace);
    window.addEventListener('slideai-edit-chart', handleEditChart);
    return () => {
      window.removeEventListener('slideai-open-ai-image', handleAI);
      window.removeEventListener('slideai-replace-image', handleReplace);
      window.removeEventListener('slideai-edit-chart', handleEditChart);
    };
  }, []);

  // Connector mode: when user clicks an element, capture it
  useEffect(() => {
    if (!connectorMode || connectorMode === 'pending') return;
    // connectorMode contains the startElementId, now wait for second selection
    if (selectedElementIds.length === 1 && selectedElementIds[0] !== connectorMode) {
      const endId = selectedElementIds[0];
      // Don't connect to self or to another connector
      const endEl = activeSlide?.elements?.find(e => e.id === endId);
      if (endEl && !endEl.connector) {
        addConnector(connectorMode, endId);
        setConnectorMode(null);
        toast.success('Connector created!');
      }
    }
  }, [selectedElementIds, connectorMode]);

  // Capture first element click in connector mode
  useEffect(() => {
    if (connectorMode !== 'pending') return;
    if (selectedElementIds.length === 1) {
      const el = activeSlide?.elements?.find(e => e.id === selectedElementIds[0]);
      if (el && !(el.type === 'shape' && el.style.shapeType === 'line')) {
        setConnectorMode(selectedElementIds[0]);
        toast.info('Now click the second element to connect.');
      }
    }
  }, [selectedElementIds, connectorMode]);

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

  const handleAddLine = (variant: 'plain' | 'arrow' | 'arrow-both' | 'dashed' | 'dotted') => {
    const style: Record<string, any> = { shapeType: 'line', shapeFill: theme.palette.text, shapeStrokeWidth: 2 };
    if (variant === 'arrow') style.lineTailEnd = 'arrow';
    if (variant === 'arrow-both') { style.lineHeadEnd = 'arrow'; style.lineTailEnd = 'arrow'; }
    if (variant === 'dashed') style.shapeStrokeDash = '8 4';
    if (variant === 'dotted') style.shapeStrokeDash = '2 4';
    addElement({ type: 'shape', content: '', x: 500, y: 500, width: 400, height: 4, rotation: 0, opacity: 1, locked: false, visible: true, style });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    reorderSlides(result.source.index, result.destination.index);
  };

  return (
    <>
      {isPresentationMode && !isPresenterView && (
        cinematicPreset ? (
          <CinematicPresentation
            slides={presentation.slides}
            preset={cinematicPreset}
            startIndex={activeSlideIndex}
            presentationTitle={presentation.title}
            onExit={() => setIsPresentationMode(false)}
          />
        ) : (
          <PresentationMode slides={presentation.slides} theme={presentation.theme} startIndex={activeSlideIndex} onExit={() => setIsPresentationMode(false)} />
        )
      )}
      {isPresenterView && (
        <PresenterView slides={presentation.slides} theme={presentation.theme} startIndex={activeSlideIndex} onExit={() => setIsPresenterView(false)} />
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
            {isTemplateMode && (
              <span className="text-[10px] text-white bg-[#9333EA] px-2 py-0.5 rounded-full font-medium">TEMPLATE STUDIO</span>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSaveTemplate(true)}>
                  <Upload className="w-4 h-4 mr-2" />Save as Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isTemplateMode && (
              <Button size="sm" onClick={() => setShowSaveTemplate(true)}
                className="h-8 gap-1.5 ml-1 bg-gradient-to-r from-[#9333EA] to-[#7E22CE] text-white text-xs">
                <Upload className="w-3.5 h-3.5" />Publish Template
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="text-white h-8 gap-1.5 ml-1 bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE]"
                >
                  <Play className="w-3.5 h-3.5" />Present<ChevronDown className="w-3 h-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => { if (cinematicPreset) setCinematicPreset(null); setIsPresentationMode(true); }}>
                  <Play className="w-4 h-4 mr-2" />Classic
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (!cinematicPreset) {
                    const fallback = getPresetById('midnight');
                    if (fallback) setCinematicPreset(fallback);
                  }
                  setIsPresentationMode(true);
                }}>
                  <Star className="w-4 h-4 mr-2" />Cinematic
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          <div className="w-36 bg-white/60 backdrop-blur-xl border-r border-slate-200/60 flex flex-col overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">{presentation.slides.length} slides</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-[#4F46E5] hover:text-[#4338CA] gap-1 px-2" onClick={() => setShowAddSlide(true)}>
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
                              <div style={{ width: 1920 * 0.065, height: 1080 * 0.065, transformOrigin: 'top left' }}>
                                <SlideCanvas
                                  slide={slide}
                                  theme={presentation.theme}
                                  scale={0.065}
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
                {activeSlide && (
                  <ErrorBoundary>
                    <div className="relative overflow-hidden" style={{
                      width: 1920 * scale,
                      height: 1080 * scale,
                      margin: '0 auto',
                      marginTop: Math.max(20, (canvasContainerRef.current?.clientHeight || 0) / 2 - (1080 * scale) / 2),
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
                      borderRadius: 4,
                    }}>
                      {/* Nav arrows — pinned to slide edges */}
                      {activeSlideIndex > 0 && (
                        <button onClick={() => setActiveSlideIndex(activeSlideIndex - 1)} className="absolute -left-10 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      {activeSlideIndex < presentation.slides.length - 1 && (
                        <button onClick={() => setActiveSlideIndex(activeSlideIndex + 1)} className="absolute -right-10 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                      <SlideCanvas slide={activeSlide} theme={presentation.theme} scale={scale} isEditing={true} />
                    </div>
                  </ErrorBoundary>
                )}
              </div>
            </CanvasContextMenu>

            {/* Hidden file input for image upload */}
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const result = await uploadAsset(file);
              if (result) addElement({ type: 'image', content: result.url, x: 400, y: 250, width: 600, height: 400, rotation: 0, opacity: 1, locked: false, visible: true, style: { objectFit: 'cover', borderRadius: 8 } });
              e.target.value = '';
            }} />
            {/* Hidden file input for video upload — auto-compresses large files */}
            <input ref={vidInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              let videoFile = file;
              const sizeMB = file.size / 1048576;
              // Auto-compress if > 10MB
              if (sizeMB > 10) {
                const toastId = toast.loading(`Compressing video (${sizeMB.toFixed(1)}MB)...`);
                try {
                  const { compressVideo } = await import('@/lib/video-compress');
                  videoFile = await compressVideo(file, {
                    onProgress: (msg) => toast.loading(msg, { id: toastId }),
                  });
                  toast.success(`Compressed: ${sizeMB.toFixed(1)}MB → ${(videoFile.size/1048576).toFixed(1)}MB`, { id: toastId });
                } catch (err) {
                  console.warn('Compression failed, uploading original:', err);
                  toast.info('Compression unavailable, uploading original', { id: toastId });
                  videoFile = file;
                }
              }
              toast.info('Uploading video...');
              const result = await uploadAsset(videoFile);
              if (result) {
                addElement({ type: 'video', content: result.url, x: 300, y: 200, width: 800, height: 450, rotation: 0, opacity: 1, locked: false, visible: true, style: { objectFit: 'cover', borderRadius: 16 } });
                toast.success('Video added!');
              }
              e.target.value = '';
            }} />
            {/* Hidden file input for replacing an existing image */}
            <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file || !replaceTargetRef.current) return;
              const result = await uploadAsset(file);
              if (result) updateElement(replaceTargetRef.current, { content: result.url });
              replaceTargetRef.current = null;
              e.target.value = '';
            }} />

            {/* Bottom floating toolbar — 3 groups: INSERT | AI | SLIDE */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0 glass-effect border border-slate-200/60 rounded-2xl shadow-2xl">

              {/* ── GROUP 1: INSERT (element creation) ── */}
              <div className="flex items-center gap-1 px-3 py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><ToolBtn icon={<Type className="w-4 h-4" />} label="Text" /></DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="mb-2 w-44">
                    <DropdownMenuItem onClick={() => addElement({ type: 'text', content: 'Title', x: 200, y: 200, width: 800, height: 120, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontFamily: detectedStyles.title.font, fontSize: detectedStyles.title.size, fontWeight: detectedStyles.title.weight || 'bold', color: detectedStyles.title.color, textAlign: 'left' } })}><span className="text-lg font-bold mr-2">T</span>Title</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addElement({ type: 'text', content: 'Subtitle', x: 200, y: 340, width: 700, height: 80, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontFamily: detectedStyles.subtitle.font, fontSize: detectedStyles.subtitle.size, color: detectedStyles.subtitle.color, textAlign: 'left' } })}><span className="text-base font-medium mr-2">S</span>Subtitle</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addElement({ type: 'text', content: 'Body text', x: 200, y: 450, width: 600, height: 200, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontFamily: detectedStyles.body.font, fontSize: detectedStyles.body.size, color: detectedStyles.body.color, textAlign: 'left' } })}><span className="text-sm mr-2">B</span>Body</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addElement({ type: 'text', content: 'Caption', x: 200, y: 680, width: 400, height: 50, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontFamily: detectedStyles.caption.font, fontSize: detectedStyles.caption.size, color: detectedStyles.caption.color, textAlign: 'left', opacity: 0.7 } })}><span className="text-xs mr-2">c</span>Caption</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAddLine('plain')}><Minus className="w-4 h-4 mr-2" />Line</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddLine('arrow')}><ArrowRightIcon className="w-4 h-4 mr-2" />Arrow Line</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddLine('arrow-both')}><span className="w-4 h-4 mr-2 text-center text-xs">↔</span>Double Arrow</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddLine('dashed')}><span className="w-4 h-4 mr-2 text-center text-[10px]">┄</span>Dashed</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setConnectorMode('pending'); toast.info('Click the first element, then click the second to connect them.'); }}><span className="w-4 h-4 mr-2 text-center text-xs">⟿</span>Connector</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><ToolBtn icon={<Image className="w-4 h-4" />} label="Image" /></DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="mb-2 w-48">
                    <DropdownMenuItem onClick={() => imgInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Upload from PC</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { const url = prompt('Image URL:'); if (url) addElement({ type: 'image', content: url, x: 400, y: 250, width: 600, height: 400, rotation: 0, opacity: 1, locked: false, visible: true, style: { objectFit: 'cover', borderRadius: 8 } }); }}><Image className="w-4 h-4 mr-2" />Insert from URL</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowAIImage(true)}><Sparkles className="w-4 h-4 mr-2" />Generate with AI</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><ToolBtn icon={<Video className="w-4 h-4" />} label="Video" /></DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="mb-2 w-52">
                    <DropdownMenuItem onClick={() => vidInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Upload from PC</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { const url = prompt('Video URL (MP4 or HLS):'); if (url) addElement({ type: 'video', content: url, x: 300, y: 200, width: 800, height: 450, rotation: 0, opacity: 1, locked: false, visible: true, style: { objectFit: 'cover', borderRadius: 16 } }); }}><Video className="w-4 h-4 mr-2" />Insert from URL</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { toast.info('AI video generation coming soon'); }}><Sparkles className="w-4 h-4 mr-2" />Generate with AI</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ToolBtn icon={<Grid3X3 className="w-4 h-4" />} label="Table" onClick={() => { const rows = Array.from({length:3},(_,ri)=>Array.from({length:3},(_,ci)=>({text:ri===0?`Header ${ci+1}`:`Cell ${ri},${ci+1}`}))); addElement({ type: 'table', content: JSON.stringify({rows,headerRow:true,borderColor:'#e2e8f0'}), x: 400, y: 300, width: 700, height: 300, rotation: 0, opacity: 1, locked: false, visible: true, style: { borderRadius: 8 } }); }} />
                <ToolBtn icon={<BarChart3 className="w-4 h-4" />} label="Chart" onClick={() => setShowChart(true)} />
                {isTemplateMode && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><ToolBtn icon={<FileText className="w-4 h-4" />} label="Placeholder" /></DropdownMenuTrigger>
                    <DropdownMenuContent side="top" className="mb-2 w-56">
                      <DropdownMenuItem onClick={() => addElement({ type: 'text', content: '{{title}}', x: 96, y: 680, width: 1400, height: 200, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontSize: 80, fontWeight: '700', color: '#FFFFFF', textAlign: 'left', lineHeight: 0.95, letterSpacing: -2 } })}><Type className="w-4 h-4 mr-2" />Hero Title</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addElement({ type: 'text', content: '{{subtitle}}', x: 96, y: 550, width: 900, height: 100, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontSize: 17, fontWeight: '400', color: '#80838e', textAlign: 'left', lineHeight: 1.65 } })}><Type className="w-4 h-4 mr-2" />Subtitle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addElement({ type: 'text', content: '{{heading}}', x: 96, y: 200, width: 1400, height: 300, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontSize: 48, fontWeight: '500', color: '#FFFFFF', textAlign: 'left', lineHeight: 1.06, letterSpacing: -0.5 } })}><Type className="w-4 h-4 mr-2" />Heading</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addElement({ type: 'text', content: '{{body}}', x: 96, y: 600, width: 780, height: 200, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontSize: 15, fontWeight: '400', color: '#80838e', textAlign: 'left', lineHeight: 1.7 } })}><Type className="w-4 h-4 mr-2" />Body</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => addElement({ type: 'text', content: '{{stat_value}}', x: 96, y: 400, width: 500, height: 150, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontSize: 88, fontWeight: '700', color: '#FFFFFF', textAlign: 'left', lineHeight: 0.96, letterSpacing: -2 } })}><Type className="w-4 h-4 mr-2" />Stat number</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addElement({ type: 'text', content: '{{label}}', x: 96, y: 160, width: 400, height: 25, rotation: 0, opacity: 1, locked: false, visible: true, style: { fontSize: 12, fontWeight: '600', color: '#80838e', textAlign: 'left', letterSpacing: 2 } })}><Type className="w-4 h-4 mr-2" />Label</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {connectorMode && (
                  <button onClick={() => setConnectorMode(null)} className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-[9px] font-medium animate-pulse">Connecting... (ESC)</button>
                )}
              </div>

              {/* ── SEPARATOR ── */}
              <div className="w-px h-8 bg-slate-200/80" />

              {/* ── GROUP 2: AI (visible buttons) ── */}
              <div className="flex items-center gap-1 px-2 py-2">
                <ToolBtn icon={<Sparkles className="w-4 h-4" />} label="Rewrite" highlight onClick={() => setShowAIRewrite(true)} />
                <ToolBtn icon={<Wand2 className="w-4 h-4" />} label="Layout" highlight onClick={() => setShowRedesign(true)} />
                <ToolBtn icon={<LayoutGrid className="w-4 h-4" />} label="Infographic" highlight onClick={() => setShowAIInfographic(true)} />
                <ToolBtn icon={<Palette className="w-4 h-4" />} label="Brand Kit" highlight onClick={() => setShowBrandKit(true)} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><ToolBtn icon={<Lightbulb className="w-4 h-4" />} label="More" highlight /></DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="mb-2 w-52">
                    {singleSelected?.type === 'image' && (
                      <>
                        <DropdownMenuItem onClick={() => setShowImageEdit(true)}><ImagePlus className="w-4 h-4 mr-2" />Edit image with AI</DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setShowAddLogo(true)}><Image className="w-4 h-4 mr-2" />Add Logo</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowTranslate(true)}><Languages className="w-4 h-4 mr-2" />Translate</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowCoach(true)}><GraduationCap className="w-4 h-4 mr-2" />Analyze</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* ── SEPARATOR ── */}
              <div className="w-px h-8 bg-slate-200/80" />

              {/* ── GROUP 3: SLIDE (navigation + zoom) ── */}
              <div className="flex items-center gap-1 px-3 py-2">
                <span className="text-[10px] text-slate-500 font-mono">{activeSlideIndex + 1}/{presentation.slides.length}</span>
                <div className="w-px h-5 bg-slate-200/60 mx-0.5" />
                <button onClick={() => setScale(Math.max(0.15, scale - 0.1))} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 text-sm font-bold">−</button>
                <button onClick={updateScale} className="text-[10px] text-slate-500 font-mono px-1 hover:text-slate-900 hover:bg-slate-100 rounded min-w-[36px] text-center">{Math.round(scale * 100)}%</button>
                <button onClick={() => setScale(Math.min(2, scale + 0.1))} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 text-sm font-bold">+</button>
              </div>
            </div>

          {/* Right panel toggle + properties */}
          <div className="flex shrink-0">
            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="w-6 bg-white/60 hover:bg-white/90 border-l border-r border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              title={showRightPanel ? 'Hide panel' : 'Show panel'}
            >
              {showRightPanel ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
            <AnimatePresence>
              {showRightPanel && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 256, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden shrink-0"
                >
                  <PropertiesPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAIRewrite && activeSlide && (
          <AIRewriteDialog slide={activeSlide} presentationTitle={presentation.title} onUpdate={handleAIUpdate} onClose={() => setShowAIRewrite(false)} />
        )}
        {showAIImage && (
          <AIImageDialog
            onClose={() => setShowAIImage(false)}
            replaceElementId={singleSelected?.type === 'image' ? singleSelected.id : undefined}
          />
        )}
        {showTranslate && <TranslateDialog onClose={() => setShowTranslate(false)} />}
        {showCoach && <CoachDialog onClose={() => setShowCoach(false)} />}
        {showRedesign && <RedesignDialog onClose={() => setShowRedesign(false)} />}
        {showBrandKit && <BrandKitDialog onClose={() => setShowBrandKit(false)} />}
        {showChart && <ChartDialog onClose={() => { setShowChart(false); editChartRef.current = null; }} editElementId={editChartRef.current || undefined} />}
        {showImageEdit && singleSelected?.type === 'image' && (
          <ImageEditDialog elementId={singleSelected.id} onClose={() => setShowImageEdit(false)} />
        )}
        {showVoiceToSlides && <VoiceToSlidesDialog onClose={() => setShowVoiceToSlides(false)} />}
        {showSuggest && <SmartSuggest onClose={() => setShowSuggest(false)} />}
        {showAddSlide && <AddSlideDialog onClose={() => setShowAddSlide(false)} />}
        {showInfographics && <InfographicsDialog onClose={() => setShowInfographics(false)} />}
        {showAIInfographic && <AIInfographicDialog onClose={() => setShowAIInfographic(false)} />}
        {showSaveTemplate && <SaveAsTemplateDialog onClose={() => setShowSaveTemplate(false)} />}
        {showAddLogo && <AddLogoDialog onClose={() => setShowAddLogo(false)} />}
        {showTemplatePicker && (
          <TemplateModePicker
            onSelect={(tmpl) => {
              const slides = (tmpl.slides || []).map((s: any) => ({
                ...s, id: s.id || crypto.randomUUID(),
                elements: s.elements || [],
                background: s.background || { type: 'solid', value: '#000000' },
              }));
              const theme = tmpl.theme || presentation.theme;
              setPresentation({
                id: crypto.randomUUID(), title: tmpl.name || 'Template',
                slides, theme: theme as any,
                templateType: 'cinematic', cinematicPresetId: tmpl.preset_id || 'midnight',
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              });
              setShowTemplatePicker(false);
            }}
            onBlank={() => {
              setPresentation({
                id: crypto.randomUUID(), title: 'New Template',
                slides: Array.from({ length: 5 }, () => ({
                  id: crypto.randomUUID(), elements: [],
                  background: { type: 'solid' as const, value: '#000000' },
                })),
                theme: { id: 'custom', name: 'Custom', category: 'Cinematic',
                  tokens: { palette: { primary: '#FFFFFF', secondary: '#80838e', accent: '#FFFFFF', bg: '#000000', text: '#FFFFFF' },
                    typography: { titleFont: 'Inter', bodyFont: 'Inter', titleSize: 56, bodySize: 17 }, radii: '0px', shadows: 'none' },
                  previewColors: ['#FFFFFF', '#80838e', '#000000'] },
                templateType: 'cinematic', cinematicPresetId: 'midnight',
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              });
              setShowTemplatePicker(false);
            }}
            onClose={() => setShowTemplatePicker(false)}
          />
        )}
      </AnimatePresence>
      </div>
    </>
  );
}

/** Toolbar button — forwardRef so it works with Radix asChild */
const ToolBtn = React.forwardRef<HTMLButtonElement, { icon: React.ReactNode; label: string; onClick?: () => void; highlight?: boolean; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ icon, label, onClick, highlight, danger, ...props }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        highlight && 'text-[#4F46E5] hover:text-[#4338CA] hover:bg-indigo-50',
        danger && 'text-red-500 hover:text-red-600 hover:bg-red-50',
      )}
      title={label}
      {...props}
    >
      {icon}
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  )
);
ToolBtn.displayName = 'ToolBtn';
