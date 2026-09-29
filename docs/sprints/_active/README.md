# Active Sprint Directory (`docs/sprints/_active`)

> [!IMPORTANT]
> **Active Series: Sprints 25–29 — Operadic MCard Virtual File System, Merkle-VCS & Reusable Explorer Subsystem (`@clm/mcard-vcs` & `@clm/mcard-explorer`)**  
> Proposed by the **BMAD Engineering Roundtable** (**Winston**, **Amelia**, **Sally**, **John**, **Mary**) to extract, isolate, and elevate TikZiT's storage, version control, and card exploration into autonomous, zero-DOM subsystems grounded in **`clm-kernel`**, ready for adoption by **`mcard-studio`**, and engineered around the **Double Operadic Theory of Systems (DOTS)**.

This directory tracks the active proposal and sprint specifications for extracting MCard storage, version control, and card exploration into independent, universally portable modules (`@clm/mcard-vcs` and `@clm/mcard-explorer`). **Success is not measured by TikZiT adoption alone: the series graduates when the outcome is a reusable MCard Explorer subsystem — a headless query engine, pluggable action registry, and host-agnostic presentation kit that *any* host can mount, proven by at least one second, non-TikZiT reference consumer running against the public API only.** Governed by the **Cubical Logic Model (CLM)**, **DOTS (Double Operadic Theory of Systems)**, **Cordis Meta-Framework**, **Satori Protocol**, and **Baldwin's Modularity Operators**, this series ensures zero host coupling, Content-Addressed Merkle DAG versioning, and drop-in plugin compatibility for `mcard-studio`.

---

## 0. Grounding Audit (verified 2025-09-29 against the working tree)

Before implementation begins, every environment claim below was re-verified against the current repository state:

| Claim | Verified Value | Command |
| :--- | :--- | :--- |
| Vitest unit/integration suite | ✅ **77 files, 466/466 passing** | `npm test` |
| Playwright E2E inventory | **405 listed tests in 27 spec files** (135 unique × Chromium/Firefox/WebKit) — supersedes the stale "392+" figure | `npx playwright test --list` |
| Contract B selector baseline | `docs/testing/testid-baseline.json` holds **196 literals + 5 dynamic prefixes**; `scripts/audit-testids.mjs --check` passes. Note: two newer literals in `PreviewStage.tsx` (`preview-svg-content`, `preview-empty-message`) are **not yet registered** in the baseline; the gate only fails on *removals*, so regenerate the baseline when adding selectors | `node scripts/audit-testids.mjs --check` |
| Browser independence gate | 5/5 checks pass | `make check-independence` |
| Dual-system protocol conformance | 12/12 canonical ZX diagrams | `make check-conformance` |
| `clm-kernel@0.0.1` surface | Exports `MCardFileSystem` (incl. `static createOptimal`), `TriDatabaseManager`, `Blake3Provider`, `buildMerkleTreeFromEntries`, `detectOptimalStorageBackend`, `registerFileSystemService`, `CASBackendPlugin`, `DisposableList`, `SavepointGuard`, `parseSatoriXml`/`serializeSatoriXml`, `sessionPrompt`, and the `TriDatabasePillar` type — see per-sprint grounding notes | inspected in `node_modules/clm-kernel/dist` |
| Hash prefix convention | The kernel uses **`blake3:`** (`BLAKE3_HASH_PREFIX`), **not** `urn:mcard:blake3:`; TikZiT's own spec asserts `'blake3:'` in `src/services/__tests__/clm-cordis.spec.ts` | — |
| `mcard-studio` grounding | The sibling checkout exists (`Dir_CLM_MCARD/mcard-studio-worktree`) but **none of the files cited by this series exist there** (`src/kernel/PtrPluginRegistry.ts`, `src/services/vfs/vfsCore.ts`, `src/koishi/*`). All `mcard-studio` references are therefore treated as **contract-first target interfaces**, to be verified against a pinned upstream revision before their sprint may start implementation (see Sprint 28 DoD) | directory scan |

> [!WARNING]
> **Contract D scope note:** several existing host services already exceed the ≤250 LOC ceiling (e.g. `src/services/clm/documentCommitService.ts` is 440 LOC). Sprint 29's refactor is what brings them into compliance; the ceiling does not describe the current state.

