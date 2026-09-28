# Sprint 15: MCard-Backed Corpus Explorer & Sovereign Collection Export

## 1. Executive Summary & Strategic Objective

- **Objective**: Transform the static Explorer drawer in `TikzitSpatialWorkbench.tsx` into a live, searchable view over the content-addressed MCard corpus held by the workbench's CLM TriDatabase, persist that corpus across reloads via `SqlJsBackend` + IndexedDB hydration, and add a "Save Corpus (.db)" affordance that emits a single portable, hash-verified SQLite 3 file that any PKC/MCard node (mcard-studio) can ingest.
- **Context & Motivation**:
  - The CLM substrate was already wired in Sprint 07: `createWorkbenchRuntime.ts` calls `initTriDatabase(ctx)` (registers `mcard.fs` + `mcard.collection` Cordis services over `TriDatabaseManager.newInMemory()`) and registers `DocumentCommitService` (`saveDocumentWithGate`: `MCard.create` → `safeParse` → `PredicateBooleanPCard` → `evaluateVCard` → receipt → `executionLog` → `putWithHandle`). None of it is surfaced in the UI.
  - The `$documentHead` store and its `tikzit/document:change` bridge (`nanostores-bridge.ts:39-50`) already carry the active card's real hash — yet the status bar still renders a hardcoded `CID: blake3:7a4f32...`.
  - A canonical 12-diagram ZX corpus already exists at `public/docs/examples/zx-calculus/*.tikz` and its handle registry `zx:01..zx:12` is declared in `PQP_BENCHMARK_FIXTURES` (`triadDefinition.ts:46-59`). The Explorer is the natural surface for it.
  - mcard-studio (`GovTech/MCard_TDD/mcard-studio`) already ships the sovereign export pipeline this sprint mirrors: `databaseSyncService.ts` (`exportMCardDatabase`, `importMCardDatabase`, `isSqlite3Binary`), `vfsPersistence.ts` (IndexedDB hydration), `saveLocalFile.ts` (FSA `showSaveFilePicker`), and the `clm:export-db` event seam.
- **Architectural Leads**:
  - **Winston (System Architect)**: Cordis service contract, pillar/backend topology, portable-SQLite pipeline contract, INV-02/03/05 and INV-287/288 governance.
  - **Amelia (Senior Software Engineer)**: Implementation, vitest coverage in `tests/unit/clm/`, Playwright E2E in `e2e/sprint-15/`.

---

## 2. Root Cause Analysis & As-Is vs. To-Be Gap Analysis

### 2.1 Technical Root Causes (verified against current code)

1. **Dead search input** — `TikzitSpatialWorkbench.tsx:372-376` renders `<input placeholder="Search diagrams or corpus...">` with no `value`, no `onChange`, no backing store. It filters nothing.
2. **Hardcoded corpus rows** — `TikzitSpatialWorkbench.tsx:378-391` renders three literal `<div>`s (`01_spider_fusion.tikz`, `02_bialgebra_law.tikz`, `03_cnot_zx_equivalence.tikz`). They are not derived from `mcard.collection`, `workspaceState.openDocs`, or any store; click handlers are absent.
3. **Fake provenance** — `TikzitSpatialWorkbench.tsx:476` renders the literal string `CID: blake3:7a4f32...` instead of `stores.$documentHead.hash`.
4. **Ephemeral storage** — `triDbAdapter.ts:35` uses `TriDatabaseManager.newInMemory()`; every reload wipes the corpus. `TriDatabaseManager.withBackends` and `SqlJsBackend` (browser WASM SQLite) are exported by `clm-kernel` but unused.
5. **No export path** — nothing in tikzit calls `compilePortableSqlite`/`parsePortableSqlite` (both exported from `clm-kernel@^0.0.1`) or `MCardFileSystem.exportHistory()`.

### 2.2 The mcard-studio reference implementation (external repo: `GovTech/MCard_TDD/mcard-studio`)

