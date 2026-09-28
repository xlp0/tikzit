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
The Qt resource file (`tikzit.qrc`) bundles the following core SVG assets from `images/`:
- `images/tikzit-tool-select.svg`: Selection arrow pointer tool.
- `images/tikzit-tool-node.svg`: Vertex/Node circle tool.
- `images/tikzit-tool-edge.svg`: Edge Bézier curve with control handles.
- `images/document-new.svg`: New file action icon.
- `images/document-open.svg`: Open directory/file action icon.
- `images/text-x-generic_with_pencil.svg`: Edit style action icon.
- `images/refresh.svg`: Reload/refresh stylesheet action icon.
- `images/crop.svg`: Bounding box/crop tool.
- `images/tikzit.svg` & `images/tikzit.png`: Application brand logo.

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
   - Left side: Traffic light buttons (Close: `#ff5f56`, Minimize: `#ffbd2e`, Maximize: `#27c93f`, diameter `12px`).
   - Center: Document title (e.g. `untitled* - TikZiT`, with reactive asterisk `*` on unsaved edits).
   - Right side: Quick actions (theme toggle, layout reset, version popover).
4. **Tool Palette Architecture**:
   - Located directly below the title bar or in the top toolbar row.
   - 3 Square icon buttons (`32x32px`), dark charcoal background (`#2b2b2b` / `#333333`).
   - Active tool state: **Bright green border** (`border-2 border-[#00c853]`, background `#3c3c3c`), matching the exact visual cue from the desktop screenshot.
   - Passive tool state: Subtle border (`border border-[#444444]`), hover (`bg-[#383838]`).

---

## 4. Implementation Steps & Acceptance Criteria (Amelia)

| Step | Task | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **09.1** | Media Asset Extraction & Sync | `public/icons/*` | All C++ SVGs copied to `public/icons/` and verified accessible over HTTP |
| **09.2** | Type-Safe Icon Registry | `src/components/common/TikzitIcons.tsx` | Clean React icon wrappers for all tool and style action icons |
| **09.3** | macOS Window Chrome | `src/components/workbench/MacWindowChrome.tsx` | Traffic light buttons, centered reactive title (`untitled* - TikZiT`), dark #2a2a2a chrome |
| **09.4** | Desktop Tool Palette | `src/components/workbench/DesktopToolPalette.tsx` | 32x32px square buttons with SVG icons, bright green border (`#00c853`) on active tool |
| **09.5** | Workbench Integration | `src/components/workbench/TikzitSpatialWorkbench.tsx` | Seamless integration replacing legacy pill buttons while preserving keyboard shortcuts |
| **09.6** | Unit & E2E Test Verification | `tests/unit/ui/desktopChrome.test.ts` & `e2e/sprint-09/desktop-chrome.spec.ts` | 100% green tests verifying icons, active tool states, and title updates |

### Detailed Acceptance Criteria:
- **AC-09-01**: `public/icons/tikzit-tool-select.svg`, `tikzit-tool-node.svg`, `tikzit-tool-edge.svg`, `document-new.svg`, `document-open.svg`, `text-x-generic_with_pencil.svg`, and `refresh.svg` exist and match C++ source hashes.
- **AC-09-02**: `TikzitIcons.tsx` exports typed icon components that render SVG cleanly with zero blur or distortion at 16px, 20px, 24px, and 32px.
- **AC-09-03**: Window title reacts to active document tab and dirty buffer status (e.g. showing `*` when edits occur, matching desktop `untitled* - TikZiT`).
- **AC-09-04**: Tool palette displays Select, Vertex, Edge buttons. Clicking Edge tool or pressing `E` applies the signature `border-2 border-[#00c853]` active border.
- **AC-09-05**: Vitest unit suite passes with >= 6 tests validating icon rendering and tool selection state changes.
- **AC-09-06**: Playwright E2E spec passes validating DOM attributes, tool click interactions, and keyboard shortcut parity.

---

## 5. Definition of Done (DoD) Checklist

- [ ] All C++ SVG and PNG media assets synchronized to `public/icons/` and integrated into the project build.
- [ ] Type-safe React icon components authored in `src/components/common/TikzitIcons.tsx`.
- [ ] macOS window chrome implemented with traffic light buttons and reactive `title* - TikZiT` document title.
- [ ] Desktop-parity Tool Palette implemented with 32x32px square buttons, exact C++ SVGs, and bright green active border (`#00c853`).
- [ ] Keyboard shortcuts (`S`, `V`, `E`) seamlessly toggle tool modes and visually update active borders.
- [ ] Unit tests in `tests/unit/ui/desktopChrome.test.ts` pass 100%.
- [ ] Playwright E2E tests in `e2e/sprint-09/desktop-chrome.spec.ts` pass 100%.
- [ ] Zero TypeScript errors (`npx tsc --noEmit`) and zero build warnings.
