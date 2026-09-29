# Proposal & Architecture: Sprints 25–29 — Portable MCard Storage, Merkle VCS & Reusable Explorer Subsystem
**Directory:** `docs/sprints/orchestration/25-29-portable-mcard-storage-and-version-control`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Establishes the architecture, mathematical foundations (Double Operadic Theory of Systems - DOTS, Conversational Lenses $S \dashv G$, Mealy/Moore machines, Porting/Inversion), and implementation of two autonomous, zero-DOM packages: `@clm/mcard-vcs` and `@clm/mcard-explorer`. Elevated MCard storage and version control from a TikZiT-coupled service into universally embeddable subsystems grounded in `clm-kernel` and ready for drop-in adoption by `mcard-studio`. TikZiT's host services and workbench drawers were refactored into thin, Contract-D-compliant adapters ($\le 250$ LOC) preserving 100% of Contract B testid selectors (211 literals and 12 dynamic prefix families) and zero regressions across the entire 526-test suite.

## Umbrella Scope & Realization
* **Sprint 25 (Corpus):** Authored `@clm/mcard-vcs` storage kernel grounded on `clm-kernel`'s `MCardFileSystem`. Implemented formal DOTS Conversational Lenses ($S \dashv G$), loose-wiring dispatch/callback `VfsEventBus`, pluggable backends (`MemoryStorageVFS`, `IndexedDbStorageVFS`, `NodeFsStorageVFS`), canonical `blake3:` content-addressing, nested ACID `SavepointGuard`, and zero-DOM AST isolation gate (`make check-vcs-isolation`).
* **Sprint 26 (Sync):** Implemented input-driven Mealy Machine VCS engine ($O = \delta(s, i)$), immutable DAG commits (`CommitMCard`) and trees (`TreeMCard`), atomic CAS branch refs (`RefStore`), multi-parent LCA traversal (`AncestryGraph`), multi-modal unified hunk/graph AST diffing (`SemanticDiffEngine`, `GraphAstDiffer`), deterministic 3-way merge (`ThreeWayMergeEngine`), `VCard` witness certification (`ConflictResolver`), and serializable DTO query facade (`ExplorerQueryFacade`).
* **Sprint 27 (Orchestration):** Built inverted Cordis Fibers (`mcard.storage`, `mcard.vcs`, `mcard.explorer`) with strict LIFO `DisposableList` teardown on bare `Context`, Satori XML/JSON AST codecs (`<card>`, `<version-dag>`, `<diff-view>`, `<mcard-explorer>`), interactive `HypermediaRenderer`, and a 5-phase conversational turn pipeline (`VcsTurnOrchestrator`).
* **Sprint 28 (Orchestration):** Delivered universally embeddable `@clm/mcard-explorer` subsystem with headless state machine (`MCardExplorerEngine`), pluggable `ExplorerActionRegistry`, host-agnostic presentation viewlets (`MCardExplorer`, `MCardTree`, `MCardSearchBar`, `MCardEntryRow`), canonical `createMCardVcsPlugin` PTR manifest and bridge for `mcard-studio`, third-party embedding guide (`EMBEDDING-MCARD-VCS.md`), shipped `/conformance` self-check runner (`hostSelfCheck.ts`), and upstream `RFC-CLM-002-OPERADIC-VFS.md`.
* **Sprint 29 (Verification):** Re-anchored TikZiT host via thin singleton adapter (`vcsAdapterInstance.ts`), refactored `DocumentCommitService` (down to 221 LOC) and `corpusExplorerService` (225 LOC) satisfying Contract D ($\le 250$ LOC), mounted `@clm/mcard-explorer` in `CorpusExplorerDrawer.tsx` preserving 100% of Contract B testids (211 selectors + 12 dynamic prefix families), enhanced sovereign `.db` export, and verified cross-system conformance with `studio-roundtrip.test.ts` and `explorer-cross-system.test.ts`.

## Verification & Quality Gates
* **Unit & Integration Suite (Vitest):** **95 test files, 526 tests passing** (100% green).
* **VCS & Explorer Subsystem Suite:** 18 test files, 60 tests passing (`make test-vcs`).
* **Zero-DOM Isolation Gate (Contract E):** `make check-vcs-isolation` passing across all 29 modules with zero DOM globals and zero host imports.
* **Browser Runtime Independence:** 5/5 automated audit checks passed (`make check-independence`), guaranteeing pure WASM execution.
* **Dual-System Protocol Conformance:** 12/12 canonical ZX-calculus diagrams verified isomorphic across runtimes (`make check-conformance`).
* **Contract B Selector Stability:** 211 literal selectors and 12 dynamic prefix families intact (`node scripts/audit-testids.mjs --check`).
* **Contract D LOC Ceiling:** All newly authored and refactored files strictly satisfy $\le 250$ LOC.

## Documents
* **Master Proposal:** [`PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md`](./PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md)
* **Upstream RFC:** [`RFC-CLM-002-OPERADIC-VFS.md`](./RFC-CLM-002-OPERADIC-VFS.md)
* **Embedding Guide:** [`../../../../integration/EMBEDDING-MCARD-VCS.md`](../../../integration/EMBEDDING-MCARD-VCS.md)
* **Sprint 25:** [`../../corpus/25-isolated-mcard-storage-kernel-and-vfs/SPRINT-25-ISOLATED-MCARD-STORAGE-KERNEL-AND-VFS.md`](../../corpus/25-isolated-mcard-storage-kernel-and-vfs/SPRINT-25-ISOLATED-MCARD-STORAGE-KERNEL-AND-VFS.md)
* **Sprint 26:** [`../../sync/26-content-addressed-version-control-and-merkle-lineage/SPRINT-26-CONTENT-ADDRESSED-VERSION-CONTROL-AND-MERKLE-LINEAGE.md`](../../sync/26-content-addressed-version-control-and-merkle-lineage/SPRINT-26-CONTENT-ADDRESSED-VERSION-CONTROL-AND-MERKLE-LINEAGE.md)
* **Sprint 27:** [`../../orchestration/27-cordis-fiber-and-satori-protocol-adapters/SPRINT-27-CORDIS-FIBER-AND-SATORI-PROTOCOL-ADAPTERS.md`](../../orchestration/27-cordis-fiber-and-satori-protocol-adapters/SPRINT-27-CORDIS-FIBER-AND-SATORI-PROTOCOL-ADAPTERS.md)
* **Sprint 28:** [`../../orchestration/28-mcard-studio-plugin-and-cross-application-bridge/SPRINT-28-MCARD-STUDIO-PLUGIN-AND-CROSS-APPLICATION-BRIDGE.md`](../../orchestration/28-mcard-studio-plugin-and-cross-application-bridge/SPRINT-28-MCARD-STUDIO-PLUGIN-AND-CROSS-APPLICATION-BRIDGE.md)
* **Sprint 29:** [`../../verification/29-tikzit-host-integration-and-verification-matrix/SPRINT-29-TIKZIT-HOST-INTEGRATION-AND-VERIFICATION-MATRIX.md`](../../verification/29-tikzit-host-integration-and-verification-matrix/SPRINT-29-TIKZIT-HOST-INTEGRATION-AND-VERIFICATION-MATRIX.md)
