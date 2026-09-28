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
               |  dashed   |     Center dot: #B4B4C8 (2 scene-px diameter)
               |  boundary |     Dashed ring: #B4B4DC, pen 2.0 scene px,
               +-----------+     dashPattern [1,2] *in pen-width units*
                                 = effective dash 2.0 / gap 4.0 scene px
                                 = 0.05 / 0.10 TikZ units
                                 Radius: 0.20 units (8 scene px)
```

### 2.1 Grid & Axis Exact Color Calibration (`tikzview.cpp`)
Constants: `GLOBAL_SCALEF = 40` (1 TikZ unit = 40 scene px), `GRID_SEP = 10` scene px, `GRID_N = 4` (`src/tikzit.h:78-82`).
1. **Background**: Pure white (`#FFFFFF`) paper surface.
2. **Central Axes**: `QColor(220, 220, 240)` -> **`#DCDCF0`** (`THREE.Color('#DCDCF0')`), spanning `x=0` and `y=0`. ⚠️ `#DCDCFA` would be `(220,220,250)` — do not use it.
3. **Major Grid**: `QColor(240, 240, 250)` -> `#F0F0FA` (`THREE.Color('#F0F0FA')`), interval `GRID_SEP * GRID_N` = 40 scene px (`1.0` TikZ unit).
4. **Minor Grid**: `QColor(250, 250, 255)` -> `#FAFAFF` (`THREE.Color('#FAFAFF')`), interval `GRID_SEP` = 10 scene px (`0.25` TikZ unit, drawn only when `_scale > 0.2`, i.e. `pixelsPerUnit > 8`; `tikzview.cpp:79`).
5. **Line widths**: all grid/axis pens are *cosmetic* (1 device px at any zoom). The shader's `fwidth`-based lines already approximate this — keep line mixes thin, and note the current shader caps blends at `0.85`/`0.95`, which leaves rendered colors ~1–2 RGB units off-palette; raise in-line alpha to `1.0` for exact parity.
6. **Initial zoom parity**: the desktop view starts at `_scale = 2.5` → **100 scene px per TikZ unit** (`tikzview.cpp:34-35`). The web `baseScale` is 50 px/unit — start the camera at zoom `2.0` (or raise baseScale) to match the reference screenshot framing.

### 2.2 Junction Node Visual Formulation (`nodeitem.cpp`)
For nodes with `style=none` or unstyled blank nodes:
1. Center point: Small solid disk, **radius 1 scene px** (2 scene-px diameter; `drawEllipse(QPointF(0,0), 1, 1)`), color `#B4B4C8` (`QColor(180, 180, 200)`).
2. Boundary circle: Dashed stroke, radius `0.20` TikZ units (`8 scene px` at `scale=40`; `nodeitem.cpp:172`), color `#B4B4DC` (`QColor(180, 180, 220)`), stroke width `2.0` scene px.
   > ⚠️ **Dash units**: `pen.setDashPattern([1.0, 2.0])` values are **multiples of the pen width**, so the effective pattern is dash `2.0` / gap `4.0` scene px = **`0.05` dash / `0.10` gap TikZ units** — not `[1, 2]` raw. The current `NodeRenderer` uses `dashSize 0.04 / gapSize 0.06`; correct to `0.05`/`0.10`.
   > Also: `LineDashedMaterial.linewidth` is ignored on WebGL (1 px hairline at all zooms). The ring must be **geometry** (dash-segment buffers or `Line2`), matching the ribbon approach already used for edges, since the desktop pen is non-cosmetic (scales with zoom).
3. Selection indicator: translucent blue halo `QColor(150, 200, 255, 100)` — alpha `100/255 ≈ 0.392` (≈ `rgba(150,200,255,0.39)`) — built by stroking the node shape with width `4`, i.e. roughly **2 scene px** of visible expansion beyond the boundary (not 4 px).

### 2.3 Teardrop Self-Loop Engine (`edge.cpp`, `edgeitem.cpp`, `graph.cpp`)

**Creation gesture (corrected)**: in the desktop, a *single* press on a node with the Edge tool sets `_edgeStartNodeItem = _edgeEndNodeItem = node` (`tikzscene.cpp:590-598`), so **release on the same node — i.e. a plain click — creates the self-loop** (`tikzscene.cpp:855-868`). A drag away and back also works. Double-click is *not* the self-loop gesture — it would create two loops; desktop double-click on a node opens the label editor and on an edge toggles bend mode (`tikzscene.cpp:1070-1104`). For the web, the existing armed two-click `EdgeTool` produces a self-loop on the second click on the same node — decide per AC-10-04 whether to adopt single-click parity or document the deviation.

