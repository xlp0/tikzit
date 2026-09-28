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

## 3. Theoretical Framework: Kenotic CLM & Spatiotemporal Compositionality

### 3.1 The Kenotic Principle of CLM
Under the **Kenotic Principle** ($\text{Universality} \propto \frac{1}{\text{Assumptions}}$), the CLM kernel empties itself of ambient mutable state, domain vocabulary, and unmediated direct coupling. It acts purely as a minimal topological coordinate harness:
1. **Statics as Generalized Numbers (The Nouns / Places $P$)**: All resources, ASTs, and databases are inert, content-addressed states ($\text{BLAKE3}(c)$ or $\text{SHA-256}(c)$) representing Petri Net Places.
2. **Dynamics as Pure Functions (The Verbs / Transitions $T$)**: All operations are modeled strictly as pure mathematical Functions ($f: A \to B$) or Petri Net transitions ($t: P_{\text{in}} \to P_{\text{out}}$).
3. **Standardized `clm-kernel` Result Modes**: All functional outcomes and transitions evaluate to `VCardResult` (with `sealWitness` / `sealExecutionRecord`) or `BailVerdict` failure records, with rollback managed by `SavepointGuard`.

### 3.2 Cordis Spatiotemporal Compositionality
To guarantee modular independence and eliminate information entanglement:
1. **Spatial Isolation (Scoped Coeffects)**: Services and UI actors declare exact coeffects via `ctx.inject(['storage', 'protocol'])`. Zero cross-boundary direct mutations or ambient DOM globals.
2. **Temporal Isolation (Cordis Fibers & DisposableList)**: Active tabs, viewports, and channels run in dedicated fibers. Side effects execute within a **VCard Sandwich** ($\text{setup} \to \text{action} \to \text{teardown}$). Unmounting cleanly tears down all listeners via `DisposableList`, eliminating zombie handlers and memory leaks.

### 3.3 Baldwin Modularity Operators
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

### Cross-Sprint Contract F: Legacy Test & Protocol Conformance Invariants
1. **Zero regressions permitted.** All 355 existing Vitest unit/integration tests and 392 Playwright E2E runs must pass 100% green at every step.
2. **Canonical ZX-calculus parity.** All 12 canonical diagrams must verify cleanly across both web and native parsers.
3. **Cross-engine graph isomorphism.** Any diagram compiled via native C++ Qt or browser TypeScript must yield identical topological graphs and element properties.

### Cross-Sprint Contract G: Kenotic Purity & clm-kernel Standardization
1. **Zero ambient state.** Newly authored protocols must not introduce stateful singletons or imperative global listeners.
2. **Function and transition formulation.** Every protocol interaction must be formulated as a pure Function or marked Petri Net transition.
3. **Standardized verdicts.** All failure and exit modes must return typed `BailVerdict` or `VCardResult` records from `clm-kernel`.
4. **Spatiotemporal cleanup.** Every subscription or timer must be registered in a Cordis `DisposableList` executing the VCard Sandwich.

---

## 5. Comprehensive Testing Mandate & Quality Framework

Every sprint in this active series must develop extensive test cases for its new modular architecture while safeguarding legacy execution:

| Sprint | New Tests | Scope & Focus | Verification Commands |
| :---: | :---: | :--- | :--- |
| **20** | **16** | Authored `Makefile`, browser independence sandboxing (`scripts/verify-browser-independence.mjs`), protocol EBNF grammar, and coordinate math. | `make check-independence && npx vitest run tests/unit/protocol/ tests/unit/build/` |
| **21** | **24** | Petri Net token conservation, async flush race elimination, CSP anti-echo communication channels, storage supervisor retry backoff. | `npx vitest run tests/unit/services/lifecycle/ tests/unit/services/sync/ tests/unit/services/storage/ tests/integration/services/` |
| **22** | **28** | Headless AST diff engine (`VersionDiffEngine.ts`), headless SVG compiler (`PreviewCompiler.ts`), 12 decomposed UI sub-components. | `npx vitest run tests/unit/components/history/ tests/unit/components/preview/ tests/unit/components/explorer/ tests/unit/components/commandbar/` |
| **23** | **24** | CLM TriDatabase index caching, gated commits & VCard receipts, headless lineage graph cycles ($A \to B \to A$), SQLite snapshot serialization. | `npx vitest run tests/unit/clm/explorer/ tests/unit/clm/export/ tests/unit/clm/storage/ tests/integration/clm/` |
| **24** | **22** | Grammar combinators (`node`, `edge`, `style`, `property`), syntax error recovery, automated cross-engine isomorphism gate. | `npx vitest run tests/unit/parser/ && node scripts/verify-protocol-conformance.mjs` |
| **Total** | **114** | **17 new test modules across unit, headless, integration, and cross-platform conformance.** | `make test && make test-e2e && make verify-corpus` |

---

## 6. Consolidated Active Definition of Done (DoD) Progress Tracker

This master checklist tracks all 51 granular Definition of Done checkpoints across the active series:

