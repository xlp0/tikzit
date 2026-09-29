# Active Sprint Directory (`docs/sprints/_active`)

> [!IMPORTANT]
> **Active Architecture Series**: **Sprints 36–40 — Polynomial Interface UI & Spatiotemporal Compositionality**.
> Realigns the TikZiT workbench interface with the polynomial-interface theory of **Spencer Breiner** and **Spivak & Niu**, following the vault syntheses in `StudyNotes` (`Literature/Reading notes/@Spencer_Breiner_Polynomial_Interfaces`, `Hub/Theory/Integration/Lenses and Directionality in Web and Cloud Architecture`, `Hub/Theory/Integration/The Card-Centric Operating System`, `Literature/Spatiotemporal Computing`).
> **Governing principle:** *MCard manipulation is the first-class object.*
> **Architecture alignment:** every module declares its **`clm-kernel` stratum** (ADR D57) and follows the **`mcard-studio` module contract** — façade + ≤150-LOC concern modules, hook-per-concern, kenotic host context (ADRs D54–D56).

---

## 1. Active Series Roadmap & Sprint Matrix

| Sprint | Subsystem Bin | Specification Document | Primary Focus & Deliverables | Status |
| :---: | :--- | :--- | :--- | :---: |
| **Proposal** | `orchestration` | [`PROPOSAL-36-40-POLYNOMIAL-INTERFACE-UI-AND-SPATIOTEMPORAL-COMPOSITIONALITY.md`](./PROPOSAL-36-40-POLYNOMIAL-INTERFACE-UI-AND-SPATIOTEMPORAL-COMPOSITIONALITY.md) | Theory grounding (Breiner / Spivak–Niu / Semagrams / Cordis), verified defect ledger, **kernel layer map (§4.2)**, **studio alignment contract (§4.3)**, ADRs D46–D57, God-file remediation map, dependency rules. | 🟢 **Active Blueprint** |
| **36** | `shell` | [`../shell/36-polynomial-interface-core-and-affordance-algebra/README.md`](../shell/36-polynomial-interface-core-and-affordance-algebra/README.md) | `@clm/mcard-explorer/poly` — `Position`/`Direction`/`PolyInterface`/`InterfaceLens`, guardrail combinators, registry, numeric-polynomial census adapter, `NavigationProvider` port; typed facets replacing substring matching; engine split into 5 modules. | ✅ **Completed (Graduated)** |
| **37** | `interactions` | [`SPRINT-37-MCARD-FIRST-CARD-ALGEBRA-AND-COMPOSITION-SURFACE.md`](./SPRINT-37-MCARD-FIRST-CARD-ALGEBRA-AND-COMPOSITION-SURFACE.md) | `@clm/mcard-explorer/cards` — typed ports (one file per card type), port legality from the kernel lattice, `⊗` / `◁` / `+` composition, monad + Kleisli handle ops; deletes the monomodal `ExplorerItem` union and the 15-prop wall. | 📋 **Drafted / Ready** |
| **38** | `shell` | [`SPRINT-38-OPERADIC-ZOOM-AND-MULTI-LEVEL-NAVIGATION.md`](./SPRINT-38-OPERADIC-ZOOM-AND-MULTI-LEVEL-NAVIGATION.md) | `@clm/mcard-explorer/zoom` — structure projection as a fibration (SQLite/Satori/PCard/ZX/TikZ/Markdown/JSON/namespace providers), zoom stack + breadcrumb, outer-contract boundary validation, default navigation providers. | 📋 **Drafted / Ready** |
| **39** | `shell` | [`SPRINT-39-COFREE-TIMELINE-REVERTIBLE-EFFECTS-AND-COEFFECT-PANELS.md`](./SPRINT-39-COFREE-TIMELINE-REVERTIBLE-EFFECTS-AND-COEFFECT-PANELS.md) | `@clm/mcard-explorer/time` — cofree interaction tree with branches and time travel, revertible-effect journal composing kernel `DisposableList`/`SavepointGuard`, replay purity; reactive coeffects + Day-convolution panel decoupling; `HostEffectContext` host port. | 📋 **Drafted / Ready** |
| **40** | `verification` | [`SPRINT-40-POLYNOMIAL-CONFORMANCE-VERIFICATION-AND-HOST-REALIGNMENT.md`](./SPRINT-40-POLYNOMIAL-CONFORMANCE-VERIFICATION-AND-HOST-REALIGNMENT.md) | Law suites (lens / monad / operad / cofree / residue), 14-case guardrail absence proofs, **layer + façade + dependency gates**, **studio parity suite**, `CorpusExplorerDrawer` decomposition, shim deletion, performance. | 📋 **Drafted / Ready** |

