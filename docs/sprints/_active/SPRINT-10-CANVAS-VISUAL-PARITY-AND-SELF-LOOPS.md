# Sprint 10: Canvas Stage Visual Parity & Teardrop Self-Loop Engine

## 1. Executive Summary & Vision
- **Objective**: Achieve exact visual fidelity on the Three.js WebGL canvas matching the desktop Qt `TikzView` and `TikzScene` implementations: a crisp white diagram canvas (`#FFFFFF`), subtle blue-lavender coordinate axes and grid lines, dashed junction circles for `style=none` nodes, and the signature upward teardrop self-loops.
- **Architectural Leads**:
  - **Winston (System Architect)**: Canvas stage paper-sheet architecture, grid shader color calibration, and mathematical curvature model for self-loops.
  - **Amelia (Senior Software Engineer)**: Shaders, node/edge renderers, tool interaction handlers, unit tests, and Playwright E2E verification.

---

## 2. Desktop Visual Baseline & Geometry Specifications

From our reverse-engineering of `tikzview.cpp`, `nodeitem.cpp`, and `edge.cpp`:

```
          (Teardrop Self-Loop)
                 _.-''''-._
               .'          '.
              /   cp1   cp2  \
              |   (45) (135) |
              \      \ /     /
               '.     v    .'
                 '-..___.-'
                    / \
                   | v |
               +-----------+
               |   ( o )   |  <- Junction Node (style=none)
               |  dashed   |     Center dot: #B4B4C8
               |  boundary |     Dashed ring: #B4B4DC, 2px, [1, 2]
               +-----------+     Radius: 0.20 (8px at 100% zoom)
```

### 2.1 Grid & Axis Exact Color Calibration (`tikzview.cpp`)
1. **Background**: Pure white (`#FFFFFF`) paper surface.
2. **Central Axes**: `QColor(220, 220, 240)` -> `#DCDCFA` (`THREE.Color('#DCDCFA')`), spanning `x=0` and `y=0`.
3. **Major Grid**: `QColor(240, 240, 250)` -> `#F0F0FA` (`THREE.Color('#F0F0FA')`), interval `40px` (`1.0` TikZ unit).
4. **Minor Grid**: `QColor(250, 250, 255)` -> `#FAFAFF` (`THREE.Color('#FAFAFF')`), interval `10px` (`0.25` TikZ unit, active when zoom > 0.2x).

### 2.2 Junction Node Visual Formulation (`nodeitem.cpp`)
For nodes with `style=none` or unstyled blank nodes:
1. Center point: Small solid disk, diameter `2px`, color `#B4B4C8` (`QColor(180, 180, 200)`).
2. Boundary circle: Dashed stroke, radius `0.20` TikZ units (`8px` at `scale=40`), color `#B4B4DC` (`QColor(180, 180, 220)`), stroke width `2px`, dash pattern `[1.0, 2.0]`.
3. Selection indicator: Expanded translucent blue stroke halo `rgba(150, 200, 255, 0.4)` (`QColor(150, 200, 255, 100)`) with 4px expansion.

### 2.3 Teardrop Self-Loop Engine (`edge.cpp`)
When creating an edge where source node equals destination node (`src == target`):
1. **Curvature Angles**: `_outAngle = 45°`, `_inAngle = 135°`.
2. **Curvature Weight**: `_weight = 1.0` (full unit control arm distance `40px`).
3. **Control Points**:
   - `cp1 = src + 1.0 * (cos(45°), sin(45°))`
   - `cp2 = target + 1.0 * (cos(135°), sin(135°))`
4. **Visual Stroke**: Solid crisp black (`#000000`, `2.5px` ribbon width) with smooth joins to node boundary.
5. **TikZ Emission**: Emits `draw [style=..., in=135, out=45, loop] (u) to (u);`.

---

## 3. Implementation Steps & Acceptance Criteria (Amelia)

| Step | Task | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **10.1** | Grid Shader Calibration | `src/canvas/shaders/gridShader.ts` | Exact C++ RGB values (`#FFFFFF` bg, `#DCDCFA` axis, `#F0F0FA` major, `#FAFAFF` minor) |
| **10.2** | Stage Theme Integration | `src/canvas/Stage.ts` | Canvas stage defaults to white paper surface with high contrast against dark outer chrome |
| **10.3** | Junction Node Rendering | `src/canvas/renderers/NodeRenderer.ts` | `style=none` nodes render center dot and dashed lavender boundary ring `[1, 2]` |
| **10.4** | Teardrop Self-Loop Geometry | `src/canvas/bezier.ts` & `src/canvas/renderers/EdgeRenderer.ts` | `src == target` computes `in=135`, `out=45`, `weight=1.0` with 2.5px black ribbon |
| **10.5** | Self-Loop Interaction | `src/components/workbench/panels/CanvasPanel.tsx` | Clicking a node twice or dragging onto itself creates an upward teardrop self-loop |
| **10.6** | Test Suite Verification | `tests/unit/canvas/desktopVisuals.test.ts` & `e2e/sprint-10/canvas-desktop-parity.spec.ts` | 100% green tests verifying grid colors, junction rings, and self-loop topology |

### Detailed Acceptance Criteria:
- **AC-10-01**: `GRID_THEMES.desktop` (or default light) matches exact C++ hex codes: bg `#FFFFFF`, minor `#FAFAFF`, major `#F0F0FA`, axis `#DCDCFA`.
- **AC-10-02**: Grid shader renders axes at `x=0` and `y=0` with clear distinction from grid lines, responsive to viewport zoom.
- **AC-10-03**: `NodeRenderer` produces visible dashed `#B4B4DC` rings with center dots for junction nodes on the white canvas.
- **AC-10-04**: Double-clicking a node with the Edge tool creates a self-loop with `in=135`, `out=45`, `weight=1.0`.
- **AC-10-05**: Emitted TikZ syntax contains `in=135, out=45, loop` for self-loop edges.
- **AC-10-06**: Vitest suite passes >= 6 tests validating math and shaders; Playwright E2E suite passes validating canvas visual elements.

---

## 4. Definition of Done (DoD) Checklist

- [ ] Canvas background calibrated to pure white (`#FFFFFF`) with C++ exact axes (`#DCDCFA`) and grid lines (`#F0F0FA` / `#FAFAFF`).
- [ ] Junction nodes (`style=none`) render with center dot (`#B4B4C8`) and dashed boundary ring (`#B4B4DC`, dash `[1, 2]`).
- [ ] Edge tool creates self-loops with upward teardrop geometry (`in=135°`, `out=45°`, `weight=1.0`) when targeting the same node.
- [ ] Edges render as crisp solid black ribbons (`#000000`, `2.5px` width) on the white canvas.
- [ ] AST and emitter round-trip self-loop properties (`in=135`, `out=45`, `loop`) losslessly.
- [ ] Unit tests in `tests/unit/canvas/desktopVisuals.test.ts` pass 100%.
- [ ] Playwright E2E tests in `e2e/sprint-10/canvas-desktop-parity.spec.ts` pass 100%.
- [ ] TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.
