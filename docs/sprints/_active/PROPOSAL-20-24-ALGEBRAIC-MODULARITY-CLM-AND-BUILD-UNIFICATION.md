# Proposal: Sprints 20–24 — Algebraic Modularity, CLM Architecture & Dual-System Unification

**Status:** Proposed; Active Architecture Series  
**Target:** TikZiT Web Spatial Workbench & Native Desktop C++ Subsystem  
**Foundations:**
- **Cubical Logic Model (CLM)**: Three dimensions (Abstract Specification / Logic $Q$, Concrete Implementation / Type Theory $K$, Balanced Expectations / Category Theory $V$) and three MVP Card primitives (MCard Moore Machine, PCard Mealy Machine, VCard Kan Filler).
- **Baldwin Modularity Operators**: Splitting ($\times$), Substituting ($\simeq \implies =$), Augmenting ($+$), Excluding ($-$), Inverting ($\dashv$), and Porting (Change-of-Base $\text{Lan}$).
- **Process Algebra (CSP / CCS)** & **Petri Nets**: Algebraic concurrency, message channels, place-transition invariants, token conservation, and reachability.
- **Dual-System Architecture**: Native browser execution for JavaScript/TypeScript (zero C++ dependencies) with a unified root `Makefile` and shared TikZ AST protocol with native C++ Qt6.

---

## 1. Problem Statement & Motivation

Following the completion of Sprints 00–19, TikZiT has achieved rich functional maturity: a Web spatial workbench with Three.js canvas, live TeX preview, bidirectional sync, MCard-backed content-addressed storage, and individual/collection export.

However, rapid functional expansion has resulted in architectural tension documented in [`docs/PROJECT-SUMMARY.md`](../../PROJECT-SUMMARY.md):
1. **God Files & Monolithic Modules (> 450 LOC)**:
   - `src/services/createWorkbenchRuntime.ts` (**1,100 lines**): Monolithic runtime service orchestrator mixing Cordis service initialization, Nanostores state management, tab routing, document lifecycle, persistence coordination, and command dispatch.
   - `src/components/workbench/panels/VersionPopover.tsx` (**739 lines**): God UI component coupling timeline visualization, diff and stat delta computation, visual compare orchestration, and head re-registration.
   - `src/services/clm/corpusExplorerService.ts` (**652 lines**): Amalgamated service coupling handle indexing, title cache recovery, commit gate checking, search filtering, and document lifecycle.
   - `src/components/workbench/panels/PreviewPanel.tsx` (**605 lines**): Combines SVG viewport pan/zoom, TeX compilation simulation, TikZ re-rendering, and export buttons.
   - `src/components/workbench/CorpusExplorerDrawer.tsx` (**572 lines**): Dense UI mixing inline renaming, duplicate dialogs, archive filtering, search inputs, and row context menus.
   - `src/core/parser/parser.ts` (**494 lines**): Monolithic recursive-descent parser handling nodes, edges, properties, styles, and paths in a single continuous file.
   - `src/services/clm/corpusExportService.ts` (**484 lines**): Couples graph traversal, lineage closure resolution, SQLite file generation, hash verification, and browser File System Access API handling.
   - `src/components/workbench/WorkbenchCommandBar.tsx` (**472 lines**): Monolithic bar coordinating document title editing, dirty state observation, tab close warnings, save commands, layout resets, and theme selection.
   - Native C++ Qt files: `src/gui/tikzscene.cpp` (**1,418 lines**), `src/gui/styleeditor.cpp` (**881 lines**), `src/gui/undocommands.cpp` (**729 lines**).

2. **Dual-System Disconnect & Missing Unified Build**:
   - Web development relies on `npm run dev` / `astro build`, while desktop development relies on `qmake` / `cmake`.
   - The root directory contains an auto-generated 3,553-line `Makefile` from qmake rather than an authored developer orchestration Makefile.
   - There is no single command (`make build`, `make test`, `make verify`) that can build and test both native C++ Qt6 and Web TypeScript pipelines under a shared quality gate.

3. **Implicit State Spaghetti vs Algebraic Concurrency**:
   - Multi-document state, dirty buffer tracking, and persistence states currently rely on ad-hoc boolean flags (`isSaving`, `isDirty`, `isDraft`, `stale`) and mutable object assignments rather than formal communicating processes or Petri net invariants.

---

## 2. Theoretical Framework: CLM & Baldwin Modularity Operators

### 2.1 The Cubical Logic Model (CLM) Mapping

Under the Curry-Howard-Lambek (CHL) isomorphism, CLM structures the TikZiT system across three orthogonal dimensions:

```mermaid
graph TD
    subgraph CLM_Three_Dimensions["Cubical Logic Model (CHL Isomorphism)"]
        direction LR
        Q["Dimension 1: Abstract Spec (Logic / Query Q)<br/>• TikZ Formal Grammar & AST Types<br/>• Petri Net Places & State Signatures<br/>• Session Type Protocols"]
        K["Dimension 2: Concrete Implementation (Type Theory / Key K)<br/>• TypeScript Browser Runtime<br/>• Native C++ Qt Engine<br/>• Three.js Canvas & Sql.js SQLite"]
        V["Dimension 3: Balanced Expectations (Category Theory / Value V)<br/>• 12 Canonical ZX-Corpus Verification<br/>• Playwright Golden Visual Tests<br/>• Cryptographic Hash Receipts"]
        
        Q -->|Attention / Query| K
        K -->|Verification / Context| V
    end
```

