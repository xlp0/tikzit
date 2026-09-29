# Sprint 30: Universal Type Judgment & Stratified Type Lattice Integration

**Sprint ID:** `SPRINT-30`  
**Subsystem Category:** `corpus`  
**Target:** `@clm/mcard-vcs/type` & Type-Enriched Storage Lenses  
**Dependencies:** `clm-kernel` (v0.0.1) root exports `TypeInterpreter`, `TypeJudgment`, `UniverseLevel`, `UNIVERSE_NAMES`, `detectMime`, `TypedValue`, Sprint 25 (`OperadicMCardVfs`), Sprint 26 (`ExplorerQueryFacade`)  
**Target LOC:** $\le 250$ LOC per file (Contract D)  
**Zero-DOM Gate:** Contract E (100% headless, zero DOM globals)  

---

## 1. Context & Motivation
Under the CLM principle *"All things are MCards"*, every artifact stored in `OperadicMCardVfs` (whether a TikZ diagram, a ZX tensor, a markdown document, a Petri net process, a Hoare sandwich proof witness, a Satori dialogue turn, or a sovereign `.db` collection) is content-addressed and immutable.

However, `@clm/mcard-vcs` currently treats cards as raw byte blobs with an optional unverified `mimeType` string defaulting to `application/json`. It possesses no knowledge of:
1. **The 6-tier Universe level hierarchy ($U_0 \to U_5$)** defined in `clm-kernel`'s `layer5/typeLattice.ts`.
2. **The 5-phase deterministic type judgment pipeline** implemented in `clm-kernel`'s `TypeInterpreter`.
3. **Semantic categories** (`diagram`, `process`, `proof`, `conversation`, `data`, `text`, `blob`, `collection`).

This sprint introduces `@clm/mcard-vcs/type`, wrapping `clm-kernel`'s `TypeInterpreter` into an autonomous, extensible `CardTypeJudgeService`, enriching `CardView` and `ExplorerCardSummaryDto` with universe coordinates and category metadata, and providing type-aware conversational lenses.

---

## 2. Deliverables & Technical Architecture

### 2.1 Extended Type Definitions (`src/packages/mcard-vcs/type/types.ts`)
Formalizes the type judgment and universe coordinates contract. **Reuse, don't fork**: kernel `TypeJudgment` already carries `mime`, `universe` (string `'U0'..'U5'`), `isBinary`, `confidence`, `matchedRule`, `extension?`, `category`, `metadata?`. We extend it only with a derived display name:

```typescript
// Root package export ONLY — 'clm-kernel/dist/*' and 'clm-kernel/layer5'
// are NOT in the package `exports` map and will fail module resolution.
import { UniverseLevel, UNIVERSE_NAMES, type TypeJudgment, type Universe } from 'clm-kernel';

export type CardCategory =
  | 'diagram'
  | 'process'
  | 'proof'
  | 'conversation'
  | 'data'
  | 'text'
  | 'blob'
  | 'collection';

/** Kernel TypeJudgment enriched with display fields derivable via UNIVERSE_NAMES. */
export interface ExtendedTypeJudgment extends TypeJudgment {
  /** 'U0_Mcard' | 'U1_Pcard' | 'U2_Vcard' | 'U3_Satori' | 'U4_Membrane' | 'U5_MetaGamma' */
  universeName: string;
  /** Numeric UniverseLevel enum for isStratified() checks (from 'U0'..'U5' string). */
  universeLevel: UniverseLevel;
  /** Narrowed category for CLM domain types (falls back to dictionary category). */
  clmCategory?: CardCategory;
  /** FND classification via kernel classifyClm(): 'Function' (operator/PCard) or 'Number' (static/MCard). */
  fndClassification?: 'Function' | 'Number';
  /** Execution dialect via kernel detectDialect(): 'M' (process) | 'A' (dispatcher) | 'B' (runtime) | 'C' (concrete). */
  dialect?: string;
}

export interface TypeJudgeOptions {
  data: Uint8Array | string;
  handle?: string;
  filename?: string;
  extHint?: string;
  declaredMime?: string;
}

/** universe: 'U0' → UniverseLevel.U0_Mcard (single mapping site, uses getUniverseCoordinates). */
export function universeLevelOf(universe: Universe | string): UniverseLevel;
export function universeNameOf(universe: Universe | string): string;
```