---

## 2. Core Architectural Principles

1. **MCard is the unit of manipulation (ADR D48)**: every interface operation is a card operation — `cardCreate` (η), `cardGet` (μ dedupe), `cardDerive`, `cardInvoke` (PCard as Kleisli arrow), `cardCompose`, `cardZoom`. View models are *projections* of positions, never independent unions.
2. **Directions are position-indexed and legal-by-construction (ADR D47)**: views render exactly `resolveDirections(position)`. An illegal act has **no DOM affordance** — absence, not `disabled`, not a validation error. (Semagrams guardrail discipline.)
3. **The interface polynomial is authored here (ADR D46)**: `clm-kernel`'s `PolynomialFunctor` is *numeric* arithmetic (`evaluate(x: number)`), not the positions/directions interaction algebra. Reuse it only for fiber censuses; never pretend it is the interface model.
4. **Typed facets replace substring matching (ADR D49)**: facets resolve to `ExplorerSearchFilter` fields (`universe` / `category` / `payloadKind` / `mimeType` / `pattern`) and are filtered in SQL by the data source — the capability `ExplorerQueryFacade` already has.
5. **Structure zoom is a fibration with boundary consistency (ADR D50)**: drilling into a card exposes its interior; an inner change that would retype an outer-exposed port has no commit direction. No provider ⇒ no zoom direction, never an error.
6. **Time is the cofree interaction tree (ADR D51)**: session = path, branches preserve the future, `alternatives` reports what was legal *then*; version lineage attaches as sub-trees.
7. **Effects are revertible; coeffects are narrow (ADR D52)**: every context mutation carries a tracked inverse (zero residue on rollback/unmount); panels declare the exact context slices they require, composed by Day convolution rather than global stores.
8. **One concern per module (ADR D53/D54)**: Contract D's ≤ 250 LOC is a ceiling of last resort; the working target is **≤ 150 LOC with a single responsibility** — the same ceiling `mcard-studio` states for its own orchestrators (`MCardFileTree.tsx`, *"thin orchestrator (≤150 lines, INV-304-09)"*) — and prop interfaces ≤ 8 members.
9. **Kernel layer discipline (ADR D57)**: every module declares its stratum (`@layer L<n>`); kernel consumption is **at or below** that stratum and via the **root** `'clm-kernel'` export only — `layer0`–`layer4` subpaths are permitted by the package, but `./layer5` is **not in the `exports` map** (verified), so lattice/judgment symbols must come from the root. `check-layer-imports.mjs` enforces this.
10. **Studio-parity module contract (ADR D54)**: one façade per capability (`poly/`, `cards/`, `zoom/`, `time/`), internals split to single-concern files, sibling imports through façades only, presentation concerns as hooks/local state rather than callback props — mirroring `mcard-studio/src/services/vfs/*` + `mcardVfs.ts` and `views/fileTree/*` + `hooks/*`.
11. **Kenotic host context (ADR D55)**: host context (Cordis `Context`, stores) is **passed in, never imported** — the rule `mcard-studio` states in `vfsCordis.ts` — and every effect returns a disposer so disposal is zero-residual in both hosts.
12. **Navigation is a port (ADR D56)**: `NavigationProvider` + addressable positions make the tree, breadcrumbs, timeline, command palette, and URL deep links consumers of one seam — matching the `mcard-navigation` skill's "URL as State" and plugin-provider plan.
13. **Package separation holds (ADR D42)**: `@clm/mcard-explorer` and `@clm/mcard-vcs` remain independently adoptable; `poly/`, `cards/`, `zoom/`, `time/` consume ports only — never `mcard-vcs` concretes.
14. **Kernel reuse, not reimplementation**: `TypeInterpreter`/`TypeJudgment` for typing, `PlaceDef`/`TransitionDef`/`ArcDef`/`MarkingMap`/`PetriNetTopology` for PCard structure, `parsePortableSqlite` for collections, `parseSatoriXml` for conversational structure, `FiberLifecycle`/`DisposableList`/`SavepointGuard` for lifecycle and disposal, `PolynomialFunctor` for numeric censuses only.

---

## 2.1 Kernel Layer Placement (ADR D57)