---

## 1. Active Series Roadmap: Sprints 25–29

| Sprint | Subsystem | Specification Document | Focus & Scope | Lead Agents | Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **Proposal** | `architecture` | [`PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md`](PROPOSAL-25-29-PORTABLE-MCARD-STORAGE-AND-VERSION-CONTROL.md) | Overarching architecture proposal, BMAD colloquy, DOTS foundations, ADRs D22–D31, and upstream convergence strategy. | Winston, Amelia, Sally, John & Mary | 📋 **Accepted** |
| **25** | `corpus` / `storage` | [`SPRINT-25-ISOLATED-MCARD-STORAGE-KERNEL-AND-VFS.md`](SPRINT-25-ISOLATED-MCARD-STORAGE-KERNEL-AND-VFS.md) | Operadic VFS grounded on `clm-kernel`'s `MCardFileSystem`; Getter/Setter lenses; Dispatch/Callback event wiring; Moore state carrier; pluggable `StorageVFS`; **public API barrel & embedding-grade boundaries (Contract E)**. | Winston & Amelia | ✅ **Complete** |
| **26** | `sync` / `vcs` | [`SPRINT-26-CONTENT-ADDRESSED-VERSION-CONTROL-AND-MERKLE-LINEAGE.md`](SPRINT-26-CONTENT-ADDRESSED-VERSION-CONTROL-AND-MERKLE-LINEAGE.md) | Mealy Machine VCS engine; Merkle DAG commits (`CommitMCard`); immutable branch refs; multi-modal semantic AST diffs; deterministic 3-way merge; **headless Explorer query facade (serializable DTOs only)**. | Winston & Amelia | ✅ **Complete** |
| **27** | `orchestration` / `protocol` | [`SPRINT-27-CORDIS-FIBER-AND-SATORI-PROTOCOL-ADAPTERS.md`](SPRINT-27-CORDIS-FIBER-AND-SATORI-PROTOCOL-ADAPTERS.md) | Inversion of Control via Cordis Fibers (`mcard.storage`, `mcard.vcs`, `mcard.explorer`) **mounted on a bare Context**; LIFO `DisposableList`; Satori XML/JSON AST codecs (`<card>`, `<version-dag>`, `<diff-view>`, `<mcard-explorer>`); turn pipeline as Mealy transition. | Winston & Sally | ✅ **Complete** |
| **28** | `orchestration` / `plugin` & `presentation` / `explorer` | [`SPRINT-28-MCARD-STUDIO-PLUGIN-AND-CROSS-APPLICATION-BRIDGE.md`](SPRINT-28-MCARD-STUDIO-PLUGIN-AND-CROSS-APPLICATION-BRIDGE.md) | **Reusable MCard Explorer Subsystem (`@clm/mcard-explorer`)**: Headless engine, pluggable `ExplorerActionRegistry`, universal UI viewlets; `PtrPluginDefinition` manifest (mcard-studio as flagship adopter); Satori tag renderers; `clm-kernel` v0.2.0 evolution RFC. | Winston, John & Sally | ✅ **Complete** |
| **29** | `verification` / `shell` & `presentation` / `explorer` | [`SPRINT-29-TIKZIT-HOST-INTEGRATION-AND-VERIFICATION-MATRIX.md`](SPRINT-29-TIKZIT-HOST-INTEGRATION-AND-VERIFICATION-MATRIX.md) | **Host Re-anchoring & Conformance**: Thin TikZiT lens adapters; `CorpusExplorerDrawer.tsx` refactor over `MCardExplorer`; cross-system roundtrip and explorer conformance tests; 100% preservation of verified baselines (466 Vitest, 405 Playwright, Contract B registry). | Amelia & Mary | ✅ **Complete** |

---

## 2. Theoretical Foundations: DOTS Programming Idioms

The subsystem is designed around four foundational programming idioms from the **Double Operadic Theory of Systems (DOTS)** (`Hub/Theory/Category Theory/Double Operadic Theory of Systems.md`):

