# Active Sprint Directory (`docs/sprints/_active`)

This directory tracks the active execution of the **Desktop Parity & Media Sharing Series** (Sprints 09–12), designed in collaboration with **Winston (System Architect)** and **Amelia (Senior Software Engineer)**.

---

## Strategic Objective: Desktop C++ Visual & Asset Parity
The core mission of this sprint series is to achieve exact visual, aesthetic, and media asset parity between the TikZiT Web spatial workbench and the original macOS desktop C++ application (`tikzit.app`):
1. **Media Asset Sharing**: Reusing the original SVG and raster assets from the C++ codebase (`images/` and `tikzit.qrc`) directly in the web app.
2. **macOS Chrome & Top Tool Palette**: Introducing the native macOS window frame (traffic light controls, document title `untitled* - TikZiT` — verified `mainwindow.cpp:191-197`) and the 32x32px square tool palette with a bright green active-selection border (design choice from the reference screenshot — no equivalent constant exists in the C++ source; see Sprint 09 §3.4).
3. **Canvas Aesthetic Parity**: Harmonizing the canvas background to pure white (`#FFFFFF`) with exact C++ coordinate axes (`#DCDCF0` — `QColor(220,220,240)`) and major/minor grid lines (`#F0F0FA` / `#FAFAFF`).
4. **Node & Edge Rendering Parity**: Rendering `style=none` junction nodes with the exact C++ dashed lavender ring (`#B4B4DC`; Qt dash pattern `[1, 2]` is expressed in pen-width units at `widthF 2.0`, i.e. effective dash `0.05` / gap `0.10` TikZ units) and center dot (`#B4B4C8`), and implementing the signature upward teardrop self-loop (`in=135°`, `out=45°`, `weight=1.0`).
5. **Styles Dock Panel Parity**: Rebuilding the right dock panel to match `stylepalette.ui` with the 4-button action bar (`document-new`, `document-open`, `text-x-generic_with_pencil`, `refresh`), category dropdown, and split 48x48 icon-mode swatches.

---

## Active Sprint Series (Sprints 09–12)

| Sprint | Document | Focus & Scope | Lead Agents | Status |
| :---: | :--- | :--- | :---: | :---: |
| **09** | [`SPRINT-09-DESKTOP-ASSETS-AND-CHROME-HARMONIZATION.md`](./SPRINT-09-DESKTOP-ASSETS-AND-CHROME-HARMONIZATION.md) | Media Asset Pipeline, Shared C++ Icons, macOS Window Chrome & Green Tool Border | Winston & Amelia | 🟢 **Active / Next Up** |
| **10** | [`SPRINT-10-CANVAS-VISUAL-PARITY-AND-SELF-LOOPS.md`](./SPRINT-10-CANVAS-VISUAL-PARITY-AND-SELF-LOOPS.md) | White Canvas Stage, Subtle Blue Grid/Axes, Dashed Junction Nodes & Teardrop Self-Loops | Winston & Amelia | 📋 **Planned** |
| **11** | [`SPRINT-11-DESKTOP-STYLE-PALETTE-AND-ACTION-BAR.md`](./SPRINT-11-DESKTOP-STYLE-PALETTE-AND-ACTION-BAR.md) | 4-Icon Action Bar, Category Dropdown, Split Node/Edge 48x48 Swatches & Style Editor | Winston & Amelia | 📋 **Planned** |
| **12** | [`SPRINT-12-VISUAL-REGRESSION-AND-FINAL-PARITY.md`](./SPRINT-12-VISUAL-REGRESSION-AND-FINAL-PARITY.md) | Desktop Reference Screenshot Visual Regressions, E2E Golden Suite & Master Sign-Off | Winston & Amelia | 📋 **Planned** |

---

## Architectural Principles & Collaboration Guidelines
- **Winston (System Architect)**: Owns architectural decisions, domain models, asset synchronization strategy, and UX/UI system hierarchy.
- **Amelia (Senior Software Engineer)**: Owns test-first execution (red, green, refactor), exact acceptance criteria (AC IDs), TypeScript type safety, and 100% green test passes.

---

