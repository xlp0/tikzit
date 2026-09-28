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
| [ Category Dropdown: All Categories              v ]        |  <- Category Combobox
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
Directly beneath the stylesheet filename label are 4 compact toolbar buttons utilizing canonical SVGs:
1. **New (`document-new.svg`)**: Initializes a new, empty stylesheet catalog.
2. **Open (`document-open.svg`)**: Invokes file chooser to import and parse a `.tikzstyles` file.
3. **Edit (`text-x-generic_with_pencil.svg`)**: Opens the Style Editor modal for the active style.
4. **Refresh (`refresh.svg`)**: Reloads the active stylesheet from disk/storage.

### 2.2 Category Combobox
A full-width native-styled dark dropdown (`<select>`):
- Width: 100% of dock width.
- Background: `#222222`, border: `#383838`, text: `#ffffff`.
- Filters the node styles list according to category (e.g. `Spiders`, `Gates`, `All`).

### 2.3 Split Icon-Mode Grids (`IconMode`, 48x48px)
- **Top Section (Node Styles)**:
  - Background: Dark slate `#181818`.
  - Grid cell: `48x48px`.
  - Index 0: Default `none` style with dashed circle preview.
  - Active selection: Highlighted with blue selection border `#0078d4` / `#2563eb`.
  - Single-click: Selects active node style for Vertex tool.
  - Double-click: Opens Style Editor modal.
- **Bottom Section (Edge Styles)**:
  - Background: Dark slate `#181818`.
  - Index 0: Default `none` style with simple wire preview.
  - Single-click: Selects active edge style for Edge tool.
  - Double-click: Opens Style Editor modal.

---

## 3. Implementation Steps & Acceptance Criteria (Amelia)

| Step | Task | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **11.1** | Desktop Action Bar Component | `src/components/styles/DesktopStyleActionBar.tsx` | 4 action buttons with SVG icons (New, Open, Edit, Refresh) |
| **11.2** | Category Combobox | `src/components/styles/CategorySelect.tsx` | Full-width styled dropdown matching C++ category selector |
| **11.3** | Desktop 48x48 Swatch Grid | `src/components/styles/DesktopSwatchGrid.tsx` | IconMode 48x48px swatches with label underneath on `#181818` |
| **11.4** | StylePalette Re-architecture | `src/components/styles/StylePalette.tsx` | Complete re-assembly into desktop layout with node/edge split |
| **11.5** | Stylesheet Ingestion & Refresh | `src/stores/workbench.ts` | Handlers for importing `.tikzstyles` and refreshing catalog |
| **11.6** | Test Suite Verification | `tests/unit/styles/desktopStylePalette.test.ts` & `e2e/sprint-11/desktop-style-palette.spec.ts` | 100% green tests for 4 actions, category filter, and swatches |

### Detailed Acceptance Criteria:
- **AC-11-01**: 4 toolbar buttons render using canonical SVGs (`document-new.svg`, `document-open.svg`, `text-x-generic_with_pencil.svg`, `refresh.svg`).
- **AC-11-02**: The loaded stylesheet title displays accurately (e.g. `[no styles]` or `pqp-zx.tikzstyles`).
- **AC-11-03**: Category combobox populates dynamically from stylesheet categories and filters the active node grid.
- **AC-11-04**: Node and Edge styles display in separate split panels in 48x48 icon grid format, always starting with `none`.
- **AC-11-05**: Clicking an icon sets active style in runtime; double-clicking opens Style Editor modal.
- **AC-11-06**: Vitest suite passes >= 6 tests validating categorization and actions; Playwright E2E suite passes validating UI workflows.

---

## 4. Definition of Done (DoD) Checklist

- [ ] Right dock panel restructured into exact desktop layout matching `stylepalette.ui`.
- [ ] 4-button action bar implemented with original SVG icons.
- [ ] Category combobox implemented as full-width dark select filter.
- [ ] Node styles and Edge styles rendered in distinct split 48x48 icon-grid sections on `#181818` background.
- [ ] Default `none` style displayed at index 0 for both nodes and edges.
- [ ] Single-click selection and double-click editor launcher working smoothly.
- [ ] Unit tests in `tests/unit/styles/desktopStylePalette.test.ts` pass 100%.
- [ ] Playwright E2E tests in `e2e/sprint-11/desktop-style-palette.spec.ts` pass 100%.
- [ ] TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.
