# Sprint 35: Multimodal Artifact Export & Sovereign Database Persistence

**Directory:** `docs/sprints/interactions/35-multimodal-artifact-export-and-database-persistence`  
**Subsystem Category:** `interactions` & `shell`  
**Status:** ✅ **Completed & Graduated**  
**Date:** 2026-09-29  

---

## 1. Executive Summary

Sprint 35 shipped a unified, format-aware multimodal export and sovereign database persistence subsystem for `MCardExplorer` and `MCardViewer`:
1. **Unified `Export ▾` Dropdown Viewlet (`MCardExportDropdown.tsx`)**: Extracted from `MCardViewerToolbar.tsx` to provide researchers with direct, one-click access to all artifact formats.
2. **Destination × Format Orthogonality**: Disentangled destination (Local Disk vs. Sovereign VFS Database) from representation (raw card payload, SVG, PNG, PDF, TikZ source, TeX standalone).
3. **Sovereign Database Persistence (`cardPersistenceService.ts`)**: Commits raw cards and generated diagram artifacts directly to `OperadicMCardVfs` under the `zx:artifacts:<source>/<filename>` provenance namespace, yielding deterministic Blake3 content-addressed hashes (CIDs) with zero file picker interactions.
4. **MCard Explorer Surfacing & Dockview Integration**:
   - `CorpusExplorerDrawer.tsx` dual-view switcher (`drawer-view-diagrams` vs `drawer-view-mcards`) allowing researchers to browse all sovereign corpus MCards (including non-diagram cards and committed artifacts).
   - `MCardExplorerPane.tsx` mounting generic MCard tree view.
   - `TikzitSpatialWorkbench.tsx` wired to open and activate the docked `card-viewer` panel upon selecting any card handle from `$previewCardHandle`.
5. **Runtime Wiring**: Bootstrap wiring in `createWorkbenchRuntime.ts` invokes `registerViewerActions()`, ensuring runtime action dispatch functions across all hosts.

---

## 2. Verification Matrix & Definition of Done (26/26 Gates Verified)

### Phase A — Disk Export
- [x] **35A-DOD-01**: **Extracted Viewer Toolbar** (`src/packages/mcard-explorer/ui/MCardViewerToolbar.tsx`, 99 LOC $\le 100$ LOC) — Contract E clean.
- [x] **35A-DOD-02**: **Export Dropdown Viewlet** (`src/packages/mcard-explorer/ui/MCardExportDropdown.tsx`, 139 LOC $\le 140$ LOC) — disk group and format variants.
- [x] **35A-DOD-03**: **MCardViewer Refactor** (`src/packages/mcard-explorer/ui/MCardViewer.tsx`, 160 LOC $\le 160$ LOC) — Contract B selectors preserved.
- [x] **35A-DOD-04**: **Universal Disk Saver** (`src/services/export/saveCardArtifact.ts`, 108 LOC $\le 120$ LOC) — MIME to extension mapping with binary fallback.
- [x] **35A-DOD-05**: **Host Action Bridge** (`src/services/clm/viewerActionBridge.ts`, 179 LOC $\le 180$ LOC) — `export.disk` registered in `ExplorerActionRegistry`.
- [x] **35A-DOD-05a**: **Bridge Bootstrap Wiring** (`src/services/createWorkbenchRuntime.ts`) — `registerViewerActions` invoked on runtime init.
- [x] **35A-DOD-06**: **Automated Test Suite** — `tests/unit/mcard-explorer/ui/MCardExportDropdown.test.tsx` (6 tests) & `tests/unit/services/export/saveCardArtifact.test.ts` (9 tests) 100% green.
- [x] **35A-DOD-07**: **Contract B Selector Audit** — `node scripts/audit-testids.mjs --check` passes with 295 literals and 17 dynamic prefix families.
- [x] **35A-DOD-08**: **Contract D LOC Ceilings** — strictly $\le 250$ LOC across all authored files.
- [x] **35A-DOD-09**: **Contract E Zero-DOM Gate** — zero DOM references in `@clm/mcard-explorer/core` and `renderers/registry`.
- [x] **35A-DOD-10**: **Full Vitest Suite** — 670 tests across 109 test files green with zero regressions.

### Phase B — Database Persistence (Format-Aware)
- [x] **35B-DOD-01**: **Database Persistence Service** (`src/services/clm/cardPersistenceService.ts`, 137 LOC $\le 160$ LOC) — `commitCardToDatabase` calls `vfs.set()`.
- [x] **35B-DOD-02**: **Generation/Delivery Split** (`src/services/export/diagramExportCoordinator.ts`, 155 LOC) — `generateDiagramArtifact` generates `{ payload, mimeType, filename }` with 0 `saveArtifact` calls.
- [x] **35B-DOD-03**: **Format-Aware DB Commit** (`cardPersistenceService.commitExportedArtifact`) — writes rendered artifacts under `zx:artifacts:<source>/<filename>`.
- [x] **35B-DOD-04**: **DB Path Never Touches Disk (Negative Test)** — spy confirms zero calls to `saveArtifact` or file pickers.
- [x] **35B-DOD-05**: **Per-Format DB Handlers** (`src/services/clm/viewerActionBridge.ts`) — `export.database.commit` + per-format handlers.
- [x] **35B-DOD-06**: **Dropdown Database Group** (`src/packages/mcard-explorer/ui/MCardExportDropdown.tsx`) — `export-group-database` with raw commit + rendered export items.
- [x] **35B-DOD-07**: **Preview Toolbar Rewire** (`src/components/workbench/panels/preview/PreviewToolbar.tsx`, `PreviewPanel.tsx`) — `btn-save-to-database` commits TikZ source directly to VFS.
- [x] **35B-DOD-08**: **Artifact Provenance Metadata** (`OperadicMCardVfs`) — companion metadata `{ sourceHandle, format, exportedAt, derivedFrom }` preserved.
- [x] **35B-DOD-09**: **Database Persistence Tests** — `tests/unit/services/clm/cardPersistenceService.test.ts` (10 tests) 100% green.

