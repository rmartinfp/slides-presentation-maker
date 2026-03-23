import { useEffect } from 'react';
import { useEditorStore } from '@/stores/editor-store';

/**
 * Global keyboard shortcuts for the editor.
 * Most shortcuts are already in Editor.tsx — this hook adds copy/paste/select-all/group.
 */
export function useKeyboardShortcuts() {
  const {
    presentation,
    activeSlideIndex,
    selectedElementIds,
    deleteElements,
    duplicateElements,
    clearSelection,
    setSelectedElementIds,
    undo,
    redo,
    pushSnapshot,
    updateElement,
  } = useEditorStore();

  const slide = presentation.slides[activeSlideIndex];

  useEffect(() => {
    // Internal clipboard (in-memory, per session)
    let clipboard: typeof slide.elements = [];

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      // Don't capture if editing text (except undo/redo)
      if (isEditing) return;
      if (!slide) return;

      const meta = e.metaKey || e.ctrlKey;

      // Copy: Ctrl+C
      if (meta && e.key === 'c') {
        if (selectedElementIds.length > 0) {
          clipboard = slide.elements.filter(el => selectedElementIds.includes(el.id));
        }
        return;
      }

      // Cut: Ctrl+X
      if (meta && e.key === 'x') {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          clipboard = slide.elements.filter(el => selectedElementIds.includes(el.id));
          deleteElements();
        }
        return;
      }

      // Paste: Ctrl+V
      if (meta && e.key === 'v') {
        if (clipboard.length > 0) {
          e.preventDefault();
          pushSnapshot();
          const state = useEditorStore.getState();
          const newIds: string[] = [];

          for (const el of clipboard) {
            const id = Math.random().toString(36).substring(2, 11);
            const maxZ = Math.max(0, ...state.presentation.slides[state.activeSlideIndex].elements.map(e => e.zIndex));
            useEditorStore.getState().addElement({
              ...el,
              x: el.x + 30,
              y: el.y + 30,
            });
            // addElement auto-generates ID and selects
          }
        }
        return;
      }

      // Select All: Ctrl+A
      if (meta && e.key === 'a') {
        e.preventDefault();
        setSelectedElementIds(slide.elements.map(el => el.id));
        return;
      }

      // Group: Ctrl+G
      if (meta && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().groupElements();
        return;
      }

      // Ungroup: Ctrl+Shift+G
      if (meta && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().ungroupElements();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slide, selectedElementIds, deleteElements, duplicateElements, clearSelection, setSelectedElementIds, undo, redo, pushSnapshot, updateElement]);
}
