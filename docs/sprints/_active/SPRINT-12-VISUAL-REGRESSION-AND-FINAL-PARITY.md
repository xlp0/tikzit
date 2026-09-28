# Sprint 12: Visual Regression Testing, Golden Parity & Master Sign-Off

## 1. Executive Summary & Vision
- **Objective**: Execute end-to-end visual regression comparisons between the TikZiT Web spatial workbench and the canonical desktop reference screenshot, verifying 100% aesthetic, layout, icon, and behavioral parity across Chromium, WebKit, and Firefox.
- **Architectural Leads**:
  - **Winston (System Architect)**: Visual parity audit criteria, pixel-level tolerances, and release readiness.
  - **Amelia (Senior Software Engineer)**: Playwright visual regression test suite, cross-browser validation, and master graduation audit.

---

## 2. Reference Desktop Benchmark Matrix

The canonical reference for this sprint is the user-provided desktop screenshot:
1. **Window Chrome**: macOS dark title bar (`untitled* - TikZiT`) with traffic lights.
2. **Top Toolbar**: 3 square buttons (`32x32px`), Edge tool highlighted with 2px bright green border (`#00c853`).
3. **Canvas Area**:
   - Pure white background (`#FFFFFF`).
   - Central axes in subtle lavender-blue (`#DCDCFA`).
   - Minor (`#FAFAFF`) and major (`#F0F0FA`) grid divisions.
   - Node 0 and Node 1 rendered with `style=none` (dashed lavender outline `#B4B4DC` with center dot `#B4B4C8`).
   - Thick solid black line (`#000000`, `2.5px`) connecting the nodes.
   - Both nodes having an upward teardrop self-loop (`in=135°`, `out=45°`, `weight=1.0`).
4. **Right Styles Panel**:
   - Header with title "Styles".
   - Stylesheet label `[no styles]`.
   - 4 Action icons (`document-new`, `document-open`, `text-x-generic_with_pencil`, `refresh`).
   - Category combobox dropdown.
   - Split icon-grid lists showing default `none` node style and default `none` edge style on dark slate (`#181818`).

---

## 3. Implementation Steps & Acceptance Criteria (Amelia)

| Step | Task | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **12.1** | Reference Scenario Automation | `e2e/sprint-12/reference-scenario.spec.ts` | Automates the exact 2-node + 2-self-loop setup from the reference screenshot |
| **12.2** | Pixelmatch Visual Regression | `e2e/sprint-12/visual-regression.spec.ts` | Compares workbench render against golden baseline with strict threshold (<1.5% diff) |
| **12.3** | Cross-Browser Matrix | `playwright.config.ts` | Runs visual parity suite across Chromium, WebKit (Safari), and Firefox |
| **12.4** | Touch & Keyboard Audits | `e2e/sprint-12/input-parity.spec.ts` | Validates keyboard navigation (`S`, `V`, `E`, `Cmd+Z`) and canvas gestures |
| **12.5** | Master Sprint Graduation | `docs/sprints/` | Archive Sprints 09–12 and update master roadmap documentation |

### Detailed Acceptance Criteria:
- **AC-12-01**: An automated Playwright script places two nodes, creates the connecting wire, and adds the two teardrop self-loops via double-click, exactly mirroring the reference screenshot.
- **AC-12-02**: Visual comparison tests pass on desktop viewport (1280x800) with matching color palettes across toolbar, canvas, and styles dock.
- **AC-12-03**: All 59+ prior E2E tests and all new Sprint 09–12 E2E tests pass 100% green without flakes.
- **AC-12-04**: Production bundle build (`npm run build`) succeeds with zero errors.
- **AC-12-05**: TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.

---

## 4. Definition of Done (DoD) Checklist

- [ ] Automated reference scenario reproduces the exact screenshot geometry and layout.
- [ ] Visual regression snapshot tests pass across all target browsers.
- [ ] Green active border on Edge tool verified in visual tests.
- [ ] Teardrop self-loop rendering verified against C++ mathematical bezier curves.
- [ ] All 4 sprints (09, 10, 11, 12) graduated to permanent folders in `docs/sprints/`.
- [ ] Master documentation index (`docs/sprints/README.md`) updated and signed off.
