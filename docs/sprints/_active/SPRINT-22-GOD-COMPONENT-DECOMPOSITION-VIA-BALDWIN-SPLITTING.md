# Sprint 22: God-Component Decomposition via Baldwin Splitting

**Status:** Proposed; not started  
**Primary Baldwin Operator:** Splitting ($\times$) & Augmenting ($+$)  
**Primary Subsystem:** `interactions` / `styles` / `preview` / `shell`  
**Depends on:** [Sprint 21](./SPRINT-21-PROCESS-ALGEBRA-AND-PETRI-NET-LIFECYCLE.md)  
**Parent Proposal:** [Sprints 20–24](./PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md)

---

## 1. Objective

Apply Carliss Baldwin's **Splitting Operator** ($\mathcal{B}_{\text{split}}$) to decompose four monolithic user-interface "God components" that exceed the project's 450-line complexity ceiling:
- [`src/components/workbench/panels/VersionPopover.tsx`](../../../src/components/workbench/panels/VersionPopover.tsx) (**739 lines**)
- [`src/components/workbench/panels/PreviewPanel.tsx`](../../../src/components/workbench/panels/PreviewPanel.tsx) (**605 lines**)
- [`src/components/workbench/CorpusExplorerDrawer.tsx`](../../../src/components/workbench/CorpusExplorerDrawer.tsx) (**572 lines**)
- [`src/components/workbench/WorkbenchCommandBar.tsx`](../../../src/components/workbench/WorkbenchCommandBar.tsx) (**472 lines**)

Refactor each into cohesive, single-responsibility sub-components strictly bounded to **$\le 250$ lines of code**, maximizing UI component reuse while guaranteeing 100% preservation of the E2E selector stability contract (Contract B).

---

## 2. Current Gaps & Architectural Tension

1. **`VersionPopover.tsx` (739 LOC)**:
   - Amalgamates timeline listing, diff stat delta calculations ($+N / -M$ vertices and edges), side-by-side visual compare panels, two confirmation dialogs (restore confirmation, dirty save-first prompt), and direct store event subscriptions.
   - Code changes to diff rendering risk destabilizing restore confirmation logic or popover positioning.

2. **`PreviewPanel.tsx` (605 LOC)**:
   - Mixes React SVG viewport layout, pan/zoom wheel and pointer interaction state, TeX compilation simulation, TikZ syntax re-rendering, error banner display, and standalone export triggers.
   - Rendering and compilation logic are coupled to React DOM life-cycles, preventing headless re-use in automated testing.

3. **`CorpusExplorerDrawer.tsx` (572 LOC)**:
   - Mixes debounced search text input, archived-item visibility toggles, sectioned list grouping (Drafts, User Diagrams, Seeded Examples), inline renaming text fields with key listeners (Enter/Escape), and contextual overflow action menus.

4. **`WorkbenchCommandBar.tsx` (472 LOC)**:
   - Combines document title editing, dirty state observation, Draft vs Diagram mode badges, Save button variants (`btn-save-draft` vs `btn-save-diagram`), layout reset buttons, tabs management dropdowns, and theme toggling.

---

## 3. Detailed Baldwin Splitting Plans

### 3.1 Decomposition of `VersionPopover.tsx` (739 $\to$ 5 focused modules)

```
src/components/workbench/panels/history/
├── VersionHistoryList.tsx        # Pure presentation of version timeline rows & copy buttons (<= 200 LOC)
├── VersionDiffEngine.ts          # Pure mathematical delta & AST diff computation (<= 160 LOC)
├── VersionCompareModal.tsx       # Side-by-side visual compare & source diff view (<= 180 LOC)
├── VersionRestoreDialog.tsx      # Confirmation and Save-first dialogs (<= 130 LOC)
└── VersionPopover.tsx            # Lightweight popover positioning & coordinating container (<= 120 LOC)
```

- **`VersionDiffEngine.ts`**: Pure TypeScript function taking two TikZ ASTs or graph states and returning `{ nodeDelta, edgeDelta, changedProperties, diffLines }`. Tested headlessly without DOM dependencies.
- **`VersionHistoryList.tsx`**: Renders timeline entries with positions, authors, formatted ISO dates, and commit labels.
- **`VersionCompareModal.tsx`**: Presents the non-destructive side-by-side preview and compare view.

### 3.2 Decomposition of `PreviewPanel.tsx` (605 $\to$ 4 focused modules)

```
src/components/workbench/panels/preview/
├── PreviewStage.tsx              # Pure SVG viewport, pan/zoom transform matrix & render (<= 220 LOC)
├── PreviewToolbar.tsx            # Zoom In/Out, 100%, Fit-to-Page, and Copy TikZ actions (<= 120 LOC)
├── PreviewCompiler.ts            # Domain coordinator generating SVG from AST & styles (<= 180 LOC)
└── PreviewPanel.tsx              # Dockview panel container orchestrating state (<= 130 LOC)
```

