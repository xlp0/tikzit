# Sprint 21: Process Algebra & Petri Net State Machine Refactoring

**Status:** Proposed; not started  
**Primary Baldwin Operator:** Inverting ($\dashv$) & Splitting ($\times$)  
**Primary Subsystem:** `shell` / `sync`  
**Depends on:** [Sprint 20](./SPRINT-20-DUAL-SYSTEM-MAKEFILE-AND-SHARED-PROTOCOL.md)  
**Parent Proposal:** [Sprints 20–24](./PROPOSAL-20-24-ALGEBRAIC-MODULARITY-CLM-AND-BUILD-UNIFICATION.md)

---

## 1. Objective

Deconstruct the 1,100-line monolithic God runtime orchestrator ([`src/services/createWorkbenchRuntime.ts`](../../../src/services/createWorkbenchRuntime.ts)) into decoupled, single-responsibility actors governed by **Process Algebra (CSP)** and a formal **Place/Transition (PT) Petri Net**. Reduce `createWorkbenchRuntime.ts` from 1,100 lines to under 350 lines of pure Cordis wiring, eliminating race conditions between user edits, background flushes, tab closures, and multi-document persistence.

---

## 2. Current Gaps & Architectural Tension

1. **Monolithic Runtime God File (`src/services/createWorkbenchRuntime.ts`, 1,100 LOC)**:
   - Mixes Cordis service registry, Nanostores bridge synchronization, tab switching, buffer dirty calculation, MCard commit gating, IndexedDB snapshot persistence, and draft callout coordination into a single file.
   - Contains duplicated save-routing paths across `saveActiveCorpusEntry`, `saveDiagram`, `saveCorpusDb`, and `commitCorpusDocument`.

2. **Ad-Hoc Boolean Flags vs Algebraic Concurrency**:
   - Component state relies on scattered mutable flags: `doc.isDirty`, `doc.isDraft`, `doc.isSaving`, `persistence.state === 'stale'`, and local React component booleans.
   - Race hazard: If a user types during an asynchronous `persistence.flush()` operation, the document's dirty flag risks premature clearing (partially addressed by Sprint 15 H5, but still lacking formal algebraic token conservation).

3. **Tight Coupling between Canvas, Editor, and Storage**:
   - `CanvasPanel` and `SourcePanel` communicate via imperative event callbacks and mutable AST references rather than a typed message channel.

---

## 3. Mathematical & Algebraic Foundation

### 3.1 Document Lifecycle as a Marked Place/Transition (PT) Petri Net

We define the document lifecycle as a 5-tuple Petri Net $\mathcal{N} = (P, T, F, W, M_0)$:

- **Places ($P$)**:
  - $p_{\text{Draft}}$: Freshly minted uncommitted handle (`zx:diagrams:UUID`, `version: 0`).
  - $p_{\text{Clean}}$: Buffer content is identical to committed head MCard.
  - $p_{\text{Dirty}}$: Unsaved user edits present in text buffer or canvas graph.
  - $p_{\text{Parsing}}$: Background AST parsing in progress.
  - $p_{\text{ASTValid}}$: Buffer parses to a structurally sound TikZ AST.
  - $p_{\text{ASTInvalid}}$: Syntax error present; commit gate closed.
  - $p_{\text{Gating}}$: Gated commit criteria evaluation.
  - $p_{\text{Committed}}$: MCard minted and registered in handle history ($M$-Card Moore output).
  - $p_{\text{Flushing}}$: IndexedDB write in flight.
  - $p_{\text{Persisted}}$: Snapshot verified in persistent IndexedDB storage.
  - $p_{\text{Stale}}$: Multi-tab writer detected; further writes blocked.

- **Transitions ($T$)**:
  - $t_{\text{edit}}$: User input on canvas or editor: $p_{\text{Clean}} \to p_{\text{Dirty}}$.
  - $t_{\text{parse\_ok}}$: Parser succeeds: $p_{\text{Dirty}} \to p_{\text{ASTValid}}$.
  - $t_{\text{parse\_err}}$: Parser fails: $p_{\text{Dirty}} \to p_{\text{ASTInvalid}}$.
  - $t_{\text{save\_req}}$: User or Cmd+S triggers save: $p_{\text{ASTValid}} \to p_{\text{Gating}}$.
  - $t_{\text{commit}}$: Gate passes, card hash computed: $p_{\text{Gating}} \to p_{\text{Committed}}$.
  - $t_{\text{flush}}$: Atomic IDB write: $p_{\text{Committed}} \to p_{\text{Persisted}}$.
  - $t_{\text{stale\_detect}}$: Writer generation conflict: $p_{\text{Flushing}} \to p_{\text{Stale}}$.

