# Sprint 35: Multimodal Artifact Export & Sovereign Database Persistence
**Directory:** `docs/sprints/interactions/35-multimodal-artifact-export-and-database-persistence`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Shipped a unified `Export ▾` dropdown (`MCardExportDropdown`) in the MCardViewer toolbar with destination × format orthogonality: every format (raw payload, SVG, PNG, PDF, TikZ, TeX) committable to either local disk or the sovereign VFS. Phase A delivered disk export via `saveCardArtifact` + extracted `MCardViewerToolbar`; Phase B split `generateDiagramArtifact` from delivery and added `cardPersistenceService.commitExportedArtifact` landing rendered artifacts as provenance cards under `zx:artifacts:*`; Phase C surfaced all MCards in the drawer via `MCardExplorerPane` and activated the dormant `card-viewer` Dockview panel on `$previewCardHandle` writes. Closed the dead-wire gap: `registerViewerActions()` is now invoked during `createWorkbenchRuntime` bootstrap.

## Verification & Test Results
* Vitest: 670 tests / 109 files green; `tsc --noEmit` clean.
* Contract B regenerated baseline (295 literals / 17 prefixes) verified; Contract E isolation clean; browser independence 5/5.
* Negative test: DB commit path never touches `saveArtifact`/file picker.

## Documents
* **Master Specification:** [`SPRINT-35-MULTIMODAL-ARTIFACT-EXPORT-AND-DATABASE-PERSISTENCE.md`](./SPRINT-35-MULTIMODAL-ARTIFACT-EXPORT-AND-DATABASE-PERSISTENCE.md)
* **Parent Proposal:** [`../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md`](../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md)
