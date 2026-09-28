# Sprint 09: Desktop Asset Pipeline & macOS Chrome Harmonization

## 1. Executive Summary & Vision
- **Objective**: Establish the shared media asset pipeline between the native C++ Qt codebase (`images/`, `tikzit.qrc`) and the Astro/React web workbench, and transform the web window frame and tool palette into an exact replica of the desktop macOS TikZiT application.
- **Architectural Leads**:
  - **Winston (System Architect)**: System asset ingestion architecture, macOS window chrome component hierarchy, and tool palette state model.
  - **Amelia (Senior Software Engineer)**: Test-first implementation, acceptance criteria, type safety, Vitest unit suite, and Playwright E2E visual verification.

---

## 2. Visual & Architectural Baseline Analysis

From our study of the original desktop application (`tikzit.app`, `mainwindow.cpp`, `toolpalette.cpp`, and screenshot reference):

```
+---------------------------------------------------------------------------------------+
| (o)(o)(o)                     untitled* - TikZiT                                      |  <- macOS Chrome
| [ -> ] [ (o) ] [ ~/~ ]*                                                                |  <- Tool Palette
| (select)(node) (edge - ACTIVE green border #00c853)                                   |
+-------------------------------------------------------------------+-------------------+
|                                                                   | Styles            |
|                                                                   | [no styles]       |
|                                                                   | [+][f][e][r]      |
|                       CANVAS STAGE                                | [Categories v]    |
|                      (Pure White #FFFFFF)                         | +---------------+ |
|                                                                   | | Node Styles   | |
|                                                                   | +---------------+ |
|                                                                   | | Edge Styles   | |
|                                                                   | +---------------+ |
+-------------------------------------------------------------------+-------------------+
```

### 2.1 C++ Media Asset Inventory
The `images/` directory is the single source of truth; `tikzit.qrc` bundles a subset of it into the Qt binary. Assets needed by the web workbench:
- `images/tikzit-tool-select.svg`: Selection arrow pointer tool. *(in qrc)*
- `images/tikzit-tool-node.svg`: Vertex/Node circle tool. *(in qrc)*
- `images/tikzit-tool-edge.svg`: Edge Bézier curve with control handles. *(in qrc)*
- `images/document-new.svg`: New file action icon. *(in qrc)*
- `images/document-open.svg`: Open directory/file action icon. *(in qrc)*
- `images/text-x-generic_with_pencil.svg`: Edit style action icon. *(in qrc)*
- `images/refresh.svg`: Reload/refresh stylesheet action icon. *(in qrc)*
- `images/tikzit.png` / `images/tikzit.svg`: Application brand logo. *(only `tikzit.png` is in qrc; `tikzit.svg` exists in `images/` only)*
- `images/crop.svg`: Bounding-box tool icon. *(exists in `images/` but is **not** in the qrc and the crop action is commented out in `toolpalette.cpp` — icon export is optional)*

Also bundled in the qrc but not needed for the chrome/palette work: `dialog-accept.svg`, `dialog-error.svg`, `loader.gif`, `loader@2x.gif`, `tex/sample/tikzit.sty`. The sync task should enumerate `images/` rather than parsing the qrc, so optional assets (e.g. `crop.svg`) remain available.

---

## 3. Architectural Specifications (Winston)

### 3.1 Media Sharing & Asset Pipeline Architecture
1. **Asset Pipeline**:
   - The C++ `images/` folder remains the single source of truth for canonical icons.
   - An automated build/sync task ensures `public/icons/` mirrors all required SVG icons.
   - In `package.json`, the `build` script verifies asset synchronization.
2. **Type-Safe Icon Registry (`src/components/common/TikzitIcons.tsx`)**:
   - Exposes clean React components for `SelectToolIcon`, `VertexToolIcon`, `EdgeToolIcon`, `CropToolIcon`, `NewDocumentIcon`, `OpenDocumentIcon`, `EditDocumentIcon`, and `RefreshIcon`.
   - Supports crisp SVG rendering with customizable `className`, `size`, and inline vector preservation.
