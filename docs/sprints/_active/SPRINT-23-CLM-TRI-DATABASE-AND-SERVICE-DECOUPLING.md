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

---

## 6. Comprehensive Test Strategy & New Test Case Inventory

This sprint introduces 24 new unit, headless, and round-trip verification tests covering the decomposed CLM actors, lineage traversal graph algorithms, and SQLite serialization:

### 6.1 Corpus Index Actor Verification (`tests/unit/clm/explorer/DiagramIndexService.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T23-01** | `test_index_initial_population_from_storage` | DiagramIndexService | Populates in-memory `CorpusIndexRecord` array from SQLite handles table; asserts correct count and record metadata. |
| **T23-02** | `test_parse_cache_memoization` | DiagramIndexService | Fetches diagram summary twice; asserts second retrieval returns cached `{ nodeCount, edgeCount }` without invoking parser. |
| **T23-03** | `test_title_cache_recovery_without_meta_cards` | DiagramIndexService | Loads diagram lacking companion metadata card; asserts title gracefully falls back to handle name or commit message. |
| **T23-04** | `test_query_filtering_by_prefix_and_archive` | DiagramIndexService | Queries index with `filter: { prefix: 'zx:diagrams:', showArchived: false }`; asserts seeded examples and archived diagrams are excluded. |

### 6.2 Commit Coordinator & Gating Verification (`tests/unit/clm/explorer/DiagramCommitCoordinator.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T23-05** | `test_commit_gate_passes_valid_tikz` | DiagramCommitCoordinator | Evaluates commit for valid TikZ source; asserts gate returns `{ approved: true }`. |
| **T23-06** | `test_commit_gate_rejects_syntax_errors` | DiagramCommitCoordinator | Evaluates commit for malformed TikZ string; asserts gate rejects commit with `INVALID_TIKZ_SYNTAX` code. |
| **T23-07** | `test_mcard_hash_computation_sha256` | DiagramCommitCoordinator | Mints MCard; asserts generated content hash matches exact SHA-256 digest of normalized TikZ source string. |
| **T23-08** | `test_companion_metadata_card_minting` | DiagramCommitCoordinator | Commits new version; asserts companion metadata card `zx:meta:diagrams:UUID` is minted and registered in handles table. |
| **T23-09** | `test_vcard_execution_receipt_generation` | DiagramCommitCoordinator | Asserts commit mints an execution receipt recording author, timestamp, parent hash, and gate check witness. |

### 6.3 Lifecycle Manager Verification (`tests/unit/clm/explorer/DiagramLifecycleManager.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T23-10** | `test_diagram_rename_appends_metadata_lineage` | DiagramLifecycleManager | Renames diagram from "Old" to "New"; asserts historic MCard content is untouched and new metadata card is appended to lineage. |
| **T23-11** | `test_diagram_duplicate_mints_fresh_uuid` | DiagramLifecycleManager | Duplicates diagram; asserts new handle `zx:diagrams:NEW-UUID` is created pointing to identical head MCard with "Copy of" title. |
| **T23-12** | `test_diagram_archive_and_unarchive_toggle` | DiagramLifecycleManager | Toggles archive flag; asserts handle history records archive status change without data loss. |

### 6.4 Headless Lineage Traversal Verification (`tests/unit/clm/export/LineageTraversalEngine.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T23-13** | `test_linear_lineage_closure_resolution` | LineageTraversalEngine | Traverses 5 sequential version commits; asserts closure contains exactly all 5 content card hashes and 5 metadata card hashes. |
| **T23-14** | `test_restore_cycle_traversal_termination` | LineageTraversalEngine | **Cycle Invariant**: Traverses history with restore cycle ($v_1 \to v_2 \to v_3 \to \text{restore } v_1$). Asserts traversal terminates and returns distinct card hashes without infinite loop. |
| **T23-15** | `test_orphan_card_exclusion_decision_d3` | LineageTraversalEngine | Populates database with unreferenced draft card; asserts traversal excludes orphan card from export closure. |
| **T23-16** | `test_execution_receipt_exclusion` | LineageTraversalEngine | Populates temporary VCard execution receipts; asserts traversal excludes receipts from exported card set. |

### 6.5 Headless SQLite Snapshot Serialization (`tests/unit/clm/export/CollectionSnapshotWriter.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T23-17** | `test_sqlite3_schema_ddl_compliance` | CollectionSnapshotWriter | Serializes database; asserts table definitions for `cards`, `handles`, and `handle_history` match `SHARED-PROTOCOL-SPECIFICATION.md`. |
| **T23-18** | `test_card_content_pre_emission_verification` | CollectionSnapshotWriter | Corrupts in-memory card hash; asserts writer detects cryptographic mismatch and aborts snapshot with descriptive error. |
| **T23-19** | `test_sqlite_round_trip_read_back` | CollectionSnapshotWriter | Serializes database to binary `Uint8Array`, then initializes fresh `sql.js` instance; asserts all cards and handles match original data 100%. |
| **T23-20** | `test_mcard_studio_cross_repo_compatibility` | CollectionSnapshotWriter | Exports database bytes and validates against pinned `mcard-studio` schema expectations. |

