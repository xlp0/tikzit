# TikZiT Web Sprints Archive
**Root Directory:** `docs/sprints`

> *Comprehensive engineering lifecycle documentation for the TikZiT Web Application.*

---

## 1. Directory Structure

Graduated sprints are organized into **category bins** — one directory per subsystem area. Each bin holds one or more numbered sprint folders. `_active/` holds only sprint working drafts that have not yet graduated.

```
docs/sprints/
├── README.md                                     # This Master Index
├── _active/                                      # Current active sprint working drafts
├── orchestration/                                # Master plans & architecture blueprints
│   ├── 00-master-orchestration/                  # Master Plan & Architecture
│   └── 16-19-mcard-diagram-lifecycle-history-and-export/ # Sprints 16–19 Proposal & Architecture
├── corpus/                                       # Reference corpora & sovereign storage
│   ├── 00-zx-demo-svg-corpus/                    # [COMPLETED] 12 Canonical ZX SVGs & Gallery
│   ├── 15-mcard-backed-corpus-explorer-and-sovereign-export/  # MCard Explorer & .db Export
│   ├── 16-diagram-creation-and-mcard-lifecycle/  # Diagram Creation & Unified MCard Lifecycle
│   ├── 16b-diagram-library-and-session-durability/ # Diagram Library Management & Session Durability
│   ├── 17-mcard-version-history-and-restore/     # MCard Version History & Restore
│   └── 19-complete-mcard-collection-export/      # Complete MCard Collection Export
├── parser/                                       # TikZ grammar & domain model
│   └── 01-core-domain-and-ast-parser/            # TypeScript AST Parser & Domain Model
├── shell/                                        # Application shell & service runtime
│   ├── 02-astro-shell-and-cordis-runtime/        # Astro 7 Shell, Dockview, Cordis & CLM State
│   └── 17b-prominent-draft-save-affordance/      # Prominent Draft-to-MCard Save Affordance
├── canvas/                                       # Canvas rendering engine & visual fidelity
│   ├── 03-threejs-webgl-canvas-engine/           # Three.js Canvas & Infinite Grid Shader
│   └── 10-canvas-visual-parity-and-self-loops/   # Canvas Stage Visual Parity & Teardrop Loops
├── interactions/                                 # Tools, gestures & editing interactions
│   ├── 04-interactive-gestures-and-animejs/      # Interactive Tools & Anime.js Springs
│   └── 05b-editable-canvas-interaction/          # Canvas Tool Activation & Editing Fixes
├── styles/                                       # Stylesheet engine, palette & inspector
│   ├── 05-style-palette-and-inspector/           # TikZ Stylesheet Engine & Inspector
│   └── 11-desktop-style-palette-and-action-bar/  # Desktop Style Palette & Action Bar
├── preview/                                      # TeX preview pipeline & exporters
│   ├── 06-preview-pipeline-and-exporters/        # WebAssembly TeX Preview & Exporters
│   ├── 14-live-tex-preview-curvature-synchronization/  # Preview Curvature & Geometry Sync
│   └── 18-individual-diagram-export/             # Multi-Format Individual Diagram Export
├── sync/                                         # State synchronization & persistence
│   └── 07-state-sync-and-mcard-storage/          # Bidirectional Sync & MCard Persistence
├── verification/                                 # Test suites, benchmarks & deployment
│   ├── 08-verification-and-deployment/           # Playwright E2E, Benchmarks & PWA Deploy
│   └── 12-visual-regression-and-final-parity/    # Visual Regression Testing & Master Sign-Off
└── desktop-parity/                               # Desktop C++ chrome & asset parity
    ├── 09-desktop-assets-and-chrome-harmonization/  # Desktop Assets, macOS Chrome & Tool Border
    └── 13-canvas-centric-toolbar-and-chrome-refinement/  # Canvas-Centric Toolbar & Chrome Refinement
```

---

## 2. Sprint Status Matrix