| Capability | Reference implementation | Notes for tikzit port |
| :--- | :--- | :--- |
| Singleton CAS | `src/services/mcardVfs.ts` + `vfs/vfsCore.ts` — `MCardFileSystem.createOptimal({ dbPath: '.clm/content_memory.db' })` | tikzit equivalent is `triDb.mcard` |
| Session persistence | `vfs/vfsPersistence.ts` — debounced CAS snapshot → IndexedDB (`clm_workbench_db`), `hydrateFromIndexedDb()` on boot | Port pattern into `triDbAdapter` |
| Export | `src/services/databaseSyncService.ts:72` `exportMCardDatabase()` — collect cards + `mcardFs.exportHistory()` → `POST /api/vfs/db/export` → fallback: IndexedDB bytes → in-browser `compilePortableSqlite` → `clm_mcard_workspace_<ts>.db` gated by `isSqlite3Binary` (INV-287-01) | tikzit has **no server** — call `compilePortableSqlite` directly |
| Magic check | `databaseSyncService.ts:36` `isSqlite3Binary(bytes)` — checks `SQLite format 3\0` header | **Not exported by clm-kernel** — implement ~8-line local helper |
| Save to disk | `src/services/saveLocalFile.ts` — `window.showSaveFilePicker` (`.db/.sqlite/.sqlite3`) + Blob-download fallback | Port verbatim |
| Import | `importMCardDatabase(bytes, {mode})` — magic assert, 64-hex hash verification (INV-288-01), mount/merge modes, `mcardFs.importHistory` replay (INV-467) | Round-trip verification target only |

### 2.3 As-Is vs. Target Intentional Design Gap Analysis

| Aspect | Current Implementation (As-Is) | Target Intentional Design (To-Be) | Impacted Files |
| :--- | :--- | :--- | :--- |
| **Corpus query surface** | No corpus service exists | Cordis `Service` registered as `corpusExplorer`: `listCorpusEntries`, `searchCorpus`, `openEntry` over `mcard.collection` | `src/services/clm/corpusExplorerService.ts` (new), `src/services/createWorkbenchRuntime.ts` |
| **Corpus seeding** | `public/docs/examples/zx-calculus/*.tikz` is a static docs asset; `PQP_BENCHMARK_FIXTURES` handles exist but hold no cards | Boot-time ingest of the 12 `.tikz` fixtures as MCards under handles `zx:*` via `saveDocumentWithGate` (seeding itself VCard-gated + receipted) | `src/services/clm/corpusExplorerService.ts` |
| **Explorer drawer** | Dead input + 3 literal rows | Controlled input bound to `$corpusQuery` (≤150 ms debounce); rows mapped from `corpusExplorer` entries; click → `openEntry`; active row highlighted | `src/components/workbench/TikzitSpatialWorkbench.tsx`, `src/stores/createWorkbenchStores.ts` |
| **Status-bar CID** | Literal `blake3:7a4f32...` | Live `stores.$documentHead.hash` (INV-02 algorithm-prefixed, truncated) — bridge already exists | `src/components/workbench/TikzitSpatialWorkbench.tsx` |
| **Storage backend** | `TriDatabaseManager.newInMemory()` (volatile) | `TriDatabaseManager.withBackends` + `SqlJsBackend` in browser, `MemoryBackend` under `CLM_ZERO_FS`/tests; debounced IndexedDB snapshot + boot hydration | `src/services/clm/triDbAdapter.ts`, new `src/services/clm/corpusPersistence.ts` |
| **Sovereign export** | None | `exportCorpusDb()`: collect `collection.list()` + `mcardFs.exportHistory()` → `compilePortableSqlite` → `isSqlite3Binary` gate → `showSaveFilePicker`/Blob fallback → IndexedDB cache | `src/services/clm/corpusExportService.ts` (new) |
| **Governance receipts** | Receipts only on gated commits | Export events also mint receipt MCards into `executionLog` (card count + manifest digest) | `src/services/clm/corpusExportService.ts` |
| **Unit tests** | `tests/unit/clm/{gated-commit,triad}.test.ts` only | Corpus service + export round-trip + persistence tests | `tests/unit/clm/corpusExplorer.test.ts`, `tests/unit/clm/corpusExport.test.ts` |
| **E2E tests** | `e2e/corpus/gallery-visual.spec.ts` covers the static docs gallery only | New workbench spec: live filter, row→open, real CID, reload persistence | `e2e/sprint-15/corpus-explorer.spec.ts` |

