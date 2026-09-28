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
   - Central axes in subtle lavender-blue (**`#DCDCF0`** — `QColor(220,220,240)`; corrected from `#DCDCFA`).
   - Minor (`#FAFAFF`) and major (`#F0F0FA`) grid divisions (10 px / 40 px scene spacing; desktop view at `_scale = 2.5` → 100 px per TikZ unit).
   - Node 0 and Node 1 rendered with `style=none` (dashed lavender outline `#B4B4DC` — effective dash `0.05`/gap `0.10` units — with center dot `#B4B4C8`).
   - Solid black edge (`#000000`, **`0.05` TikZ units = `2.0` scene px**, i.e. ~5 device px at the desktop's default `2.5` scale — corrected from `2.5px`).
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
| **12.2** | Visual Regression Baseline | `e2e/sprint-12/visual-regression.spec.ts` | Compares workbench render against golden baseline. Prefer Playwright's built-in `toHaveScreenshot({ maxDiffPixelRatio })` — `pixelmatch` is not a current dependency; only add it if the built-in thresholding proves insufficient |
| **12.3** | Cross-Browser Matrix | `playwright.config.ts` | ⚠️ Currently declares **chromium only**. Add `webkit` + `firefox` projects (`devices['Desktop Safari']`, `devices['Desktop Firefox']`) and run `npx playwright install webkit firefox`; gate WebGL-dependent visual diffs per-browser as needed |
| **12.4** | Touch & Keyboard Audits | `e2e/sprint-12/input-parity.spec.ts` | Validates keyboard navigation (`S`, `V`, `N`, `E`, `B`, `Delete`/`Backspace`, `Cmd+Z`/`Cmd+Shift+Z`) and canvas gestures |
| **12.5** | Master Sprint Graduation | `docs/sprints/` | Archive Sprints 09–12 and update master roadmap documentation |

### Detailed Acceptance Criteria:
- **AC-12-01**: An automated Playwright script places two nodes, creates the connecting wire, and adds the two teardrop self-loops using the gesture contract settled in Sprint 10 AC-10-04 (desktop parity = press-release single click on the node; if the armed two-click model was kept, the second click on the same node). Mirror the reference screenshot geometry: nodes at `(-1, 0)` and `(1, 0)`, camera ≈ 100 px/unit.
- **AC-12-02**: Visual comparison tests pass on desktop viewport (1280x800) with matching color palettes across toolbar, canvas, and styles dock — paper colors asserted against the corrected constants (`#DCDCF0` axis, `2.0`-scene-px edges, dash `0.05`/`0.10`).
- **AC-12-03**: All **59** prior E2E tests (verified count in `e2e/`) and all new Sprint 09–12 E2E tests pass 100% green without flakes. This is only achievable if Sprints 09/11 honored the Contract-B selectors (or migrated specs in-commit) — audit selector usage before starting this sprint.
- **AC-12-04**: Production bundle build (`npm run build`) succeeds with zero errors, including the Sprint 09 icon-sync `prebuild` step.
- **AC-12-05**: TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.
- **AC-12-06**: Dockview integrity audit: panels still drag/float/maximize, layout persists across reload via `toJSON`/`fromJSON` + 0-panel guard, and the new `styles` panel (if split per Sprint 11 §3) survives layout reset and restores for users with a pre-existing saved layout.

---

## 4. Verification Sources (C++ → AC Traceability)

| AC / Claim | Source of Truth | Verified Value |
| :--- | :--- | :--- |
| Reference colors | `src/gui/tikzview.cpp:66-75`, `nodeitem.cpp:72-85`, `style.cpp:90-93,168-192` | bg `#FFFFFF`, axis `#DCDCF0`, major `#F0F0FA`, minor `#FAFAFF`, ring `#B4B4DC` (dash 0.05/0.10 u), dot `#B4B4C8`, edge `#000000` at `0.05` u |
| Reference framing | `tikzview.cpp:34-35`, `tikzit.h:78-82` | `_scale=2.5`, `GLOBAL_SCALEF=40` → 100 px/unit |
| Self-loop scenario | `edge.cpp:34-46`, `tikzscene.cpp:589-599,855-872`, `graph.cpp:304-333` | click creates `Edge(n,n)` → `in=135/out=45/w=1.0` → emits `\draw [in=135, out=45, loop] (u) to ();` |
| Style dock reference | `stylepalette.ui:37-193`, `stylepalette.cpp:39-53,195-231` | label + 4×16px-icon action bar + category combo + two 48px IconMode grids |
| Browser matrix | `playwright.config.ts` | **chromium-only today** — webkit/firefox projects must be added |
| Prior-test baseline | `e2e/**/*.spec.ts` | **59** `test(` blocks; selectors enumerated in `_active/README.md` Contract B |
| Dockview invariants | `src/components/workbench/TikzitSpatialWorkbench.tsx:158-235` | `toJSON`/`fromJSON` + 0-panel guard + `loadDefaultLayout` |

## 5. Definition of Done (DoD) Checklist

- [ ] Automated reference scenario reproduces the exact screenshot geometry and layout (nodes at `(-1,0)`/`(1,0)`, ~100 px/unit, self-loops per AC-12-01).
- [ ] Visual regression snapshot tests pass across Chromium, WebKit, and Firefox (config + installed browsers verified).
- [ ] Green active border (`#00c853` — documented design choice) on Edge tool verified in visual tests.
- [ ] Teardrop self-loop rendering verified against the C++ control-point math (`cp1 = src + 1.0∠45°`, `cp2 = target + 1.0∠135°` in TikZ coords).
- [ ] Contract A (Dockview invariants) and Contract B (selector stability) audit passes — zero regressions in the 59 prior E2E tests.
- [ ] All 4 sprints (09, 10, 11, 12) graduated to permanent folders in `docs/sprints/`.
- [ ] Master documentation index (`docs/sprints/README.md`) updated and signed off.
