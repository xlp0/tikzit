# Active Sprint Directory (`docs/sprints/_active`)

This directory tracks the active engineering series in flight: **The Algebraic Architecture Series (Sprints 20–24)**. Designed in collaboration with **Winston (System Architect)** and **Amelia (Senior Software Engineer)**, this series restructures the TikZiT codebase around the **Cubical Logic Model (CLM)**, **Carliss Baldwin's Six Modularity Operators**, **Process Algebra (CSP/CCS)**, and **Petri Nets**, while establishing an authored root **Makefile** that unifies the native C++ Qt and web TypeScript build and test workflows without coupling browser execution to native binaries.

---

## 1. Active Series Roadmap: Algebraic Modularity & Build Unification (Sprints 20–24)

| Sprint | Subsystem | Document | Focus & Scope | Lead Agents | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **20** | `orchestration` / `build` | [`SPRINT-20-DUAL-SYSTEM-MAKEFILE-AND-SHARED-PROTOCOL.md`](./SPRINT-20-DUAL-SYSTEM-MAKEFILE-AND-SHARED-PROTOCOL.md) | Authored root `Makefile` driving CMake & npm; browser independence gate; shared protocol spec. | Winston & Amelia | 📋 **In Planning** |
| **21** | `shell` / `sync` | [`SPRINT-21-PROCESS-ALGEBRA-AND-PETRI-NET-LIFECYCLE.md`](./SPRINT-21-PROCESS-ALGEBRA-AND-PETRI-NET-LIFECYCLE.md) | Petri Net document state machine; CSP communication channels; decompose `createWorkbenchRuntime.ts` (1,100 $\to < 350$ LOC). | Winston & Amelia | 📋 **In Planning** |
| **22** | `interactions` / `styles` | [`SPRINT-22-GOD-COMPONENT-DECOMPOSITION-VIA-BALDWIN-SPLITTING.md`](./SPRINT-22-GOD-COMPONENT-DECOMPOSITION-VIA-BALDWIN-SPLITTING.md) | Baldwin Splitting on UI God components (`VersionPopover` 739 LOC, `PreviewPanel` 605 LOC, `CorpusExplorerDrawer` 572 LOC, `WorkbenchCommandBar` 472 LOC) $\to \le 250$ LOC. | Winston & Amelia | 📋 **In Planning** |
| **23** | `corpus` / `storage` | [`SPRINT-23-CLM-TRI-DATABASE-AND-SERVICE-DECOUPLING.md`](./SPRINT-23-CLM-TRI-DATABASE-AND-SERVICE-DECOUPLING.md) | Prune legacy `DocumentStore` shadow state; decompose `corpusExplorerService.ts` (652 LOC) & `corpusExportService.ts` (484 LOC) into CLM MVP Card actors. | Winston & Amelia | 📋 **In Planning** |
| **24** | `parser` / `desktop-parity` | [`SPRINT-24-PARSER-AND-NATIVE-CPP-MODULARIZATION.md`](./SPRINT-24-PARSER-AND-NATIVE-CPP-MODULARIZATION.md) | Modular combinator decomposition for `parser.ts` (494 $\to < 120$ LOC); native C++ Qt refactoring blueprint; automated dual-system conformance suite. | Winston & Amelia | 📋 **In Planning** |

**Master Architecture Proposal:** [`PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md`](./PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md)

---

## 2. Identified Monolithic God Modules (> 450 LOC) & Target Reductions

Our repository-wide architectural audit identified 13 files exceeding the 450-line complexity ceiling:

| File Path | Current LOC | Primary Subsystem | Target Architecture / Decomposed Modules | Target LOC |
| :--- | :---: | :--- | :--- | :---: |
| `src/services/createWorkbenchRuntime.ts` | **1,100** | Shell / Runtime | Split into `DocumentProcess`, `SyncChannel`, `StorageSupervisor`, `TabSessionController` | **$\le 350$** |
| `src/components/workbench/panels/VersionPopover.tsx` | **739** | Version History | Split into `VersionHistoryList`, `VersionDiffEngine`, `VersionCompareModal`, `VersionRestoreDialog` | **$\le 120$** |
| `src/services/clm/corpusExplorerService.ts` | **652** | Corpus / CLM | Split into `DiagramIndexService`, `DiagramCommitCoordinator`, `DiagramLifecycleManager` | **$\le 120$** |
| `src/components/workbench/panels/PreviewPanel.tsx` | **605** | Preview | Split into `PreviewStage`, `PreviewToolbar`, `PreviewCompiler` | **$\le 130$** |
| `src/components/workbench/CorpusExplorerDrawer.tsx` | **572** | Explorer Drawer | Split into `ExplorerSearchBar`, `ExplorerSectionList`, `ExplorerEntryRow` | **$\le 130$** |
| `src/core/parser/parser.ts` | **494** | Parser Kernel | Split into `nodeCombinator`, `edgeCombinator`, `styleCombinator`, `propertyCombinator` | **$\le 120$** |
| `src/services/clm/corpusExportService.ts` | **484** | Sovereign Export | Split into `LineageTraversalEngine`, `CollectionSnapshotWriter`, `ExportFileBridge` | **$\le 120$** |
| `src/components/workbench/WorkbenchCommandBar.tsx` | **472** | Window Chrome | Split into `DocumentTitleBar`, `DocumentActionButtons`, `WorkbenchCommandBar` | **$\le 170$** |
| *C++* `src/gui/tikzscene.cpp` | **1,418** | Native GUI Scene | Architectural blueprint: decompose into `SelectSceneTool`, `NodeSceneTool`, `EdgeSceneTool` | Blueprint |
| *C++* `src/gui/styleeditor.cpp` | **881** | Native Styles | Architectural blueprint: extract palette model and swatch delegates | Blueprint |
| *C++* `src/gui/undocommands.cpp` | **729** | Native Commands | Architectural blueprint: split into atomic `QUndoCommand` headers/sources | Blueprint |
| *C++* `src/tikzit.cpp` | **580** | Native App Entry | Architectural blueprint: extract document and CLI option parsers | Blueprint |
| *C++* `src/data/graph.cpp` | **482** | Native Graph Data | Architectural blueprint: separate geometry computations from graph topology | Blueprint |