### 2.1a Explorer Data Source Port Interface (`src/packages/mcard-explorer/core/datasource/types.ts`)
**ADR D42 — Port Ownership**: The explorer package **owns** all DTOs and port interfaces. Host implementations (`ExplorerQueryFacade` in TikZiT, `studioMCardFs` adapter in mcard-studio) implement these ports. This is the foundational decoupling that makes `@clm/mcard-explorer` reusable across hosts.

```typescript
import type { TypeJudgment } from 'clm-kernel';
import type { TypedValueDict } from 'clm-kernel'; // kernel's canonical typed wrapper

/** Serializable card summary — aligns with TypedValueDict shape. */
export interface ExplorerCardSummaryDto {
  handle: string;
  hash: string;
  mimeType: string;
  universe?: string;      // 'U0'..'U5' (kernel Universe)
  universeName?: string;  // 'U0_Mcard' etc.
  category?: string;      // dictionary category
  clmCategory?: CardCategory;
  payloadKind?: 'scalar' | 'text' | 'satori' | 'binary' | 'structured' | 'executable'; // MCardPayload.kind
  isBinary?: boolean;
  confidence?: number;
  fndClassification?: 'Function' | 'Number';
  updatedAt: string;
}

/** Full card content for rendering — aligns with TypedValueDict shape. */
export interface CardContentDto {
  handle: string;
  hash: string;
  content: Uint8Array;
  text: string;           // UTF-8 decoded (empty for binary)
  mimeType: string;
  payloadKind: 'scalar' | 'text' | 'satori' | 'binary' | 'structured' | 'executable';
  typeJudgment?: TypeJudgment;
  metadata?: Record<string, unknown>;
}

/** Search filter — universe/category filtering is SQL-level, not post-fetch. */
export interface ExplorerSearchFilter {
  pattern?: string;
  mimeType?: string;
  universe?: string;      // SQL WHERE clause on universe column
  category?: string;      // SQL WHERE clause on category column
  payloadKind?: string;   // SQL WHERE on payload_kind column
  limit?: number;
}

/** History entry for a handle's version chain. */
export interface ExplorerHistoryEntryDto {
  hash: string;
  changedAt: string;
  authorDid: string;
  message: string;
  position?: number;
  isHead?: boolean;
}

/**
 * Abstract data source port — the ONLY interface MCardExplorerEngine depends on.
 * Implementations: ExplorerQueryFacade (TikZiT), studioMCardFs adapter (mcard-studio).
 */
export interface ExplorerDataSource {
  search(filter: ExplorerSearchFilter): Promise<ExplorerCardSummaryDto[]>;
  getContent(handle: string): Promise<CardContentDto | null>;
  getHistory(handle: string): Promise<ExplorerHistoryEntryDto[]>;
  subscribe(cb: (event: unknown) => void): () => void;
}

/**
 * Content provider port for MCardViewer — subset of ExplorerDataSource.
 * Allows the viewer to fetch card content independently of the explorer engine.
 */
export interface CardContentProvider {
  getContent(handle: string): Promise<CardContentDto | null>;
}
```

**Key design decisions:**
- `ExplorerCardSummaryDto` adds `payloadKind` (from `MCardPayload.kind` discriminated union) enabling **two-level viewlet dispatch**: first by `kind`, then by `mimeType`.
- `ExplorerSearchFilter` specifies `universe` and `category` as **SQL-level** WHERE clauses — not post-fetch JavaScript filtering (Gap 7).
- `CardContentDto` aligns with `TypedValueDict` shape from `clm-kernel`, ensuring cross-system parity.
### 2.2 Card Type Judge Service (`src/packages/mcard-vcs/type/CardTypeJudgeService.ts`)
Wraps `TypeInterpreter.createDefault()` from `clm-kernel` — which loads the **bundled 48-type SSOT `type_dictionary`** — and registers **only delta types** via `registerType(TypeDefinition)`. Additionally calls `classifyClm()` and `detectDialect()` on structured payloads to enrich judgments with FND classification. Verified dictionary entries we must **reuse, not re-declare** (canonical mimes per ADR D43):

