# Sprint 11: Desktop-Parity Style Palette & Action Bar

## 1. Executive Summary & Vision
- **Objective**: Re-engineer the right dock panel to achieve exact architectural and visual parity with the desktop Qt `StylePalette` (`stylepalette.ui` and `stylepalette.cpp`), featuring the 4-icon action toolbar, category combobox, and split 48x48 icon-mode grids for Node and Edge styles.
- **Architectural Leads**:
  - **Winston (System Architect)**: Dockview layout model, action bar event bus, and icon-grid visual structure.
  - **Amelia (Senior Software Engineer)**: Component implementation, file ingestion/export handlers, unit tests, and Playwright E2E verification.

---

## 2. Desktop Baseline Analysis (`stylepalette.ui` & `stylepalette.cpp`)

In the desktop C++ application:
```
+-------------------------------------------------------------+
| Styles                                                [x][=]|  <- Dock header
+-------------------------------------------------------------+
| [no styles]                                                 |  <- Loaded file label
| [ New ] [ Open ] [ Edit ] [ Refresh ]                       |  <- 4 Action Buttons
| (doc-new) (doc-open) (pencil) (refresh)                     |
+-------------------------------------------------------------+
| [ Category Dropdown: (all)                       v ]        |  <- Category Combobox — blank `""` entry = show all
+-------------------------------------------------------------+
| NODE STYLES (QListView::IconMode, 48x48px grid)             |
|   +-------+   +-------+   +-------+                         |
|   | ( o ) |   |  (Z)  |   |  (X)  |                         |
|   | none  |   |   Z   |   |   X   |                         |
|   +-------+   +-------+   +-------+                         |
+-------------------------------------------------------------+
| EDGE STYLES (QListView::IconMode, 48x48px grid)             |
|   +-------+   +-------+                                     |
|   |  ---  |   |  ---> |                                     |
|   | none  |   | arrow |                                     |
|   +-------+   +-------+                                     |
+-------------------------------------------------------------+
```

### 2.1 The 4-Icon Action Bar
Directly beneath the stylesheet filename label are 4 compact toolbar buttons utilizing canonical SVGs (icon size in `stylepalette.ui:77-142` is **16×16**, not 48 — the 48 figure is the icon-grid cell size below):
1. **New (`document-new.svg`)**: Desktop opens a *save dialog* and writes a new empty `.tikzstyles` file (`tikzit.cpp:142-174`). Web mapping: create a new empty catalog, then export/download via File System Access API or blob download.
2. **Open (`document-open.svg`)**: Invokes file chooser to import and parse a `.tikzstyles` file. ⚠️ Currently impossible: `FileDropZone.tsx:49` rejects `.tikzstyles` — the ingestion path must be added (input `accept=".tikzstyles"` + `parseStyles`).
3. **Edit (`text-x-generic_with_pencil.svg`)**: Opens the Style Editor modal — **but only when a stylesheet is loaded**; with `[no styles]` the desktop shows a warning dialog instead (`stylepalette.cpp:215-224`). Mirror the guard.
4. **Refresh (`refresh.svg`)**: Re-loads the *last-opened* `.tikzstyles` from disk (`previous-tikzstyles-file` setting, `stylepalette.cpp:226-231`). On the web this needs a retained `FileSystemFileHandle` or the last-imported file contents; without one, disable/gray the button.

### 2.2 Category Combobox
A full-width native-styled dark dropdown (`<select>`):
- Width: 100% of dock width.
- Background: `#222222`, border: `#383838`, text: `#ffffff`.
- **Populated from node styles only** (`TikzStyles::categories()`, `tikzstyles.cpp:141-152` — edge-style categories are explicitly excluded), sorted alphabetically, **plus an empty-string `""` first entry that means "show all"** (there is no literal "All Categories" label in the desktop — the blank entry is the unfiltered state; `numInCategory` treats `""` as pass-through).
- Filters the **node styles list only** (`stylepalette.cpp:233-238` calls `nodeStyles()->setCategory(cat)`); the edge grid is never filtered.