When `src == target` (node identity, not merely coincident positions — see §4 note on `computeEdgeControls`):
1. **Curvature Angles**: `_outAngle = 45°`, `_inAngle = 135°` (`edge.cpp:43-44`), `_basicBendMode = false`.
2. **Curvature Weight**: `_weight = 1.0`; for coincident endpoints `_cpDist = _weight` (in TikZ units) → control arms of `1.0` unit = `40 scene px` (`edge.cpp:204`).
3. **Control Points** (TikZ/math coords, y-up — screen space flips y via `toScreen`):
   - `cp1 = src + 1.0 * (cos(45°), sin(45°))`
   - `cp2 = target + 1.0 * (cos(135°), sin(135°))`
4. **Endpoints**: for `style=none` nodes, `_tail`/`_head` are the node **center** (`edge.cpp:189-201`); styled nodes inset `0.2` along the out/in angle. The current `bezier.ts` already mirrors this.
5. **Visual Stroke**: solid black (`#000000` via default `draw`), pen width `strokeThickness() * 2.0` = **`2.0` scene px = `0.05` TikZ units** (`style.cpp:90-93, 168-192`) — *not* `2.5px`. Web ribbon half-width = `0.025`. Edges use the style's `draw` color regardless of app theme — on the always-white paper, default edges must render black (the current `EdgeRenderer` emits `#f1f5f9` in dark theme — must be overridden for the paper).
6. **TikZ Emission** (`edge.cpp:255-297`, `graph.cpp:304-333`): the edge's `updateData()` normalizes properties to **`[style=<name>?, in=135, out=45, loop]`** — `in`/`out` re-appended in that order, `loop` atom last, and **`style` is omitted entirely when `none`** (`setStyleName` unsets it). The emitted line is:
   ```
   \draw [in=135, out=45, loop] (u) to ();
   ```
   Note the empty `()` target — the desktop emits `to ();` for self-loops, and the web emitter/parser already round-trip this form. ⚠️ The current `EdgeTool` writes `[loop, style=none, in, out]` — wrong order *and* a spurious `style=none`; emit-time normalization equivalent to `updateData()` is required.

---

## 3. Implementation Steps & Acceptance Criteria (Amelia)

| Step | Task | Deliverable | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **10.1** | Grid Shader Calibration | `src/canvas/shaders/gridShader.ts` | Exact C++ RGB values (`#FFFFFF` bg, **`#DCDCF0`** axis, `#F0F0FA` major, `#FAFAFF` minor); minor grid gated at `pixelsPerUnit > 8`; in-line mix alpha `1.0` |
| **10.2** | Stage Theme Integration | `src/canvas/Stage.ts` | Canvas "paper" is always white, decoupled from the chrome theme atom (Contract A §5); initial camera ≈ `100 px/unit` to match desktop `_scale = 2.5` |
| **10.3** | Junction Node Rendering | `src/canvas/renderers/NodeRenderer.ts` | `style=none` nodes render center dot (`#B4B4C8`) and dashed boundary ring (`#B4B4DC`, effective dash `0.05` / gap `0.10` units) **as geometry**, not `linewidth` |
| **10.4** | Teardrop Self-Loop Geometry | `src/canvas/bezier.ts` & `src/canvas/renderers/EdgeRenderer.ts` | `src == target` computes `in=135`, `out=45`, `weight=1.0` with **`0.05`-unit (2.0 scene-px) black ribbon** |
| **10.5** | Self-Loop Interaction | `src/canvas/tools/EdgeTool.ts` | Desktop-parity: press on a node + release on the same node creates the self-loop (single click). Keep the existing armed two-click path only if it doesn't conflict |
| **10.6** | Emission Normalization | `src/core/parser/emitter.ts` (or `EdgeTool` write path) | `updateData()` parity: self-loop emits `[style=<non-none>?, in=135, out=45, loop]`, `style=none` omitted, `to ()` target |
| **10.7** | Test Suite Verification | `tests/unit/canvas/desktopVisuals.test.ts` & `e2e/sprint-10/canvas-desktop-parity.spec.ts` | 100% green tests verifying grid colors, junction rings, and self-loop topology |

### Detailed Acceptance Criteria:
- **AC-10-01**: `GRID_THEMES.desktop` (used for the paper regardless of UI theme) matches exact C++ hex codes: bg `#FFFFFF`, minor `#FAFAFF`, major `#F0F0FA`, axis **`#DCDCF0`**.
- **AC-10-02**: Grid shader renders axes at `x=0` and `y=0` with clear distinction from grid lines, cosmetic (constant screen-width) lines responsive to zoom, minor grid hidden when `pixelsPerUnit ≤ 8`.
- **AC-10-03**: `NodeRenderer` produces visible dashed `#B4B4DC` rings (dash `0.05` / gap `0.10` units, stroke `0.05` units) with `#B4B4C8` center dots for junction nodes on the white canvas.
- **AC-10-04**: Press-release on a node with the Edge tool creates a self-loop with `in=135`, `out=45`, `weight=1.0` (desktop: single click; if the web keeps the armed two-click model, the second click on the same node must produce the same edge — choose one and test it).
- **AC-10-05**: Emitted TikZ for a self-loop edge is `\draw [in=135, out=45, loop] (u) to ();` — ordered properties, `loop` last, no `style=none`, empty `()` target. (Assert on emitted structure/normalized AST, not raw substring order, if whitespace varies.)
- **AC-10-06**: `computeEdgeControls` treats self-loops by **node identity** (`sourceId === targetId`), not coordinate coincidence — two distinct nodes at the same position must not render as a loop.
- **AC-10-07**: Bend precedence matches `edge.cpp:217-253`: `bend left/right` takes priority over `in`/`out` when both are present in edge data.
- **AC-10-08**: Vitest suite passes >= 6 tests validating math and shaders; Playwright E2E suite passes validating canvas visual elements; no regression in the 59 prior tests (Contract B).

