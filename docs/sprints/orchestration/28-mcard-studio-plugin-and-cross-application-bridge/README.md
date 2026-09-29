# Sprint 28: mcard-studio Plugin Manifest & Reusable MCard Explorer Subsystem
**Directory:** `docs/sprints/orchestration/28-mcard-studio-plugin-and-cross-application-bridge`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Created the universally embeddable `@clm/mcard-explorer` package providing a zero-DOM headless core and modular React/Astro UI viewlets. Engineered `MCardExplorerEngine` with debounced search filtering, facet selection, active card tracking, and hierarchical namespace tree generation running with 100% parity under Node without DOM globals. Built `ExplorerActionRegistry` allowing hosts to bind custom Mealy action morphisms ($O = \delta(s, i)$). Delivered the canonical `createMCardVcsPlugin` PTR manifest and `StudioMCardPluginBridge` declaring Petri Net places and transitions for `mcard-studio`. Published the third-party embedding guide `EMBEDDING-MCARD-VCS.md`, the shipped `/conformance` runner `hostSelfCheck.ts`, and the upstream evolution specification `RFC-CLM-002-OPERADIC-VFS.md`.

## Verification & Test Results
* **Headless Explorer Engine:** `tests/unit/mcard-explorer/engine.test.ts` — verified query filtering, facets, selection, and tree generation under pure Node.
* **PTR Plugin & Upstream Gate:** `tests/unit/mcard-vcs/plugin/contract.test.ts` — verified `PtrPluginDefinition` compatibility, place/transition invariants, and upstream pinning gate.
* **Host Self-Check Conformance:** `tests/unit/mcard-vcs/conformance/selfCheck.test.ts` — verified shipped self-check runner validates lens laws, DTO serializability, and LIFO teardown.
* **Contract D Compliance:** All 12 authored modules strictly satisfy $\le 250$ LOC.

## Documents
* **Master Specification:** [`SPRINT-28-MCARD-STUDIO-PLUGIN-AND-CROSS-APPLICATION-BRIDGE.md`](./SPRINT-28-MCARD-STUDIO-PLUGIN-AND-CROSS-APPLICATION-BRIDGE.md)
* **Embedding Guide:** [`../../../../integration/EMBEDDING-MCARD-VCS.md`](../../../integration/EMBEDDING-MCARD-VCS.md)
* **Upstream RFC:** [`../25-29-portable-mcard-storage-and-version-control/RFC-CLM-002-OPERADIC-VFS.md`](../25-29-portable-mcard-storage-and-version-control/RFC-CLM-002-OPERADIC-VFS.md)
* **Parent Proposal:** [`../25-29-portable-mcard-storage-and-version-control/PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md`](../25-29-portable-mcard-storage-and-version-control/PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md)
