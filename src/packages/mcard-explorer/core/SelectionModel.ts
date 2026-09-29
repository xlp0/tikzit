/** @layer L4 interface/membrane */
import type { ExplorerState } from './ExplorerStateStore';

/**
 * SelectionModel: Pure algebraic selection transitions for explorer states.
 * Supports single active selection, multi-selection toggles, and range selection.
 */
export class SelectionModel {
  /**
   * Set single active handle, adding it to selectedHandles if not already present.
   */
  public static select(state: ExplorerState, handle: string | null): ExplorerState {
    if (!handle) {
      return {
        ...state,
        activeHandle: null
      };
    }

    const alreadySelected = state.selectedHandles.includes(handle);
    return {
      ...state,
      activeHandle: handle,
      selectedHandles: alreadySelected ? state.selectedHandles : [...state.selectedHandles, handle]
    };
  }

  /**
   * Toggle a handle's presence in selectedHandles.
   */
  public static toggle(state: ExplorerState, handle: string): ExplorerState {
    const isSelected = state.selectedHandles.includes(handle);
    const nextSelected = isSelected
      ? state.selectedHandles.filter(h => h !== handle)
      : [...state.selectedHandles, handle];

    return {
      ...state,
      activeHandle: isSelected && state.activeHandle === handle ? (nextSelected[0] ?? null) : handle,
      selectedHandles: nextSelected
    };
  }

  /**
   * Range selection from one handle to another within the current items list.
   */
  public static selectRange(state: ExplorerState, fromHandle: string, toHandle: string): ExplorerState {
    const fromIdx = state.items.findIndex(i => i.handle === fromHandle);
    const toIdx = state.items.findIndex(i => i.handle === toHandle);

    if (fromIdx === -1 || toIdx === -1) {
      return this.select(state, toHandle);
    }

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const rangeHandles = state.items.slice(start, end + 1).map(i => i.handle);

    const merged = Array.from(new Set([...state.selectedHandles, ...rangeHandles]));
    return {
      ...state,
      activeHandle: toHandle,
      selectedHandles: merged
    };
  }

  /**
   * Clear all selected handles.
   */
  public static clear(state: ExplorerState): ExplorerState {
    return {
      ...state,
      activeHandle: null,
      selectedHandles: []
    };
  }
}
