# Sprint 36: Polynomial Interface Core & Affordance Algebra

**Directory:** `docs/sprints/shell/36-polynomial-interface-core-and-affordance-algebra`  
**Subsystem Category:** `shell`  
**Status:** ✅ **Completed & Graduated**  
**Date:** 2026-09-29  

---

## 1. Executive Summary

Sprint 36 established the mathematical foundation of Spencer Breiner's polynomial-interface framework ($p = \sum_{y \in B} y^{E(y)}$) within `@clm/mcard-explorer`, decomposing monolithic legacy components into decoupled, single-concern modules governed by strict LOC ceilings ($\le 150$ LOC concern target, $\le 250$ LOC absolute limit):

1. **Polynomial Interface Subsystem (`poly/`)**:
   - `types.ts`: Formal definitions of `Position`, `Direction`, `DirectionResult`, `PolyInterface`, and `InterfaceLens`. Root-only `'clm-kernel'` imports with zero deep paths.
   - `guardrails.ts`: Boolean algebra and affordance guardrail combinators (`allOf`, `anyOf`, `never`) and domain position predicates (`isSource`, `isArtifact`, `isCollection`, `isProcess`, `hasMime`).
   - `registry.ts`: `PolyInterfaceRegistry` providing fail-closed evaluation (a throwing legality predicate defaults to `false`, never surfacing to the caller) and deterministic priority sorting.
   - `census.ts`: Fiber census adapter wrapping the kernel's `PolynomialFunctor` for degree calculation and monomial census.
   - `navigation.ts`: `NavigationProvider` port definition and registry supporting bidirectional URI/address codecs.

2. **Core Engine Decomposition (`core/`)**:
   - Decomposed legacy `MCardExplorerEngine` into five single-concern units: `ExplorerStateStore`, `TreeProjection`, `FacetResolver`, `SelectionModel`, and `ExplorerEngine`.
   - `FacetResolver`: Typed facet resolution pushing queries directly to SQL storage, eliminating client-side `.includes()` substring filtering.
   - Retained `MCardExplorerEngine.ts` as an 8-LOC deprecated re-export shim for backwards compatibility.

3. **UI Viewlet Decomposition (`ui/`)**:
   - Decomposed `MCardExplorer.tsx` into five focused viewlets: `ExplorerToolbar`, `FacetStrip`, `ExplorerListPane`, `ExplorerPreviewPane`, and `ExplorerKeyboardScope`.
   - Reduced `MCardExplorer.tsx` to a clean composition root ($\le 120$ LOC).
   - Rendered directions are derived exclusively from `registry.resolveDirections(position)`; illegal directions are completely omitted from the DOM, never rendered disabled.

4. **Studio Parity & Interoperability**:
   - `TreeProjection` produces directory-first, case-insensitive sorting identical to `mcard-studio`'s `buildArtifactTree`.
   - `forwardBrowsingAdapter.ts` maps studio `ForwardTarget['reason']` vocabulary into typed direction groups (`navigate`, `mutate`, `execute`, `view`).

---

## 2. Verification Matrix & Definition of Done (20/20 Gates Verified)

