# Sprint 31: Pluggable Polyglot Renderer Registry & Base Viewlets
**Directory:** `docs/sprints/interactions/31-pluggable-polyglot-renderer-registry-and-viewlets`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Ported `mcard-studio`'s `CardViewletRegistry` architecture into `@clm/mcard-explorer/renderers` as a headless `RendererRegistry` with `resolveAll()` ordered-candidate fallback cascade, `listAll()` enumeration, and `RendererDescriptor` — a bidirectional superset of `CardViewletDefinition` adding `matches()`, `viewport` modes (D44), `actions` (D45), and `toHypermediaNode()` headless fallback. Shipped 8 base viewlets (Text, Markdown, Data, YAML, CSV, Image, PDF, BinaryHex) plus the deterministic 14-file `tests/fixtures/multimodal-media/` corpus and `npm run seed:media` harness.

## Verification & Test Results
* `tests/unit/mcard-explorer/renderers/RendererRegistry.test.ts` + `baseViewlets.test.tsx` — 100% green.
* Contract E: registry scanned, type-only React imports, 0 DOM globals.

## Documents
* **Master Specification:** [`SPRINT-31-PLUGGABLE-POLYGLOT-RENDERER-REGISTRY-AND-VIEWLETS.md`](./SPRINT-31-PLUGGABLE-POLYGLOT-RENDERER-REGISTRY-AND-VIEWLETS.md)
* **Parent Proposal:** [`../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md`](../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md)
