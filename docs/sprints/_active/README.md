# Active Sprint Directory (`docs/sprints/_active`)

> [!NOTE]
> **No Active Sprints**: Sprints 25–29 have been successfully implemented, verified against all Definition of Done (DoD) criteria, and graduated into their permanent subsystem category directories. This directory stands ready for the next sprint series.

---

## Recently Graduated Series: Sprints 25–29 — Operadic MCard Virtual File System, Merkle-VCS & Reusable Explorer Subsystem

Proposed by the **BMAD Engineering Roundtable** (**Winston**, **Amelia**, **Sally**, **John**, **Mary**) to extract, isolate, and elevate TikZiT's storage, version control, and card exploration into autonomous, zero-DOM subsystems grounded in **`clm-kernel`**, ready for adoption by **`mcard-studio`**, and engineered around the **Double Operadic Theory of Systems (DOTS)**.

| Sprint | Subsystem Bin | Graduated Specification Directory | Focus & Realization | Status |
| :---: | :--- | :--- | :--- | :---: |
| **Proposal** | `orchestration` | [`../orchestration/25-29-portable-mcard-storage-and-version-control`](../orchestration/25-29-portable-mcard-storage-and-version-control/) | Overarching architecture proposal, BMAD colloquy, DOTS foundations, ADRs D22–D31, and upstream convergence strategy. | 🟢 **Graduated Blueprint** |
| **25** | `corpus` | [`../corpus/25-isolated-mcard-storage-kernel-and-vfs`](../corpus/25-isolated-mcard-storage-kernel-and-vfs/) | Operadic VFS grounded on `clm-kernel`'s `MCardFileSystem`; Getter/Setter lenses; Dispatch/Callback event wiring; Moore state carrier; pluggable `StorageVFS`; public API barrel & Contract E isolation. | ✅ **Completed (Graduated)** |
| **26** | `sync` | [`../sync/26-content-addressed-version-control-and-merkle-lineage`](../sync/26-content-addressed-version-control-and-merkle-lineage/) | Mealy Machine VCS engine; Merkle DAG commits (`CommitMCard`); immutable branch refs; multi-modal semantic AST diffs; deterministic 3-way merge; headless Explorer query facade (serializable DTOs). | ✅ **Completed (Graduated)** |
| **27** | `orchestration` | [`../orchestration/27-cordis-fiber-and-satori-protocol-adapters`](../orchestration/27-cordis-fiber-and-satori-protocol-adapters/) | Inversion of Control via Cordis Fibers (`mcard.storage`, `mcard.vcs`, `mcard.explorer`) mounted on bare Context; LIFO `DisposableList`; Satori XML/JSON AST codecs; turn pipeline as Mealy transition. | ✅ **Completed (Graduated)** |
| **28** | `orchestration` | [`../orchestration/28-mcard-studio-plugin-and-cross-application-bridge`](../orchestration/28-mcard-studio-plugin-and-cross-application-bridge/) | Reusable MCard Explorer Subsystem (`@clm/mcard-explorer`): Headless engine, pluggable `ExplorerActionRegistry`, universal UI viewlets; `PtrPluginDefinition` manifest; Satori tag renderers; `clm-kernel` RFC. | ✅ **Completed (Graduated)** |
| **29** | `verification` | [`../verification/29-tikzit-host-integration-and-verification-matrix`](../verification/29-tikzit-host-integration-and-verification-matrix/) | Host Re-anchoring & Conformance: Thin TikZiT lens adapters; `CorpusExplorerDrawer.tsx` refactor over `MCardExplorer`; cross-system roundtrip & explorer conformance tests; 100% preservation of verified baselines (526 Vitest, Contract B registry). | ✅ **Completed (Graduated)** |

---

## Master Verification Summary (All Gates Passed)

- **Vitest Unit & Integration Matrix:** **95 test files, 526 tests passing (100% green)** (`make test-web`).
- **Isolated VCS & Explorer Matrix:** **18 test files, 60 tests passing (100% green)** (`make test-vcs`).
- **Zero-DOM Isolation Gate (Contract E):** Passed with 0 DOM references and 0 host imports across all 29 modules (`make check-vcs-isolation`).
- **Browser Runtime Independence:** 5/5 checks passed with 0 native OS modules or C++ bindings in web bundle (`make check-independence`).
- **Dual-System Protocol Conformance:** 12/12 canonical ZX diagrams passing (`make check-conformance`).
- **Contract B Selector Audit:** 211 literal `data-testid` selectors and 12 dynamic prefix families verified intact (`node scripts/audit-testids.mjs --check`).
- **Contract D LOC Ceiling:** All newly authored and refactored files strictly satisfy $\le 250$ LOC.

---

## Graduation Workflow Reference

When a new series is proposed:
1. Author proposal and sprint specifications in `docs/sprints/_active/`.
2. Implement, test, and verify each sprint against its Definition of Done.
3. Graduate completed sprints into their respective subsystem directories (`corpus/`, `sync/`, `orchestration/`, `verification/`, etc.).
4. Update `docs/sprints/README.md` and repository changelogs.
