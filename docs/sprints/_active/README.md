# Active Sprint Directory (`docs/sprints/_active`)

This directory tracks sprint working drafts in flight. The **Desktop Parity & Media Sharing Series** (Sprints 09–14) and the follow-on **Sovereign Corpus track** (Sprint 15) — designed in collaboration with **Winston (System Architect)** and **Amelia (Senior Software Engineer)** — are now **fully graduated**: their final specifications live in the category bins under `docs/sprints/` (see the table below and the [master index](../README.md)).

---

## Strategic Objective: Desktop C++ Visual & Asset Parity
The core mission of this sprint series is to achieve exact visual, aesthetic, and media asset parity between the TikZiT Web spatial workbench and the original macOS desktop C++ application (`tikzit.app`):
1. **Media Asset Sharing**: Reusing the original SVG and raster assets from the C++ codebase (`images/` and `tikzit.qrc`) directly in the web app via an automated sync pipeline (`scripts/sync-desktop-icons.mjs`).
2. **macOS Chrome & Top Tool Palette**: Introducing the native macOS window frame (traffic light controls, document title `untitled* - TikZiT` — verified `mainwindow.cpp:191-197`) and the 32x32px square tool palette with the signature bright green active-selection border (`border-2 border-[#00c853]`, background `#3c3c3c`).
3. **Canvas Aesthetic Parity**: Harmonizing the canvas background to pure white (`#FFFFFF`) with exact C++ coordinate axes (`#DCDCF0` — `QColor(220,220,240)`) and major/minor grid lines (`#F0F0FA` / `#FAFAFF`), decoupled from the outer dark window chrome.
4. **Node & Edge Rendering Parity**: Rendering `style=none` junction nodes with the exact C++ dashed lavender ring (`#B4B4DC`; effective dash `0.05` / gap `0.10` TikZ units, matching Qt pen-width units `[1.0, 2.0]` at `widthF 2.0`) and center dot (`#B4B4C8`), and implementing the signature upward teardrop self-loop (`in=135°`, `out=45°`, `weight=1.0`).
5. **Styles Dock Panel Parity**: Rebuilding the right dock panel to match `stylepalette.ui` with the 4-button action bar (`document-new`, `document-open`, `text-x-generic_with_pencil`, `refresh`), full-width category dropdown, and split 48x48 icon-mode swatches for Node and Edge styles on `#181818`.

---

## As-Is vs. Target Parity Gap Analysis

| Subsystem | Current Codebase State (As-Is) | Target Desktop Parity (To-Be) | Sprint |
| :--- | :--- | :--- | :---: |
| **Media Assets** | Canonical SVGs reside in `images/`; web has no `public/icons/` | Automated sync to `public/icons/`; typed React wrappers in `TikzitIcons.tsx` | **09** |
| **Window Chrome** | Astro header has `TikZiT Web` brand, tab chip, and `+` button | macOS traffic lights, centered reactive title `{doc}* - TikZiT`, absorbed actions | **09** |
| **Tool Palette** | Text pill buttons (`px-2.5 py-1`, active `bg-blue-600`) | 32x32px square buttons with C++ SVGs, active `border-2 border-[#00c853]` | **09** |
| **Canvas Background** | Dark (`#0D1117`) or off-white (`#F6F8FA`), coupled to theme | Pure white (`#FFFFFF`) paper sheet at all times, decoupled from UI theme | **10** |
| **Grid & Axes** | Dark axes (`#388BFD`); light axes (`#0969DA`) | Central axes `#DCDCF0` (`QColor(220,220,240)`), major `#F0F0FA`, minor `#FAFAFF` | **10** |
| **Junction Nodes** | Dash ring `0.05/0.05` with WebGL 1px hairline limit | Dash `0.05`, gap `0.10` (1:2 ratio); 2px geometric ring; dot `#B4B4C8` | **10** |
| **Edge Ribbon** | Stroke flips to `#f1f5f9` in dark mode; width 0.015 | Stroke is always `#000000` on white paper; width 0.025 (2.0 scene px) | **10** |
| **Self-Loop Emission** | Emits `[loop, style=none, in, out]` with destination | Emits `[style=<name>?, in=135, out=45, loop]`, `style=none` omitted, `to ()` | **10** |
| **Style Palette** | Pill category tabs, single list, edit button in header | 4-button action bar (16x16), `<select>` category, split 48x48 icon grids | **11** |
| **Style Ingestion** | `FileDropZone.tsx:49` rejects `.tikzstyles` | Accepts `.tikzstyles`, populates `$stylesCatalog.styleFileName`, refresh support | **11** |
| **Visual Tests** | 59 functional E2E tests, no reference screenshot assertions | Playwright pixelmatch suite reproducing screenshot geometry across browsers | **12** |
| **Canvas-Centric Chrome** | Traffic lights in top bar; tools pinned to top-left | Non-functional traffic lights removed; tools centered over canvas; title on left | **13** |
| **Live Preview Curvature** | Curved edges in canvas collapse to straight lines in TeX Preview | Curvature properties reflected as cubic Bézier splines with node insets | **14** |
| **Corpus Explorer** | Static mock drawer: dead search input, 3 literal rows, fake `CID:`; CLM TriDatabase wired but UI-invisible; volatile in-memory storage | Live MCard-backed corpus list with debounced search, real content hash, SqlJsBackend + IndexedDB persistence, sovereign `.db` export ingestible by mcard-studio | **15** |