3. **macOS Window Chrome Architecture**:
   - Top Header bar (`h-10` / `38px`, background `#2a2a2a`, border `#383838`).
   - Left side: Traffic light buttons (Close: `#ff5f56`, Minimize: `#ffbd2e`, Maximize: `#27c93f`, diameter `12px`). These are **decorative** in a browser — render them `aria-hidden` / non-interactive.
   - Center: Document title (e.g. `untitled* - TikZiT`, with reactive asterisk `*` on unsaved edits — verified: `mainwindow.cpp:191-197` builds `nm + " - TikZiT"` and appends `*` when `!isClean()`).
   - Right side: **absorb the existing header actions** — undo/redo, version-history popover, tabs menu, reset layout, theme toggle — do not delete or duplicate them (see `_active/README.md` Contract A §4). Reuse the existing `[data-testid="doc-tab-title"]` element for the centered title so existing tests keep passing.
4. **Tool Palette Architecture**:
   - Located in the top toolbar row. *(Desktop reality: `ToolPalette` is a `QToolBar` added via `addToolBar()` — horizontal when docked in the top area; its `Qt::Window` flags + vertical orientation + `"Tools"` title only apply when floated, which the web cannot reproduce. In-chrome placement is the correct approximation.)*
   - 3 Square icon buttons (`32x32px`), dark charcoal background (`#2b2b2b` / `#333333`).
   - Active tool state: **Bright green border** (`border-2 border-[#00c853]`, background `#3c3c3c`).
     > ⚠️ **Design choice, not extracted constant**: the C++ code defines no green border — checked tool buttons render via the native Qt platform style (`toolpalette.cpp:58-66` sets `checkable` only). `#00c853` and `32x32px` are interpretations of the reference screenshot; document them as chosen values. If the screenshot was taken on stock macOS Qt, the real highlight is the platform accent — re-confirm against the actual screenshot before freezing the color.
   - Passive tool state: Subtle border (`border border-[#444444]`), hover (`bg-[#383838]`).

---

## 4. Implementation Steps & Acceptance Criteria (Amelia)

| Step | Task | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **09.1** | Media Asset Extraction & Sync | `public/icons/*` | All C++ SVGs copied to `public/icons/` and verified accessible over HTTP |
| **09.2** | Type-Safe Icon Registry | `src/components/common/TikzitIcons.tsx` | Clean React icon wrappers for all tool and style action icons |
| **09.3** | macOS Window Chrome | `src/components/workbench/MacWindowChrome.tsx` | Traffic light buttons, centered reactive title (`untitled* - TikZiT`), dark #2a2a2a chrome |
| **09.4** | Desktop Tool Palette | `src/components/workbench/DesktopToolPalette.tsx` | 32x32px square buttons with SVG icons, bright green border (`#00c853`) on active tool |
| **09.5** | Workbench Integration | `src/components/workbench/TikzitSpatialWorkbench.tsx` | Seamless integration replacing legacy pill buttons while preserving keyboard shortcuts **and all existing header actions/selectors (Contract A §4, Contract B)** |
| **09.6** | Unit & E2E Test Verification | `tests/unit/ui/desktopChrome.test.ts` & `e2e/sprint-09/desktop-chrome.spec.ts` | 100% green tests verifying icons, active tool states, and title updates |

**09.1 note**: the current `build` script is plain `astro build` — add an explicit icon-sync step (e.g. `scripts/sync-desktop-icons.mjs` run via `prebuild`) that copies the required SVGs from `images/` to `public/icons/` and verifies hashes, so `npm run build` enforces AC-09-01.

