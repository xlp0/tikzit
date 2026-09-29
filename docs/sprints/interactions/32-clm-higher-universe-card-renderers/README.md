# Sprint 32: CLM Higher-Universe Card Renderers
**Directory:** `docs/sprints/interactions/32-clm-higher-universe-card-renderers`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Delivered the specialized viewlet suite in `@clm/mcard-explorer/renderers/clm/`: `TikzCardRenderer` (SVG preview + `export.png/.pdf/.svg/.tikz/.tex` descriptor actions), `SqliteCollectionRenderer`, `PCardRenderer`, `VCardRenderer` (D43 U2 override), and `SatoriCardRenderer` — all on canonical kernel-dictionary MIMEs, self-registering via `descriptor` + `register()` exports, each declaring a D44 viewport mode and `toHypermediaNode()` headless output.

## Verification & Test Results
* `tests/unit/mcard-explorer/renderers/clmViewlets.test.tsx` — 100% green on canonical mimes.
* Kernel layer-1/3 types consumed via `import type` only.

## Documents
* **Master Specification:** [`SPRINT-32-CLM-HIGHER-UNIVERSE-CARD-RENDERERS.md`](./SPRINT-32-CLM-HIGHER-UNIVERSE-CARD-RENDERERS.md)
* **Parent Proposal:** [`../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md`](../../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md)
