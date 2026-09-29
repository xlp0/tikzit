# Active Sprint Directory (`docs/sprints/_active`)

> [!IMPORTANT]
> **No active sprints.** The **Sprints 30–35** series — Universal Type Interpretation, Stratified Type Lattice & Multimodal MCard Rendering/Export — was **completed, verified, and graduated** on 2026-09-29.
> This directory holds only working drafts that have not yet graduated.

---

## 1. Graduated Series Index

| Series | Bin | Summary |
| :--- | :--- | :--- |
| **30–34 Proposal** | `orchestration` | [`30-34-universal-type-interpreter-and-multimodal-mcard-renderer`](../orchestration/30-34-universal-type-interpreter-and-multimodal-mcard-renderer/) |
| **Sprint 30** | `corpus` | [`30-universal-type-judgment-and-stratified-type-lattice`](../corpus/30-universal-type-judgment-and-stratified-type-lattice/) |
| **Sprint 31** | `interactions` | [`31-pluggable-polyglot-renderer-registry-and-viewlets`](../interactions/31-pluggable-polyglot-renderer-registry-and-viewlets/) |
| **Sprint 32** | `interactions` | [`32-clm-higher-universe-card-renderers`](../interactions/32-clm-higher-universe-card-renderers/) |
| **Sprint 33** | `shell` | [`33-universal-mcard-viewer-and-explorer-integration`](../shell/33-universal-mcard-viewer-and-explorer-integration/) |
| **Sprint 34** | `verification` | [`34-tikzit-dockview-integration-and-verification-matrix`](../verification/34-tikzit-dockview-integration-and-verification-matrix/) |
| **Sprint 35** | `interactions` | [`35-multimodal-artifact-export-and-database-persistence`](../interactions/35-multimodal-artifact-export-and-database-persistence/) |

**Verification at graduation:** 670 Vitest tests / 109 files green · `tsc --noEmit` clean · Contract B regenerated baseline (295 literals / 17 dynamic prefixes) intact · Contract E zero-DOM isolation clean · `make check-independence` 5/5.

---

## 2. Graduation Workflow Reference

When work on a sprint in `_active/` is finished and verified against its definition of done:
1. Classify the sprint into the category bin matching its primary subsystem (`orchestration`, `corpus`, `parser`, `shell`, `canvas`, `interactions`, `styles`, `preview`, `sync`, `verification`, `desktop-parity`). If no existing bin fits, create a new inclusive category directory rather than a bare `<sprint-id>/` folder.
2. Move the final sprint document into its folder inside the bin: `docs/sprints/<bin>/<NN-slug>/`, and write that folder's `README.md` with links to produced source code, test reports, and benchmarks.
3. Mark status as **Completed (Graduated)** in both `docs/sprints/README.md` and `docs/sprints/_active/README.md`, and remove the graduated draft from `_active/`.
4. Update the root `README.md` and the weekly changelog under `docs/changelog/`.