### Detailed Acceptance Criteria:
- **AC-09-01**: `public/icons/tikzit-tool-select.svg`, `tikzit-tool-node.svg`, `tikzit-tool-edge.svg`, `document-new.svg`, `document-open.svg`, `text-x-generic_with_pencil.svg`, and `refresh.svg` exist and match C++ source hashes.
- **AC-09-02**: `TikzitIcons.tsx` exports typed icon components that render SVG cleanly with zero blur or distortion at 16px, 20px, 24px, and 32px.
- **AC-09-03**: Window title reacts to active document tab and dirty buffer status (e.g. showing `*` when edits occur, matching desktop `untitled* - TikZiT` — format: `{shortName|untitled}{dirty?"*":""} - TikZiT` per `mainwindow.cpp:191-197`).
- **AC-09-04**: Tool palette displays Select, Vertex, Edge buttons. Clicking Edge tool or pressing `E` applies the signature `border-2 border-[#00c853]` active border. **Full desktop keymap must also be covered**: `S` → select, `V`/`N` → vertex, `E` → edge, `B` → bbox/crop (`tikzscene.cpp:1049-1061`; already implemented in `src/services/keybindings.ts`). The existing web-only `bbox` button stays in the palette or is merged deliberately — do not silently drop it.
- **AC-09-05**: Vitest unit suite passes with >= 6 tests validating icon rendering and tool selection state changes.
- **AC-09-06**: Playwright E2E spec passes validating DOM attributes, tool click interactions, and keyboard shortcut parity.
- **AC-09-07**: Selector stability — the new palette buttons keep `data-tool="select|vertex|edge|bbox"` and `data-testid="tool-*"` attributes, and the chrome keeps `[data-testid="doc-tab-title"]`, `btn-toolbar-undo/redo`, `btn-version-history`, `editor-tabs-more-actions-btn`, `tabs-close-*`, `btn-reset-layout`, `btn-theme-toggle`/`#theme-selector-btn` (see `_active/README.md` Contract B). All 59 pre-existing E2E tests still pass.

---

## 5. Verification Sources (C++ → AC Traceability)

| AC | C++ Source of Truth | Notes |
| :--- | :--- | :--- |
| AC-09-01 | `images/` directory; `tikzit.qrc:2-16` | `crop.svg`, `tikzit.svg` are **not** in qrc — sync from `images/` |
| AC-09-02 | `src/gui/toolpalette.cpp:45-50`, `src/gui/stylepalette.ui:73-143` | Icon usages: `:/images/tikzit-tool-*.svg`, `document-*.svg`, `text-x-generic_with_pencil.svg`, `refresh.svg` |
| AC-09-03 | `src/gui/mainwindow.cpp:191-197` (`updateFileName`) | `nm + " - TikZiT"`, `*` appended iff `!isClean()` |
| AC-09-04 | `src/gui/toolpalette.cpp:26-68`; `src/gui/tikzscene.cpp:1049-1061` | Checkable QActionGroup; keymap S / V,N / E / B. Green border = design choice (no C++ source) |
| AC-09-07 | `e2e/` selector inventory (Contract B) | Verified 59 `test(` blocks reference these selectors |
| Palette placement | `src/gui/mainwindow.cpp:36-37` (`addToolBar`), `toolpalette.cpp:29-34` (float flags) | Horizontal when docked; floating "Tools" window not reproducible on web |

## 6. Definition of Done (DoD) Checklist

- [ ] All required C++ SVG and PNG media assets synchronized from `images/` to `public/icons/` and verified by hash in the project build (new `prebuild`/sync script).
- [ ] Type-safe React icon components authored in `src/components/common/TikzitIcons.tsx`.
- [ ] macOS window chrome implemented with traffic light buttons and reactive `title* - TikZiT` document title.
- [ ] Desktop-parity Tool Palette implemented with 32x32px square buttons, exact C++ SVGs, and bright green active border (`#00c853`).
- [ ] Keyboard shortcuts (`S`, `V`, `N`, `E`, `B`) seamlessly toggle tool modes and visually update active borders.
- [ ] macOS window chrome preserves all pre-existing header features (undo/redo, version popover, tabs menu, reset layout, theme toggle, doc tab + `+` button) and every selector in Contract B.
- [ ] Tool palette keeps `data-tool`/`data-testid="tool-*"` attributes; no prior E2E test regresses.
- [ ] Unit tests in `tests/unit/ui/desktopChrome.test.ts` pass 100%.
- [ ] Playwright E2E tests in `e2e/sprint-09/desktop-chrome.spec.ts` pass 100%.
- [ ] Zero TypeScript errors (`npx tsc --noEmit`) and zero build warnings.