### 2.3 Split Icon-Mode Grids (`IconMode`, 48x48px)
Grid cell `48×48` is the *grid size* (`style-icon-spacing` setting, default 48, `stylepalette.cpp:39-53`) — not the action-bar icon size (16×16).
- **Top Section (Node Styles)**:
  - Background: Dark slate `#181818`.
  - Grid cell: `48x48px`.
  - Index 0: synthetic `none` style with dashed-circle preview, **pinned at index 0 in every category** (`StyleList::numInCategory` always counts `isNone()`; `stylelist.cpp:79-99`).
  - Active selection: Highlighted with blue selection border `#0078d4` / `#2563eb`. *(Design choice — desktop uses the platform Qt highlight; pick and document.)*
  - **Single-click**: selects the active node style for the Vertex tool — *only* sets the active style (desktop has no apply-on-click).
  - **Double-click**: **applies the active style to the current selection** (`nodeStyleDoubleClicked` → `applyActiveStyleToNodes()`, `stylepalette.cpp:195-203`). ⚠️ It does *not* open the Style Editor — that is the Edit action-bar button's job.
- **Bottom Section (Edge Styles)**:
  - Background: Dark slate `#181818`.
  - Index 0: Default `none` style (`noneEdgeStyle` = atom `-`) with simple wire preview; pinned at index 0.
  - **Single-click**: selects the active edge style for the Edge tool.
  - **Double-click**: **applies the active edge style to selected edges** (`edgeStyleDoubleClicked` → `applyActiveStyleToEdges()`).
  - ⚠️ **Current web deviation**: `StylePalette.handleSwatchClick` applies the style to the selection on *single* click (`StylePalette.tsx:46-52`). Moving to desktop semantics means: click = set active; double-click = apply to selection. Decide and encode in AC-11-05 — the desktop behavior is recommended for parity and because click-to-apply makes "just browsing styles" destructive.

---

## 3. Dockview Preservation Constraints (Contract A applied)

The "right dock panel" in the desktop maps to a **Dockview panel**, not a fixed sidebar:

1. **Recommended**: register a dedicated `styles` panel component (title `"Styles"` — which reproduces the desktop dock header for free) in the `components` map of `TikzitSpatialWorkbench.tsx`, and add it to `loadDefaultLayout` to the right of the canvas. The Inspector/PropertyInspector remains its own panel.
   - Alternative (lower parity): keep `StylePalette` embedded in `InspectorPanel` — acceptable only if the split node/edge grids and action bar still fit the half-height slot.
2. **Layout migration**: saved `localStorage['tikzit:workbench:layout']` blobs predate the new panel — bump the layout key version or add a post-`fromJSON` reconciliation that `addPanel`s any missing required panel IDs. Never let `fromJSON` throw on an unknown/old layout.
3. **Native features stay on**: tab drag between groups, floating groups, panel maximize, close buttons, `.editor-tab` custom tab component, and the `onDidLayoutChange` → `toJSON` persistence loop must all keep working (sprint-02 E2E covers several of these).
4. **The desktop dock's `[x]`/`[=]` affordances** map to Dockview's built-in tab close + group maximize controls — prefer enabling/using those over custom chrome.

## 4. Implementation Steps & Acceptance Criteria (Amelia)

| Step | Task | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **11.1** | Desktop Action Bar Component | `src/components/styles/DesktopStyleActionBar.tsx` | 4 action buttons with canonical SVG icons (New, Open, Edit, Refresh); Edit/Refresh guard when `[no styles]` |
| **11.2** | Category Combobox | `src/components/styles/CategorySelect.tsx` | Full-width dark `<select>`; node-style categories + `""` (all) first entry |
| **11.3** | Desktop 48x48 Swatch Grid | `src/components/styles/DesktopSwatchGrid.tsx` | IconMode 48x48px swatches with label underneath on `#181818` |
| **11.4** | StylePalette Re-architecture | `src/components/styles/StylePalette.tsx` | Re-assembly into desktop layout with node/edge split; mounts inside Dockview per §3 |
| **11.5** | Stylesheet Ingestion & Refresh | `src/stores/workbench.ts` + `FileDropZone` | `.tikzstyles` accepted by drop + Open button; catalog state gains `styleFileName` (default `[no styles]`); Refresh re-parses retained handle/content |
| **11.6** | Test Suite Verification | `tests/unit/styles/desktopStylePalette.test.ts` & `e2e/sprint-11/desktop-style-palette.spec.ts` | 100% green tests for 4 actions, category filter, and swatches |

