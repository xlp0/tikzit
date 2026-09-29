# Active Sprint Directory (`docs/sprints/_active`)

> [!IMPORTANT]
> **Active Architecture Series**: **Sprints 30–34 — Universal Type Interpretation, Stratified Type Lattice & Multimodal MCard Rendering Engine**.
> Grounded in `clm-kernel`'s `TypeInterpreter` and `mcard-studio`'s `CardViewletRegistry`/`CardViewletDefinition` architecture, engineered by the **BMAD Engineering Roundtable** (**Winston**, **Amelia**, **Sally**, **John**, **Mary**), and adhering to the CLM principle *"All things are MCards"*.

---

## 1. Active Series Roadmap & Sprint Matrix

| Sprint | Subsystem Bin | Specification Document | Primary Focus & Deliverables | Status |
| :---: | :--- | :--- | :--- | :---: |
| **Proposal** | `orchestration` | [`PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md`](./PROPOSAL-30-34-UNIVERSAL-TYPE-INTERPRETER-AND-MULTIMODAL-MCARD-RENDERER.md) | Overarching architecture proposal, BMAD colloquy, DOTS & CLM foundations, kernel layer map, ADRs D32–D45, and convergence strategy. | 🟢 **Active Blueprint** |
| **30** | `corpus` | [`SPRINT-30-UNIVERSAL-TYPE-JUDGMENT-AND-STRATIFIED-TYPE-LATTICE.md`](./SPRINT-30-UNIVERSAL-TYPE-JUDGMENT-AND-STRATIFIED-TYPE-LATTICE.md) | Universal Type Judgment & Stratified Type Lattice Integration (`@clm/mcard-vcs/type`). Wrap `clm-kernel` `TypeInterpreter` & `typeLattice`; 5-phase pipeline; enrich `CardView` and `ExplorerCardSummaryDto`. | 📋 **Drafted / Ready** |
| **31** | `interactions` | [`SPRINT-31-PLUGGABLE-POLYGLOT-RENDERER-REGISTRY-AND-VIEWLETS.md`](./SPRINT-31-PLUGGABLE-POLYGLOT-RENDERER-REGISTRY-AND-VIEWLETS.md) | Pluggable Polyglot Renderer Registry & Base Viewlet Suite (`@clm/mcard-explorer/renderers`). Port `mcard-studio` descriptor model; build Text, Markdown, Data, Yaml, Csv, Image, BinaryHex viewlets ($\le 250$ LOC). | 📋 **Drafted / Ready** |
| **32** | `interactions` | [`SPRINT-32-CLM-HIGHER-UNIVERSE-CARD-RENDERERS.md`](./SPRINT-32-CLM-HIGHER-UNIVERSE-CARD-RENDERERS.md) | Higher-Universe Card Renderers: TikZ, PCard, VCard, Satori & SQLite (`@clm/mcard-explorer/renderers/clm`). Implement domain viewlets for $U_0$ TikZ/SQLite, $U_1$ PCard, $U_2$ VCard, $U_3$ Satori. | 📋 **Drafted / Ready** |
| **33** | `shell` | [`SPRINT-33-UNIVERSAL-MCARD-VIEWER-AND-EXPLORER-INTEGRATION.md`](./SPRINT-33-UNIVERSAL-MCARD-VIEWER-AND-EXPLORER-INTEGRATION.md) | Universal Card Viewlet (`MCardViewer`) & Explorer Master Integration (`@clm/mcard-explorer/ui`). Composite viewer, split-pane drawer in `MCardExplorer`, Universe facet filter chips ($U_0$–$U_5$), keyboard navigation. | 📋 **Drafted / Ready** |
| **34** | `verification` | [`SPRINT-34-TIKZIT-DOCKVIEW-INTEGRATION-AND-VERIFICATION-MATRIX.md`](./SPRINT-34-TIKZIT-DOCKVIEW-INTEGRATION-AND-VERIFICATION-MATRIX.md) | TikZiT Dockview Integration, Cross-System Conformance & Verification Matrix. Native `UniversalCardViewerPanel`, `viewerActionBridge` export seam, `CorpusExplorerDrawer` wiring, 9-fixture conformance suite (incl. D42 port parity + D44 viewport matrix + D45 export bridge), Contract B/D/E audits. | 📋 **Drafted / Ready** |

---

## 2. Core Architectural Principles

1. **The Axiom of Universal MCards**: In CLM, all entities are content-addressed MCards identified by cryptographic hash (`blake3:...`) and classified into the 6-tier universe hierarchy ($U_0 \to U_5$).
2. **5-Phase Deterministic Type Judgment**:
   - Phase 1: Magic byte signatures (`SQLite format 3\0`, PNG, ELF, WebP, etc.).
   - Phase 2: Structural text regex probes (`\begin{tikzpicture}`, `<satori>`, `"places":`, etc.).
   - Phase 3: Content validator callbacks.
   - Phase 4: Filename & extension hint mapping (`.tikz`, `.pcard`, `.vcard`, `.md`, `.db`).
   - Phase 5: Binary vs. UTF-8 fallback heuristics.