---

## 3. Winston's Technical Architecture Specification

```
+----------------------------------------------------------------------------------------------------------------------+
|                                       MCard CORPUS EXPLORER DATA FLOW                                               |
|                                                                                                                      |
|   [Boot: createWorkbenchRuntime]                                                                                     |
|        │                                                                                                             |
|        ├─ initTriDatabase(ctx)  ──withBackends──>  SqlJsBackend (browser WASM SQLite)                                  |
|        │                                            ├─ hydrateFromIndexedDb()  <── 'tikzit:corpus-db' store            |
|        │                                            └─ debounced snapshot persist                                     |
|        ├─ registerTikzTriad(triDb)                                                                                   |
|        ├─ DocumentCommitService (saveDocumentWithGate)                                                               |
|        └─ CorpusExplorerService ('corpusExplorer')                                                                   |
|                 │  seed: fetch /docs/examples/zx-calculus/*.tikz ──saveDocumentWithGate──> handle zx:*               |
|                 ▼                                                                                                    |
|        mcard.collection (G-Set CRDT)                                                                                 |
|          list() · resolveHandle() · history(handle)                                                                  |
|                 │                                                                                                    |
|   [Explorer UI] │  $corpusQuery ──debounce 150ms──> searchCorpus(q)                                                  |
|                 ├─ row click ──> openEntry(handle) ──> resolveDocument → ctx.graph.setAST + WorkspaceManager          |
|                 └─ status bar ──> $documentHead.hash  (tikzit/document:change bridge, existing)                      |
|                                                                                                                      |
|   [Save Corpus (.db)]                                                                                                |
|        collection.list() ∪ storageBackend.list()  +  mcardFs.exportHistory()                                         |
|             └─> compilePortableSqlite() ──> isSqlite3Binary gate (INV-287-01) ──> showSaveFilePicker / Blob            |
|             └─> receipt MCard → triDb.executionLog (INV-03 audit)                                                    |
|                                                                                                                      |
|   [mcard-studio round-trip]  .db ──> importMCardDatabase(mode) ──> magic + 64-hex hash verify (INV-288-01)            |
+----------------------------------------------------------------------------------------------------------------------+
```

### 3.1 Corpus Explorer Service Contract
- `src/services/clm/corpusExplorerService.ts`, `class CorpusExplorerService extends Service` → `ctx.corpusExplorer`.
- `listCorpusEntries(prefix?): CorpusEntry[]` — derive from `mcardCollection.list()` joined with the handle registry (`putWithHandle` handles + `mcardFs.exportHistory()`), expose `{ handle, hash, name, nodeCount?, edgeCount?, updatedAt }`.
- `searchCorpus(query): CorpusEntry[]` — case-insensitive ranking: prefix match > substring > simple fuzzy.
- `openEntry(handle)` — `documentCommit.resolveDocument(handle)` → load source into workbench (`ctx.graph.setAST` + `WorkspaceManager.openDocument`/`$activeDiagram`) → `getDocumentHistory(handle)` feeds the existing VersionPopover.
- `seedZxCorpus()` — idempotent ingest of `public/docs/examples/zx-calculus/*.tikz` under `zx:*` handles (aligned with `PQP_BENCHMARK_FIXTURES`); skip handles already resolved.