### Sprint 20: Dual-System Makefile & Shared Protocol
- [ ] **S20-G01 — Authored Root Makefile Deployed**: Root `Makefile` committed with `.PHONY` targets for `all`, `build`, `build-web`, `build-cpp`, `test`, `test-web`, `test-cpp`, `test-e2e`, `verify-corpus`, `clean`, `lint`, and `check-independence`.
- [ ] **S20-G02 — Dual-System Build Success**: `make build` builds both web (`dist/`) and desktop C++ (`build/tikzit`).
- [ ] **S20-G03 — QMake Shadow Isolation**: `make build-qmake` emits artifacts to `build-qmake/` without touching root `Makefile`.
- [ ] **S20-G04 — Dual-System Test Execution**: `make test` runs both Vitest and native Qt `UnitTests`.
- [ ] **S20-G05 — Browser Independence Gate Implemented**: `scripts/verify-browser-independence.mjs` authored and wired to `make check-independence`.
- [ ] **S20-G06 — Zero Native Dependencies in Web Bundle**: Automated scan verifies zero `.node` files, node-gyp builds, or C++ FFI in `dist/`.
- [ ] **S20-G07 — Shared Protocol Specification Authored**: `docs/architecture/SHARED-PROTOCOL-SPECIFICATION.md` authored.
- [ ] **S20-G08 — Protocol Unit Suite Passing**: `tests/unit/protocol/sharedProtocol.test.ts` passes all 16 tests (T20-01 to T20-16).
- [ ] **S20-G09 — Zero Regressions on Existing Suites**: 355 Vitest tests, 392 Playwright runs, 12 ZX diagrams, and 20 C++ tests pass.
- [ ] **S20-G10 — Clean Verification Log**: Build logs verifying `make all`, `make check-independence`, and `make verify-corpus` committed.

### Sprint 21: Process Algebra & Petri Net State Machine
- [ ] **S21-G01 — Runtime Orchestrator Under 350 LOC**: `createWorkbenchRuntime.ts` reduced from 1,100 lines to $\le 350$ lines.
- [ ] **S21-G02 — Extracted Actors Under 300 LOC**: `DocumentProcess.ts`, `TabSessionController.ts`, `SyncChannel.ts`, `StorageSupervisor.ts` all $\le 300$ lines.
- [ ] **S21-G03 — Petri Net State Determinism**: State machine dispatches formal actions; zero ad-hoc boolean mutations across components.
- [ ] **S21-G04 — Token Conservation Guarantee**: Verified by T21-09: concurrent edits during async flush maintain dirty token without data loss.
- [ ] **S21-G05 — CSP Channel Invariant**: `SyncChannel` eliminates cyclic echo feedback loops (verified by T21-13).
- [ ] **S21-G06 — Storage Supervisor Isolation**: Persistence and retry backoff fully encapsulated in `StorageSupervisor.ts`.
- [ ] **S21-G07 — Stale Writer Detection**: Writer generation conflicts halt writes and trigger stale banner (verified by T21-10).
- [ ] **S21-G08 — 24 New Algebraic Tests Passing**: All 24 tests (T21-01 to T21-24) pass 100% green.
- [ ] **S21-G09 — Zero Regressions on Existing Suites**: All 355 unit tests and 392 Playwright runs pass.
- [ ] **S21-G10 — Contract A & B Preservation**: Dockview serialization and 59 `data-testid` selectors preserved.
- [ ] **S21-G11 — Clean Concurrency Verification Log**: Stress test log verifying 10 rapid edit-save cycles with zero lost edits committed.

### Sprint 22: God-Component Decomposition via Baldwin Splitting
- [ ] **S22-G01 — All Sub-Components Under 250 LOC**: All 12 newly extracted sub-components verified $\le 250$ lines of code.
- [ ] **S22-G02 — All Parent Containers Under 200 LOC**: `VersionPopover.tsx`, `PreviewPanel.tsx`, `CorpusExplorerDrawer.tsx`, `WorkbenchCommandBar.tsx` verified $\le 200$ lines of code.
- [ ] **S22-G03 — Headless Version Diff Engine Verified**: `VersionDiffEngine.ts` tested headlessly without React DOM (T22-01 to T22-05).
- [ ] **S22-G04 — Headless Preview Compiler Verified**: `PreviewCompiler.ts` tested headlessly for SVG generation and Bézier math (T22-06 to T22-10).
- [ ] **S22-G05 — History & Modal Unit Tests Passing**: T22-11 through T22-17 pass 100% green.
- [ ] **S22-G06 — Preview & Stage Unit Tests Passing**: T22-18 and T22-19 pass 100% green.
- [ ] **S22-G07 — Explorer Drawer Unit Tests Passing**: T22-20 through T22-24 pass 100% green.
- [ ] **S22-G08 — Command Bar Unit Tests Passing**: T22-25 through T22-28 pass 100% green.
- [ ] **S22-G09 — Contract B Selector Integrity Verified**: Automated audit confirms all 59 baseline selectors remain active and correctly positioned.
- [ ] **S22-G10 — Full Regression Suite Passing**: All 355 Vitest unit tests and 392 Playwright runs pass with zero query modifications.

