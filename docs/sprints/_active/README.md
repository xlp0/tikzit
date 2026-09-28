# Active Sprint Directory (`docs/sprints/_active`)

This directory tracks the active execution of the **Desktop Parity & Media Sharing Series** (Sprints 09–12), designed in collaboration with **Winston (System Architect)** and **Amelia (Senior Software Engineer)**.

---

## Strategic Objective: Desktop C++ Visual & Asset Parity
The core mission of this sprint series is to achieve exact visual, aesthetic, and media asset parity between the TikZiT Web spatial workbench and the original macOS desktop C++ application (`tikzit.app`):
1. **Media Asset Sharing**: Reusing the original SVG and raster assets from the C++ codebase (`images/` and `tikzit.qrc`) directly in the web app.
2. **macOS Chrome & Top Tool Palette**: Introducing the native macOS window frame (traffic light controls, document title `untitled* - TikZiT`) and the 32x32px square tool palette with the signature bright green active selection border.
3. **Canvas Aesthetic Parity**: Harmonizing the canvas background to pure white (`#FFFFFF`) with exact C++ coordinate axes (`#DCDCFA`) and major/minor grid lines (`#F0F0FA` / `#FAFAFF`).
4. **Node & Edge Rendering Parity**: Rendering `style=none` junction nodes with the exact C++ dashed lavender ring (`#B4B4DC`, dash `[1, 2]`) and center dot (`#B4B4C8`), and implementing the signature upward teardrop self-loop (`in=135°`, `out=45°`, `weight=1.0`).
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
