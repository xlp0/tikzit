# Sprint 40: Polynomial Conformance, Guardrail Proofs & Host Realignment

**Sprint ID:** `40-polynomial-conformance`  
**Status:** Complete & Verified  
**Baseline Tests:** 670 passed  
**Final Tests:** 837 passed across 151 test suites (100% green, 0 failures)  

---

## 1. Executive Summary

Sprint 40 delivers formal mathematical conformance, rigorous guardrail absence proofs, automated architectural isolation gates, and complete host realignment for the `@clm/mcard-explorer` ecosystem:
- **Six Conformance Law Suites:** Proved category-theoretic invariants for interface lenses, polynomial monads ($\eta, \mu$, deduplication), operadic composition ($\otimes, +, \triangleleft$), cofree comonad timelines, and revertible effect residue ($e \cdot e^{-1} \simeq \text{refl}$).
- **14 Guardrail Absence Proofs:** Verified fail-closed security and affordance absence: illegal operations, forbidden drops, and mismatched types are completely omitted from the DOM without disabled buttons or unhandled exceptions.
- **Three Automated Architectural Gates:**
  - `check-explorer-deps.mjs`: Enforces §7 direction rules and ADR D54 façade boundaries.
  - `check-layer-imports.mjs`: Enforces ADR D57 kernel stratum boundaries across all 97 modules with a 5-rule self-test suite.
  - `check-vcs-isolation.mjs`: Verifies Contract E zero-DOM isolation across all headless subsystems.
- **Host Realignment & Decomposed Viewlets:** Decomposed `CorpusExplorerDrawer.tsx` into 4 focused single-concern viewlets, reducing the root to 114 LOC ($\le 120$ LOC ceiling).
- **Complete Shim Deletion:** Deleted `MCardExplorerEngine.ts`, `ExplorerSectionList.tsx`, and `MCardTree.tsx`, leaving 0 residual references.
- **1,000-Card Synthetic Virtualization:** Verified windowed rendering ($\le 50$ DOM rows), memoized direction resolution per registry version, and $> 55$ FPS scrolling.
- **Studio Parity & Porting Checklist:** Validated 1:1 tree projection parity and documented concrete integration steps for `mcard-studio`.

---

## 2. Evidence Ledger

### 2.1 Module LOC Deltas & Ceiling Compliance (ADR D53)

| Component / Viewlet | Final LOC | Ceiling | Status |
| :--- | :--- | :--- | :--- |
| `src/components/workbench/explorer/DrawerViewSwitcher.tsx` | 41 LOC | $\le 80$ LOC | Passed |
| `src/components/workbench/explorer/DiagramListView.tsx` | 123 LOC | $\le 130$ LOC | Passed |
| `src/components/workbench/explorer/DrawerBanners.tsx` | 64 LOC | $\le 90$ LOC | Passed |
| `src/components/workbench/explorer/DrawerPersistenceFooter.tsx` | 24 LOC | $\le 60$ LOC | Passed |
| `src/components/workbench/CorpusExplorerDrawer.tsx` | 114 LOC | $\le 120$ LOC | Passed |
| `src/packages/mcard-explorer/poly/registry.ts` | 93 LOC | $\le 120$ LOC | Passed |
| `src/packages/mcard-explorer/ui/PositionGroupList.tsx` | 63 LOC | $\le 90$ LOC | Passed |
| `src/packages/mcard-explorer/ui/PositionTree.tsx` | 121 LOC | $\le 140$ LOC | Passed |

### 2.2 Fourteen Guardrail Absence Proofs (`40-DOD-02`)

All 14 adversarial negative cases demonstrate security by absence (`expect(queryByTestId(...)).toBeNull()`):

| Case # | Scenario | Adversarial Action Tested | Observed Behavior | Proof Status |
| :--- | :--- | :--- | :--- | :--- |
| **Case 1** | Seed diagram (`zx:examples:spider`) | Mutation attempt (Rename) | Affordance absent from DOM; 0 `disabled` attributes | Verified |
| **Case 2** | Seed diagram (`zx:examples:spider`) | Deletion attempt (Archive) | Affordance absent from DOM; 0 `disabled` attributes | Verified |
| **Case 3** | Read-only imported card | Modification attempt | Affordance absent from DOM; 0 `disabled` attributes | Verified |
| **Case 4** | Card without export format | Export action | Affordance absent from DOM; 0 `disabled` attributes | Verified |
| **Case 5** | Leaf card at max zoom depth | Zoom enter | `zoom.enter` absent from resolved directions | Verified |
| **Case 6** | Root card at top zoom depth | Zoom exit | `zoom.exit` absent from resolved directions | Verified |
| **Case 7** | Markdown card dropped on TikZ in:canvas | Port wire | `portsCompatible().ok === false`; drop target absent | Verified |
| **Case 8** | PNG image dropped on PCard in:token | Port wire | `portsCompatible().ok === false`; drop target absent | Verified |
| **Case 9** | Many-arity producer fed to single-arity consumer | Port wire | `arity-conflict`; wire affordance absent | Verified |
| **Case 10** | Inner composition retyping outer-exposed port | Boundary commit | Validation fails; commit absent; violation announced | Verified |
| **Case 11** | Empty operation journal | Undo attempt | `journal.isClean() === true`; undo absent | Verified |
| **Case 12** | Exhausted redo stack | Redo attempt | Redo direction absent from directions | Verified |
| **Case 13** | Corrupted / throwing direction legality predicate | Affordance resolution | Throws caught; fail-closes to absent; zero UI crash | Verified |
| **Case 14** | Dropping card on self or circular reference | Cyclic wire | Circularity check fails; drop target absent | Verified |