### Sprint 23: CLM Tri-Database & Service Boundary Decoupling
- [ ] **S23-G01 — Legacy DocumentStore Fully Deleted**: `DocumentStore.ts` deleted; zero references to `tikzit:doc-*` or `tikzit:rev-*` remain.
- [ ] **S23-G02 — All Decomposed Services Under 250 LOC**: `DiagramIndexService`, `DiagramCommitCoordinator`, `DiagramLifecycleManager`, `LineageTraversalEngine`, `CollectionSnapshotWriter`, `ExportFileBridge` all $\le 250$ lines.
- [ ] **S23-G03 — Service Facades Under 150 LOC**: `CorpusExplorerService.ts` and `CorpusExportService.ts` verified $\le 150$ lines.
- [ ] **S23-G04 — Headless Lineage Traversal Verified**: Lineage closures and cycle resolution pass headless tests (T23-13 to T23-16).
- [ ] **S23-G05 — Headless Snapshot Serialization Verified**: SQLite 3 database generation and round-trip pass headless tests (T23-17 to T23-20).
- [ ] **S23-G06 — Cross-Repo Mcard-Studio Compatibility**: Exported databases validate against external `mcard-studio` schema format.
- [ ] **S23-G07 — Commit Gating & VCard Receipts Verified**: Syntax error gating and execution receipts pass tests (T23-05 to T23-09).
- [ ] **S23-G08 — Index & Parse Cache Verified**: Record caching and parse memoization pass tests (T23-01 to T23-04).
- [ ] **S23-G09 — Zero Regressions on Existing Suites**: All 355 Vitest tests and Sprint 19 Playwright tests pass 100% green.
- [ ] **S23-G10 — Clean Export Round-Trip Artifact**: Verified SQLite `.db` export artifact passes `sqlite3` integrity check.

### Sprint 24: Core Parser Combinator & Native C++ Modularization
- [ ] **S24-G01 — Parser Kernel Under 120 LOC**: `src/core/parser/parser.ts` refactored into combinator coordinator strictly $\le 120$ lines.
- [ ] **S24-G02 — Combinator Modules Under 180 LOC**: `nodeCombinator`, `edgeCombinator`, `styleCombinator`, `propertyCombinator` all $\le 180$ lines.
- [ ] **S24-G03 — Node Combinator Verified**: Node declarations, options, and error reporting pass tests (T24-01 to T24-04).
- [ ] **S24-G04 — Edge Combinator Verified**: Straight, curved, teardrop, and compound edges pass tests (T24-05 to T24-10).
- [ ] **S24-G05 — Style & Property Combinators Verified**: Style declarations, nested options, and escaped brackets pass tests (T24-11 to T24-14).
- [ ] **S24-G06 — Top-Level Orchestrator Verified**: Full diagram parsing and syntax recovery pass tests (T24-15 to T24-17).
- [ ] **S24-G07 — Automated Conformance Suite Deployed**: `scripts/verify-protocol-conformance.mjs` authored and integrated into `make test`.
- [ ] **S24-G08 — 100% Canonical ZX Isomorphism**: All 12 canonical ZX diagrams produce topologically isomorphic graphs across C++ and TS engines.
- [ ] **S24-G09 — C++ Modularization Blueprint Authored**: `docs/architecture/CPP-MODULARIZATION-BLUEPRINT.md` authored.
- [ ] **S24-G10 — Full Dual-System Suite Passing**: All 355 Vitest unit tests, 392 Playwright E2E tests, 20 native C++ tests, and 12 canonical ZX diagrams pass 100% green.

---

## 7. Master Quality Gate Execution Runbook

```bash
# 1. Clean previous build artifacts
make clean

# 2. Build both platforms through unified Makefile
make build

# 3. Verify browser runtime independence (zero native C++ in web bundle)
make check-independence

# 4. Run unified test suite (Vitest + Native C++ UnitTests)
make test

# 5. Run full Playwright cross-browser E2E suite
make test-e2e

# 6. Verify 12 canonical ZX-calculus diagrams
make verify-corpus

# 7. Run cross-engine TikZ AST protocol conformance verification
node scripts/verify-protocol-conformance.mjs

# 8. Run code hygiene and linting across both systems
make lint
```

---

## 8. Previous Graduated Series

- [Desktop Parity Series (Sprints 09–15)](../README.md#2-sprint-status-matrix) — Shared C++ media assets, macOS chrome, paper canvas, teardrop self-loops, desktop style palette, and sovereign `.db` corpus export.
- [Diagram Lifecycle & Export Series (Sprints 16–19)](../README.md#2-sprint-status-matrix) — First-class MCard diagram creation (`zx:diagrams:UUID`), library management (rename, duplicate, archive), session durability, lineage version history, draft save affordance, individual diagram export, and complete MCard collection export.