- [x] **36-DOD-01**: **Polynomial Core Types** (`poly/types.ts`, 88 LOC $\le 140$ LOC) — Exports `Position`, `Direction`, `DirectionResult`, `PolyInterface`, `InterfaceLens`. Verified root-only `'clm-kernel'` imports.
- [x] **36-DOD-02**: **Affordance Guardrail Combinators** (`poly/guardrails.ts`, 54 LOC $\le 100$ LOC) — `allOf`, `anyOf`, `never`, and position predicates unit-tested in isolation.
- [x] **36-DOD-03**: **Fail-Closed Affordance Registry** (`poly/registry.ts`, 74 LOC $\le 130$ LOC) — `PolyInterfaceRegistry` with disposer function; throwing predicates fail-close to `false`.
- [x] **36-DOD-04**: **Numeric Fiber Census Adapter** (`poly/census.ts`, 42 LOC $\le 80$ LOC) — Wraps kernel `PolynomialFunctor`; `fiberDegree([]) === 0` asserted; zero other `PolynomialFunctor` imports in explorer.
- [x] **36-DOD-05**: **Engine Decomposition into 5 Single-Concern Modules** — `ExplorerStateStore` (80 LOC), `TreeProjection` (77 LOC), `FacetResolver` (66 LOC), `SelectionModel` (77 LOC), `ExplorerEngine` (94 LOC), shim (8 LOC).
- [x] **36-DOD-06**: **Typed Facets with SQL-Level Filtering** — `FacetResolver` maps facets to `ExplorerSearchFilter` (`universe`, `category`, `mimeType`, `pattern`); zero client-side `.includes()`.
- [x] **36-DOD-07**: **UI Decomposition into 5 Focused Viewlets** — `ExplorerToolbar` (67 LOC), `FacetStrip` (41 LOC), `ExplorerListPane` (123 LOC), `ExplorerPreviewPane` (29 LOC), `ExplorerKeyboardScope` (76 LOC), `MCardExplorer` (116 LOC).
- [x] **36-DOD-08**: **Resolved Directions Only (Zero Hardcoded Action Arrays)** — Directions rendered exclusively via `registry.resolveDirections()`; illegal directions absent from DOM.
- [x] **36-DOD-09**: **Contract B Selector Audit & Dynamic Family Registration** — `node scripts/audit-testids.mjs --check` passes with all 296 literals + 18 dynamic prefix families (`facet-chip-`, `direction-`).
- [x] **36-DOD-10**: **Contract E Zero-DOM Isolation Gate** — `check-vcs-isolation.mjs` confirms zero DOM globals and zero host imports in `poly/` and `core/`.
- [x] **36-DOD-11**: **Poly Algebra Unit Test Suite** — 100% pass across `tests/unit/mcard-explorer/poly/` (17 tests).
- [x] **36-DOD-12**: **Core Engine Unit Test Suite** — 100% pass across `tests/unit/mcard-explorer/core/` (13 tests).
- [x] **36-DOD-13**: **Vitest Regression Suite & Type Check** — 705 tests across 120 files green; `npx tsc --noEmit` exits with code 0.
- [x] **36-DOD-14**: **Concern Audit & LOC Thresholds (ADR D53)** — `node scripts/audit-concerns.mjs` verifies all 20 modules $\le 150$ LOC.
- [x] **36-DOD-15**: **Kernel Layer Declarations (ADR D57)** — `@layer L4` present across all files in `poly/` and `core/`.
- [x] **36-DOD-16**: **Studio Tree Parity (ADR D54)** — Directory-first and case-insensitive tree sorting verified by `tests/conformance/studio-parity.test.ts`.
- [x] **36-DOD-17**: **Direction-Group Compatibility (ADR D54)** — `forwardBrowsingAdapter.ts` (32 LOC) maps studio target reasons to directions; tested in unit suite.
- [x] **36-DOD-18**: **Façade Discipline (ADR D54)** — `poly/index.ts` and `core/index.ts` are the exclusive public boundaries; zero internal imports from host services.
- [x] **36-DOD-19**: **Kenotic Host Boundary (ADR D55)** — Zero `cordis` or host store imports inside `poly/` and `core/`.
- [x] **36-DOD-20**: **NavigationProvider Port Definition (ADR D56)** — `NavigationProvider` interface exported; `encodeAddress`/`decodeAddress` round-trip tested.

---

## 3. Produced Source Modules & Tests