---

## Graduated Sprint Series (Sprints 09–15)

| Sprint | Bin | Document | Focus & Scope | Lead Agents | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **09** | `desktop-parity` | [`SPRINT-09-DESKTOP-ASSETS-AND-CHROME-HARMONIZATION.md`](../desktop-parity/09-desktop-assets-and-chrome-harmonization/SPRINT-09-DESKTOP-ASSETS-AND-CHROME-HARMONIZATION.md) | Media Asset Pipeline, Shared C++ Icons, macOS Window Chrome & Green Tool Border | Winston & Amelia | ✅ **Completed & Graduated** |
| **10** | `canvas` | [`SPRINT-10-CANVAS-VISUAL-PARITY-AND-SELF-LOOPS.md`](../canvas/10-canvas-visual-parity-and-self-loops/SPRINT-10-CANVAS-VISUAL-PARITY-AND-SELF-LOOPS.md) | White Paper Canvas, Exact `#DCDCF0` Axes, Dashed Junctions & Teardrop Loops | Winston & Amelia | ✅ **Completed & Graduated** |
| **11** | `styles` | [`SPRINT-11-DESKTOP-STYLE-PALETTE-AND-ACTION-BAR.md`](../styles/11-desktop-style-palette-and-action-bar/SPRINT-11-DESKTOP-STYLE-PALETTE-AND-ACTION-BAR.md) | 4-Icon Action Bar, Category Dropdown, Split Node/Edge 48x48 Swatches & Ingestion | Winston & Amelia | ✅ **Completed & Graduated** |
| **12** | `verification` | [`SPRINT-12-VISUAL-REGRESSION-AND-FINAL-PARITY.md`](../verification/12-visual-regression-and-final-parity/SPRINT-12-VISUAL-REGRESSION-AND-FINAL-PARITY.md) | Reference Screenshot Golden Tests, Cross-Browser Matrix & Master Sign-Off | Winston & Amelia | ✅ **Completed & Graduated** |
| **13** | `desktop-parity` | [`SPRINT-13-CANVAS-CENTRIC-TOOLBAR-AND-CHROME-REFINEMENT.md`](../desktop-parity/13-canvas-centric-toolbar-and-chrome-refinement/SPRINT-13-CANVAS-CENTRIC-TOOLBAR-AND-CHROME-REFINEMENT.md) | Canvas-Centric Tool Placement, Traffic Light Removal & Chrome Refinement | Winston & Amelia | ✅ **Completed & Graduated** |
| **14** | `preview` | [`SPRINT-14-LIVE-TEX-PREVIEW-CURVATURE-SYNCHRONIZATION.md`](../preview/14-live-tex-preview-curvature-synchronization/SPRINT-14-LIVE-TEX-PREVIEW-CURVATURE-SYNCHRONIZATION.md) | Live TeX Preview Curvature & Edge Geometry Synchronization | Winston & Amelia | ✅ **Completed & Graduated** |
| **15** | `corpus` | [`SPRINT-15-MCARD-BACKED-CORPUS-EXPLORER-AND-SOVEREIGN-EXPORT.md`](../corpus/15-mcard-backed-corpus-explorer-and-sovereign-export/SPRINT-15-MCARD-BACKED-CORPUS-EXPLORER-AND-SOVEREIGN-EXPORT.md) | MCard-Backed Corpus Explorer, SqlJsBackend Persistence & Sovereign `.db` Export | Winston & Amelia | ✅ **Completed & Graduated** |