## Cross-Sprint Contract A: Dockview Preservation Invariants

The workbench's Dockview shell is a feature, not scaffolding. All Sprint 09–12 UI work MUST preserve its native capabilities:

1. **Panels remain Dockview panels.** New surface components (macOS chrome content, desktop tool palette, styles dock) mount *inside* `DockviewReact` panels or the surrounding shell chrome — never as fixed overlays that prevent panel dragging, re-docking, floating groups, or maximization.
2. **Layout serialization is load-bearing.** `api.toJSON()`/`api.fromJSON()` persistence to `localStorage['tikzit:workbench:layout']` and the 0-panel guard must continue to work after every sprint. Adding a new panel `id`/`component` (e.g. a dedicated `styles` panel) requires either a layout-key version bump or a post-restore `addPanel` for missing IDs — a saved layout will not magically contain new panels.
3. **Panel component registry.** Any new panel kind must be registered in the `components` map in `TikzitSpatialWorkbench.tsx`; unregistered component names in a restored layout will throw at `fromJSON` time.
4. **Header consolidation, not replacement.** `MacWindowChrome` absorbs the existing header's functions (doc title chip + dirty `*`, new-diagram `+`, undo/redo, version-history popover, tabs menu, reset layout, theme toggle) rather than deleting them. There must never be two competing tool switchers or two document-title indicators.
5. **Paper vs. chrome theme decoupling.** The canvas "paper" is always white per desktop parity; the surrounding chrome/dock theme may remain dark. Do not wire the grid theme to the UI theme atom.

## Cross-Sprint Contract B: E2E Selector Stability Contract

The existing **59 Playwright tests** depend on the selectors below. Any component rewrite in Sprints 09–12 must either preserve these attributes or update the referencing spec in the same commit — otherwise AC-12-03 ("all prior tests green") fails by construction.

**Shell / chrome / tools** (sprint-00, sprint-02, sprint-05b, sprint-07, tikzit.spec):
`#tikzit-workbench`, `[data-testid="workbench-root"]`, `[data-testid="doc-tab-title"]`, `[data-testid="btn-new-diagram"]`, `button[data-tool="select"|"vertex"|"edge"|"bbox"]`, `[data-testid="tool-*"]`, `[data-testid="btn-toolbar-undo"/"btn-toolbar-redo"]`, `[data-testid="btn-version-history"]`, `[data-testid="version-popover"]`, `[data-testid="editor-tabs-more-actions-btn"]`, `[data-testid="tabs-more-actions-dropdown"]`, `[data-testid="tabs-close-others-btn"/"tabs-close-all-btn"]`, `[data-testid="btn-reset-layout"]`, `[data-testid="btn-theme-toggle"]`, `#theme-selector-btn`, `button[data-theme="dark"/"light"]`.

**Dockview / layout** (sprint-02):
`#dockview-host`, `[data-testid="dockview-host"]`, `.editor-tab`, `.dv-group`, `.dv-sash`/`[role="separator"]`, `#activity-bar`, `#toggle-source-drawer`, `#source-drawer-island`, `[data-action="restore-dockview"]`, `[data-testid="status-bar"]`, `[data-testid="status-dockview-focal"]`, `[data-testid="panel-count-indicator"]`.

**Style palette / inspector** (sprint-05):
`#style-palette-island`, `.style-category-tab`, `button[data-style-name="…"]`, `#open-style-editor-btn`, `#style-editor-modal`, `#new-style-btn`, `#style-name-input`, `#style-fill-color`, `#save-style-btn`, `#node-style-select`, `#node-label-input`, `#edge-dashed-checkbox`.

**Panels** (sprint-02/03/06): `[data-testid="panel-canvas"|"panel-source"|"panel-inspector"|"panel-preview"|"panel-console"]`, `[data-panel="canvas"/"source"/"inspector"]`, `canvas#webgl-stage`.

**Out-of-scope but still green**: preview/exporter/corpus/sync selectors (`btn-export-*`, `preview-*`, `sync-diagnostics-banner`, `revisions-list`, `file-drop-zone`, `tikz-source-editor`) — do not regress while changing unrelated code.
