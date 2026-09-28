# Sprint 23: CLM Tri-Database & Service Boundary Decoupling

**Status:** Proposed; not started  
**Primary Baldwin Operator:** Excluding ($-$) & Substituting ($\simeq \implies =$)  
**Primary Subsystem:** `corpus` / `storage` / `export`  
**Depends on:** [Sprint 21](./SPRINT-21-PROCESS-ALGEBRA-AND-PETRI-NET-LIFECYCLE.md), [Sprint 22](./SPRINT-22-GOD-COMPONENT-DECOMPOSITION-VIA-BALDWIN-SPLITTING.md)  
**Parent Proposal:** [Sprints 20–24](./PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md)

---

## 1. Objective

Apply Carliss Baldwin's **Excluding Operator** ($\mathcal{B}_{\text{excl}}$) to prune obsolete legacy `DocumentStore` shadow storage, and the **Splitting Operator** ($\mathcal{B}_{\text{split}}$) to decompose two monolithic CLM services exceeding the 450-line complexity ceiling:
- [`src/services/clm/corpusExplorerService.ts`](../../../src/services/clm/corpusExplorerService.ts) (**652 lines**)
- [`src/services/clm/corpusExportService.ts`](../../../src/services/clm/corpusExportService.ts) (**484 lines**)

Align the storage and export architecture cleanly with the three **Cubical Logic Model (CLM) MVP Card Primitives** (MCard, PCard, VCard), establishing zero-leakage service boundaries strictly bounded to **$\le 250$ lines of code**.

---

## 2. Current Gaps & Architectural Tension

1. **`corpusExplorerService.ts` (652 LOC)**:
   - Amalgamates four distinct responsibilities:
     1. Maintaining the in-memory `CorpusIndexRecord` list and parse cache (`parseCache`).
     2. Gated commit evaluation, receipt creation, and metadata card emission.
     3. Diagram library mutation (rename, duplicate, archive, unarchive).
     4. Cordis service mesh registration and query filtering.
   - Any bug fix in title caching risks impacting commit gating or archive filtering.

2. **`corpusExportService.ts` (484 LOC)**:
   - Mixes complex recursive lineage graph traversal (handling A$\to$B$\to$A restore cycles), SQLite binary table encoding, cryptographic SHA-256 validation, and browser-specific File System Access API picker logic.
   - Cannot run lineage traversal or export validation in a headless Node.js test environment without mocking DOM `Blob` and `window.showSaveFilePicker`.

3. **Lingering Legacy Shadow State (`DocumentStore.ts`)**:
   - Despite Sprints 16–19 migrating active diagrams to `zx:diagrams:UUID` MCards, remnants of legacy `DocumentStore` (`tikzit:doc:*`, `tikzit:rev:*`) remain in `WorkspaceManager.ts` as fallback paths.
   - Dual-storage paths violate the Single Source of Truth invariant and risk data desynchronization.

---

## 3. Detailed Baldwin Architectural Refactoring

### 3.1 Baldwin Exclusion of Legacy `DocumentStore`

Apply Baldwin's Exclusion operator ($-$) to eliminate legacy shadow storage:
- Retire `src/services/storage/DocumentStore.ts` and associated key constants.
- Cleanse `WorkspaceManager.ts` of all legacy `tikzit:doc-*` localStorage read/write logic.
- Ensure all diagrams—whether seeded examples or user creations—resolve exclusively through the CLM TriDatabase (`knowledge`, `executionLog`, `mcard`).

### 3.2 Decomposition of `corpusExplorerService.ts` (652 $\to$ 4 focused modules)

```
src/services/clm/explorer/
├── DiagramIndexService.ts         # Handle index management, parse cache & title cache (<= 180 LOC)
├── DiagramCommitCoordinator.ts    # Gated commit check, receipt minting & metadata cards (<= 220 LOC)
├── DiagramLifecycleManager.ts     # Rename, duplicate, archive & restore mutations (<= 160 LOC)
└── CorpusExplorerService.ts       # Cordis service facade aggregating actors (<= 120 LOC)
```