1. **Getter / Setter (Conversational Lenses $S \dashv G$)**:
   - Access to VFS cards and handles is structured through formal bidirectional lenses:
     $$G: \mathcal{S} \longrightarrow \mathcal{A} \quad (\text{Getter: Observation / Projection})$$
     $$S: \mathcal{S} \times \mathcal{B} \longrightarrow \mathcal{S}' \quad (\text{Setter: Actuation / Mutation})$$
   - Satisfying the three categorical Lens Laws ($S(s, G(s)) = s$, $G(S(s, b)) = b$, $S(S(s, b_1), b_2) = S(s, b_2)$).
2. **Dispatch / Callback (Wiring Diagrams)**:
   - Dynamic interactions in the VFS and Explorer are structured as loose wiring morphisms. Actions are submitted via `dispatch(action)`, and state changes or transition receipts are broadcast to registered callback closures returning clean disposal tokens.
3. **Mealy / Moore Machines**:
   - **Moore Machine (MCard)**: Static state carrier. $O = \lambda(s)$. Content is pure, immutable, and addressable by cryptographic hash (`urn:mcard:blake3:...`).
   - **Mealy Machine (VFS Mutation Engine & Explorer Actions)**: Input-driven transition system. $O = \delta(s, i)$. An incoming edit, commit intent, or explorer action triggers state progression, generating updated Merkle DAGs, modified selection states, and `VCard` execution witnesses.
4. **Porting / Inversion (Baldwin Operators & Cordis)**:
   - **Porting ($\operatorname{Lan}_K F$)**: Change-of-base functor that maps the VFS and Explorer interfaces from TikZiT's spatial shell to `mcard-studio`'s microkernel without modifying internal logic.
   - **Inversion ($\dashv$)**: Inverting control through Cordis coeffects (`ctx.inject(['identity.did', 'mcard.storage', 'mcard.explorer'])`) and `DisposableList` LIFO cleanup.

---

## 3. Key Architectural Invariants & Decisions (ADRs D22–D31)

1. **D22 (Subsystem Boundary)**: Storage and version control are packaged as an autonomous, headless module (`@clm/mcard-vcs`) with zero dependency on UI, Three.js, or TikZiT domain models.
2. **D23 (Grounded VFS & Zero-FS Hermeticity - INV-09)**: Built directly upon `clm-kernel`'s `MCardFileSystem` and `TriDatabaseManager`. All storage operations execute through `StorageVFS` (in-memory SQLite, WASM `sql.js` with IndexedDB persistence, or native Node.js filesystem). Zero browser window or DOM globals.
3. **D24 (Content-Addressed Merkle DAG - INV-02)**: Versioning evolves from a linear monotonic counter into a full Merkle DAG with parent commit hashes, author DIDs, branching (`refs/heads/*`), and deterministic 3-way merging.
4. **D25 (Conversational Lens & Dispatch API)**: Provides reactive Getters and Setters satisfying formal lens laws, with typed dispatch/callback event wiring for UI and agent observation.
5. **D26 (Cordis Fiber Lifecycle & Reversible Effects)**: Storage transactions, branch checkouts, and explorer queries execute within Cordis Fibers. All side effects register cleanup closures in a `DisposableList` for exact LIFO unwinding on abort or component unmount.
6. **D27 (Canonical `mcard-studio` PTR Plugin)**: Exposes a standard `PtrPluginDefinition` (`TikzitMCardVcsPlugin`) declaring Petri Net places (`p_vcs_idle`, `p_mcard_staged`, `p_merkle_verified`, `p_commit_sealed`, `p_explorer_ready`) and transition morphisms for `mcard-studio`'s microkernel.
7. **D28 (Upstream `clm-kernel` Evolution Blueprint)**: Authors `RFC-CLM-002-OPERADIC-VFS.md` detailing how `clm-kernel` v0.2.0 should natively adopt operadic lenses, Mealy machine transitions, and conversational turn pipelines.
8. **D29 (Reusable Explorer Subsystem — Contract E)**: The series ships an embeddable MCard Explorer, not just internals: a headless query facade over storage + lineage (`list` / `search` / `history` / `diff` / `subscribe` returning plain serializable DTOs), consumed exclusively through declared subpath exports (`/`, `/explorer`, `/plugin`, `/cordis`, `/satori`, `/conformance`), with zero imports from any host namespace and a shipped conformance kit so third-party hosts verify their own integrations. Reuse is proven empirically by Sprint 29's Node CLI reference host.
9. **D30 (Pluggable Action Morphisms)**: Domain actions (`open`, `duplicate`, `archive`, `export`, `diff`, `inspectMarking`) are modeled as Mealy state transitions $O = \delta(s, i)$, registered via `ExplorerActionRegistry` by each host application without modifying the core explorer engine.
10. **D31 (Universal Viewlet Decoupling)**: Headless engine (`MCardExplorerEngine`) operates with 100% parity under Node without DOM; presentation viewlets (`MCardExplorer`, `MCardTree`, `MCardSearchBar`, `MCardEntryRow`) adapt to any host with configurable selectors and facets.