---

## Proposed Next Series: Diagram Lifecycle, History & Export (Sprints 16–19)

These are proposals, not implementation commitments. The umbrella plan captures current gaps, UX principles, the shared data/event contract, and a decision record (D1–D10 all confirmed by the product owner, 2026-09-28). It was revised after a three-lens review whose findings were verified against source and the CLM kernel.

| Sprint | Proposed specification | Outcome | Depends on | Status |
| :---: | :--- | :--- | :--- | :---: |
| **16** | [Diagram Creation & Unified MCard Lifecycle](./SPRINT-16-DIAGRAM-CREATION-AND-MCARD-LIFECYCLE.md) | Phase A: fix Sprint 15 carry-over defects H1–H8. Then one handle predicate, snapshot v2, and create + explicit save of `zx:diagrams:` handles with metadata cards | — | Proposed |
| **16B** | [Diagram Library Management & Session Durability](./SPRINT-16B-DIAGRAM-LIBRARY-AND-SESSION-DURABILITY.md) | Rename, duplicate, and archive via metadata-card lineage; dirty-buffer recovery across reload; idempotent legacy `DocumentStore` import | 16 | Proposed |
| **17** | [MCard Version History & Restore](./SPRINT-17-MCARD-VERSION-HISTORY-AND-RESTORE.md) | History popover on real lineage with labels, preview, and compare; restore by re-registering the historical card | 16 | Proposed |
| **18** | [Individual Diagram Export](./SPRINT-18-INDIVIDUAL-DIAGRAM-EXPORT.md) | Verbatim TikZ/TeX and rendered SVG/PNG/PDF export of saved or unsaved content from row or active doc | 16 | Proposed |
| **19** | [Complete MCard Diagram Collection Export](./SPRINT-19-COMPLETE-MCARD-COLLECTION-EXPORT.md) | Verified `.db` of all diagram and metadata handles with full lineage; pinned mcard-studio round-trip | 16, 16B, 17 | Proposed |

16B, 17, and 18 can run in parallel once 16 lands.

**Planning brief:** [Sprints 16–19 proposal](./PROPOSAL-16-19-MCARD-DIAGRAM-LIFECYCLE-HISTORY-AND-EXPORT.md)

---

## Architectural Principles & Collaboration Guidelines
- **Winston (System Architect)**: Owns architectural decisions, domain models, asset synchronization strategy, and UX/UI system hierarchy.
- **Amelia (Senior Software Engineer)**: Owns test-first execution (red, green, refactor), exact acceptance criteria (AC IDs), TypeScript type safety, and 100% green test passes.

---

## Cross-Sprint Contract A: Dockview Preservation Invariants

The workbench's Dockview shell is a feature, not scaffolding. All Sprint 09–12 UI work MUST preserve its native capabilities — these invariants continue to bind the Sprints 16–19 Explorer/chrome work:

