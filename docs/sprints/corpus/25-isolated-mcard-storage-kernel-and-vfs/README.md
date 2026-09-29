# Sprint 25: Isolated MCard Storage Kernel & Operadic VFS
**Directory:** `docs/sprints/corpus/25-isolated-mcard-storage-kernel-and-vfs`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Delivered the headless storage subsystem `@clm/mcard-vcs` grounded directly in `clm-kernel`'s `MCardFileSystem` and `TriDatabaseManager`. Structured state access around DOTS Conversational Lenses ($S \dashv G$) satisfying classical categorical Lens Laws. Replaced tight component coupling with a loose-wiring `VfsEventBus` supporting typed dispatch and disposable subscription callbacks. Provided three pluggable `StorageVFS` backends: in-memory WASM SQLite (`MemoryStorageVFS`), browser persistent IndexedDB (`IndexedDbStorageVFS`), and headless Node.js filesystem (`NodeFsStorageVFS`). Guaranteed zero DOM globals and zero host imports via an automated AST purity audit (`scripts/check-vcs-isolation.mjs`).

## Verification & Test Results
* **Lens & Event Bus Suite:** `tests/unit/mcard-vcs/storage/lens.test.ts` & `events.test.ts` — verified 3 Lens Laws and error-resilient dispatch pipeline.
* **Storage Backend Parity:** `tests/unit/mcard-vcs/storage/vfs.test.ts` & `operadicVfs.test.ts` — verified identical behavior across Memory, IndexedDB, and NodeFs backends.
* **Isolation Gate:** `make check-vcs-isolation` passing with 0 DOM references and 0 host imports.
* **Content Addressing:** BLAKE3 cryptographic hashes verified with canonical `blake3:` prefix.
* **ACID Transactions:** Nested savepoint rollback verified via `SavepointGuard`.

## Documents
* **Master Specification:** [`SPRINT-25-ISOLATED-MCARD-STORAGE-KERNEL-AND-VFS.md`](./SPRINT-25-ISOLATED-MCARD-STORAGE-KERNEL-AND-VFS.md)
* **Parent Proposal:** [`../../orchestration/25-29-portable-mcard-storage-and-version-control/PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md`](../../orchestration/25-29-portable-mcard-storage-and-version-control/PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md)
