# Sprint 39: Cofree Timeline, Revertible Effects & Coeffect Panels

**Directory:** `docs/sprints/shell/39-cofree-timeline-revertible-effects-and-coeffect-panels`  
**Subsystem Category:** `shell`  
**Status:** ✅ **Completed & Graduated**  
**Date:** 2026-09-29  

---

## 1. Executive Summary

Sprint 39 completed the spatiotemporal interaction architecture for `@clm/mcard-explorer`, formalizing interactive user history and side-effects through Spencer Breiner's polynomial cofree comonad ($P \triangleleft -$) and Noetherian reversibility discipline ($H_T \to 0$ in $< 1$ms):

1. **Time Subsystem (`time/`)**:
   - `types.ts`: Core contracts `InteractionNode`, `RevertibleEffect`, `JournalMark`, `JournalEntry`.
   - `InteractionTree.ts`: Headless append-only interaction tree engine ($p, d \in P[p] \to \text{Node}$). Rewinding moves a cursor without deleting future history; branching creates sibling subtrees; `foldHistoryLineage` incorporates version lineages; bounded memory pruning preserves active paths.
   - `journal.ts`: Revertible effect journal engine composing kernel `DisposableList` and `SavepointGuard`. Provides zero-residue rollback, LIFO unwinding, mark boundaries, and atomic fail-safe execution.
   - `replay.ts`: Purity-guaranteed session reconstruction (`replayTo`); side-effect isolation auditing (`auditInvertibility`).
   - `timeline.ts`: Deep-link URL hash synchronization (`#t=<nodeId>`) through `TimelineNavigationProvider`.
   - `hostEffectContext.ts`: Pure headless port contract `HostEffectContext` and `bindHostEffects` binding journal and coeffect lifecycle without importing host frameworks.
   - `index.ts`: Strict façade export boundary adhering to ADR D54.

2. **Poly Glot Additions (`poly/`)**:
   - `coeffects.ts`: `CoeffectHost` and `CoeffectEnvironment` implementing narrow slice subscriptions and environment capabilities (viewport, permissions, storage quota, active device) with dynamic legality re-evaluation.
   - `dayConvolution.ts`: Day convolution tensor product ($P \boxtimes Q$) for composite positions and direction pairs ($(d_P, d_Q)$), with pair legality holding iff both individual directions are legal, plus isolated panel state composition (`composePanelStates`).

3. **Universal Decomposed UI Viewlets (`ui/`)**:
   - `TimelineScrubber.tsx`: Interactive horizontal timeline scrubber with historical alternative direction inspectability, branching button, and keyboard scrubbing (Left/Right arrow, Cmd/Ctrl+Z undo, Alt+B branch).
   - `JournalIndicator.tsx`: Reactive indicator showing pending reversible actions with single-click undo.
   - `ViewerHeader.tsx`: Extracted card header with metadata, badges, and quick actions.
   - `ViewportHost.tsx`: Decomposed multimodal viewport rendering cards via polyglot renderers.
   - `ViewerShell.tsx`: Unified layout container housing toolbar, header, viewport, and scrubber.
   - `MCardViewer.tsx`: Decomposed from a monolithic 160 LOC component into an 82 LOC composition root.

4. **Kenotic Host Adapter (`src/services/clm/`)**:
   - `coeffectCordisAdapter.ts`: Bridges host Cordis Context to `HostEffectContext` without leaking Cordis types into `@clm/mcard-explorer`.

5. **Architectural Guardrails & Conformance**:
   - **Contract D**: All 68 decomposed modules strictly adhere to LOC targets ($\le 150$ LOC target, $\le 250$ LOC ceiling).
   - **Contract E**: `check-vcs-isolation.mjs` verifies 0 DOM globals and 0 host imports in `time/` and `poly/`.
   - **Contract B**: Locked 310 literal selectors and 27 dynamic prefixes in `docs/testing/testid-baseline.json`.
   - **Layering (ADR D57)**: `@layer L4 interface/membrane` declared on every `time/` and `poly/` file.

---

## 2. Verification Matrix & Definition of Done (23/23 Gates Verified)