| Canonical MIME | Dict Category/Universe | Our Use |
| :--- | :--- | :--- |
| `text/x-tikz` | `code` / `U0` | TikZ diagrams — **canonical** (NOT `text/vnd.tikz`); clmCategory override → `diagram` |
| `application/vnd.pcard+json` | `data` / `U1` | PCard processes — **canonical** (NOT `application/vnd.clm.pcard+json`) |
| `application/vnd.vcard+json` | `data` / `U1` | VCard witnesses — **canonical mime**; lattice override lifts to `U2` (ADR D43) |
| `application/vnd.mcard+json` | `data` / `U1` | Generic MCard payloads |
| `application/x-sqlite3` | `blob` / `U0` | Sovereign `.db` collections — **canonical** (NOT `application/vnd.sqlite3`); clmCategory → `collection` |
| `text/markdown`, `application/json`, `application/x-yaml`, `application/yaml`, `text/csv`, `application/xml`, `image/*` | dict | Polyglot fallbacks — zero work |

**New registrations (dictionary deltas only):**
1. **ZX-Calculus Graph** (`application/vnd.zx-graph+json`):
   - Extensions: `['.zx.json', '.zx']`; Universe: `'U0'`; Category: `'diagram'`
   - Patterns: `"spiders":`, `"spider_type":`, `"zx:diagrams:"`
2. **Satori Dialogue Turn** (`application/vnd.satori.turn+xml`):
   - Extensions: `['.satori.xml', '.turn.xml']`; Universe: `'U3'`; Category: `'conversation'`
   - Patterns: `<satori`, `<card`, `<execute`, `<turn`, `<message`

**Single-site overrides** (kept in one `CLM_OVERRIDES` table, applied post-`judge()`):
- `text/x-tikz` → `clmCategory: 'diagram'` (dict category `code` is preserved in `category`).
- `application/vnd.vcard+json` → `universe: 'U2'`, `universeLevel: UniverseLevel.U2_Vcard` (ADR D43 lattice override).
- `application/x-sqlite3` → `clmCategory: 'collection'`.
- Handle-prefix hints (`zx:diagrams:*` → diagram, `zx:meta:*` → metadata) applied **before** judging when `declaredMime` is absent.

**Kernel reuse (do not re-implement):** `detectMime`/`isBinary` for byte sniffing inside validators; `detectEpistemicStatus` for `clmCategory` refinement on CLM JSON; `classifyClm` for FND classification (`'Function'` | `'Number'`); `detectDialect` for execution dialect annotation; `TypedValue`/`computeContentHash` for the enriched `CardView` payload shape.

**Cordis Service Registration (Gap 6):** `CardTypeJudgeService` must provide a `registerTypeJudgeService(ctx: Context, service: CardTypeJudgeService)` function following the kernel pattern (`registerCollectionService`, `registerRuntimeAdapters`). This enables `mcard-studio`'s Cordis plugin system to consume the service natively via `ctx['mcard.typeJudge']`.

### 2.3 Type-Aware Storage Lenses & DTO Enrichment
1. **`CardView` & `SetCardOptions` (`src/packages/mcard-vcs/storage/lens/types.ts`)**:
   - Add fields:
     ```typescript
     export interface CardView {
       // ... existing fields ...
       typeJudgment?: ExtendedTypeJudgment;
       universe?: string;
       category?: string;
     }
     ```
2. **`OperadicMCardVfs` (`src/packages/mcard-vcs/storage/OperadicMCardVfs.ts`)**:
   - In `putCard` and `set`, instantiate `CardTypeJudgeService` if no explicit MIME type is supplied.
   - Automatically determine MIME type, Universe coordinate, and category, and persist in companion metadata.
3. **Explorer DTOs & Port (`src/packages/mcard-explorer/core/datasource/`) — ADR D42**:
   - DTO **ownership moves to the explorer port**: `ExplorerCardSummaryDto`, `ExplorerSearchFilter`, `ExplorerTreeNode`, `ExplorerHistoryEntryDto` are declared in `datasource/types.ts` (explorer package) — the **single definition** is §2.1a above (`payloadKind`, `fndClassification`, `clmCategory` included); `ExplorerTreeNode` gains optional `universe`/`category` for tree facet badges. `ExplorerQueryFacade` in `mcard-vcs` re-exports/implements them. Existing `mcard-vcs/explorer/ExplorerQueryFacade.ts` keeps its public shape so host code doesn't churn.
   - `ExplorerSearchFilter` (§2.1a) supports `universe`, `category`/`clmCategory`, and `payloadKind` as SQL-level WHERE clauses.
   - `MCardExplorerEngine` is repointed to the `ExplorerDataSource` port interface (engine no longer names the concrete `ExplorerQueryFacade` class).