### 3.2 Persistence Contract (INV-05 pillar separation preserved)
- `triDbAdapter.ts` gains `withBackends` path: `SqlJsBackend` when `window.indexedDB` is present, `NodeSqliteBackend` in Node, `MemoryBackend` under `CLM_ZERO_FS`/vitest.
- New `corpusPersistence.ts` ports `vfsPersistence.ts`: debounced (≈500 ms) serialized CAS snapshot → IndexedDB `tikzit_corpus_db`; `hydrateCorpusFromIndexedDb()` awaited inside `createWorkbenchRuntime` before triad registration.
- All three pillars (`knowledge`/`executionLog`/`mcard`) snapshot and rollback together via existing `TriDatabaseManager.savepoint()`/`rollback()`.

### 3.3 Sovereign Export Contract
- `exportCorpusDb()` mirrors `exportMCardDatabase()` minus the server hop:
  1. Collect `mcardCollection.list()` ∪ `mcardFs.storageBackend.list()` cards + `mcardFs.exportHistory()` rows.
  2. `compilePortableSqlite(cards, { history })` — direct `clm-kernel` import (async, returns `Uint8Array`).
  3. `isSqlite3Binary(bytes)` local gate (INV-287-01; port of `databaseSyncService.ts:36-40`).
  4. `saveDatabaseFileToDisk` port: `window.showSaveFilePicker({ types: ['.db','.sqlite','.sqlite3'] })` → Blob-download fallback → refresh IndexedDB cache.
  5. Mint receipt MCard into `triDb.executionLog` (verdict, card count, manifest digest, timestamp) per `documentCommitService` precedent.
- Round-trip target: `importMCardDatabase(bytes)` in mcard-studio must accept the file with zero INV-288-01 rejections.

### 3.4 Contract A: Dockview & Selector Invariants
- Cross-Sprint Contract B selectors are untouched: `#source-drawer-island`, `#toggle-source-drawer`, `[data-testid="status-bar"]`, `[data-testid="status-dockview-focal"]`, `[data-testid="panel-count-indicator"]` all preserved.
- New stable selectors: `[data-testid="corpus-search-input"]`, `[data-testid="corpus-entry-{handle}"]`, `[data-testid="corpus-save-btn"]`, `[data-testid="status-cid"]`.
- Drawer remains an `<aside>` sibling of Dockview — no new Dockview panel, no layout serialization change.

### 3.5 Contract B: Governance
- Every corpus write path funnels through `saveDocumentWithGate` — including seeding — so VCard bail semantics and `executionLog` receipts are uniform.
- Export emits a receipt even on `isSqlite3Binary` failure (verdict `bail`), matching the diagnostics precedent.

---

## 4. Amelia's Implementation Plan & Acceptance Criteria

| Step | Task | Target File(s) | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **15.1** | `CorpusExplorerService` + `seedZxCorpus()` | `src/services/clm/corpusExplorerService.ts`, `src/services/createWorkbenchRuntime.ts` | `listCorpusEntries()` returns 12 seeded `zx:*` entries; `searchCorpus('bialgebra')` returns the bialgebra handle first; `openEntry` resolves and emits `tikzit/document:change` |
| **15.2** | Live Explorer drawer wiring | `TikzitSpatialWorkbench.tsx`, `createWorkbenchStores.ts` (`$corpusQuery`) | Controlled input debounced ≤150 ms; rows rendered from service, not literals; click loads diagram + highlights row; empty query shows all |
| **15.3** | Real status-bar CID | `TikzitSpatialWorkbench.tsx` | CID span binds `$documentHead.hash`, algorithm-prefixed and truncated; updates on every gated commit |
| **15.4** | Persistent TriDatabase + IndexedDB hydration | `triDbAdapter.ts`, `src/services/clm/corpusPersistence.ts` (new) | `withBackends` + `SqlJsBackend` in browser, `MemoryBackend` in tests; corpus + `handle_history` identical after reload |
| **15.5** | Sovereign export `exportCorpusDb()` | `src/services/clm/corpusExportService.ts` (new), drawer header button | Produces bytes passing `isSqlite3Binary`; file picker/Blob fallback; `executionLog` receipt minted; `parsePortableSqlite` round-trip yields zero rejected cards |
| **15.6** | Unit + E2E coverage | `tests/unit/clm/corpusExplorer.test.ts`, `tests/unit/clm/corpusExport.test.ts`, `e2e/sprint-15/corpus-explorer.spec.ts` | Unit: seed→list→search→open, export bytes magic + round-trip, bail receipt, persistence hydration. E2E: type "bialgebra" filters list, click opens doc, CID matches `resolveHandle`, corpus survives reload |