### 6.6 Legacy Storage Exclusion Verification (`tests/unit/clm/storage/DocumentStoreExclusion.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T23-21** | `test_zero_legacy_keys_in_localstorage` | Storage Cleanse | Executes full session workflow; asserts `localStorage` contains zero keys matching `tikzit:doc-*` or `tikzit:rev-*`. |
| **T23-22** | `test_workspace_manager_exclusive_tridatabase` | Storage Cleanse | Asserts `WorkspaceManager.ts` resolves active documents solely via `sql.js` TriDatabase and never falls back to legacy storage. |

### 6.7 End-to-End Export Integration (`tests/integration/clm/CorpusExportRoundTrip.test.ts`)

| Test ID | Test Name | Target Subsystem | Description & Expected Assertions |
| :--- | :--- | :--- | :--- |
| **T23-23** | `test_full_collection_export_and_cli_inspect` | End-to-End Export | Exports full 12-diagram corpus to file; inspects via `sqlite3` CLI (`SELECT count(*) FROM cards;`); asserts all cards and histories match expected counts. |
| **T23-24** | `test_export_file_bridge_cancellation_safety` | ExportFileBridge | Simulates user cancelling browser File System save dialog; asserts graceful cancellation handling without error banners. |

---

## 7. Legacy Test Preservation & Regression Safeguards

Decoupling the CLM database and services requires rigorous regression protection:

1. **Complete Preservation of CLM Unit Tests**:
   - All tests in `tests/unit/clm/` (`corpusExplorerService.test.ts`, `corpusExportService.test.ts`, `mcardExportVerification.test.ts`) must pass 100% green.
2. **Playwright Sprint 19 Collection Export Preservation**:
   - `e2e/sprint-19/collection-export.spec.ts` must execute cleanly without modification to export triggers or modal selectors.
3. **Full 355 Unit Test Suite Green**:
   - `npm test` must run with 0 regressions.
4. **Canonical ZX Corpus Invariant**:
   - 12/12 canonical ZX diagrams must verify with zero errors.

---

## 8. Definition of Done (DoD) Checklists

This sprint is gated by 10 verifiable Definition of Done checkpoints:

### Legacy Exclusion & Source Decomposition Gates
- [ ] **G01 — Legacy DocumentStore Fully Deleted**: `src/services/storage/DocumentStore.ts` is deleted; zero occurrences of `tikzit:doc-*` or `tikzit:rev-*` remain in the codebase (verified by T23-21).
- [ ] **G02 — All Decomposed Services Under 250 LOC**: `DiagramIndexService.ts`, `DiagramCommitCoordinator.ts`, `DiagramLifecycleManager.ts`, `LineageTraversalEngine.ts`, `CollectionSnapshotWriter.ts`, `ExportFileBridge.ts` are strictly **$\le 250$ lines of code**.
- [ ] **G03 — Service Facades Under 150 LOC**: Facades (`CorpusExplorerService.ts`, `CorpusExportService.ts`) are strictly **$\le 150$ lines of code**.

### Headless Algorithm & CLM Alignment Gates
- [ ] **G04 — Headless Lineage Traversal Verified**: `LineageTraversalEngine.ts` resolves lineage closures, handles restore cycles, and excludes orphans headlessly in Vitest (T23-13 to T23-16).
- [ ] **G05 — Headless Snapshot Serialization Verified**: `CollectionSnapshotWriter.ts` generates valid SQLite 3 databases and passes round-trip tests (T23-17 to T23-20).
- [ ] **G06 — Cross-Repo Mcard-Studio Compatibility**: Exported databases validate against the pinned `mcard-studio` schema format.

### Gating & Index Coverage Gates
- [ ] **G07 — Commit Gating & VCard Receipts Verified**: Syntax errors correctly block commits; valid commits mint verified MCards and execution receipts (T23-05 to T23-09).
- [ ] **G08 — Index & Parse Cache Verified**: Diagram index and parse memoization function cleanly (T23-01 to T23-04).

### Regression & Verification Artifact Gates
- [ ] **G09 — Zero Regressions on Existing Suites**: All 355 Vitest unit tests and Sprint 19 Playwright tests pass 100% green.
- [ ] **G10 — Clean Export Round-Trip Artifact**: Verified SQLite `.db` export artifact produced by headless tests passes `sqlite3` CLI integrity check (`PRAGMA integrity_check;`).

---

## 9. Verification Commands & Execution Runbook

Execute these commands to verify Sprint 23 completion:

```bash
# 1. Run headless CLM service and algorithm unit tests
npx vitest run tests/unit/clm/explorer/ \
               tests/unit/clm/export/ \
               tests/unit/clm/storage/

# 2. Run CLM integration export tests
npx vitest run tests/integration/clm/CorpusExportRoundTrip.test.ts

# 3. Check for lingering legacy storage references
grep -rn "tikzit:doc-" src/ || echo "Zero legacy doc references found."
grep -rn "tikzit:rev-" src/ || echo "Zero legacy rev references found."

# 4. Verify line counts across all refactored CLM modules
wc -l src/services/clm/explorer/* \
      src/services/clm/export/*

# 5. Run full Vitest regression suite
npm test

# 6. Run Sprint 19 collection export E2E suite
npx playwright test e2e/sprint-19/
```