### Detailed Acceptance Criteria:
- **AC-11-01**: 4 toolbar buttons render using canonical SVGs (`document-new.svg`, `document-open.svg`, `text-x-generic_with_pencil.svg`, `refresh.svg`) at the desktop's 16×16 action-icon size.
- **AC-11-02**: The loaded stylesheet label displays accurately (`[no styles]` default — verified `tikzit.cpp:42` — or the file name e.g. `pqp-zx.tikzstyles`), italic per `stylepalette.ui:47-54`.
- **AC-11-03**: Category combobox populates from **node-style** categories (sorted, `""` = show-all as first entry) and filters **only** the node grid; the edge grid is unaffected.
- **AC-11-04**: Node and Edge styles display in separate split panels in 48×48 icon grid format on `#181818`, each **always starting with a synthetic `none` at index 0 that survives every category filter**.
- **AC-11-05**: Single-click sets the active style only; **double-click applies the active style to the current selection** (node grid → selected nodes, edge grid → selected edges). The Style Editor opens via the Edit action button (or a documented extra affordance) — never via grid double-click.
- **AC-11-06**: Vitest suite passes >= 6 tests validating categorization and actions; Playwright E2E suite passes validating UI workflows.
- **AC-11-07**: Selector contract — preserve or migrate `#style-palette-island`, `button[data-style-name]`, `#open-style-editor-btn`, `#style-editor-modal` (+ inner field IDs), `#node-style-select`, `#node-label-input`, `#edge-dashed-checkbox`, and any `.style-category-tab` usage (sprint-05 spec may be updated to the combobox model, but do it in the same commit). All 59 prior E2E tests pass (Contract B).

---

## 5. Verification Sources (C++ → AC Traceability)

| AC / Claim | C++ Source of Truth | Verified Value |
| :--- | :--- | :--- |
| Panel structure | `src/gui/stylepalette.ui:37-193` | `QDockWidget "Styles"` → italic `styleFile` label → `QHBoxLayout` of 4 `QToolButton`s (iconSize **16×16**) → `currentCategory` `QComboBox` → two `QListView`s |
| IconMode + 48 grid | `src/gui/stylepalette.cpp:39-53` | `setViewMode(IconMode)`, `setGridSize(QSize(space,space))`, `space = style-icon-spacing` default **48** |
| `[no styles]` label | `src/tikzit.cpp:42`, `stylepalette.cpp:66-85` | `_styleFile` initialized `"[no styles]"`; `reloadStyles()` overwrites the `.ui` placeholder at construction |
| New / Open / Refresh semantics | `src/tikzit.cpp:142-174`, `stylepalette.cpp:205-231` | New = save-dialog for a new `.tikzstyles`; Refresh = re-load `previous-tikzstyles-file` |
| Edit guard | `stylepalette.cpp:215-224` | Warning dialog when `styleFile == "[no styles]"` |
| Double-click | `stylepalette.cpp:195-203`, `tikzscene.cpp:1147-1155` | `applyActiveStyleToNodes/Edges()` — **apply to selection, not the editor** |
| Categories | `src/data/tikzstyles.cpp:141-152`, `stylepalette.cpp:233-238` | Node styles only, sorted, `""` = all; filters node grid only |
| `none` pinned | `src/data/stylelist.cpp:5-12, 79-99` | `none`/`noneEdgeStyle` always index 0, counted in every category |
| Web gaps found | `src/components/workspace/FileDropZone.tsx:49`, `src/components/styles/StylePalette.tsx:46-52`, `src/stores/createWorkbenchStores.ts:74-75` | `.tikzstyles` rejected by drop zone; apply-on-click deviation; catalog has no `styleFileName` field and ZX presets lack a synthetic `none` entry |

## 6. Definition of Done (DoD) Checklist

- [ ] Right dock panel restructured into desktop layout matching `stylepalette.ui`, mounted as a Dockview panel (or inside `InspectorPanel`) with all Dockview-native features intact (Contract A).
- [ ] 4-button action bar implemented with original SVG icons at 16×16; New/Open/Edit/Refresh semantics mapped to web storage (save/new catalog, `.tikzstyles` open incl. `FileDropZone`, editor guard, refresh via retained handle/content).
- [ ] Category combobox implemented as full-width dark `<select>`, populated from node-style categories with `""` (all) first, filtering only the node grid.
- [ ] Node styles and Edge styles rendered in distinct split 48×48 icon-grid sections on `#181818`, `none` pinned at index 0 in every filter state.
- [ ] Single-click = set active style; double-click = apply to selection (desktop semantics — corrected from "opens editor").
- [ ] Contract-B selectors preserved or specs migrated in-commit; zero regressions in the 59 prior E2E tests.
- [ ] Unit tests in `tests/unit/styles/desktopStylePalette.test.ts` pass 100%.
- [ ] Playwright E2E tests in `e2e/sprint-11/desktop-style-palette.spec.ts` pass 100%.
- [ ] TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.
