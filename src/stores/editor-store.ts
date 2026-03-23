import { create } from 'zustand';
import { produce } from 'immer';
import { Presentation, Slide, SlideElement, PresentationTheme, SlideBackground } from '@/types/presentation';
import { THEME_CATALOG } from '@/lib/themes';
import { generateId, createSampleSlides } from '@/lib/slide-utils';
import { migrateSlideToElements, migrateAllSlides } from '@/lib/slide-migration';
import { supabase } from '@/lib/supabase';
import { resolveConnectorPosition, getConnectorsForElement } from '@/lib/connector-utils';

export interface EditorState {
  // Presentation data
  presentation: Presentation;
  activeSlideIndex: number;
  selectedElementIds: string[];

  // UI state
  isPresentationMode: boolean;
  showAIRewrite: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  scale: number;

  // History
  _history: { past: unknown[]; future: unknown[] };
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushSnapshot: () => void;

  // Presentation actions
  setPresentation: (p: Presentation) => void;
  loadFromSupabase: (id: string) => Promise<void>;
  saveToSupabase: () => Promise<void>;
  setTitle: (title: string) => void;
  setTheme: (theme: PresentationTheme) => void;

  // Slide actions
  setActiveSlideIndex: (index: number) => void;
  addSlide: () => void;
  deleteSlide: (index?: number) => void;
  duplicateSlide: (index?: number) => void;
  updateSlideNotes: (notes: string) => void;
  setSlideBackground: (bg: SlideBackground) => void;

  reorderSlides: (startIndex: number, endIndex: number) => void;

  // Element actions
  addElement: (element: Omit<SlideElement, 'id' | 'zIndex'>) => void;
  updateElement: (elementId: string, updates: Partial<SlideElement>) => void;
  deleteElements: (ids?: string[]) => void;
  duplicateElements: (ids?: string[]) => void;
  setSelectedElementIds: (ids: string[]) => void;
  toggleElementSelection: (id: string) => void;
  clearSelection: () => void;
  moveElement: (elementId: string, x: number, y: number) => void;
  resizeElement: (elementId: string, width: number, height: number, x?: number, y?: number) => void;
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;
  lockElement: (elementId: string, locked: boolean) => void;

  // Connector actions
  addConnector: (startElementId: string, endElementId: string, style?: Record<string, any>) => void;

  // Group & Align actions
  groupElements: () => void;
  ungroupElements: () => void;
  alignElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeElements: (direction: 'horizontal' | 'vertical') => void;

  // UI actions
  setScale: (scale: number) => void;
  setIsPresentationMode: (v: boolean) => void;
  setShowAIRewrite: (v: boolean) => void;
  setSaveStatus: (s: 'idle' | 'saving' | 'saved') => void;
}

const MAX_HISTORY = 50;

// Keys to exclude from history snapshots
const EXCLUDED_KEYS = new Set([
  '_history', 'undo', 'redo', 'canUndo', 'canRedo', 'pushSnapshot',
  'selectedElementIds', 'isPresentationMode', 'showAIRewrite', 'saveStatus', 'scale',
]);

function snapshot(state: Record<string, unknown>): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    if (!EXCLUDED_KEYS.has(key) && typeof state[key] !== 'function') {
      snap[key] = state[key];
    }
  }
  return JSON.parse(JSON.stringify(snap));
}