| File | Concern / Role | Lines of Code | Ceiling |
| :--- | :--- | :---: | :---: |
| `src/packages/mcard-explorer/poly/types.ts` | Polynomial core types & lenses | 88 | 140 |
| `src/packages/mcard-explorer/poly/guardrails.ts` | Guardrail combinators & predicates | 54 | 100 |
| `src/packages/mcard-explorer/poly/registry.ts` | Fail-closed direction registry | 74 | 130 |
| `src/packages/mcard-explorer/poly/census.ts` | Kernel PolynomialFunctor wrapper | 42 | 80 |
| `src/packages/mcard-explorer/poly/navigation.ts` | Navigation provider port & registry | 67 | 110 |
| `src/packages/mcard-explorer/poly/index.ts` | Poly subsystem facade | 7 | 50 |
| `src/packages/mcard-explorer/core/ExplorerStateStore.ts` | Immutable state store | 80 | 120 |
| `src/packages/mcard-explorer/core/TreeProjection.ts` | Deterministic tree projection | 77 | 130 |
| `src/packages/mcard-explorer/core/FacetResolver.ts` | SQL facet filter resolver | 66 | 110 |
| `src/packages/mcard-explorer/core/SelectionModel.ts` | Pure selection transitions | 77 | 110 |
| `src/packages/mcard-explorer/core/ExplorerEngine.ts` | Decomposed engine facade | 94 | 120 |
| `src/packages/mcard-explorer/core/MCardExplorerEngine.ts` | Deprecated re-export shim | 8 | 40 |
| `src/packages/mcard-explorer/core/index.ts` | Core subsystem facade | 9 | 50 |
| `src/packages/mcard-explorer/ui/ExplorerToolbar.tsx` | Search & mode controls | 67 | 110 |
| `src/packages/mcard-explorer/ui/FacetStrip.tsx` | Facet chip bar | 41 | 100 |
| `src/packages/mcard-explorer/ui/ExplorerListPane.tsx` | List/tree entry rendering | 123 | 130 |
| `src/packages/mcard-explorer/ui/ExplorerPreviewPane.tsx` | Preview container | 29 | 100 |
| `src/packages/mcard-explorer/ui/ExplorerKeyboardScope.tsx` | Keyboard shortcuts | 76 | 110 |
| `src/packages/mcard-explorer/ui/MCardExplorer.tsx` | Composition root | 116 | 120 |
| `src/packages/mcard-explorer/renderers/forwardBrowsingAdapter.ts` | Studio parity adapter | 32 | 60 |
| `scripts/audit-concerns.mjs` | Module LOC & concern audit tool | 68 | 100 |

### Tests & Verification Suites

| Test File | Description | Test Count | Status |
| :--- | :--- | :---: | :---: |
| `tests/unit/mcard-explorer/poly/guardrails.test.ts` | Combinator laws, short-circuit, predicates | 9 | Passed |
| `tests/unit/mcard-explorer/poly/registry.test.ts` | Priority ordering & fail-closed resolution | 3 | Passed |
| `tests/unit/mcard-explorer/poly/census.test.ts` | Degree & fiber census tests | 2 | Passed |
| `tests/unit/mcard-explorer/poly/navigation.test.ts` | Navigation codec & provider registry | 3 | Passed |
| `tests/unit/mcard-explorer/core/FacetResolver.test.ts` | SQL facet filter resolution without includes | 4 | Passed |
| `tests/unit/mcard-explorer/core/TreeProjection.test.ts` | Tree hierarchy & sorting | 2 | Passed |
| `tests/unit/mcard-explorer/core/SelectionModel.test.ts` | Selection state transitions | 4 | Passed |
| `tests/unit/mcard-explorer/core/ExplorerEngine.test.ts` | Engine orchestration & facade behavior | 3 | Passed |
| `tests/unit/mcard-explorer/renderers/forwardBrowsingAdapter.test.ts` | Forward target reason mapping | 2 | Passed |
| `tests/conformance/studio-parity.test.ts` | TreeProjection parity with buildArtifactTree | 1 | Passed |
| `tests/unit/mcard-explorer/ui/ExplorerListPane.test.tsx` | Direction affordance rendering | 2 | Passed |
