# Sprint 33: Universal MCardViewer & Explorer Integration
**Directory:** `docs/sprints/shell/33-universal-mcard-viewer-and-explorer-integration`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Delivered the composite `MCardViewer` in `@clm/mcard-explorer/ui` — header toolbar (handle, universe badge, CID copy, MIME pill), descriptor-action toolbar, adaptive `data-viewport-mode` container chrome per media type, and error-boundary fallback walking the `resolveAll()` candidate list. Integrated into `MCardExplorer` with dual-pane preview, Universe facet filters, keyboard navigation, and the Satori `type:'custom'` `<mcard-viewer>` element. Depends solely on the `CardContentProvider` port — zero `mcard-vcs` imports.

## Verification & Test Results
* `tests/unit/mcard-explorer/ui/MCardViewer.test.tsx` + `MCardExplorerIntegration.test.tsx` — 100% green.
* Viewport matrix verified per fixture; headless `hypermediaToAnsi()` fallback proven.

## Documents
* **Master Specification:** [`SPRINT-33-UNIVERSAL-MCARD-VIEWER-AND-EXPLORER-INTEGRATION.md`](./SPRINT-33-UNIVERSAL-MCARD-VIEWER-AND-EXPLORER-INTEGRATION.md)
* **Parent Proposal:** [`../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md`](../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md)