The system operates strictly on three **MVP Card Primitives**:
1. **MCard ($\Sigma$-Type / Moore Machine)**: Static, persistent, content-addressed state. Represents "what is" ($O = \lambda(s)$). In TikZiT, every committed diagram and metadata card is an immutable MCard identified by $\text{BLAKE3}/\text{SHA-256}(c)$.
2. **PCard (Mealy Machine)**: Dynamic computational operator. Represents computational transformation ($O = \delta(s, i)$). In TikZiT, the Parser, SvgGenerator, AST Transformer, and Exporters are pure PCards.
3. **VCard (Kan Filler / Identity Type)**: Verification witness certifying invariants. In TikZiT, VCards are execution receipts, round-trip test proofs, and cryptographic manifest digests.

### 2.2 The Six Baldwin Modularity Operators

From Carliss Baldwin and Kim Clark's *Design Rules*, modularity in TikZiT is executed through six algebraic operators:

| Operator | Symbol | Algebraic Role | Application to TikZiT Refactoring |
| :--- | :---: | :--- | :--- |
| **Splitting** | $\times$ | Multiplication / Product | Dissecting God files (`createWorkbenchRuntime`, `VersionPopover`, `corpusExplorerService`) into decoupled autonomous modules with explicit design rules. |
| **Substituting** | $\simeq \implies =$ | Univalent Swap | Swapping headless mock storage with IndexedDB/SqlJs; swapping canvas WebGL with pure SVG without changing consumers. |
| **Augmenting** | $+$ | Coproduct / Sum Type | Adding new export formats (PNG 4x, standalone TeX, PDF) or new tool modes without modifying the core AST kernel. |
| **Excluding** | $-$ | Pruning / Deletion | Completely eliminating legacy `DocumentStore` shadow state, dead traffic light UI, and redundant storage paths. |
| **Inverting** | $\dashv$ | Platform Adjunction / Curry | Inverting low-level imperative event wiring into high-level reactive Nanostores/Cordis streams and Petri net controllers. |
| **Porting** | $\text{Lan}$ | Change-of-Base | Ensuring JavaScript/TypeScript runs 100% natively in modern browsers with zero C++ dependencies, while preserving shared protocol interoperability. |

---

## 3. Algebraic Concurrency: Process Algebra & Petri Nets

### 3.1 Document Lifecycle as a Place/Transition (PT) Petri Net

Rather than mutable boolean flags scattered across components, document state is formalized as a marked Petri Net:

```mermaid
stateDiagram-v2
    [*] --> Place_Draft: Create (zx:diagrams:UUID)
    Place_Draft --> Place_DirtyBuffer: Buffer Edit (User Input)
    Place_DirtyBuffer --> Place_ASTParsed: Parse AST (Debounced)
    Place_ASTParsed --> Place_Gated: Gate Check (Valid TikZ)
    Place_Gated --> Place_HeadCommitted: Commit Card (MCard Minted)
    Place_HeadCommitted --> Place_PersistedDB: Flush Snapshot (IndexedDB)
    Place_PersistedDB --> [*]
    
    Place_DirtyBuffer --> Place_ASTInvalid: Parse Error
    Place_ASTInvalid --> Place_DirtyBuffer: Correct Error
```

**Petri Net Invariants:**
- **Token Conservation**: Exactly one state token per active document session; no document can simultaneously be committed and unstaged without a distinct token marking.
- **Liveness & Non-Blocking**: Transition to `Place_PersistedDB` occurs asynchronously without stalling UI thread interaction in `Place_Draft` or `Place_DirtyBuffer`.
- **Stale Writer Exclusion**: If snapshot sequence does not match generation token, transition fires to `Place_StaleWriter`, halting further commits until reload.

### 3.2 Process Algebra (CSP / CCS) Architecture

We model the spatial workbench as communicating concurrent processes:
$$\text{TikzitWorkbench} \triangleq \text{EditorProcess} \parallel \text{CanvasProcess} \parallel \text{SyncChannel} \parallel \text{StorageSupervisor} \parallel \text{PreviewActor}$$

- **Communication via Typed Channels**: Processes communicate solely via typed async channels (`SyncChannel`, `CommitChannel`, `ExportChannel`), eliminating direct method calls and mutable object references.
- **Hiding & Encapsulation**: Internal transition $\tau$ events (e.g. temporary Three.js mesh re-allocation, buffer debouncing) remain private to the process and cannot pollute global application state.

---

## 4. Dual-Platform Architecture & Root Makefile Strategy

### 4.1 Strict Decoupling: Zero C++ Dependency in Web Runtime