function defaultPresentation(): Presentation {
  return {
    id: 'default',
    title: 'Untitled Presentation',
    slides: [],
    theme: THEME_CATALOG[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const useEditorStore = create<EditorState>()((set, get) => {
  let skipTracking = false;

  // Wrap set to auto-push history
  const trackedSet: typeof set = (...args) => {
    if (!skipTracking) {
      const current = snapshot(get() as unknown as Record<string, unknown>);
      set(
        produce((state: EditorState) => {
          state._history.past = [...state._history.past.slice(-(MAX_HISTORY - 1)), current];
          state._history.future = [];
        }),
      );
    }
    set(...args);
  };

  // Helper to get current slide
  const activeSlide = (): Slide | undefined => {
    const s = get();
    return s.presentation.slides[s.activeSlideIndex];
  };

  // Generate next zIndex for current slide
  const nextZIndex = (): number => {
    const slide = activeSlide();
    if (!slide?.elements?.length) return 1;
    return Math.max(...slide.elements.map(e => e.zIndex)) + 1;
  };

  return {
    // Initial state
    presentation: defaultPresentation(),
    activeSlideIndex: 0,
    selectedElementIds: [],
    isPresentationMode: false,
    showAIRewrite: false,
    saveStatus: 'idle',
    scale: 0.5,

    _history: { past: [], future: [] },

    // History
    undo: () => {
      const { _history } = get();
      if (_history.past.length === 0) return;
      const current = snapshot(get() as unknown as Record<string, unknown>);
      const previous = _history.past[_history.past.length - 1] as Record<string, unknown>;
      skipTracking = true;
      set({
        ...previous,
        _history: {
          past: _history.past.slice(0, -1),
          future: [current, ..._history.future].slice(0, MAX_HISTORY),
        },
      } as Partial<EditorState>);
      skipTracking = false;
    },

    redo: () => {
      const { _history } = get();
      if (_history.future.length === 0) return;
      const current = snapshot(get() as unknown as Record<string, unknown>);
      const next = _history.future[0] as Record<string, unknown>;
      skipTracking = true;
      set({
        ...next,
        _history: {
          past: [..._history.past, current],
          future: _history.future.slice(1),
        },
      } as Partial<EditorState>);
      skipTracking = false;
    },

    canUndo: () => get()._history.past.length > 0,
    canRedo: () => get()._history.future.length > 0,

    pushSnapshot: () => {
      const current = snapshot(get() as unknown as Record<string, unknown>);
      set(
        produce((state: EditorState) => {
          state._history.past = [...state._history.past.slice(-(MAX_HISTORY - 1)), current];
          state._history.future = [];
        }),
      );
    },

    // Presentation actions
    setPresentation: (p) => {
      const theme = p.theme;
      const migrated = migrateAllSlides(p.slides, theme.tokens);
      skipTracking = true;
      set({ presentation: { ...p, slides: migrated }, activeSlideIndex: 0, selectedElementIds: [] });
      skipTracking = false;
    },

    loadFromSupabase: async (id) => {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        const theme = data.theme as PresentationTheme;
        const slides = migrateAllSlides(data.slides as Slide[], theme.tokens);
        skipTracking = true;
        set({
          presentation: {
            id: data.id,
            title: data.title,
            slides,
            theme,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
          activeSlideIndex: 0,
          selectedElementIds: [],
        });
        skipTracking = false;
      }
    },

    saveToSupabase: async () => {
      const { presentation } = get();
      if (presentation.slides.length === 0) return;

      set({ saveStatus: 'saving' });

      try {
        if (presentation.id === 'default' || !presentation.id.match(/^[0-9a-f-]{36}$/)) {
          const { data, error } = await supabase
            .from('presentations')
            .insert({
              title: presentation.title,
              slides: presentation.slides as unknown as Record<string, unknown>[],
              theme: presentation.theme as unknown as Record<string, unknown>,
            })
            .select('id')
            .single();

          if (!error && data) {
            skipTracking = true;
            set(
              produce((state: EditorState) => {
                state.presentation.id = data.id;
              }),
            );
            skipTracking = false;
            window.history.replaceState({}, '', `/editor?id=${data.id}`);
          }
        } else {
          await supabase
            .from('presentations')
            .update({
              title: presentation.title,
              slides: presentation.slides as unknown as Record<string, unknown>[],
              theme: presentation.theme as unknown as Record<string, unknown>,
            })
            .eq('id', presentation.id);
        }
        set({ saveStatus: 'saved' });
      } catch (err) {
        console.error('Auto-save failed:', err);
        set({ saveStatus: 'idle' });
      }
    },

    setTitle: (title) =>
      trackedSet(
        produce((state: EditorState) => {
          state.presentation.title = title;
          state.presentation.updatedAt = new Date().toISOString();
        }),
      ),

    setTheme: (theme) =>
      trackedSet(
        produce((state: EditorState) => {
          state.presentation.theme = theme;
          state.presentation.updatedAt = new Date().toISOString();
        }),
      ),

    // Slide actions
    setActiveSlideIndex: (index) => set({ activeSlideIndex: index, selectedElementIds: [] }),

    addSlide: () => {
      const { presentation, activeSlideIndex } = get();
      const theme = presentation.theme.tokens;
      const newSlide: Slide = migrateSlideToElements(
        {
          id: generateId(),
          layout: 'content',
          title: 'New Slide',
          elements: [],
          background: { type: 'solid', value: theme.palette.bg },
        },
        theme,
      );
      trackedSet(
        produce((state: EditorState) => {
          state.presentation.slides.push(newSlide);
          state.activeSlideIndex = state.presentation.slides.length - 1;
          state.selectedElementIds = [];
          state.presentation.updatedAt = new Date().toISOString();
        }),
      );
    },

    deleteSlide: (index) => {
      const { activeSlideIndex, presentation } = get();
      const idx = index ?? activeSlideIndex;
      if (presentation.slides.length <= 1) return;
      trackedSet(
        produce((state: EditorState) => {
          state.presentation.slides.splice(idx, 1);
          state.activeSlideIndex = Math.max(0, idx - 1);
          state.selectedElementIds = [];
          state.presentation.updatedAt = new Date().toISOString();
        }),
      );
    },

    duplicateSlide: (index) => {
      const { activeSlideIndex } = get();
      const idx = index ?? activeSlideIndex;
      trackedSet(
        produce((state: EditorState) => {
          const original = state.presentation.slides[idx];
          const dup: Slide = {
            ...JSON.parse(JSON.stringify(original)),
            id: generateId(),
          };
          // Give new IDs to all elements and remap connector references
          const idMap = new Map<string, string>();
          dup.elements = dup.elements.map((el: SlideElement) => {
            const newId = generateId();
            idMap.set(el.id, newId);
            return { ...el, id: newId };
          });
          // Remap connector start/end references to new element IDs
          dup.elements = dup.elements.map((el: SlideElement) => {
            if (!el.connector) return el;
            return { ...el, connector: { ...el.connector, startElementId: idMap.get(el.connector.startElementId) || el.connector.startElementId, endElementId: idMap.get(el.connector.endElementId) || el.connector.endElementId } };
          });
          state.presentation.slides.splice(idx + 1, 0, dup);
          state.activeSlideIndex = idx + 1;
          state.selectedElementIds = [];
          state.presentation.updatedAt = new Date().toISOString();
        }),
      );
    },

    updateSlideNotes: (notes) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (slide) slide.notes = notes;
        }),
      ),

    setSlideBackground: (bg) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (slide) {
            slide.background = bg;
            state.presentation.updatedAt = new Date().toISOString();
          }
        }),
      ),

    reorderSlides: (startIndex, endIndex) =>
      trackedSet(
        produce((state: EditorState) => {
          const [removed] = state.presentation.slides.splice(startIndex, 1);
          state.presentation.slides.splice(endIndex, 0, removed);
          // Keep the same slide active (follow it to new position)
          if (state.activeSlideIndex === startIndex) {
            state.activeSlideIndex = endIndex;
          } else if (startIndex < state.activeSlideIndex && endIndex >= state.activeSlideIndex) {
            state.activeSlideIndex -= 1;
          } else if (startIndex > state.activeSlideIndex && endIndex <= state.activeSlideIndex) {
            state.activeSlideIndex += 1;
          }
          state.presentation.updatedAt = new Date().toISOString();
        }),
      ),

    // Element actions
    addElement: (element) => {
      const zIndex = nextZIndex();
      const newElement: SlideElement = {
        ...element,
        id: generateId(),
        zIndex,
      };
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (slide) {
            slide.elements.push(newElement);
            state.selectedElementIds = [newElement.id];
            state.presentation.updatedAt = new Date().toISOString();
          }
        }),
      );
    },

    updateElement: (elementId, updates) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide) return;
          const el = slide.elements.find(e => e.id === elementId);
          if (el) {
            const { style: styleUpdates, ...rest } = updates;
            Object.assign(el, rest);
            if (styleUpdates) {
              el.style = { ...el.style, ...styleUpdates };
            }
            state.presentation.updatedAt = new Date().toISOString();
          }
        }),
      ),

    deleteElements: (ids) => {
      const toDelete = ids ?? get().selectedElementIds;
      if (!toDelete.length) return;
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (slide) {
            const deleteSet = new Set(toDelete);
            // Also remove connectors referencing deleted elements
            slide.elements = slide.elements.filter(e => {
              if (deleteSet.has(e.id)) return false;
              if (e.connector && (deleteSet.has(e.connector.startElementId) || deleteSet.has(e.connector.endElementId))) return false;
              return true;
            });
            state.selectedElementIds = [];
            state.presentation.updatedAt = new Date().toISOString();
          }
        }),
      );
    },

    duplicateElements: (ids) => {
      const toDup = ids ?? get().selectedElementIds;
      if (!toDup.length) return;
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide) return;
          const newIds: string[] = [];
          for (const id of toDup) {
            const original = slide.elements.find(e => e.id === id);
            if (original) {
              const dup: SlideElement = {
                ...JSON.parse(JSON.stringify(original)),
                id: generateId(),
                x: original.x + 40,
                y: original.y + 40,
                zIndex: Math.max(...slide.elements.map(e => e.zIndex)) + 1,
              };
              slide.elements.push(dup);
              newIds.push(dup.id);
            }
          }
          state.selectedElementIds = newIds;
          state.presentation.updatedAt = new Date().toISOString();
        }),
      );
    },

    setSelectedElementIds: (ids) => set({ selectedElementIds: ids }),
    toggleElementSelection: (id) => {
      const { selectedElementIds } = get();
      if (selectedElementIds.includes(id)) {
        set({ selectedElementIds: selectedElementIds.filter(i => i !== id) });
      } else {
        set({ selectedElementIds: [...selectedElementIds, id] });
      }
    },
    clearSelection: () => set({ selectedElementIds: [] }),

    // Hot-path: direct mutation-free update without Immer for 60fps drag/resize
    moveElement: (elementId, x, y) => {
      const state = get();
      const slide = state.presentation.slides[state.activeSlideIndex];
      if (!slide) return;
      const elIdx = slide.elements.findIndex(e => e.id === elementId);
      if (elIdx === -1) return;
      const el = slide.elements[elIdx];
      const dx = Math.round(x) - el.x;
      const dy = Math.round(y) - el.y;
      // Collect all moved element IDs (including group siblings)
      const movedIds = new Set([elementId]);
      if (el.groupId) slide.elements.forEach(e => { if (e.groupId === el.groupId) movedIds.add(e.id); });
      let newElements = slide.elements.map(e => {
        if (e.id === elementId) return { ...e, x: Math.round(x), y: Math.round(y) };
        if (el.groupId && e.groupId === el.groupId) return { ...e, x: e.x + dx, y: e.y + dy };
        return e;
      });
      // Update connectors attached to moved elements
      newElements = newElements.map(e => {
        if (!e.connector) return e;
        if (!movedIds.has(e.connector.startElementId) && !movedIds.has(e.connector.endElementId)) return e;
        const pos = resolveConnectorPosition(e.connector, newElements);
        if (!pos) return e;
        return { ...e, x: pos.x, y: pos.y, width: pos.width, height: pos.height };
      });
      const newSlide = { ...slide, elements: newElements };
      const newSlides = [...state.presentation.slides];
      newSlides[state.activeSlideIndex] = newSlide;
      set({ presentation: { ...state.presentation, slides: newSlides } });
    },

    resizeElement: (elementId, width, height, x, y) => {
      const state = get();
      const slide = state.presentation.slides[state.activeSlideIndex];
      if (!slide) return;
      const elIdx = slide.elements.findIndex(e => e.id === elementId);
      if (elIdx === -1) return;
      const el = slide.elements[elIdx];
      const newEl = {
        ...el,
        width: Math.round(width),
        height: Math.round(height),
        ...(x !== undefined ? { x: Math.round(x) } : {}),
        ...(y !== undefined ? { y: Math.round(y) } : {}),
      };
      const newElements = [...slide.elements];
      newElements[elIdx] = newEl;
      const newSlide = { ...slide, elements: newElements };
      const newSlides = [...state.presentation.slides];
      newSlides[state.activeSlideIndex] = newSlide;
      set({
        presentation: {
          ...state.presentation,
          slides: newSlides,
        },
      });
    },

    bringToFront: (elementId) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide) return;
          const maxZ = Math.max(...slide.elements.map(e => e.zIndex));
          const el = slide.elements.find(e => e.id === elementId);
          if (el) el.zIndex = maxZ + 1;
        }),
      ),

    sendToBack: (elementId) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide) return;
          const minZ = Math.min(...slide.elements.map(e => e.zIndex));
          const el = slide.elements.find(e => e.id === elementId);
          if (el) el.zIndex = minZ - 1;
        }),
      ),

    lockElement: (elementId, locked) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide) return;
          const el = slide.elements.find(e => e.id === elementId);
          if (el) el.locked = locked;
        }),
      ),

    // Connector actions
    addConnector: (startElementId, endElementId, style = {}) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide) return;
          const connector = { startElementId, endElementId, startAnchor: 'auto' as const, endAnchor: 'auto' as const };
          const pos = resolveConnectorPosition(connector, slide.elements);
          if (!pos) return;
          const maxZ = Math.max(0, ...slide.elements.map(e => e.zIndex));
          slide.elements.push({
            id: generateId(),
            type: 'shape',
            content: '',
            x: pos.x, y: pos.y, width: pos.width, height: pos.height,
            rotation: 0, opacity: 1, locked: false, visible: true,
            zIndex: maxZ + 1,
            style: { shapeType: 'line', shapeFill: '#6366f1', shapeStrokeWidth: 2, lineTailEnd: 'arrow', ...style },
            connector,
          });
          state.selectedElementIds = [slide.elements[slide.elements.length - 1].id];
        }),
      ),

    // Group & Align actions
    groupElements: () =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide || state.selectedElementIds.length < 2) return;
          const gid = generateId();
          for (const el of slide.elements) {
            if (state.selectedElementIds.includes(el.id)) el.groupId = gid;
          }
        }),
      ),

    ungroupElements: () =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide) return;
          for (const el of slide.elements) {
            if (state.selectedElementIds.includes(el.id)) el.groupId = undefined;
          }
        }),
      ),

    alignElements: (alignment) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide || state.selectedElementIds.length < 2) return;
          const els = slide.elements.filter(e => state.selectedElementIds.includes(e.id));
          if (els.length < 2) return;
          switch (alignment) {
            case 'left': { const min = Math.min(...els.map(e => e.x)); els.forEach(e => { e.x = min; }); break; }
            case 'center': { const cx = els.reduce((s, e) => s + e.x + e.width / 2, 0) / els.length; els.forEach(e => { e.x = Math.round(cx - e.width / 2); }); break; }
            case 'right': { const max = Math.max(...els.map(e => e.x + e.width)); els.forEach(e => { e.x = max - e.width; }); break; }
            case 'top': { const min = Math.min(...els.map(e => e.y)); els.forEach(e => { e.y = min; }); break; }
            case 'middle': { const cy = els.reduce((s, e) => s + e.y + e.height / 2, 0) / els.length; els.forEach(e => { e.y = Math.round(cy - e.height / 2); }); break; }
            case 'bottom': { const max = Math.max(...els.map(e => e.y + e.height)); els.forEach(e => { e.y = max - e.height; }); break; }
          }
        }),
      ),

    distributeElements: (direction) =>
      trackedSet(
        produce((state: EditorState) => {
          const slide = state.presentation.slides[state.activeSlideIndex];
          if (!slide || state.selectedElementIds.length < 3) return;
          const els = slide.elements.filter(e => state.selectedElementIds.includes(e.id));
          if (els.length < 3) return;
          if (direction === 'horizontal') {
            els.sort((a, b) => a.x - b.x);
            const totalWidth = els.reduce((s, e) => s + e.width, 0);
            const span = els[els.length - 1].x + els[els.length - 1].width - els[0].x;
            const gap = (span - totalWidth) / (els.length - 1);
            let cx = els[0].x + els[0].width + gap;
            for (let i = 1; i < els.length - 1; i++) {
              els[i].x = Math.round(cx);
              cx += els[i].width + gap;
            }
          } else {
            els.sort((a, b) => a.y - b.y);
            const totalHeight = els.reduce((s, e) => s + e.height, 0);
            const span = els[els.length - 1].y + els[els.length - 1].height - els[0].y;
            const gap = (span - totalHeight) / (els.length - 1);
            let cy = els[0].y + els[0].height + gap;
            for (let i = 1; i < els.length - 1; i++) {
              els[i].y = Math.round(cy);
              cy += els[i].height + gap;
            }
          }
        }),
      ),

    // UI actions
    setScale: (scale) => set({ scale }),
    setIsPresentationMode: (v) => set({ isPresentationMode: v }),
    setShowAIRewrite: (v) => set({ showAIRewrite: v }),
    setSaveStatus: (s) => set({ saveStatus: s }),
  };
});