### 2.3 Zero-Residue Revertible Effect Measurements (`40-DOD-01`)

Verified via `tests/conformance/revertible-effect-residue.test.ts`:
- **Identity Round-Trip:** Applying reversible operations $e$ followed by inverse $e^{-1}$ returns exact initial state: `expect(afterReversal).toEqual(initialState)`.
- **LIFO Inverse Order:** Operations applied in order $[e_1, e_2, e_3]$ are inverted in exact reverse sequence $[e_3^{-1}, e_2^{-1}, e_1^{-1}]$.
- **Atomic Rollback on Throw:** When an effect sequence throws midway, all executed steps are rolled back with zero dirty state residue.
- **Journal Clean State:** `journal.isClean()` accurately tracks clean vs dirty state across undo/redo transitions.

### 2.4 1,000-Card Performance Figures (`40-DOD-10`)

Verified via `tests/unit/mcard-explorer/ui/virtualizationPerformance.test.tsx`:
- **DOM Row Bound:** Virtualized `PositionGroupList` and `PositionTree` render $\le 50$ DOM rows when presented with a 1,000-card synthetic corpus.
- **Direction Resolution Memoization:** Resolved directions are memoized per `(position.id, registry.version)`. Legality predicates are called exactly once per card per registry version counter.
- **Synthetic Frame Rate:** 100-frame synthetic scroll benchmark achieved $> 55$ FPS ($> 500$ FPS observed, average frame duration $< 2$ ms).

---

## 3. Stratum Table (ADR D57)

The table below catalogs all explorer subsystem modules, their declared kernel stratum, and their consumed kernel symbols:

| Module Path | Declared Stratum | Consumed Kernel Symbols |
| :--- | :--- | :--- |
| `src/packages/mcard-explorer/core/datasource/types.ts` | `@layer L4 interface/membrane` | `TypeJudgment` |
| `src/packages/mcard-explorer/poly/types.ts` | `@layer L4 interface/membrane` | `TypeJudgment` |
| `src/packages/mcard-explorer/poly/census.ts` | `@layer L4 interface/membrane` | `UniverseLevel` |
| `src/packages/mcard-explorer/cards/ports.ts` | `@layer L4 interface/membrane` | `TypeJudgment` |
| `src/packages/mcard-explorer/cards/providers/*.ts` | `@layer L4 interface/membrane` | `TypeJudgment` |
| `src/packages/mcard-explorer/zoom/types.ts` | `@layer L4 interface/membrane` | None (pure domain types) |
| `src/packages/mcard-explorer/time/types.ts` | `@layer L4 interface/membrane` | None (pure domain types) |
| `src/packages/mcard-explorer/ui/*.tsx` | `@layer L4 interface/membrane` | `HypermediaNode` (via viewer) |
| `src/packages/mcard-explorer/renderers/base/*.tsx` | `@layer L4 interface/membrane` | `HypermediaNode` |

---

## 4. Studio Porting Checklist (`40-DOD-19`)

Target repository: `mcard-studio`. See `docs/integration/STUDIO-PORTING-CHECKLIST.md` for full guidance.

- [x] **`src/services/vfs/vfsCordis.ts`:** Satisfy `CardStorePort` at the VFS façade; keep core package zero-Cordis.
- [x] **`src/hooks/useCordisFiber.ts`:** Map fiber lifecycle teardown to `OperationJournal` and `InteractionTree.replayTo`.
- [x] **`src/utils/artifactTree.ts`:** Replace custom tree builders with `TreeProjection` (verified 100% parity).
- [x] **`src/views/fileTree/`:** Bind studio tree views to `PositionTree` and `ZoomBreadcrumb`.
- [x] **Card Viewlets:** Register studio-only card viewlets (`Spatial3dViewlet`, `WebappZenViewlet`, `MeshTopologyViewlet`, `MerkleProofViewlet`, `PayloadCasViewlet`) via `StructureRegistry`.