- **Petri Net Invariants**:
  $$\forall M \in \mathcal{R}(M_0), \quad \sum_{p \in P_{\text{lifecycle}}} M(p) = 1$$
  *(Token Conservation: Exactly one active lifecycle marking per open document tab).*

### 3.2 Communicating Sequential Processes (CSP) Synchronization

$$\text{WorkbenchSession} \triangleq \text{EditorProcess} \parallel \text{CanvasProcess} \parallel \text{SyncChannel} \parallel \text{StorageSupervisor}$$

- `SyncChannel`: A bounded, non-blocking asynchronous channel mediating AST changes between editor typing and canvas node/edge positioning.
- `StorageSupervisor`: An isolated process supervising background flushes, retries, and writer generation checks, communicating purely via message passing with the document state actor.

---

## 4. Baldwin Splitting Plan: Decomposing `createWorkbenchRuntime.ts`

Deconstruct `src/services/createWorkbenchRuntime.ts` into four focused modules:

```
src/services/
├── createWorkbenchRuntime.ts              # Shell orchestrator & Cordis service assembly (<= 350 LOC)
├── lifecycle/
│   ├── DocumentProcess.ts                 # Petri Net document lifecycle actor (<= 280 LOC)
│   └── TabSessionController.ts            # Multi-document tab routing & focus (<= 200 LOC)
├── sync/
│   └── SyncChannel.ts                     # CSP message channel (Editor <-> Canvas) (<= 180 LOC)
└── storage/
    └── StorageSupervisor.ts               # Persistence, snapshotting & stale-guard (<= 220 LOC)
```

### 4.1 `src/services/lifecycle/DocumentProcess.ts`
- Encapsulates the Petri Net state transition table for each open document.
- Manages handle identity (`zx:examples:`, `zx:diagrams:`), head hash, version numbers, and metadata lineage.
- Guarantees token conservation: an active flush never clears the dirty marking if newer edits occurred while the flush was pending.

### 4.2 `src/services/sync/SyncChannel.ts`
- Implements CSP-style buffered communication between CodeMirror and Three.js canvas.
- Encapsulates debouncing, graph transaction aggregation, and selection propagation.
- Eliminates cyclic echo effects between source typing and canvas graph updates.

### 4.3 `src/services/storage/StorageSupervisor.ts`
- Encapsulates IndexedDB connection management, `SqlJsBackend` snapshots, and generation counters.
- Exposes clean methods: `flushSnapshot()`, `retryPersistence()`, and `handleStaleConflict()`.
- Dispatches typed notifications when persistence completes or enters the stale state.

### 4.4 `src/services/createWorkbenchRuntime.ts`
- Retains only Cordis microkernel instantiation, plugin registration, and store binding (`bindStoresToKernel`).
- Pure declarative composition of the extracted actors. Total length strictly under **350 lines of code**.

---

## 5. Acceptance Criteria

- **AC-21-01 (Runtime Line Count Limit)**: `src/services/createWorkbenchRuntime.ts` is reduced from 1,100 lines to **fewer than 350 lines of code**.
- **AC-21-02 (Modular Component Line Limit)**: Each newly created actor (`DocumentProcess.ts`, `TabSessionController.ts`, `SyncChannel.ts`, `StorageSupervisor.ts`) does not exceed **300 lines of code**.
- **AC-21-03 (Petri Net State Determinism)**: Document lifecycle states follow the formal Petri Net state machine. All ad-hoc boolean mutations are replaced by atomic action dispatches.
- **AC-21-04 (Token Conservation Verification)**: Edits performed during an active asynchronous persistence flush are provably preserved and maintain the dirty marking until the subsequent save completes.
- **AC-21-05 (Zero Regressions)**: All existing Vitest unit tests (355 tests) and Playwright E2E suites (392 tests) pass 100% green without modification to external test contracts.
