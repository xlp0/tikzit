# TikZiT Web Sprints Archive
**Root Directory:** `docs/sprints`

> *Comprehensive engineering lifecycle documentation for the TikZiT Web Application.*

---

## 1. Directory Structure

```
docs/sprints/
├── README.md                              # This Master Index
├── _active/                               # Current active sprint working drafts
│   ├── README.md
│   ├── SPRINT-00-MASTER-ORCHESTRATION.md
│   ├── SPRINT-00-ZX-DEMO-SVG-CORPUS.md
│   └── SPRINT-01 ... SPRINT-08
├── 00-master-orchestration/               # Master Plan & Architecture
├── 00-zx-demo-svg-corpus/                 # [COMPLETED] 12 Canonical ZX SVGs & Gallery
├── 01-core-domain-and-ast-parser/         # TypeScript AST Parser & Domain Model
├── 02-astro-shell-and-cordis-runtime/     # Astro 4 Shell & Cordis Service Container
├── 03-threejs-webgl-canvas-engine/        # Three.js Canvas & Infinite Grid Shader
├── 04-interactive-gestures-and-animejs/   # Interactive Tools & Anime.js Springs
├── 05-style-palette-and-inspector/        # TikZ Stylesheet Engine & Inspector
├── 06-preview-pipeline-and-exporters/     # WebAssembly TeX Preview & Exporters
├── 07-state-sync-and-mcard-storage/       # Bidirectional Sync & MCard Persistence
└── 08-verification-and-deployment/        # Playwright E2E, Benchmarks & PWA Deploy
```

---

## 2. Sprint Status Matrix

| Sprint | Directory | Focus & Tech Stack | Status |
| :---: | :--- | :--- | :---: |
| **00** | [`00-master-orchestration`](./00-master-orchestration/) | Master Technical Architecture & Cordis Mesh | 🟢 **Active Blueprint** |
| **00-A**| [`00-zx-demo-svg-corpus`](./00-zx-demo-svg-corpus/) | Canonical ZX-Diagram Reference Corpus & Standalone SVG Suite | ✅ **Completed** |
| **01** | [`01-core-domain-and-ast-parser`](./01-core-domain-and-ast-parser/) | TypeScript TikZ AST Parser, Grammar Lexer & CLM Kernel Domain | 🟡 **Ready to Execute** |
| **02** | [`02-astro-shell-and-cordis-runtime`](./02-astro-shell-and-cordis-runtime/) | Astro 4 Shell, Dockable Layout & Cordis Service Container | ⚪ *Planned* |
| **03** | [`03-threejs-webgl-canvas-engine`](./03-threejs-webgl-canvas-engine/) | Three.js Infinite Canvas, Procedural Grid & Bezier Spline Shaders | ⚪ *Planned* |
| **04** | [`04-interactive-gestures-and-animejs`](./04-interactive-gestures-and-animejs/) | Tool State Machines (Select, Node, Edge, Crop) & Anime.js Springs | ⚪ *Planned* |
| **05** | [`05-style-palette-and-inspector`](./05-style-palette-and-inspector/) | TikZ Stylesheet Engine (`\tikzstyle`), Category Palette & Inspector | ⚪ *Planned* |
| **06** | [`06-preview-pipeline-and-exporters`](./06-preview-pipeline-and-exporters/) | Live TeX Preview Window, Standalone PDF/SVG/TikZ Exporters | ⚪ *Planned* |
| **07** | [`07-state-sync-and-mcard-storage`](./07-state-sync-and-mcard-storage/) | Bidirectional Code/Canvas Sync, Undo/Redo & MCard Local Storage | ⚪ *Planned* |
| **08** | [`08-verification-and-deployment`](./08-verification-and-deployment/) | Playwright E2E Suite, 60 FPS Benchmarks & PWA Offline Deploy | ⚪ *Planned* |

---

## 3. Graduation Workflow

When work on a sprint in `_active/` is finished and verified against its definition of done:
1. Copy the final sprint document into its corresponding dedicated folder `docs/sprints/<sprint-id>/`.
2. Update the folder's `README.md` with links to produced source code, test reports, and benchmarks.
3. Mark status as **Completed (Graduated)** in both `docs/sprints/README.md` and `docs/sprints/_active/README.md`.
