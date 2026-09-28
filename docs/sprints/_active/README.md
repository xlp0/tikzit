# Active Sprint Directory (`docs/sprints/_active`)

This directory tracks sprint working drafts in flight. Both the **Desktop Parity & Media Sharing Series** (Sprints 09–15) and the **Diagram Lifecycle, History & Export Series** (Sprints 16–19) — designed in collaboration with **Winston (System Architect)** and **Amelia (Senior Software Engineer)** — are now **fully graduated**: their final specifications live in the category bins under `docs/sprints/` (see the tables below and the [master index](../README.md)). There are currently no ungraduated sprint drafts in flight.

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

## Graduated Series: Diagram Lifecycle, History & Export (Sprints 16–19)

| Sprint | Bin | Document | Focus & Scope | Lead Agents | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **16** | `corpus` | [`SPRINT-16-DIAGRAM-CREATION-AND-MCARD-LIFECYCLE.md`](../corpus/16-diagram-creation-and-mcard-lifecycle/SPRINT-16-DIAGRAM-CREATION-AND-MCARD-LIFECYCLE.md) | Diagram Creation (`zx:diagrams:`), Carry-Over Hardening H1–H8, Snapshot v2 & Explicit MCard Save | Winston & Amelia | ✅ **Completed & Graduated** |
| **16B** | `corpus` | [`SPRINT-16B-DIAGRAM-LIBRARY-AND-SESSION-DURABILITY.md`](../corpus/16b-diagram-library-and-session-durability/SPRINT-16B-DIAGRAM-LIBRARY-AND-SESSION-DURABILITY.md) | Library Actions (Rename, Duplicate, Archive), Crash/Reload Recovery & Legacy Migration | Winston & Amelia | ✅ **Completed & Graduated** |
| **17** | `corpus` | [`SPRINT-17-MCARD-VERSION-HISTORY-AND-RESTORE.md`](../corpus/17-mcard-version-history-and-restore/SPRINT-17-MCARD-VERSION-HISTORY-AND-RESTORE.md) | Lineage Version History Popover, Preview/Compare Modes & Non-Rewinding Restore | Winston & Amelia | ✅ **Completed & Graduated** |
| **17B** | `shell` | [`SPRINT-17B-PROMINENT-DRAFT-SAVE-AFFORDANCE.md`](../shell/17b-prominent-draft-save-affordance/SPRINT-17B-PROMINENT-DRAFT-SAVE-AFFORDANCE.md) | Prominent Draft-to-MCard Save CTA, In-Canvas Callout & Mode Transitions | Winston & Amelia | ✅ **Completed & Graduated** |
| **18** | `preview` | [`SPRINT-18-INDIVIDUAL-DIAGRAM-EXPORT.md`](../preview/18-individual-diagram-export/SPRINT-18-INDIVIDUAL-DIAGRAM-EXPORT.md) | Individual Diagram Export (TikZ, TeX, SVG, PNG 1x/2x/4x, PDF) & Style Presets | Winston & Amelia | ✅ **Completed & Graduated** |
| **19** | `corpus` | [`SPRINT-19-COMPLETE-MCARD-COLLECTION-EXPORT.md`](../corpus/19-complete-mcard-collection-export/SPRINT-19-COMPLETE-MCARD-COLLECTION-EXPORT.md) | Verified MCard Collection `.db` Export, Complete Lineage Traversal & Pinned Round-Trip | Winston & Amelia | ✅ **Completed & Graduated** |

**Architecture & Planning Brief:** [`PROPOSAL-16-19-MCARD-DIAGRAM-LIFECYCLE-HISTORY-AND-EXPORT.md`](../orchestration/16-19-mcard-diagram-lifecycle-history-and-export/PROPOSAL-16-19-MCARD-DIAGRAM-LIFECYCLE-HISTORY-AND-EXPORT.md)

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