---

## 3. Theoretical Framework: CLM & Baldwin Modularity Operators

### 3.1 Cubical Logic Model (CLM) Integration
Under CLM, refactoring follows the **Curry-Howard-Lambek (CHL)** three-dimensional manifold:
1. **Dimension 1: Abstract Specification (Logic / Query $Q$)**: Types, EBNF grammar, Petri net place/transition signatures, session type protocols.
2. **Dimension 2: Concrete Implementation (Type Theory / Key $K$)**: Browser TypeScript runtime, Three.js WebGL canvas, Sql.js WASM SQLite engine, native Qt C++ engine.
3. **Dimension 3: Balanced Expectations (Category Theory / Value $V$)**: 12 canonical ZX verification gates, Playwright pixelmatch baselines, cryptographic hash checksums.

### 3.2 Baldwin Modularity Operators
1. **Splitting ($\times$)**: Dissecting God files into autonomous modules bounded by explicit design rules.
2. **Substituting ($\simeq \implies =$)**: Swapping storage backends or canvas implementations without affecting consumers.
3. **Augmenting ($+$)**: Extending export formats (e.g. PNG 4x, TeX wrapper) without altering the AST core.
4. **Excluding ($-$)**: Completely eliminating legacy `DocumentStore` shadow state.
5. **Inverting ($\dashv$)**: Transforming imperative event wiring into high-level reactive streams and Petri net controllers.
6. **Porting ($\text{Lan}$)**: Maintaining native browser independence while executing identical TikZ protocol conformance.

---

## 4. Cross-Sprint Quality Contracts

### Cross-Sprint Contract A: Dockview Preservation Invariants
1. **Panels remain Dockview panels.** New or decomposed surface components mount *inside* `DockviewReact` panels or window chrome.
2. **Layout serialization is load-bearing.** `api.toJSON()`/`api.fromJSON()` persistence and 0-panel layout guards must continue working.
3. **Panel component registry.** All panel components are registered in `TikzitSpatialWorkbench.tsx`.
4. **Paper vs. chrome theme decoupling.** Canvas paper is always pure white (`#FFFFFF`); outer chrome may remain dark.

### Cross-Sprint Contract B: E2E Selector Stability Contract
All 59 baseline selectors (`[data-testid="workbench-root"]`, `[data-testid="btn-save-draft"]`, `[data-testid="btn-save-diagram"]`, `[data-testid="version-popover"]`, `[data-testid^="corpus-entry-"]`, `[data-testid="btn-export-collection"]`, etc.) MUST be preserved byte-for-byte on the newly extracted sub-components.

### Cross-Sprint Contract C: Browser Runtime Independence
The web application must run **100% natively in standard browser environments**:
1. Zero native C++ binary dependencies (`.dylib`, `.so`, `.dll`), zero `node-gyp` native addon builds.
2. All SQLite execution in the browser runs via `sql.js` WASM.
3. All cryptographic hashing uses Web Crypto (`crypto.subtle`) or pure TypeScript hash libraries.
4. Verified by the automated `make check-independence` gate.

### Cross-Sprint Contract D: Strict 450-Line Source File Ceiling
1. No source file in `src/` may exceed **450 lines of code**.
2. Any newly extracted sub-component or actor must not exceed **250 lines of code** (and $\le 150$ lines for coordinating facades).

### Cross-Sprint Contract E: Petri Net Token Conservation
Document state transitions follow the formal marked Petri Net $\mathcal{N} = (P, T, F, W, M_0)$. User edits occurring during an active asynchronous flush are provably preserved and maintain the dirty token marking until the subsequent save completes.

---

## 5. Previous Graduated Series

- [Desktop Parity Series (Sprints 09–15)](../README.md#2-sprint-status-matrix) — Shared C++ media assets, macOS chrome, paper canvas, teardrop self-loops, desktop style palette, and sovereign `.db` corpus export.
- [Diagram Lifecycle & Export Series (Sprints 16–19)](../README.md#2-sprint-status-matrix) — First-class MCard diagram creation (`zx:diagrams:UUID`), library management (rename, duplicate, archive), session durability, lineage version history, draft save affordance, individual diagram export, and complete MCard collection export.