---

## 5. Definition of Done (DoD) Checklist

- [ ] `corpusExplorer` Cordis service registered in `createWorkbenchRuntime`; 12 `zx:*` corpus MCards seeded via `saveDocumentWithGate` (idempotent).
- [ ] Search input is controlled (`$corpusQuery`), filters live with ≤150 ms debounce; "bialgebra" leaves only the bialgebra row.
- [ ] Explorer rows render from `listCorpusEntries()` — zero hardcoded diagram names remain in the drawer.
- [ ] Row click opens the diagram (canvas + source panels populated) and highlights the active row.
- [ ] Status bar shows the active card's real content hash via `$documentHead`, INV-02 prefixed/truncated.
- [ ] `initTriDatabase` uses `withBackends` + `SqlJsBackend` in browser; `CLM_ZERO_FS`/vitest still uses `MemoryBackend`.
- [ ] Corpus + `handle_history` survive page reload via debounced IndexedDB snapshot + boot hydration.
- [ ] "Save Corpus (.db)" produces a file passing `SQLite format 3\0` magic-byte check, saved via `showSaveFilePicker`/Blob fallback.
- [ ] Exported `.db` parses through `parsePortableSqlite` with zero rejected cards and intact `handle_history` (verified unit-side; mcard-studio `importMCardDatabase` accepts it).
- [ ] Export + every gated write mint receipt MCards into `executionLog`; bail path preserves prior handle and emits diagnostics.
- [ ] Unit tests in `tests/unit/clm/` pass; `e2e/sprint-15/corpus-explorer.spec.ts` green across configured Playwright projects.
- [ ] Zero regressions across existing vitest suites and all prior Playwright specs (incl. `e2e/corpus/gallery-visual.spec.ts` and the 59 Contract-B selector tests).
- [ ] `npx tsc --noEmit` 0 errors; `npm run build` succeeds.

---

## 6. Verification Commands

```bash
# tikzit workbench (this repo)
npx vitest run tests/unit/clm        # corpus service, export compile, hash display, persistence
npx playwright test e2e/sprint-15    # explorer search/open/export e2e
npx tsc --noEmit && npm run build

# clm kernel reference suite (external repo — kernel is consumed here as npm clm-kernel@^0.0.1)
cd ../../GovTech/MCard_TDD/clm/kernel/clm_js_core
npm run test -- tests/layer2_tikz_corpus.test.ts tests/layer2_mcardfs_history.test.ts tests/collection.test.ts

# mcard-studio import round-trip (external repo)
cd ../../GovTech/MCard_TDD/mcard-studio
npm run test:unit                    # then manual: Load .db via "Load MCard Database" modal
```

---

## 7. Out of Scope / Follow-ups

- Reticulum mesh distribution of the corpus — collection stays local-first this sprint.
- Full mcard-studio VFS adoption inside tikzit — this sprint reuses the *pipeline contract* (`compilePortableSqlite` / magic-byte verification / `exportHistory`), not the whole StudioWorkbench.
- CRDT merge of two exported `.db` files — `importMCardDatabase` merge mode is the seam; conflict policy deferred.
- Extracting `databaseSyncService`/`saveLocalFile`/`isSqlite3Binary` into a shared package — the tikzit port duplicates ~80 lines deliberately; a shared module is a candidate follow-up across both repos.
- Explorer UX beyond filter+open (rename, delete, drag-into-canvas) — deferred to a follow-up sprint.