| Sprint | Bin | Directory | Focus & Tech Stack | Status |
| :---: | :--- | :--- | :--- | :---: |
| **00** | orchestration | [`orchestration/00-master-orchestration`](./orchestration/00-master-orchestration/) | Master Technical Architecture, Nanostores Flux & Cordis Mesh | 🟢 **Active Blueprint** |
| **00-A** | corpus | [`corpus/00-zx-demo-svg-corpus`](./corpus/00-zx-demo-svg-corpus/) | Canonical ZX-Diagram Reference Corpus & Standalone SVG Suite | ✅ **Completed** |
| **01** | parser | [`parser/01-core-domain-and-ast-parser`](./parser/01-core-domain-and-ast-parser/) | TypeScript TikZ AST Parser, Grammar Lexer & CLM Kernel Domain | ✅ **Completed** |
| **02** | shell | [`shell/02-astro-shell-and-cordis-runtime`](./shell/02-astro-shell-and-cordis-runtime/) | Astro 7 Shell, Dockable Layout, Cordis, Nanostores Flux & CLM State | ✅ **Completed** |
| **03** | canvas | [`canvas/03-threejs-webgl-canvas-engine`](./canvas/03-threejs-webgl-canvas-engine/) | Three.js Infinite Canvas, Procedural Grid & Bezier Spline Shaders | ✅ **Completed** |
| **04** | interactions | [`interactions/04-interactive-gestures-and-animejs`](./interactions/04-interactive-gestures-and-animejs/) | Tool State Machines (Select, Node, Edge, Crop) & Anime.js Springs | ✅ **Completed** |
| **05** | styles | [`styles/05-style-palette-and-inspector`](./styles/05-style-palette-and-inspector/) | TikZ Stylesheet Engine (`\tikzstyle`), Category Palette & Inspector | ✅ **Completed** |
| **05B** | interactions | [`interactions/05b-editable-canvas-interaction`](./interactions/05b-editable-canvas-interaction/) | Unified Context, Visible Junctions, Vertex/Edge Creation & Source Sync | ✅ **Completed** |
| **06** | preview | [`preview/06-preview-pipeline-and-exporters`](./preview/06-preview-pipeline-and-exporters/) | Live TeX Preview Window, Standalone PDF/SVG/TikZ Exporters | ✅ **Completed** |
| **07** | sync | [`sync/07-state-sync-and-mcard-storage`](./sync/07-state-sync-and-mcard-storage/) | Bidirectional Code/Canvas Sync, Undo/Redo & MCard Local Storage | ✅ **Completed** |
| **08** | verification | [`verification/08-verification-and-deployment`](./verification/08-verification-and-deployment/) | Playwright E2E Suite, 60 FPS Benchmarks & PWA Offline Deploy | ✅ **Completed** |
| **09** | desktop-parity | [`desktop-parity/09-desktop-assets-and-chrome-harmonization`](./desktop-parity/09-desktop-assets-and-chrome-harmonization/) | Desktop Assets, macOS Window Chrome & Green Active Tool Border | ✅ **Completed** |
| **10** | canvas | [`canvas/10-canvas-visual-parity-and-self-loops`](./canvas/10-canvas-visual-parity-and-self-loops/) | White Paper Canvas, Subtle Blue Grid/Axes, Dashed Junctions & Teardrop Loops | ✅ **Completed** |
| **11** | styles | [`styles/11-desktop-style-palette-and-action-bar`](./styles/11-desktop-style-palette-and-action-bar/) | 4-Icon Action Bar, Category Combobox & Split 48x48 Swatch Grids | ✅ **Completed** |
| **12** | verification | [`verification/12-visual-regression-and-final-parity`](./verification/12-visual-regression-and-final-parity/) | Reference Screenshot Golden Tests, Cross-Browser Matrix & Master Sign-Off | ✅ **Completed** |
| **13** | desktop-parity | [`desktop-parity/13-canvas-centric-toolbar-and-chrome-refinement`](./desktop-parity/13-canvas-centric-toolbar-and-chrome-refinement/) | Canvas-Centric Tool Palette & Window Chrome Refinement | ✅ **Completed** |
| **14** | preview | [`preview/14-live-tex-preview-curvature-synchronization`](./preview/14-live-tex-preview-curvature-synchronization/) | Live TeX Preview Curvature & Edge Geometry Synchronization | ✅ **Completed** |
| **15** | corpus | [`corpus/15-mcard-backed-corpus-explorer-and-sovereign-export`](./corpus/15-mcard-backed-corpus-explorer-and-sovereign-export/) | MCard Corpus Explorer, IndexedDB/SqlJs Persistence & Sovereign `.db` Export | ✅ **Completed** |
| **16** | corpus | [`corpus/16-diagram-creation-and-mcard-lifecycle`](./corpus/16-diagram-creation-and-mcard-lifecycle/) | Diagram Creation (`zx:diagrams:`), Carry-Over Hardening H1–H8, Snapshot v2 & Explicit MCard Save | ✅ **Completed** |
| **16B** | corpus | [`corpus/16b-diagram-library-and-session-durability`](./corpus/16b-diagram-library-and-session-durability/) | Library Actions (Rename, Duplicate, Archive), Crash/Reload Recovery & Legacy Migration | ✅ **Completed** |
| **17** | corpus | [`corpus/17-mcard-version-history-and-restore`](./corpus/17-mcard-version-history-and-restore/) | Lineage Version History Popover, Preview/Compare Modes & Non-Rewinding Restore | ✅ **Completed** |
| **17B** | shell | [`shell/17b-prominent-draft-save-affordance`](./shell/17b-prominent-draft-save-affordance/) | Prominent Draft-to-MCard Save CTA, In-Canvas Callout & Mode Transitions | ✅ **Completed** |
| **18** | preview | [`preview/18-individual-diagram-export`](./preview/18-individual-diagram-export/) | Individual Diagram Export (TikZ, TeX, SVG, PNG 1x/2x/4x, PDF) & Style Presets | ✅ **Completed** |
| **19** | corpus | [`corpus/19-complete-mcard-collection-export`](./corpus/19-complete-mcard-collection-export/) | Verified MCard Collection `.db` Export, Complete Lineage Traversal & Pinned Round-Trip | ✅ **Completed** |
| **16–19** | orchestration | [`orchestration/16-19-mcard-diagram-lifecycle-history-and-export`](./orchestration/16-19-mcard-diagram-lifecycle-history-and-export/) | Architecture Proposal: First-Class MCard Diagrams, History & Export | 🟢 **Graduated Blueprint** |
| **20–24** | orchestration | [`_active/PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION`](./_active/PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md) | Architecture Proposal: Algebraic Modularity, CLM & Build Unification | 📋 **In Planning** |
| **20** | orchestration | [`_active/SPRINT-20-DUAL-SYSTEM-MAKEFILE-AND-SHARED-PROTOCOL`](./_active/SPRINT-20-DUAL-SYSTEM-MAKEFILE-AND-SHARED-PROTOCOL.md) | Authored Root Makefile, Browser Independence & Shared TS/C++ Protocol | 📋 **In Planning** |
| **21** | sync | [`_active/SPRINT-21-PROCESS-ALGEBRA-AND-PETRI-NET-LIFECYCLE`](./_active/SPRINT-21-PROCESS-ALGEBRA-AND-PETRI-NET-LIFECYCLE.md) | Process Algebra Runtime Decomposition & Petri Net Document Lifecycle | 📋 **In Planning** |
| **22** | shell | [`_active/SPRINT-22-GOD-COMPONENT-DECOMPOSITION-VIA-BALDWIN-SPLITTING`](./_active/SPRINT-22-GOD-COMPONENT-DECOMPOSITION-VIA-BALDWIN-SPLITTING.md) | UI God-Component Decomposition, Baldwin Splitting & Generated Selector Audit | 📋 **In Planning** |
| **23** | corpus | [`_active/SPRINT-23-CLM-TRI-DATABASE-AND-SERVICE-DECOUPLING`](./_active/SPRINT-23-CLM-TRI-DATABASE-AND-SERVICE-DECOUPLING.md) | CLM TriDatabase Service Decoupling, Headless Lineage & Legacy Store Boundary | 📋 **In Planning** |
| **24** | parser | [`_active/SPRINT-24-PARSER-COMBINATOR-AND-PROTOCOL-CONFORMANCE`](./_active/SPRINT-24-PARSER-COMBINATOR-AND-PROTOCOL-CONFORMANCE.md) | Parser Combinator Decomposition & TS/C++ Cross-Engine Conformance | 📋 **In Planning** |

---

## 3. Graduation Workflow

When work on a sprint in `_active/` is finished and verified against its definition of done:
1. Classify the sprint into the category bin matching its primary subsystem (`orchestration`, `corpus`, `parser`, `shell`, `canvas`, `interactions`, `styles`, `preview`, `sync`, `verification`, `desktop-parity`). If no existing bin fits, create a new inclusive category directory rather than a bare `<sprint-id>/` folder.
2. Move the final sprint document into its folder inside the bin: `docs/sprints/<bin>/<NN-slug>/`, and write that folder's `README.md` with links to produced source code, test reports, and benchmarks.
3. Mark status as **Completed (Graduated)** in both `docs/sprints/README.md` and `docs/sprints/_active/README.md`, and remove the graduated draft from `_active/`.