| Layer | Kernel surface | Our modules | Import rule |
| :--- | :--- | :--- | :--- |
| **L0** values & identity | `TypedValue`, `TypedValueDict`, `computeContentHash`, `detectMime`, `isBinary` | `cards/handles.ts` (η/μ), `poly/census.ts`, `time/*` snapshots | root export |
| **L1** process & dynamics | `PlaceDef`, `TransitionDef`, `ArcDef`, `MarkingMap`, `PetriNetTopology`, `fireTransition` | `cards/providers/pcard.ts`, `zoom/providers/PcardStructureProvider.ts` | root export |
| **L2** storage & classification | `MCardFileSystem`, `TriDatabaseManager`, `parsePortableSqlite`, `classifyClm`, `detectDialect` | `cards` ports, `zoom/providers/Sqlite*`, `core/FacetResolver.ts` | root export |
| **L3** speech acts | `parseSatoriXml`, `SatoriElement`, `satoriToMCard` | `zoom/providers/SatoriStructureProvider.ts` | root export |
| **L4** membrane / viewlets | `HypermediaNode`, `FiberLifecycle`, `DisposableList`, `SavepointGuard`, `PtrCordisEngine` | **`poly/`, `cards/`, `zoom/`, `time/`, `ui/`** (all new strata are L4) | root export |
| **L5** lattice & meta | `TypeInterpreter`, `TypeJudgment`, `UniverseLevel`, `UNIVERSE_NAMES`, `isStratified` | consumed by reference only | **root export only — `./layer5` is not exported** |

---

## 3. Definition of Done (DoD) Summary Matrix

| Sprint | Verification Gates | Automated Tests | Isolation & Contracts | Status |
| :---: | :--- | :--- | :--- | :---: |
| **36** | Position/direction algebra; fail-closed resolution; typed facets push SQL filters; engine split into 5 modules; `NavigationProvider` port | `poly/{guardrails,registry,census}.test.ts`, `core/{FacetResolver,TreeProjection,SelectionModel}.test.ts`, `studio-parity.test.ts` (tree semantics) | Contract E incl. `poly/` + `core/`; `@layer L4` declared; façade-only exports; kenotic boundary; no hardcoded action lists | ✅ Graduated |
| **37** | 7 port providers (one file each); 4 `PortMatch` reasons; `⊗`/`◁`/`+` with computed legality; Kleisli invariant; `toStudioPortDescriptor` parity | `cards/*.test.ts`, `studio-parity.test.ts` (port descriptor, `studioMCardFs` signatures) | `ExplorerItem` deleted; `CardRowProps` ≤ 4 members; ≥ 8 guardrail absence cases; `@layer L4`; no in-line hashing/parsing | 📋 Ready |
| **38** | 8 structure providers delegating to kernel codecs; depth + cycle bounds; boundary accept/reject; default navigation providers + deep links | `zoom/{providers,stack,boundary}.test.ts`, `studio-parity.test.ts` (`toStudioTreeNode`, address round-trip) | `PositionTree` replaces `MCardTree`; providers never re-parse kernel-owned formats; absent zoom for unmodelled types | 📋 Ready |
| **39** | Cofree path/branch/alternatives; zero residue; replay purity; coeffect isolation; journal ≡ `useCordisFiber` teardown | `time/*.test.ts`, `poly/coeffects.test.ts`, `studio-parity.test.ts` (teardown, nanostores slices) | `MCardViewer` 172 → ≤ 90 LOC; kernel `DisposableList`/`SavepointGuard` composed (no second disposal mechanism); zero `cordis` imports in package | 📋 Ready |
| **40** | 6 law suites; 14 guardrail cases; **layer + façade + dependency gates**; studio parity suite; 1,000-card performance | `tests/conformance/polynomial-*.test.ts`, `guardrail-absence.test.ts`, `studio-parity.test.ts`, `scripts/check-layer-imports.mjs` | Contract B (295 literals / 17 families); drawer decomposed into 4 modules; shims deleted; studio porting checklist | 📋 Ready |

---

## 4. Graduation Workflow Reference