- **`PreviewCompiler.ts`**: Pure computation generating SVG elements from `Graph` and `$stylesCatalog`, decoupling geometry and Bézier math from React component rendering.
- **`PreviewStage.tsx`**: Pure interactive canvas handling SVG pan, pinch, and zoom transformations.

### 3.3 Decomposition of `CorpusExplorerDrawer.tsx` (572 $\to$ 4 focused modules)

```
src/components/workbench/explorer/
├── ExplorerSearchBar.tsx         # Search input with debounce and 'Show archived' toggle (<= 110 LOC)
├── ExplorerSectionList.tsx       # Grouped sections for Drafts, Diagrams, and Examples (<= 180 LOC)
├── ExplorerEntryRow.tsx          # Single row item, status badge, inline rename, and context menu (<= 160 LOC)
└── CorpusExplorerDrawer.tsx      # Drawer container orchestrating layout & service calls (<= 130 LOC)
```

- **`ExplorerEntryRow.tsx`**: Encapsulates inline rename keyboard handlers (`Enter` to save, `Escape` to cancel), type badge rendering, and overflow menu actions (Rename, Duplicate, Version History, Export, Archive).

### 3.4 Decomposition of `WorkbenchCommandBar.tsx` (472 $\to$ 3 focused modules)

```
src/components/workbench/commandbar/
├── DocumentTitleBar.tsx          # Document title, dirty '*' indicator, and amber Draft badge (<= 130 LOC)
├── DocumentActionButtons.tsx     # Save Draft/Diagram, Version History, and Export CTA buttons (<= 150 LOC)
└── WorkbenchCommandBar.tsx       # Top bar coordinator & utility menus (Layout, Theme) (<= 170 LOC)
```

- **`DocumentActionButtons.tsx`**: Encapsulates the save affordance transitions between Draft and Diagram modes, rendering `btn-save-draft` or `btn-save-diagram` with appropriate aria-labels and tooltips.

---

## 4. Cross-Sprint Selector Contract B Preservation Matrix

Every selector in the Contract B registry MUST be preserved on the corresponding decomposed sub-component:

| Selector | Original File | New Sub-Component Location |
| :--- | :--- | :--- |
| `[data-testid="btn-version-history"]` | `WorkbenchCommandBar.tsx` | `DocumentActionButtons.tsx` |
| `[data-testid="btn-save-draft"]`, `[data-testid="btn-save-diagram"]` | `WorkbenchCommandBar.tsx` | `DocumentActionButtons.tsx` |
| `[data-testid="doc-tab-title"]`, `[data-testid="badge-draft"]` | `WorkbenchCommandBar.tsx` | `DocumentTitleBar.tsx` |
| `[data-testid="version-popover"]` | `VersionPopover.tsx` | `VersionPopover.tsx` |
| `[data-testid="history-head-hash"]`, `[data-testid="btn-copy-head-hash"]` | `VersionPopover.tsx` | `VersionHistoryList.tsx` |
| `[data-testid^="version-row-"]`, `[data-testid="btn-restore-version"]` | `VersionPopover.tsx` | `VersionHistoryList.tsx` |
| `[data-testid="history-compare-panel"]`, `[data-testid="compare-stat-deltas"]` | `VersionPopover.tsx` | `VersionCompareModal.tsx` |
| `[data-testid="restore-confirm-dialog"]`, `[data-testid="restore-dirty-dialog"]` | `VersionPopover.tsx` | `VersionRestoreDialog.tsx` |
| `[data-testid="corpus-search-input"]`, `[data-testid="toggle-show-archived"]` | `CorpusExplorerDrawer.tsx` | `ExplorerSearchBar.tsx` |
| `[data-testid^="corpus-entry-"]`, `[data-testid^="entry-actions-"]` | `CorpusExplorerDrawer.tsx` | `ExplorerEntryRow.tsx` |
| `[data-testid="panel-preview"]`, `[data-testid="preview-svg-stage"]` | `PreviewPanel.tsx` | `PreviewStage.tsx` |

---

## 5. Acceptance Criteria

- **AC-22-01 (Strict 250 LOC Limit for Sub-Components)**: All newly extracted sub-components do not exceed **250 lines of code**.
- **AC-22-02 (Strict 200 LOC Limit for Containers)**: Parent coordinating components (`VersionPopover.tsx`, `PreviewPanel.tsx`, `CorpusExplorerDrawer.tsx`, `WorkbenchCommandBar.tsx`) do not exceed **200 lines of code**.
- **AC-22-03 (Selector Contract B Invariant)**: All Playwright E2E tests in `e2e/sprint-16/`, `e2e/sprint-16b/`, `e2e/sprint-17/`, `e2e/sprint-17b/`, and `e2e/sprint-18/` pass without modifying selector queries.
- **AC-22-04 (Headless Diff Verification)**: `VersionDiffEngine.ts` is covered by dedicated unit tests asserting exact node and edge delta calculations without instantiating React components.
- **AC-22-05 (Pure Compilation Decoupling)**: `PreviewCompiler.ts` produces identical SVG DOM nodes across standalone testing and in-panel rendering.
