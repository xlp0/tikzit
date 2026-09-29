# MCard Explorer to Studio Porting Checklist

This checklist documents the adoption pathway for importing the unified `@clm/mcard-explorer` package into `mcard-studio` without requiring modifications to package internals.

---

## 1. Architectural Invariants

- **Zero Cordis In Package Core (ADR D54 / ADR D55):** `mcard-explorer` contains zero references or direct dependencies on `cordis`. All host effects and fiber lifecycles are inverted through `CoeffectHost` and `InteractionTree`.
- **Façade Boundary Enforcement (ADR D54):** All cross-subsystem consumption is channeled through module façades (`index.ts`). Internal file imports are strictly forbidden and guarded by `scripts/check-explorer-deps.mjs`.
- **Dual-Axis Hierarchy (ADR D56):** Spatial navigation and structural containment operate as orthogonal axes via `NavigationProviderRegistry` and `ZoomStack`.
- **Stratified Kernel Layer Placement (ADR D57):** Modules declare `@layer L4` (or target stratum) and only consume approved kernel symbols, audited via `scripts/check-layer-imports.mjs`.

---

## 2. Exported Seams & Contracts

The following core interfaces are exported from the package root façade (`src/packages/mcard-explorer/index.ts`):

| Exported Seam | Layer / Subsystem | Purpose in Studio |
| :--- | :--- | :--- |
| `CardStructureProvider` | `zoom/` | Interface for registering studio-only containment and hierarchy models. |
| `CardRuntimePort` | `cards/` | Inversion boundary for card execution and runtime dispatch. |
| `NavigationProvider` | `poly/` | Extensibility point for multi-axis navigation (namespaces, tables, timeline). |
| `CoeffectHost` | `poly/` | Clean host effect binding mechanism for notifications, modals, and telemetry. |
| `bindHostEffects` | `time/` | Helper to wire host coeffects directly into revertible interaction trees. |

---

## 3. Concrete Studio-Side Files to Touch

Adopting `@clm/mcard-explorer` in `mcard-studio` requires modifying only studio-side host adapters. Zero changes are needed inside the package:

### 1. `src/services/vfs/vfsCordis.ts`
- **Action:** Replace Cordis-specific VFS hooks with `ExplorerQueryFacade` and `CardStorePort`.
- **Contract:** Satisfies kenotic rule: core package remains agnostic of Cordis lifecycle events.

### 2. `src/hooks/useCordisFiber.ts`
- **Action:** Bind `useCordisFiber` teardown lifecycle to `OperationJournal` and `InteractionTree.replayTo`.
- **Contract:** Preserves $p \cdot (-p) \simeq \text{refl}$ inverse action semantics upon fiber termination.

### 3. `src/utils/artifactTree.ts`
- **Action:** Migrate to `TreeProjection` or consume `ExplorerTreeNode` directly.
- **Contract:** Verified 1:1 behavioral parity with `studio-parity.test.ts`.

### 4. `src/views/fileTree/`
- **Action:** Replace studio-specific tree components with `PositionTree` and `ZoomBreadcrumb`.
- **Contract:** Supports dual-axis operadic zooming and windowed virtualization for corpora $> 200$ nodes.

---

## 4. Studio-Specific Card Viewlet Registrations

Register studio-only card type structure providers into `StructureRegistry`:
- [ ] `Spatial3dViewlet` (3D scene mesh graphs)
- [ ] `WebappZenViewlet` (Sandboxed web application frames)
- [ ] `MeshTopologyViewlet` (Network topology visualizations)
- [ ] `MerkleProofViewlet` (Cryptographic verification DAGs)
- [ ] `PayloadCasViewlet` (Content-addressed payload blobs)

---

## 5. Verification Gate in Studio

Before landing in `mcard-studio`, verify:
1. `npm test` runs with zero `cordis` leaks from `@clm/mcard-explorer`.
2. All tree nodes match `buildArtifactTree` output across flat, hierarchical, and deeply nested paths.
3. Undoing an action clears the fiber state with zero residue.