---

## 4. Verification Sources (C++ → AC Traceability)

| AC / Claim | C++ Source of Truth | Verified Value |
| :--- | :--- | :--- |
| AC-10-01 grid colors | `src/gui/tikzview.cpp:66-75` | minor `QColor(250,250,255)` `#FAFAFF`; major `QColor(240,240,250)` `#F0F0FA`; axes `QColor(220,220,240)` **`#DCDCF0`** |
| Grid intervals | `src/tikzit.h:78-82` | `GRID_SEP=10`, `GRID_N=4`, `GLOBAL_SCALEF=40` → minor 10 px (`0.25 u`), major 40 px (`1.0 u`) |
| Minor-grid threshold | `tikzview.cpp:79` | visible when `_scale > 0.2` → `pixelsPerUnit > 8` |
| Initial zoom | `tikzview.cpp:34-35` | `_scale = 2.5` → 100 px/unit |
| Junction dot/ring | `src/gui/nodeitem.cpp:72-85, 145-175` | dot `QColor(180,180,200)` r=1 px; ring `QColor(180,180,220)` `widthF 2.0`, `dashPattern [1,2]` (× pen width → dash 2.0/gap 4.0 px), radius `GLOBAL_SCALEF*0.2` |
| Selection halo | `nodeitem.cpp:133-140` | `QColor(150,200,255,100)` ≈ alpha 0.39; stroker width 4 → ≈2 px expansion |
| Self-loop defaults | `src/data/edge.cpp:34-46` | `s==t` → `_basicBendMode=false`, `in=135`, `out=45`, `weight=1.0` |
| Control points | `edge.cpp:163-215` | `_cpDist=_weight` for self-loops; `tail`/`head` = node center when `style=none` |
| Edge stroke | `src/data/style.cpp:90-93, 168-192` | pen width `strokeThickness()*2.0` = **2.0 scene px** = 0.05 units |
| Creation gesture | `src/gui/tikzscene.cpp:589-599, 855-872` | press on node sets start=end; release creates edge → single click = self-loop |
| Double-click | `tikzscene.cpp:1070-1104` | node → label editor; edge → `ChangeEdgeModeCommand` (bend-mode toggle) — not loop creation |
| Emission | `edge.cpp:255-297` (`updateData`), `src/data/graph.cpp:304-333` | `[style?, in=135, out=45, loop]`, `style=none` omitted, `(u) to ();` |
| Web deviations found | `src/canvas/tools/EdgeTool.ts:105-112`, `src/canvas/renderers/EdgeRenderer.ts:100-134`, `src/canvas/renderers/NodeRenderer.ts:117-125`, `src/canvas/bezier.ts:71-73,128` | `[loop,style=none,in,out]` order; `style=none` emitted; dark-theme `#f1f5f9` edges; `halfWidth 0.015`; dash `0.04/0.06`; self-loop by coordinate equality; `in/out` precedence over `bend` |

## 5. Definition of Done (DoD) Checklist

- [ ] Canvas background calibrated to pure white (`#FFFFFF`) with C++ exact axes (**`#DCDCF0`**) and grid lines (`#F0F0FA` / `#FAFAFF`).
- [ ] Junction nodes (`style=none`) render with center dot (`#B4B4C8`) and dashed boundary ring (`#B4B4DC`, effective dash `0.05` / gap `0.10` units) built from geometry (zoom-correct, not a 1-px hairline).
- [ ] Edge tool creates self-loops with upward teardrop geometry (`in=135°`, `out=45°`, `weight=1.0`) via the desktop-parity press-release (single-click) gesture.
- [ ] Edges render as crisp solid black ribbons (`#000000`, `0.05` TikZ units = `2.0` scene px) on the white paper, regardless of chrome theme.
- [ ] AST and emitter round-trip self-loop properties losslessly in canonical order `[style?, in=135, out=45, loop]` with `to ()` target and `style=none` omitted.
- [ ] Self-loop detection is by node identity; `bend` precedence over `in`/`out` matches `edge.cpp`.
- [ ] Unit tests in `tests/unit/canvas/desktopVisuals.test.ts` pass 100%.
- [ ] Playwright E2E tests in `e2e/sprint-10/canvas-desktop-parity.spec.ts` pass 100%; all Contract-B selectors intact.
- [ ] TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.