---

## 3. Definition of Done (DoD) Criteria

- [ ] **30-DOD-01**: `src/packages/mcard-vcs/type/types.ts` is implemented satisfying Contract D ($\le 120$ LOC), exporting `ExtendedTypeJudgment` (extends kernel `TypeJudgment`), `CardCategory`, `TypeJudgeOptions`, `universeLevelOf`, `universeNameOf`. All kernel imports come from the `'clm-kernel'` root export — **zero deep `dist/`/`layer5/` imports**.
- [ ] **30-DOD-02**: `src/packages/mcard-vcs/type/CardTypeJudgeService.ts` is authored ($\le 240$ LOC), wrapping `TypeInterpreter.createDefault()` with **delta-only** `registerType` calls (ZX-graph, Satori turn) plus the single-site `CLM_OVERRIDES` table — no re-declaration of the 48 SSOT dictionary types.
- [ ] **30-DOD-03**: The 5-phase deterministic judgment pipeline (Magic Bytes $\to$ Text Regex $\to$ Validator $\to$ Extension Hint $\to$ Binary Heuristic) is strictly verified, including SSOT pass-through: `text/x-tikz`, `application/vnd.pcard+json`, `application/vnd.vcard+json`, `application/x-sqlite3`, `text/markdown`, `text/csv` judged by the dictionary itself.
- [ ] **30-DOD-04**: `CardView` and `SetCardOptions` in `lens/types.ts` include `typeJudgment`, `universe`, and `category` fields (aligned to `TypedValueDict` shape).
- [ ] **30-DOD-05**: `OperadicMCardVfs.putCard` automatically classifies unannotated cards and records universe coordinates ($U_0 \to U_5$) in card metadata.
- [ ] **30-DOD-06**: `ExplorerDataSource`, `CardContentDto`, `CardContentProvider`, `ExplorerCardSummaryDto`, `ExplorerSearchFilter`, `ExplorerHistoryEntryDto`, and `ExplorerTreeNode` are defined in `mcard-explorer/core/datasource/types.ts` (D42 port ownership). `ExplorerCardSummaryDto` includes `payloadKind`, `universe`, `universeName`, `category`, `clmCategory`, `isBinary`, `confidence`, `fndClassification`. `ExplorerSearchFilter` supports `universe`, `category`, and `payloadKind` as SQL-level WHERE clauses.
- [ ] **30-DOD-07**: `ExplorerDataSource.search()` supports filtering by `universe` (e.g. `'U1'`), `category`/`clmCategory`, and `payloadKind` at the SQL level; `MCardExplorerEngine` compiles against `ExplorerDataSource` port interface only — grep proves zero `mcard-vcs` imports inside `src/packages/mcard-explorer/`.
- [ ] **30-DOD-08**: `tests/unit/mcard-vcs/type/CardTypeJudgeService.test.ts` passes with $\ge 12$ diverse fixtures **plus** a mcard-studio parity fixture asserting identical mime/universe for identical bytes. Structured payloads verify `fndClassification` and `dialect` fields.
- [ ] **30-DOD-09**: Contract E isolation check passes: `scripts/check-vcs-isolation.mjs` `TARGET_DIRECTORIES` is extended to include `mcard-vcs/type` and `mcard-explorer/core/datasource`; `CardTypeJudgeService` contains 0 DOM globals and 0 host imports.
- [ ] **30-DOD-10**: Existing 505 tests in the TikZiT test suite pass with zero regressions (kickoff-recorded baseline).
- [ ] **30-DOD-11**: `registerTypeJudgeService(ctx, service)` Cordis registration function is implemented, registering `CardTypeJudgeService` on `ctx['mcard.typeJudge']` following the kernel's `registerCollectionService` pattern.