- **`DiagramIndexService.ts`**: Pure MCard index manager. Maintains the in-memory array of `CorpusIndexRecord` and the immutable card parse cache (`Map<string, { nodeCount, edgeCount }>`).
- **`DiagramCommitCoordinator.ts`**: Pure PCard computational transformation. Evaluates gate criteria (`INVALID_TIKZ_SYNTAX`, `NULL_AST`), generates execution receipts, mints companion metadata cards (`zx:meta:diagrams:UUID`), and commits MCard head updates.
- **`DiagramLifecycleManager.ts`**: Handles state transitions for rename, duplicate, and archive operations via immutable metadata lineage append.

### 3.3 Decomposition of `corpusExportService.ts` (484 $\to$ 4 focused modules)

```
src/services/clm/export/
├── LineageTraversalEngine.ts      # Pure graph traversal for lineage closures & orphan exclusion (<= 160 LOC)
├── CollectionSnapshotWriter.ts    # Pure SQLite 3 table serializer (cards, handles, history) (<= 150 LOC)
├── ExportFileBridge.ts            # Browser File System Access API & Blob fallback download (<= 120 LOC)
└── CorpusExportService.ts         # Clean export orchestrator & verification gate (<= 120 LOC)
```

- **`LineageTraversalEngine.ts`**: Pure algorithm. Computes the complete lineage closure across all diagrams, companion metadata cards, and historical head transitions (A$\to$B$\to$A). Enforces Decision D3 by excluding orphan cards and execution receipts.
- **`CollectionSnapshotWriter.ts`**: Generates a valid SQLite 3 database using `sql.js` WASM, validating every card's content against its recorded hash prior to emission.
- **`ExportFileBridge.ts`**: Isolated browser file I/O layer. Handles `showSaveFilePicker`, streams writes, catches cancellation, and falls back to Blob anchor download.

---

## 4. CLM MVP Card Alignment Matrix

| Subsystem Component | CLM Role | Mathematical Model | Responsibilities |
| :--- | :--- | :--- | :--- |
| **`SqlJsBackend` / IDB** | **MCard** | Static State ($\Sigma$-Type) | Immutable content-addressed blocks and handle registers. |
| **`DiagramCommitCoordinator`** | **PCard** | Dynamic Operator (Mealy) | Transformation of raw TikZ source into verified AST and minted MCard. |
| **`LineageTraversalEngine`** | **PCard** | Graph Algorithm | Directed acyclic traversal of MCard lineage histories. |
| **`VerificationReceipt`** | **VCard** | Witness (Kan Filler) | Execution receipts and cryptographic hash checksums verifying export integrity. |

---

## 5. Acceptance Criteria

- **AC-23-01 (Strict 250 LOC Limit for Services)**: All newly extracted service modules do not exceed **250 lines of code**.
- **AC-23-02 (Strict 150 LOC Limit for Facades)**: Facades (`CorpusExplorerService.ts`, `CorpusExportService.ts`) do not exceed **150 lines of code**.
- **AC-23-03 (Complete Exclusion of Legacy DocumentStore)**: `src/services/storage/DocumentStore.ts` is deleted; zero references to `tikzit:doc-*` or `tikzit:rev-*` remain in the codebase.
- **AC-23-04 (Headless Export Engine Testability)**: `LineageTraversalEngine.ts` and `CollectionSnapshotWriter.ts` are tested headlessly in Vitest without requiring browser DOM or file picker mocks.
- **AC-23-05 (Cross-Repo Round-Trip Preservation)**: The export output produced by `CollectionSnapshotWriter` passes the pinned `mcard-studio` round-trip test with 100% bit-exact verification.
- **AC-23-06 (Regression Free)**: All unit tests in `tests/unit/clm/` pass 100% green.