The JavaScript/TypeScript application must run **natively in standard browser environments** without requiring:
- Native C++ binaries or shared libraries (`.dylib`, `.so`, `.dll`).
- Node-gyp or native Node.js addons.
- Local Qt installations or X11/macOS Cocoa window servers.

### 4.2 Shared Dual-System Protocol

Although runtime execution is decoupled, both systems adhere to a **single shared formal protocol**:

```mermaid
graph LR
    subgraph Shared_Protocol["Shared TikZiT Protocol & Interchange Contract"]
        direction TB
        P1["1. TikZ/PGF Language Subset (Grammar & AST Schema)"]
        P2["2. Property Graph Model (Vertices, Edges, Styles, Paths, Teardrop Loops)"]
        P3["3. Coordinate System Transformation (TikZ (x,y) <-> Canvas Space)"]
        P4["4. MCard Sovereign SQLite 3 Database Schema (Pillars & Lineage)"]
    end
    
    Native_Cpp["Native C++ Qt6 Desktop<br/>(CMake / Ninja / Clang++)"] <-->|Shared TikZ / SQLite / Corpus| Shared_Protocol
    Web_TS["Browser TypeScript / React 19<br/>(Astro / Vite / Three.js / Sql.js)"] <-->|Shared TikZ / SQLite / Corpus| Shared_Protocol
```

### 4.3 Unified Developer Makefile

A clean, top-level `Makefile` will be authored to provide a standardized interface for developers and CI/CD:

```makefile
# High-Level Makefile Target Topology
.PHONY: all build build-web build-cpp test test-web test-cpp test-e2e verify-corpus clean lint

all: build test

build: build-web build-cpp

build-web:
	npm run prebuild
	npm run build

build-cpp:
	cmake -B build -S . -GNinja -DCMAKE_BUILD_TYPE=Release
	cmake --build build

test: test-web test-cpp

test-web:
	npm run test

test-cpp:
	./build/UnitTests.app/Contents/MacOS/UnitTests || ./build/UnitTests

test-e2e:
	npm run test:e2e

verify-corpus:
	python3 docs/examples/build_examples.py --verify-only
```

---

## 5. Active Sprint Roadmap (Sprints 20–24)

| Sprint | Title | Primary Baldwin Operator | Primary Subsystem | Target God Files | Core Deliverable |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **20** | **Dual-System Makefile & Shared Protocol** | Porting & Substituting | `orchestration` / `build` | Root `Makefile` | Authored root `Makefile` driving CMake and npm; browser independence gate; shared protocol spec. |
| **21** | **Process Algebra & Petri Net Lifecycle** | Inverting & Splitting | `shell` / `sync` | `createWorkbenchRuntime.ts` (1,100 LOC) | Petri Net document state machine; CSP communication channels; decompose runtime to < 350 LOC. |
| **22** | **God-Component Decomposition via Baldwin Splitting** | Splitting | `interactions` / `styles` | `VersionPopover.tsx` (739 LOC), `CorpusExplorerDrawer.tsx` (572 LOC), `WorkbenchCommandBar.tsx` (472 LOC), `PreviewPanel.tsx` (605 LOC) | Dissect UI God components into focused single-responsibility modules ($\le 300$ LOC each). |
| **23** | **CLM Tri-Database & Service Decoupling** | Excluding & Substituting | `corpus` / `storage` | `corpusExplorerService.ts` (652 LOC), `corpusExportService.ts` (484 LOC) | Prune legacy `DocumentStore`; extract dedicated CLM actors for Indexing, Gated Commit, and Export. |
| **24** | **Parser Combinator & Native C++ Modularization** | Splitting & Porting | `parser` / `desktop-parity` | `parser.ts` (494 LOC), `tikzscene.cpp` (1,418 LOC) | Modular combinator decomposition for TS parser; architectural blueprint for native C++ cleanup. |

---

## 6. Decision Record (D11 – D16)

- **D11 (Root Makefile Authority):** The root `Makefile` is an authored developer entrypoint, not a generated qmake file. Qt qmake builds must emit their build artifacts into a designated shadow directory (`build-qmake/`) to prevent overwriting the master Makefile.
- **D12 (Zero Native C++ Dependency for Web):** Under no circumstances may any TypeScript package depend on native node addons or C++ bindings. All SQLite manipulation in the web client runs via WASM `sql.js`.
- **D13 (Strict Line Limit Rule):** No source file in `src/` should exceed **450 lines of code**. Any file approaching 400 lines must be evaluated for Baldwin splitting.
- **D14 (Petri Net State Determinism):** All document save/persistence operations must adhere strictly to the Petri Net place-transition semantics, prohibiting direct boolean flag mutations across component boundaries.
- **D15 (Single Source of Truth for Protocol):** The TikZ AST schema in `src/core/parser/ast.ts` and the MCard SQLite schema in `src/services/clm/corpusExportService.ts` constitute the canonical specification shared between C++ and TypeScript.
- **D16 (Preservation of Contracts A & B):** All refactoring must strictly uphold Dockview layout preservation (Contract A) and E2E selector stability (Contract B).