3. **Pluggable Monoidal Renderer Sieve**: Adapts `mcard-studio`'s `RendererDescriptor` pattern with strict priority ordering and fallback cascades, guaranteeing 100% renderability across arbitrary card types.
4. **Contract Compliance**:
   - **Contract B**: 100% preservation of all 212 literal `data-testid` selectors.
   - **Contract D**: Strict module size ceiling $\le 250$ LOC per file.
   - **Contract E**: Zero DOM globals and zero host imports in headless packages (`@clm/mcard-vcs` and `@clm/mcard-explorer/core` or `renderers/registry`).
5. **Kernel Layer Discipline (Proposal §1.3)**: Deliverables slot into `clm-kernel`'s stratified stack — L0 `TypedValue`/storage, L1 PCard dynamics, L2 `MCardFileSystem`/`detectMime` persistence, L3 Satori protocol, L4 membrane/viewlets, L5 `typeLattice` + `TypeInterpreter`. Our code may only consume kernel layers at or below its own stratum.
6. **Package Separation (ADR D42)**: `@clm/mcard-explorer` and `@clm/mcard-vcs` are independently adoptable. The explorer defines `ExplorerDataSource` + `CardContentProvider` **ports** in `core/datasource/`; `mcard-vcs` implements them (`ExplorerQueryFacade`); `mcard-studio` will implement them over `studioMCardFs`. No `mcard-explorer` file imports `mcard-vcs` concretes.
7. **Canonical MIME Alignment (ADR D43)**: All specs use the kernel 48-type SSOT dictionary mimes — `text/x-tikz`, `application/vnd.pcard+json`, `application/vnd.vcard+json`, `application/x-sqlite3` — registering only delta types (Satori turn, ZX-graph). VCard's `U1`-dict vs `U2`-lattice divergence is resolved by a single-site override.
8. **Adaptive Viewports & In-Viewer Export (ADRs D44–D45)**: Every `RendererDescriptor` declares a `viewport` mode (`fit`/`scroll`/`zoom`/`paged`/`split`) so `MCardViewer` adapts its container + chrome per selected media type, plus `actions` surfaced in the toolbar — TikZ export (`export.png/.pdf/.svg/.tikz/.tex`) bridged by the host to `diagramExportCoordinator.exportDiagramArtifact` (PNG 1x/2x/4x, PDF, SVG, verbatim TikZ/TeX) with no duplicated export pipeline. A deterministic 14-file `tests/fixtures/multimodal-media/` corpus exercises every renderer + mode in both hosts.

---

## 3. Definition of Done (DoD) Summary Matrix

| Sprint | Verification Gates | Automated Tests | Isolation & Contracts | Status |
| :---: | :--- | :--- | :--- | :---: |
| **30** | Type judgment determinism; 6 universe levels ($U_0$–$U_5$); SSOT pass-through + delta registrations | `CardTypeJudgeService.test.ts` (≥12 fixtures + studio parity) | Contract E incl. `type/` scan; root-export imports only | 📋 Ready |
| **31** | Priority matching; fallback cascade; 8 base viewlets incl. PDF; `toCardViewletDefinition` adapter; 14-file media fixture corpus | `RendererRegistry.test.ts`, `baseViewlets.test.tsx` | Registry headless (type-only React); Contract D; `seed:media` harness | 📋 Ready |
| **32** | $U_0$ TikZ/SQLite, $U_1$ PCard, $U_2$ VCard, $U_3$ Satori viewlets on canonical mimes; TikZ export actions | `clmViewlets.test.tsx` (5 higher-universe fixtures) | Contract D: $\le 250$ LOC; kernel L1/L3 `import type` reuse | 📋 Ready |
| **33** | Dual-pane split preview; Universe facet filters; `custom` Satori element; adaptive `data-viewport-mode` per media type | `MCardViewer.test.tsx`, `MCardExplorerIntegration.test.tsx` | D42 port-only deps; keyboard accessibility | 📋 Ready |
| **34** | Dockview tab integration; 10-check conformance incl. port parity + viewport matrix + export bridge; master verification | `multimodal-card-conformance.test.ts`, `viewerActionBridge` spy tests, Full Vitest suite | Contract B (212 selectors), extended Contract E, 0 regressions | 📋 Ready |

---

## 4. Graduation Workflow Reference

When implementation begins and each sprint meets its Definition of Done:
1. Sprints will be executed sequentially (30 $\to$ 31 $\to$ 32 $\to$ 33 $\to$ 34).
2. Each completed sprint will graduate into its permanent category bin (`corpus/`, `interactions/`, `shell/`, `verification/`).
3. Root `docs/sprints/README.md` and repository changelogs will be updated upon graduation.