---

## 4. `mcard-studio` Plug-in Sample & Integration Blueprint

The subsystem provides a drop-in plugin and reusable explorer for `mcard-studio`:

```typescript
import { clientContext } from './cordisClient';
import { PtrPluginRegistry } from '../kernel/PtrPluginRegistry';
import { createMCardVcsPlugin } from '@clm/mcard-vcs/plugin';
import { MCardExplorer, ExplorerActionRegistry } from '@clm/mcard-explorer';

// 1. Initialize microkernel registry and mount plugin
const registry = new PtrPluginRegistry(clientContext);
const plugin = createMCardVcsPlugin(clientContext);
registry.registerPtrPlugin(plugin);

// 2. The plugin is now active! Its places, transitions, and Cordis services 
// (mcard.storage, mcard.vcs, mcard.explorer) are available to Koishi bots and UI panels.

// 3. Mount Reusable Explorer into ExplorerPanel.astro
export const StudioExplorer = () => (
  <MCardExplorer
    engine={clientContext.get('mcard.explorer').engine}
    actionRegistry={new ExplorerActionRegistry()}
    facets={['all', 'marking', 'diagram', 'prompt']}
  />
);
```

---

## 5. Quality Gates & Governance Constraints

- **Strict Line Count Ceiling (Contract D)**: Every file in `@clm/mcard-vcs`, `@clm/mcard-explorer`, and every host adapter must strictly adhere to $\le 250$ LOC. Existing adapters above the ceiling (`documentCommitService.ts` at 440 LOC) are brought into compliance by Sprint 29's refactor.
- **Zero-DOM Isolation Gate**: `make check-vcs-isolation` automatically verifies that `@clm/mcard-vcs/storage`, `@clm/mcard-vcs/vcs`, and `@clm/mcard-explorer/core` contain zero references to `window`, `document`, or `HTMLElement`.
- **Embedding & Reuse (Contract E — ADR D29)**: every host-facing claim is enforced, not aspirational —
  - sole runtime dependency outside devDependencies is `clm-kernel` (React allowed only behind the optional UI kit as a peer);
  - zero imports from host namespaces (`src/components/**`, `src/stores/**`, `src/services/**`, `src/core/**`) inside `src/packages/mcard-vcs/**` and `src/packages/mcard-explorer/core/**`;
  - all consumption via declared subpath exports (`/`, `/explorer`, `/plugin`, `/cordis`, `/satori`, `/conformance`);
  - full headless parity — the entire Explorer surface must run under Node without DOM;
  - shipped conformance self-check kit so external hosts verify their integration in one command.
- **Selector Stability (Contract B)**: All literal `data-testid` attributes registered in `docs/testing/testid-baseline.json` (currently 196 literals + 5 dynamic prefixes) are preserved. Newly added selectors must be baselined via `scripts/audit-testids.mjs` in the same change.
- **Test Integrity**: The existing Vitest suite (**77 files, 466 tests**, verified green on 2025-09-29) and the Playwright suite (**405 listed tests across 27 spec files** over the Chromium/Firefox/WebKit matrix) must continue to pass 100% green without modification.
- **Cross-System Conformance**: Dedicated roundtrip and explorer conformance tests (`studio-roundtrip.test.ts` and `explorer-cross-system.test.ts`) verify seamless SQLite database interchange and identical explorer behavior across TikZiT, `mcard-studio`, and headless CLI environments.