- [x] **39-DOD-01**: **Cofree Interaction Tree Engine** (`time/InteractionTree.ts`, 157 LOC $\le 180$ LOC) — Implements `record`, `path`, `rewind`, `branchFrom`, `attachLineage`, `alternatives`, `toJSON`/`fromJSON`, `serialize`/`deserialize`. Verified by `InteractionTree.test.ts`.
- [x] **39-DOD-02**: **Historical Fiber Alternatives Resolution** — `alternatives(nodeId)` re-resolves historical affordance fiber; historical legality immutable to present state changes. Verified by `InteractionTree.test.ts -t "historical alternatives"`.
- [x] **39-DOD-03**: **Revertible Effect Journal Engine** (`time/journal.ts`, 83 LOC $\le 150$ LOC) — Implements `run`, `push`, `undo`, `rollbackTo`, `mark`, `isClean`, `entries`, `size`. Verified by `journal.test.ts`.
- [x] **39-DOD-04**: **Zero-Residue Gate ($\ge 6$ Representative Effects)** — After `rollbackTo(mark)`, host declared slices return to initial snapshot with deep equality; `SavepointGuard` rollback prevents leaked reverts. Verified by `journal.test.ts -t "zero residue"`.
- [x] **39-DOD-05**: **Replay Purity & Side-Effect Absence** (`time/replay.ts`, 32 LOC $\le 120$ LOC) — `replayTo(nodeId)` reconstructs interface state with zero external I/O side effects. Verified by `replay.test.ts -t "replay purity"`.
- [x] **39-DOD-06**: **Session Recovery & Memory Bound** — JSON serialization round-trip; dead branch pruning maintains active spine. Verified by `sessionRecovery.test.ts`.
- [x] **39-DOD-07**: **Coeffect Declarations & Narrow Subscriptions** (`poly/coeffects.ts`, 108 LOC $\le 150$ LOC) — Implements `CoeffectHost` and `CoeffectEnvironment`; capability updates re-evaluate direction legality without page reload. Verified by `coeffects.test.ts`.
- [x] **39-DOD-08**: **Day Convolution Panel Decoupling** (`poly/dayConvolution.ts`, 87 LOC $\le 90$ LOC) — Implements `dayProductDirections` ($P \boxtimes Q$) and `composePanelStates`. Verified by `dayConvolution.test.ts`.
- [x] **39-DOD-09**: **Global Store Migration to Narrow Slices** — Coeffects scoped per instance; mutating Instance A does not trigger direction re-evaluations in Instance B. Verified by `coeffectIsolation.test.ts`.
- [x] **39-DOD-10**: **UI Decomposition of Viewer & Timeline** — `TimelineScrubber.tsx` (132 LOC $\le 140$), `ViewerShell.tsx` (41 LOC $\le 100$), `ViewerHeader.tsx` (45 LOC $\le 90$), `ViewportHost.tsx` (83 LOC $\le 120$), `JournalIndicator.tsx` (37 LOC $\le 80$), `MCardViewer.tsx` (82 LOC $\le 90$).
- [x] **39-DOD-11**: **Timeline Contract B Registration** — 310 literal selectors + 27 dynamic families registered and verified via `node scripts/audit-testids.mjs --check`.
- [x] **39-DOD-12**: **Keyboard Shortcut Absence & Precedence** — Left/Right scrubs timeline nodes, Cmd/Ctrl+Z triggers `journal.undo()`, Alt+B triggers `branch()`. Verified by `keyboardShortcuts.test.ts`.
- [x] **39-DOD-13**: **Contract E Zero-DOM Isolation Gate** — Verified 0 DOM globals and 0 host imports in `time/` and `poly/` via `node scripts/check-vcs-isolation.mjs`.
- [x] **39-DOD-14**: **Time & Coeffects Unit Test Suite** — 100% pass across all unit tests in `time/` and `poly/`.
- [x] **39-DOD-15**: **Full Vitest Regression Suite & Type Check** — All 63 test files and 292 tests green; `tsc --noEmit` exits with status 0.
- [x] **39-DOD-16**: **Single-Concern Module Audit** — All 68 modules satisfy LOC ceilings via `node scripts/audit-concerns.mjs`.
- [x] **39-DOD-17**: **Kernel Layer Declarations & Disposal Composition** — Every `time/` module carries `@layer L4`; composes kernel `DisposableList` and `SavepointGuard`.
- [x] **39-DOD-18**: **HostEffectContext Port & Cordis Host Adapter** — `coeffectCordisAdapter.ts` maps Cordis; zero `cordis` imports inside `time/` or `poly/`.
- [x] **39-DOD-19**: **Nanostores Atom Slice Binding** — Slices bound via nanostores `listenKeys`; zero unnecessary notifications. Verified by `nanostoresSlice.test.ts`.
- [x] **39-DOD-20**: **Teardown Parity with `useCordisFiber`** — Verified in `tests/conformance/studio-parity.test.ts -t "teardown parity"`.
- [x] **39-DOD-21**: **Kernel DisposableList Convergence Documentation** — Studio `DisposableList` convergence documented in sprint specification.
- [x] **39-DOD-22**: **Timeline Deep Linking & URL Navigation** — `#t=<nodeId>` hash round-trip verified by `timelineNavigation.test.ts`.
- [x] **39-DOD-23**: **Façade Discipline (ADR D54)** — `time/index.ts` and `poly/index.ts` are exclusive public exports; zero internal subpath imports from `ui/`.

---

## 3. Evidence Ledger

```
src/packages/mcard-explorer/time/
  types.ts                32 LOC  (ceiling:  80 LOC)
  InteractionTree.ts     157 LOC  (ceiling: 180 LOC)
  journal.ts              83 LOC  (ceiling: 150 LOC)
  replay.ts               32 LOC  (ceiling: 120 LOC)
  timeline.ts             45 LOC  (ceiling: 110 LOC)
  hostEffectContext.ts    48 LOC  (ceiling:  80 LOC)
  index.ts                 8 LOC  (ceiling:  50 LOC)

src/packages/mcard-explorer/poly/
  coeffects.ts           108 LOC  (ceiling: 150 LOC)
  dayConvolution.ts       87 LOC  (ceiling:  90 LOC)

src/packages/mcard-explorer/ui/
  TimelineScrubber.tsx   132 LOC  (ceiling: 140 LOC)
  JournalIndicator.tsx    37 LOC  (ceiling:  80 LOC)
  ViewerHeader.tsx        45 LOC  (ceiling:  90 LOC)
  ViewportHost.tsx        83 LOC  (ceiling: 120 LOC)
  ViewerShell.tsx         41 LOC  (ceiling: 100 LOC)
  MCardViewer.tsx         82 LOC  (ceiling:  90 LOC)
```
