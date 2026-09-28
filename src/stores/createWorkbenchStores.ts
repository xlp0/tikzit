import { atom, map, type WritableAtom, type MapStore } from 'nanostores';
import type { ToolMode } from '../services/kernel';
import type { GraphAST, TikzStylesCatalog } from '../core/domain/types';
import { getDefaultStylesCatalog } from '../core/styles/presets';
import { createEmptyAST } from '../core/parser/parser';

export interface SelectionState {
  nodes: string[];
  edges: string[];
}

export interface WorkbenchLayoutState {
  isDrawerCollapsed: boolean;
  drawerWidth: number;
  isWorkbenchDepressed: boolean;
  panelCount: number;
  tabsMenuOpen: boolean;
  themeMenuOpen: boolean;
}

export interface ActiveDiagramState {
  name: string;
  handle: string;
}

export interface DocumentHeadState {
  handle: string;
  hash: string;
  sequence: number;
  isValid: boolean;
  lastCommittedAt?: number;
}

export interface WorkbenchStores {
  readonly $toolMode: WritableAtom<ToolMode>;
  readonly $theme: WritableAtom<'dark' | 'light'>;
  readonly $selectedElements: MapStore<SelectionState>;
  readonly $workbenchLayout: MapStore<WorkbenchLayoutState>;
  readonly $activeDiagram: WritableAtom<ActiveDiagramState>;
  readonly $graphAST: WritableAtom<GraphAST>;
  readonly $documentHead: WritableAtom<DocumentHeadState>;
  readonly $stylesCatalog: WritableAtom<TikzStylesCatalog>;
  readonly $activeStyle: WritableAtom<string>;
  readonly $styleFileName: WritableAtom<string>;
  readonly $styleFileBuffer: WritableAtom<string>;
}

/**
 * Factory function creating an isolated, hermetic set of Nanostores stores.
 * Prevents cross-test pollution and enables multi-instance workbench tabs.
 */
export function createWorkbenchStores(): WorkbenchStores {
  return {
    $toolMode: atom<ToolMode>('select'),
    $theme: atom<'dark' | 'light'>('dark'),
    $selectedElements: map<SelectionState>({ nodes: [], edges: [] }),
    $workbenchLayout: map<WorkbenchLayoutState>({
      isDrawerCollapsed: false,
      drawerWidth: 260,
      isWorkbenchDepressed: false,
      panelCount: 0,
      tabsMenuOpen: false,
      themeMenuOpen: false,
    }),
    $activeDiagram: atom<ActiveDiagramState>({
      name: '01_spider_fusion.tikz',
      handle: 'zx:01_spider_fusion',
    }),
    $graphAST: atom<GraphAST>(createEmptyAST()),
    $documentHead: atom<DocumentHeadState>({
      handle: 'zx:01_spider_fusion',
      hash: '',
      sequence: 0,
      isValid: true,
    }),
    $stylesCatalog: atom<TikzStylesCatalog>(getDefaultStylesCatalog()),
    $activeStyle: atom<string>('Z'),
    $styleFileName: atom<string>('[no styles]'),
    $styleFileBuffer: atom<string>(''),
  };
}