### Phase C — MCard Explorer Surfacing
- [x] **35C-DOD-01**: **Drawer View Switcher** (`src/components/workbench/CorpusExplorerDrawer.tsx`, 202 LOC $\le 250$ LOC) — `drawer-view-diagrams` & `drawer-view-mcards` tabs.
- [x] **35C-DOD-02**: **Generic MCard View** (`src/components/workbench/MCardExplorerPane.tsx`, 107 LOC $\le 140$ LOC) — mounts `MCardExplorer` against sovereign VFS.
- [x] **35C-DOD-03**: **CardView Panel Activation** (`src/components/workbench/TikzitSpatialWorkbench.tsx`) — selecting any card handle activates docked `card-viewer`.
- [x] **35C-DOD-04**: **Type-Aware Refresh** (`src/packages/mcard-explorer/ui/MCardViewer.tsx`) — viewlets dynamically load by MIME type based on `typeJudgment`.
- [x] **35C-DOD-05**: **Artifact Visibility Loop** — committing an artifact immediately refreshes MCard tree view.
- [x] **35C-DOD-06**: **Workbench Integration Suite** — `tests/unit/workbench` (4 tests) 100% green.

---

## 3. Produced Source Modules & Tests

| Component / Service | File Path | LOC |
| :--- | :--- | :---: |
| **Viewer Toolbar Viewlet** | [`src/packages/mcard-explorer/ui/MCardViewerToolbar.tsx`](../../../../src/packages/mcard-explorer/ui/MCardViewerToolbar.tsx) | 99 |
| **Export Dropdown Viewlet** | [`src/packages/mcard-explorer/ui/MCardExportDropdown.tsx`](../../../../src/packages/mcard-explorer/ui/MCardExportDropdown.tsx) | 139 |
| **Universal Disk Saver** | [`src/services/export/saveCardArtifact.ts`](../../../../src/services/export/saveCardArtifact.ts) | 108 |
| **Card Persistence Service** | [`src/services/clm/cardPersistenceService.ts`](../../../../src/services/clm/cardPersistenceService.ts) | 137 |
| **Action Bridge Handlers** | [`src/services/clm/viewerActionBridge.ts`](../../../../src/services/clm/viewerActionBridge.ts) | 179 |
| **Drawer View Switcher Container** | [`src/components/workbench/CorpusExplorerDrawer.tsx`](../../../../src/components/workbench/CorpusExplorerDrawer.tsx) | 202 |
| **MCard Explorer Pane Adapter** | [`src/components/workbench/MCardExplorerPane.tsx`](../../../../src/components/workbench/MCardExplorerPane.tsx) | 107 |
| **Spatial Workbench Host** | [`src/components/workbench/TikzitSpatialWorkbench.tsx`](../../../../src/components/workbench/TikzitSpatialWorkbench.tsx) | 240 |
| **Unit Test Suite (Export Dropdown)** | [`tests/unit/mcard-explorer/ui/MCardExportDropdown.test.tsx`](../../../../tests/unit/mcard-explorer/ui/MCardExportDropdown.test.tsx) | 125 |
| **Unit Test Suite (Disk Saver)** | [`tests/unit/services/export/saveCardArtifact.test.ts`](../../../../tests/unit/services/export/saveCardArtifact.test.ts) | 118 |
| **Unit Test Suite (Card Persistence)** | [`tests/unit/services/clm/cardPersistenceService.test.ts`](../../../../tests/unit/services/clm/cardPersistenceService.test.ts) | 139 |

---

## 4. Master Specification Reference

* **Specification Document:** [`SPRINT-35-MULTIMODAL-ARTIFACT-EXPORT-AND-DATABASE-PERSISTENCE.md`](./SPRINT-35-MULTIMODAL-ARTIFACT-EXPORT-AND-DATABASE-PERSISTENCE.md)
* **Parent Architecture Proposal:** [`../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md`](../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md)
* **Successor Architecture Series:** [`../../_active/PROPOSAL-36-40-POLYNOMIAL-INTERFACE-UI-AND-SPATIOTEMPORAL-COMPOSITIONALITY.md`](../../_active/PROPOSAL-36-40-POLYNOMIAL-INTERFACE-UI-AND-SPATIOTEMPORAL-COMPOSITIONALITY.md)