1. **Panels remain Dockview panels.** New surface components (macOS chrome content, desktop tool palette, styles dock) mount *inside* `DockviewReact` panels or the surrounding shell chrome — never as fixed overlays that prevent panel dragging, re-docking, floating groups, or maximization.
2. **Layout serialization is load-bearing.** `api.toJSON()`/`api.fromJSON()` persistence to `localStorage['tikzit:workbench:layout']` and the 0-panel guard must continue to work after every sprint. Adding a new panel `id`/`component` (e.g. a dedicated `styles` panel) requires either a layout-key version bump or a post-restore `addPanel` for missing IDs — a saved layout will not magically contain new panels.
3. **Panel component registry.** Any new panel kind must be registered in the `components` map in `TikzitSpatialWorkbench.tsx`; unregistered component names in a restored layout will throw at `fromJSON` time.
4. **Header consolidation, not replacement.** `MacWindowChrome` absorbs the existing header's functions (doc title chip + dirty `*`, new-diagram `+`, undo/redo, version-history popover, tabs menu, reset layout, theme toggle) rather than deleting them. There must never be two competing tool switchers or two document-title indicators.
5. **Paper vs. chrome theme decoupling.** The canvas "paper" is always white per desktop parity; the surrounding chrome/dock theme may remain dark. Do not wire the grid theme to the UI theme atom.

---

## Cross-Sprint Contract B: E2E Selector Stability Contract

The existing **59 Playwright tests** depend on the selectors below. Any component rewrite in Sprints 09–12 (or the 16–19 series, which touches the same Explorer/chrome surfaces) must either preserve these attributes or update the referencing spec in the same commit — otherwise AC-12-03 ("all prior tests green") fails by construction.

**Shell / chrome / tools** (sprint-00, sprint-02, sprint-05b, sprint-07, tikzit.spec):
`#tikzit-workbench`, `[data-testid="workbench-root"]`, `[data-testid="doc-tab-title"]`, `[data-testid="btn-new-diagram"]`, `button[data-tool="select"|"vertex"|"edge"|"bbox"]`, `[data-testid="tool-*"]`, `[data-testid="btn-toolbar-undo"/"btn-toolbar-redo"]`, `[data-testid="btn-version-history"]`, `[data-testid="version-popover"]`, `[data-testid="editor-tabs-more-actions-btn"]`, `[data-testid="tabs-more-actions-dropdown"]`, `[data-testid="tabs-close-others-btn"/"tabs-close-all-btn"]`, `[data-testid="btn-reset-layout"]`, `[data-testid="btn-theme-toggle"]`, `#theme-selector-btn`, `button[data-theme="dark"/"light"]`.

**Dockview / layout** (sprint-02):
`#dockview-host`, `[data-testid="dockview-host"]`, `.editor-tab`, `.dv-group`, `.dv-sash`/`[role="separator"]`, `#activity-bar`, `#toggle-source-drawer`, `#source-drawer-island`, `[data-action="restore-dockview"]`, `[data-testid="status-bar"]`, `[data-testid="status-dockview-focal"]`, `[data-testid="panel-count-indicator"]`.

**Style palette / inspector** (sprint-05):
`#style-palette-island`, `.style-category-tab`, `button[data-style-name="…"]`, `#open-style-editor-btn`, `#style-editor-modal`, `#new-style-btn`, `#style-name-input`, `#style-fill-color`, `#save-style-btn`, `#node-style-select`, `#node-label-input`, `#edge-dashed-checkbox`.

**Panels** (sprint-02/03/06): `[data-testid="panel-canvas"|"panel-source"|"panel-inspector"|"panel-preview"|"panel-console"]`, `[data-panel="canvas"/"source"/"inspector"]`, `canvas#webgl-stage`.

**Corpus Explorer** (sprint-15): `[data-testid="corpus-persistence-state"]`, `[data-testid="corpus-save-btn"]`, `[data-testid="corpus-search-input"]`, `[data-testid="corpus-entry-<handle>"]`. The row selector pattern also applies to `zx:diagrams:` handles. Sprint 19 retires `corpus-save-btn` in favor of `btn-export-collection` and updates `corpus-explorer.spec.ts` in the same commit.

**Planned for Sprints 16–19** (added to this contract as each sprint lands): `btn-explorer-new-diagram`, `row-export-diagram`, `btn-export-diagram`, `btn-export-collection`, plus row overflow items for Rename, Duplicate, and Archive, the Show-archived toggle, and the recovered-edits banner (Sprint 16B).