**Corpus Explorer, Diagram Lifecycle & Library Management** (sprint-15, sprint-16, sprint-16b): `[data-testid="corpus-persistence-state"]`, `[data-testid="corpus-save-btn"]`, `[data-testid="corpus-search-input"]`, `[data-testid="corpus-entry-<handle>"]`, `[data-testid="btn-explorer-new-diagram"]`, `[data-testid="btn-empty-state-new-diagram"]`, `[data-testid="doc-type-badge"]`, `[data-testid="doc-save-status"]`, `[data-testid="status-save-state"]`, `[data-testid="btn-save-retry"]`, `[data-testid="stale-reload-banner"]`, `[data-testid="btn-reload-window"]`, `[data-testid="badge-draft"]`, `[data-testid="badge-diagram"]`, `[data-testid="badge-example"]`, `[data-testid="entry-version"]`, `[data-testid="toggle-show-archived"]`, `[data-testid="badge-archived"]`, `[data-testid="badge-imported"]`, `[data-testid="recovery-banner"]`, `[data-testid="btn-recovery-review"]`, `[data-testid="btn-recovery-discard"]`, `[data-testid="live-announcer"]`, `[data-testid="close-dirty-dialog"]`, `[data-testid="btn-close-save"]`, `[data-testid="btn-close-discard"]`, `[data-testid="btn-close-cancel"]`, `[data-testid="checkbox-apply-all"]`, `[data-testid="input-rename-diagram"]`, `[data-testid^="entry-actions-"]`, `[data-testid="action-rename"]`, `[data-testid="action-duplicate"]`, `[data-testid="action-archive"]`, `[data-testid="action-unarchive"]`, `[data-testid="btn-close-tab"]`. The row selector pattern also applies to `zx:diagrams:` handles. Sprint 19 retires `corpus-save-btn` in favor of `btn-export-collection` and updates `corpus-explorer.spec.ts` in the same commit.

**MCard Version History & Restore** (sprint-17): `[data-testid="history-head-hash"]`, `[data-testid="btn-copy-head-hash"]`, `[data-testid="history-version-count"]`, `[data-testid^="version-row-"]`, `[data-testid="version-position"]`, `[data-testid="badge-current-version"]`, `[data-testid="version-timestamp"]`, `[data-testid="version-author"]`, `[data-testid="version-label"]`, `[data-testid="version-hash"]`, `[data-testid="btn-copy-version-hash"]`, `[data-testid="version-unavailable"]`, `[data-testid="btn-preview-version"]`, `[data-testid="btn-compare-version"]`, `[data-testid="btn-restore-version"]`, `[data-testid="history-preview-panel"]`, `[data-testid="btn-close-preview"]`, `[data-testid="preview-source-code"]`, `[data-testid="history-compare-panel"]`, `[data-testid="btn-close-compare"]`, `[data-testid="compare-stat-deltas"]`, `[data-testid="compare-diff-view"]`, `[data-testid="restore-confirm-dialog"]`, `[data-testid="btn-confirm-restore"]`, `[data-testid="btn-cancel-restore"]`, `[data-testid="restore-dirty-dialog"]`, `[data-testid="btn-restore-save-first"]`, `[data-testid="btn-restore-discard"]`, `[data-testid="btn-restore-cancel"]`, `[data-testid="history-already-current"]`, `[data-testid="history-conflict"]`, `[data-testid="history-live-announcer"]`, `[data-testid="heading-legacy-revisions"]`.

**Draft-to-MCard Save Affordance & Mode Transition** (sprint-17b): `[data-testid="btn-save-draft"]`, `[data-testid="draft-canvas-callout"]`, `[data-testid="btn-canvas-save-draft"]`, `[data-testid="btn-dismiss-draft-callout"]`, `[data-testid="btn-save-diagram"]`, `[data-testid="draft-save-success-pill"]`, `[data-testid="diagram-save-error"]`.

**Individual Diagram Export** (sprint-18): `[data-testid="row-export-diagram"]`, `[data-testid="btn-export-diagram"]`, `[data-testid="export-diagram-dialog"]`, `[data-testid="export-dialog-title"]`, `[data-testid="export-styles-name"]`, `[data-testid="format-tikz"]`, `[data-testid="format-tex"]`, `[data-testid="format-svg"]`, `[data-testid="format-png"]`, `[data-testid="format-pdf"]`, `[data-testid="export-png-scale"]`, `[data-testid="source-current-edits"]`, `[data-testid="source-saved-version"]`, `[data-testid="export-parse-error"]`, `[data-testid="btn-confirm-export"]`, `[data-testid="btn-cancel-export"]`, `[data-testid="btn-retry-export"]`, `[data-testid="export-live-announcer"]`.

**Planned for Sprint 19** (added to this contract as sprint lands): `btn-export-collection` (Sprint 19).
