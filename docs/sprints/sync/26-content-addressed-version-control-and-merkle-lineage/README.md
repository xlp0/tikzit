# Sprint 26: Content-Addressed Version Control & Merkle Lineage Engine
**Directory:** `docs/sprints/sync/26-content-addressed-version-control-and-merkle-lineage`  
**Status:** ✅ Completed (Graduated)  
**Date:** 2026-09-29  

## Executive Summary
Replaced monotonic linear versioning with an input-driven Mealy Machine VCS engine ($O = \delta(s, i)$) and full content-addressed Merkle DAG version control. Modeled immutable commits (`CommitMCard`) and directory trees (`TreeMCard`) using canonical BLAKE3 serialization. Built atomic CAS branch references (`RefStore`) with HEAD resolution, multi-parent Lowest Common Ancestor (LCA) traversal (`AncestryGraph`), and multi-modal semantic diffing across Myers line-based unified hunks and diagram graph AST modifications (`SemanticDiffEngine`, `GraphAstDiffer`). Delivered a deterministic 3-way merge engine (`ThreeWayMergeEngine`) with non-overlapping AST auto-merging and `VCard` witness generation (`ConflictResolver`). Exposed a headless `ExplorerQueryFacade` returning plain serializable DTOs (`structuredClone`-safe).

## Verification & Test Results
* **Merkle Commit & Ref Suite:** `tests/unit/mcard-vcs/vcs/merkle.test.ts` — verified commit hashing, tree sorting, branch refs, and CAS updates.
* **Mealy Transition System:** `tests/unit/mcard-vcs/vcs/mealy.test.ts` — verified 5-state transitions and staged commit progression.
* **Diff & Merge Engine:** `tests/unit/mcard-vcs/vcs/diff.test.ts` & `merge.test.ts` — verified unified hunks, graph AST diffs, fast-forwards, non-overlapping 3-way merges, and conflict witness receipts.
* **Query Facade:** `tests/unit/mcard-vcs/vcs/facade.test.ts` — verified headless query surface and DTO serializability under Node.

## Documents
* **Master Specification:** [`SPRINT-26-CONTENT-ADDRESSED-VERSION-CONTROL-AND-MERKLE-LINEAGE.md`](./SPRINT-26-CONTENT-ADDRESSED-VERSION-CONTROL-AND-MERKLE-LINEAGE.md)
* **Parent Proposal:** [`../../orchestration/25-29-portable-mcard-storage-and-version-control/PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md`](../../orchestration/25-29-portable-mcard-storage-and-version-control/PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md)
