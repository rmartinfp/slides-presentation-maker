import { type StateCreator, type StoreMutatorIdentifier } from 'zustand';

/**
 * Zustand middleware that tracks state changes for undo/redo.
 * Wraps the store and exposes undo(), redo(), canUndo, canRedo.
 */
export interface HistoryState {
  _history: {
    past: unknown[];
    future: unknown[];
  };
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Call this to push a snapshot manually (e.g. before a drag starts) */
  pushSnapshot: () => void;
}

const MAX_HISTORY = 50;

type History = typeof historyMiddleware;

declare module 'zustand' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StoreMutators<S, A> {
    history: S & HistoryState;
  }
}

type HistoryImpl = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  stateCreator: StateCreator<T, [...Mps, ['history', never]], Mcs>,
  options?: { limit?: number },
) => StateCreator<T & HistoryState, Mps, Mcs>;

/**
 * Keys to exclude from history snapshots
 */
const EXCLUDED_KEYS = new Set([
  '_history',
  'undo',
  'redo',
  'canUndo',
  'canRedo',
  'pushSnapshot',
  // Transient UI state
  'selectedElementIds',
  'isPresentationMode',
  'showAIRewrite',
  'saveStatus',
  'scale',
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

const historyMiddlewareImpl: HistoryImpl =
  (config, options) => (set, get, api) => {
    const limit = options?.limit ?? MAX_HISTORY;
    let skipTracking = false;

    const wrappedSet: typeof set = (...args) => {
      if (!skipTracking) {
        const current = snapshot(get() as Record<string, unknown>);
        set((state: Record<string, unknown>) => ({
          ...state,
          _history: {
            past: [...(state._history as HistoryState['_history']).past.slice(-(limit - 1)), current],
            future: [],
          },
        }) as never);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (set as any)(...args);
    };

    const initialState = config(wrappedSet, get, api);

    return {
      ...initialState,
      _history: { past: [], future: [] },

      undo: () => {
        const { _history } = get() as unknown as HistoryState;
        if (_history.past.length === 0) return;
        const current = snapshot(get() as Record<string, unknown>);
        const previous = _history.past[_history.past.length - 1];
        skipTracking = true;
        set({
          ...(previous as object),
          _history: {
            past: _history.past.slice(0, -1),
            future: [current, ..._history.future].slice(0, limit),
          },
        } as never);
        skipTracking = false;
      },

      redo: () => {
        const { _history } = get() as unknown as HistoryState;
        if (_history.future.length === 0) return;
        const current = snapshot(get() as Record<string, unknown>);
        const next = _history.future[0];
        skipTracking = true;
        set({
          ...(next as object),
          _history: {
            past: [..._history.past, current],
            future: _history.future.slice(1),
          },
        } as never);
        skipTracking = false;
      },

      canUndo: () => (get() as unknown as HistoryState)._history.past.length > 0,
      canRedo: () => (get() as unknown as HistoryState)._history.future.length > 0,

      pushSnapshot: () => {
        const current = snapshot(get() as Record<string, unknown>);
        set((state: Record<string, unknown>) => ({
          ...state,
          _history: {
            past: [...(state._history as HistoryState['_history']).past.slice(-(limit - 1)), current],
            future: [],
          },
        }) as never);
      },
    } as typeof initialState & HistoryState;
  };

export const historyMiddleware = historyMiddlewareImpl as unknown as History;