When work on a sprint in `_active/` is finished and verified against its definition of done:
1. Classify the sprint into the category bin matching its primary subsystem (`orchestration`, `corpus`, `parser`, `shell`, `canvas`, `interactions`, `styles`, `preview`, `sync`, `verification`, `desktop-parity`). If no existing bin fits, create a new inclusive category directory rather than a bare `<sprint-id>/` folder.
2. Move the final sprint document into its folder inside the bin: `docs/sprints/<bin>/<NN-slug>/`, and write that folder's `README.md` with links to produced source code, test reports, and benchmarks.
3. Mark status as **Completed (Graduated)** in both `docs/sprints/README.md` and `docs/sprints/_active/README.md`, and remove the graduated draft from `_active/`.
4. Update the root `README.md` and the weekly changelog under `docs/changelog/`.

---

## 5. Graduated Precedent

| Series | Bin | Relevance to this series |
| :--- | :--- | :--- |
| Sprints 30–34 | `orchestration` · `corpus` · `interactions` · `shell` · `verification` | Type judgment, renderer registry, `MCardViewer`, Dockview integration — the surfaces this series makes compositional |
| Sprint 35 (Active) | `interactions` · `shell` | `Export ▾` dropdown, destination × format orthogonality, sovereign VFS persistence — the multimodal foundation this series re-derives through the registry |
| Sprints 25–29 | `corpus` · `sync` · `orchestration` · `verification` | `@clm/mcard-vcs` / `@clm/mcard-explorer` split, `OperadicMCardVfs`, `ExplorerQueryFacade` — the ports this series consumes |

---

## 6. Reference Implementation — `mcard-studio`

`~/Documents/Development/GovTech/MCard_TDD/mcard-studio` is the generalized MCard browsing/exploration host this series converges with. Verified artefacts the sprints bind to:

| Studio artefact | Convention it establishes | Adopted as |
| :--- | :--- | :--- |
| `src/services/vfs/*` (11 modules) + `mcardVfs.ts` façade | Façade + single-concern modules; the façade is *"the compile-time contract (INV-294-01)"* | **ADR D54** |
| `views/fileTree/MCardFileTree.tsx` — *"thin orchestrator (≤150 lines, INV-304-09)"*; `hooks/{useFileTreeSync,useInlineRename,useDragAndDrop,useFolderContext,useCardInsertion}` | ≤150-LOC orchestrators; hook-per-concern | **ADR D53/D54**, Sprint 36 UI split, Sprint 37 `usePortDrag` |
| `src/hooks/useCordisFiber.ts`, `src/services/vfs/vfsCordis.ts` — *"Context is passed IN — never imported"*, `ctx.effect` → disposer, INV-255-02 zero-residual | Kenotic host boundary; disposer-returning effects | **ADR D55**, Sprint 39 `HostEffectContext` |
| `src/fiber/disposable.ts` — studio `DisposableList` (`p · (−p) ≃ refl`, `H_T → 0`) | LIFO reversibility as a named invariant | Sprint 39 composes the **kernel** `DisposableList`; studio converges as a wrapper |
| `src/stores/*` (11 nanostores atoms incl. `$mcardTree`, `executionLog.ts`, `lagrangian.ts`) | Atoms as context slices; `L = S_T − H_T` naming | Sprint 39 coeffect slices; zero-residue = `H_T → 0` |
| `src/utils/artifactTree.ts` (`buildArtifactTree`, `TreeNode`) | Path-based tree with dir-first sorting | Sprint 36 `TreeProjection` parity target |
| `src/lib/renderers/forwardBrowsing.ts` (`findForwardBrowsingTargets`) | Ad-hoc affordance fiber by regex over YAML | Sprint 36/37 generalize into typed ports + direction groups |
| `views/cardViewlets/*` (`CardViewletDefinition`, `ViewletErrorBoundary`, `ViewletLoadingSpinner`) | Viewlet registry + failure/loading patterns | ADR D34 port target; Sprint 37 adds `toStudioPortDescriptor`, Sprint 38 adds `toStudioTreeNode` |
| `.agents/skills/mcard-navigation/SKILL.md` | Hybrid Explorer: sidebar tree + breadcrumbs + command palette; **"URL as State"**; navigation-provider plugin system | **ADR D56**, Sprint 36 `NavigationProvider`, Sprint 38 default providers, Sprint 39 timeline deep links |

**Studio-side deliverables (not in this repository):** host adapters for `CardStorePort`/`CardVcsPort`/`CardRuntimePort`, `HostEffectContext` over `clientContext`, `StructureProvider` registrations for studio-only card types (`Spatial3d`, `Webapp`, `MeshTopology`, `MerkleProof`, `PayloadCas`), and the `DisposableList` convergence wrapper. Sprint 40's porting checklist names each file.
