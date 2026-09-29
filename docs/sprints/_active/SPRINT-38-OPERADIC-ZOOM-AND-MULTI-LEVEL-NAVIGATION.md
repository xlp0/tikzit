# Sprint 38: Operadic Zoom & Multi-Level Navigation

**Sprint ID:** `SPRINT-38`
**Subsystem Category:** `shell`
**Target:** `@clm/mcard-explorer/zoom` & zoom-aware tree/list surfaces
**Dependencies:** Sprint 36 (`Position`, `Direction`, registry), Sprint 37 (`CardInterface`, ports, `portsCompatible`), kernel root exports (`parsePortableSqlite`, `parseSatoriXml`, `PlaceDef`/`TransitionDef`/`ArcDef`/`PetriNetTopology`, `MCardFileSystem`)
**Target LOC:** ≤ 250 LOC per file (Contract D) · ≤ 150 LOC concern target (ADR D53/D54)
**Zero-DOM Gate:** Contract E — `zoom/` is 100% headless
**Kernel Stratum:** `@layer L4` (interface/membrane) consuming **L1** (`PetriNetTopology` and Petri defs), **L2** (`parsePortableSqlite`, `MCardFileSystem` via port), **L3** (`parseSatoriXml`) — all root-export only
**Host Boundary:** kenotic (ADR D55) — content arrives through `CardContentProvider`; no `cordis`/host-store imports
**Contract B Gate:** all existing selectors preserved; zoom selectors registered deliberately
**Status:** 📋 Drafted / Ready

---

## 1. Context & Motivation

The tree view is a **namespace tree, not a structure tree**. `MCardExplorerEngine.buildTree()` (`:134`) splits `item.handle` on `:` — so `zx:diagrams:ghz` becomes three nested folders that describe *naming*, not *containment*. A SQLite collection with 40 cards inside it is a single leaf. A Satori turn embedding three `<card>` references is a single leaf. A PCard with 12 places and 9 transitions is a single leaf. And folder nodes carry **zero affordances** (`MCardTree.tsx:34-45` — click toggles expansion and nothing else).

Two consequences:

1. **There is nowhere to go.** `OperadicMCardVfs` has no containment API, so the interface cannot descend into a card's interior. The vault's Semagrams result is the opposite: double-clicking a composite box in the string-diagram editor expands its internal diagram, and *dragging a resource across the abstraction boundary updates the outer contract* — see [[StudyNotes: Literature/Annotation/Transcription of Polynomial Interfaces|Transcription of Polynomial Interfaces]] (the `dwd-zoom` branch demonstration) and [[StudyNotes: Fleeting/Inbox/Semagrams|Semagrams]] ("operads capture 'subsystem → system' assembly").
2. **Hierarchy is not enforced.** Nothing prevents an edit inside a nested structure from violating the enclosing card's interface. The vault is explicit that this must be impossible: *"expanding a box reveals an inner string diagram, and dragging intermediate resources across the boundary enforces semantic consistency at the enclosing layer."*

This sprint makes structure navigable and boundary-consistent: **zoom is a fibration over positions**, and crossing a level boundary is a checked composition (Sprint 37's port legality, applied to containment).

> **Vault alignment.** [[StudyNotes: Literature/Reading notes/@Spencer_Breiner_Polynomial_Interfaces|Breiner §3]]: the bundle formulation $E \xrightarrow{\pi} B$ — a polynomial *is* a display map, and the fiber over a position is its local affordance set. Zooming is following $\pi$ downward; the outer contract is the base.

---

## 2. Deliverables & Technical Architecture

```mermaid
flowchart TD
    subgraph Zoom["@clm/mcard-explorer/zoom (headless)"]
        Types["types.ts<br/>StructureNode · ZoomPath · ZoomLevel"]
        Prov["providers/*.ts<br/>CardStructureProvider per card type"]
        Stack["stack.ts<br/>ZoomStack: enter/exit/breadcrumb · fibration"]
        Boundary["boundary.ts<br/>outer-contract validation for inner edits"]
    end

    subgraph Kernel["clm-kernel (reuse only)"]
        Sqlite["parsePortableSqlite"]
        Satori["parseSatoriXml"]
        Petri["PlaceDef / TransitionDef / ArcDef / PetriNetTopology"]
        MFS["MCardFileSystem"]
    end

    subgraph UI["UI surfaces"]
        Tree["PositionTree (zoom-aware)"]
        Crumb["ZoomBreadcrumb"]
        Viewer["MCardViewer zoom host"]
    end

    Sqlite --> Prov
    Satori --> Prov
    Petri --> Prov
    MFS --> Prov
    Prov --> Stack
    Types --> Stack
    Boundary --> Stack
    Stack --> Tree
    Stack --> Crumb
    Stack --> Viewer
```

*Diagram: structure providers over kernel parsers, composed into a zoom stack consumed by three surfaces.*

### 2.1 `zoom/types.ts` — the fibration (≤ 120 LOC)

```typescript
/** A node in a card's internal structure. Children are positions (Sprint 36) when card-shaped. */
export interface StructureNode {
  readonly id: string;                    // stable within the parent card
  readonly label: string;
  readonly kind: 'card' | 'record' | 'place' | 'transition' | 'node' | 'edge'
                    | 'section' | 'element' | 'table' | 'field';
  /** When the node *is* a card (contained handle / embedded reference), its position handle. */
  readonly handle?: string;
  /** Provider-declared metadata (counts, types, kernel ids). */
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly children?: readonly StructureNode[];
}

/** One level of descent: which card we are inside, via which provider. */
export interface ZoomLevel {
  readonly handle: string;
  readonly hash: string;
  readonly providerId: string;
  readonly nodes: readonly StructureNode[];
  /** Ports of the *enclosing* card, used for boundary validation (Sprint 37). */
  readonly outerInterface: CardInterface | null;
}

export interface ZoomPath {
  readonly levels: readonly ZoomLevel[];   // index 0 = root context
  readonly cursor: number;                 // active level index
}
```

### 2.2 `zoom/providers/` — structure projection per card type (≤ 90 LOC each)

Each provider is a pure function `content → StructureNode[]`, registered in a registry mirroring Sprint 36's direction registry:

| Provider | Card types | Structure derived | Kernel reuse |
| :--- | :--- | :--- | :--- |
| `SqliteStructureProvider` | `application/x-sqlite3` | Tables → fields; **contained cards** as `kind: 'card'` nodes with real handles | `parsePortableSqlite` (portable format), `MCardFileSystem` |
| `SatoriStructureProvider` | `application/vnd.satori.turn+xml` | Speech-act elements; nested `<card>` references as zoomable `card` nodes | `parseSatoriXml`, `SatoriElement` |
| `PcardStructureProvider` | `application/vnd.pcard+json` | Places / transitions / arcs as `kind: 'place' \| 'transition'` nodes with markings | `PlaceDef`, `TransitionDef`, `ArcDef`, `MarkingMap`, `PetriNetTopology` |
| `ZxGraphStructureProvider` | `application/vnd.zx-graph+json` | Spiders (nodes) and edges | — (JSON shape) |
| `TikzStructureProvider` | `text/x-tikz` | Nodes, edges, and style references from the diagram AST | existing parser output (no new parser) |
| `MarkdownStructureProvider` | `text/markdown` | Heading sections as `kind: 'section'`; fenced code blocks as `element` | — |
| `JsonYamlStructureProvider` | `application/json`, `text/yaml` | Top-level keys → nested keys; arrays as indexed `element` nodes | — |
| `HandleNamespaceProvider` | any | Operadic VFS namespace levels (`zx:diagrams:`, `zx:artifacts:`, …) as a *virtual* root structure | `listHandles(prefix)` via port |

**Rule (ADR D50):** a card type with no applicable provider resolves **no zoom direction** — the zoom affordance is absent, never an error dialog. This keeps the guardrail property: absence, not failure.

**Recursion bound:** zoom depth is bounded by a configured maximum (default 8) and a cycle guard on handle repetition, so a self-referential collection cannot produce an infinite stack.

### 2.3 `zoom/stack.ts` — the zoom stack (≤ 160 LOC)

```typescript
export class ZoomStack {
  constructor(private providers: StructureRegistry, private content: CardContentProvider) {}

  /** Resolve the zoom direction fiber for a position: empty when no provider applies. */
  resolveZoomDirections(position: Position): readonly Direction[];

  /** Descend into a node (or into the card itself when nodeHandle is omitted). */
  async enter(position: Position, nodeHandle?: string): Promise<ZoomPath>;

  /** Ascend one level; returns the new path (never throws at root — it is a no-op). */
  exit(): ZoomPath;

  /** Jump to an arbitrary ancestor (breadcrumb navigation). */
  to(cursor: number): ZoomPath;

  /** Current level's nodes, or empty when at root context. */
  nodes(): readonly StructureNode[];

  /** Breadcrumb projection: [{label, handle, cursor}]. */
  breadcrumb(): readonly ZoomCrumb[];
}

export interface ZoomCrumb { readonly label: string; readonly handle: string; readonly cursor: number; }
```

`ZoomStack` is headless and holds no DOM or store references; the host binds it to a surface.

### 2.4 `zoom/boundary.ts` — outer-contract validation (≤ 130 LOC)

The Semagrams boundary rule, implemented with Sprint 37's port machinery:

```typescript
/** Validate that a proposed inner mutation satisfies the enclosing card's interface. */
export async function validateBoundary(
  innerChange: CompositionPlan | { kind: 'edit'; nodeId: string },
  outerInterface: CardInterface,
  matcher: typeof portsCompatible
): Promise<BoundaryVerdict>;

export type BoundaryVerdict =
  | { ok: true }
  | { ok: false; violations: readonly { portId: string; reason: PortMatch & { ok: false } }[] };
```

Rules:
1. An inner composition that would **remove or retype** a port exposed by the outer interface is rejected (`violations` names the port and the mismatch reason).
2. An inner composition that **adds** ports is permitted (the outer interface is a lower bound, matching the vault's "internal modifications satisfy the outer interface boundaries").
3. A rejected boundary check produces **no commit direction** at the inner position — the user cannot attempt the edit, and the reason is available for diagnostics and the live-announcer (accessible explanation without an enabled-but-failing control).

### 2.5 Zoom-aware surfaces

| Surface | Change |
| :--- | :--- |
| `ui/PositionTree.tsx` (replaces `MCardTree.tsx`) | Folder nodes gain a resolved direction set (expand/collapse, zoom-enter, copy handle); a card node with an applicable provider shows a zoom affordance; a container card's children appear as a **second tree level** (containment) distinguished from the namespace level by `data-node-kind` |
| `ui/ZoomBreadcrumb.tsx` (≤ 90 LOC) | Renders `breadcrumb()`; each crumb is a position with a `zoom.to` direction; testids `zoom-breadcrumb`, `zoom-crumb-${cursor}` |
| `MCardViewer` zoom host | When a zoom path is active, the viewer renders the current level's structure beside the card, and the container attribute `data-zoom-depth` is set for E2E assertions |
| Keyboard | `Enter` on a card position = zoom enter (its default direction); `Backspace` = zoom exit; both resolve through the Sprint 36 fiber, so a card with no provider simply has no enter direction |

**Namespace vs. containment.** The existing `:`-namespace grouping is retained as the *root* projection (`HandleNamespaceProvider`), so no current behaviour is lost; containment appears as an additional, typed level. Users can distinguish them visually via `data-node-kind="namespace" | "card" | "place" | "section" | …`.

### 2.6 Kernel Layer Placement (ADR D57)

Zoom is **L4** reading structure that belongs to **L1/L2/L3**. The providers are *projections*, never parsers: each one calls the kernel codec that owns the format.

| Module | Declared stratum | Kernel symbols consumed | From | Layer note |
| :--- | :--- | :--- | :--- | :--- |
| `zoom/providers/SqliteStructureProvider.ts` | L4 | `parsePortableSqlite` | root export | L2 codec; contained cards read as handles |
| `zoom/providers/PcardStructureProvider.ts` | L4 | `PlaceDef`, `TransitionDef`, `ArcDef`, `MarkingMap`, `PetriNetTopology` | root export | L1 structures; **no** transition firing here |
| `zoom/providers/SatoriStructureProvider.ts` | L4 | `parseSatoriXml`, `SatoriElement` | root export | L3 codec |
| `zoom/providers/{Zx,Tikz,Markdown,JsonYaml}StructureProvider.ts` | L4 | — (JSON/AST shapes) | — | Format-shape reading only |
| `zoom/providers/HandleNamespaceProvider.ts` | L4 | — | — | Calls `listHandles(prefix)` **through a port** (L2 boundary) |
| `zoom/stack.ts`, `zoom/boundary.ts` | L4 | `portsCompatible` (Sprint 37, via façade) | `cards/index.ts` | Interface logic over ports |

**Provider rule (inherited from Sprint 37 §2.7):** a provider that parses a format the kernel already parses is a defect. The only permitted parsing is of shapes the kernel does not model (ZX JSON, TikZ AST nodes, Markdown headings, JSON/YAML keys).

### 2.7 `mcard-studio` Alignment (ADRs D54–D56)

`mcard-studio` is a *path-based* browser. Verified: `src/utils/artifactTree.ts` builds a tree by splitting artifact **paths**; `src/components/studio/views/fileTree/MCardFileTree.tsx` renders that folder tree; `src/pages/api/vfs/tree.ts` serves it. There is **no containment zoom** — a `.db` collection, a Satori turn with embedded `<card>` references, or a PCard net are opaque leaves. This sprint is therefore a *capability the studio gains*, not a convention it already has.

| Studio artefact (verified) | Relationship to this sprint | Action |
| :--- | :--- | :--- |
| `views/fileTree/FileTreeNode.tsx` — `TreeNode { name, fullPath, isDir, file, children }` | The studio's tree node shape. | Add `adapters/studioTreeNode.ts` (≤ 60 LOC) exporting `toStudioTreeNode(nodes: StructureNode[]): StudioTreeNode[]`, mirroring the `toCardViewletDefinition` / `toStudioPortDescriptor` parity pattern, so the studio renders containment with **its existing** `FileTreeNode`. |
| `views/fileTree/MCardFileTree.tsx` + `hooks/useFileTreeSync.ts` | The studio's tree orchestrator and VFS sync hook. | Our `PositionTree` is headless-safe and store-free; the studio keeps `useFileTreeSync` as its sync hook and feeds positions in. No studio rewrite required. |
| `.agents/skills/mcard-navigation/SKILL.md` — *"Left Sidebar: A tree view of folders/artifacts. Top Bar: Breadcrumbs and a 'Search…' button"* | The studio's navigation plan matches our `PositionTree` + `ZoomBreadcrumb` exactly. | Ship the default `NavigationProvider`s (`core.namespace` from `HandleNamespaceProvider`, `core.containment` from structure providers) so **both** hosts consume one tree and one breadcrumb; `encodeAddress`/`decodeAddress` satisfy the skill's "URL as State" principle. |
| Studio-only viewlets: `Spatial3dViewlet.tsx`, `WebappZenViewlet.tsx`, `MeshTopologyViewlet.tsx`, `MerkleProofViewlet.tsx`, `PayloadCasViewlet.tsx` | Card types the studio renders but has no structure model for. | The studio registers additional `StructureProvider`s for these (its own porting checklist item) — proving the provider seam is open without touching the package. |
| `src/services/vfs/vfsContent.ts`, `vfsVersions.ts` | Content and lineage supply. | `CardContentProvider` (D42) is implemented over `vfsContent`; `ZoomLevel` may attach lineage via `CardVcsPort`. |

### 2.8 Default `NavigationProvider`s (consuming Sprint 36 §2.9)

| Provider | Structure | Notes |
| :--- | :--- | :--- |
| `core.namespace` | `:`-segment handle namespaces via `listHandles(prefix)` through a port | Replaces the current `buildTree` behaviour without losing it (Contract B: `folder-*`, `tree-item-*` retained) |
| `core.containment` | `StructureProvider` output — contained cards, places/transitions, sections, keys | New; `data-node-kind` distinguishes levels |

Both are registered by default; the studio may add `studio.remote`-style providers per its navigation skill's plugin plan. Deep links: `#/card/<handle>` for a card position, `#/card/<handle>/<nodeId>` for a structure node; round-trip is asserted.

---

## 3. Definition of Done (DoD) Criteria

- [ ] **38-DOD-01**: `zoom/types.ts` (≤ 120 LOC) exports `StructureNode`, `ZoomLevel`, `ZoomPath`, `ZoomCrumb`; kernel imports are root-only.
- [ ] **38-DOD-02**: All eight providers in §2.2 are implemented (≤ 90 LOC each) with a registry and `appliesTo` predicates. `SqliteStructureProvider` exposes contained cards as real handles (kernel `parsePortableSqlite`), verified against a fixture `.db`.
- [ ] **38-DOD-03**: `SatoriStructureProvider` surfaces nested `<card>` references as zoomable nodes (kernel `parseSatoriXml`), verified against `tests/fixtures/multimodal-media/turn.satori.xml`.
- [ ] **38-DOD-04**: `PcardStructureProvider` projects places/transitions/arcs from kernel `PetriNetTopology` with markings — **no bespoke Petri parsing** in `zoom/` (grep-asserted).
- [ ] **38-DOD-05**: `zoom/stack.ts` (≤ 160 LOC) implements `resolveZoomDirections`, `enter`, `exit`, `to`, `nodes`, `breadcrumb`. `exit()` at root is a no-op (no throw). Depth bound and cycle guard enforced, with tests for both.
- [ ] **38-DOD-06**: **Guardrail** — a card type with no applicable provider resolves an **empty** zoom fiber: the zoom affordance is absent from the DOM (asserted by absence), and no error state is rendered.
- [ ] **38-DOD-07**: `zoom/boundary.ts` (≤ 130 LOC) implements `validateBoundary` with the three rules in §2.4; a boundary violation yields **no commit direction** plus an accessible explanation surfaced through the existing `live-announcer`.
- [ ] **38-DOD-08**: `ui/PositionTree.tsx` replaces `MCardTree.tsx`, renders namespace **and** containment levels with `data-node-kind`, and gives folders a resolved direction set (no hardcoded click handler); `MCardTree.tsx` is deleted.
- [ ] **38-DOD-09**: `ui/ZoomBreadcrumb.tsx` (≤ 90 LOC) renders `breadcrumb()` with `zoom.to` directions; testids `zoom-breadcrumb`, `zoom-crumb-*` registered.
- [ ] **38-DOD-10**: Contract B — 295 literal selectors + 17 dynamic families preserved; `mcard-tree-view`, `folder-*`, `tree-item-*` retained (or migrated with specs updated **in-commit**, per Contract B's rule); new zoom selectors registered.
- [ ] **38-DOD-11**: Contract E — `mcard-explorer/zoom` added to `check-vcs-isolation.mjs`; 0 DOM globals, 0 host imports, zero `mcard-vcs` concretes.
- [ ] **38-DOD-12**: `tests/unit/mcard-explorer/zoom/{providers,stack,boundary}.test.ts` pass: per-provider projections from fixtures, depth/cycle bounds, boundary accept/reject cases, breadcrumb navigation.
- [ ] **38-DOD-13**: Full Vitest suite green with **0 regressions** against the 670-test baseline; `tsc --noEmit` clean.
- [ ] **38-DOD-14**: Concern audit — all new modules ≤ 150 LOC or documented; `MCardTree.tsx` (84 LOC) removal and `PositionTree` replacement recorded in the graduation evidence ledger.
- [ ] **38-DOD-15**: **Layer declarations (ADR D57)** — every `zoom/` module carries a `@layer L4` header naming the kernel symbols it consumes; imports are root-export only. **No provider parses a format the kernel owns** (`parsePortableSqlite` for `.db`, `parseSatoriXml` for Satori, Petri defs for PCard) — grep-asserted, and a test asserts each provider delegates to the kernel codec.
- [ ] **38-DOD-16**: **One file per provider (ADR D54)** — the eight providers live in `zoom/providers/*.ts` (≤ 90 LOC each) behind a registry; registering a ninth provider touches no existing file (verified by test).
- [ ] **38-DOD-17**: **`toStudioTreeNode` parity** — `zoom/adapters/studioTreeNode.ts` (≤ 60 LOC) converts `StructureNode[]` into the studio's `TreeNode` shape (`name`, `fullPath`, `isDir`, `file`, `children`) with a field-parity test, so `mcard-studio` renders containment with its existing `FileTreeNode`.
- [ ] **38-DOD-18**: **Default `NavigationProvider`s (ADR D56)** — `core.namespace` and `core.containment` are registered by default; `encodeAddress`/`decodeAddress` round-trip for both a card position (`#/card/<handle>`) and a structure node (`#/card/<handle>/<nodeId>`) is asserted; a position restored from an address renders the same viewport mode as one reached by clicking.
- [ ] **38-DOD-19**: **Façade discipline (ADR D54)** — `zoom/index.ts` is the only importable surface; `ui/` consumes the `zoom/` façade only (grep-asserted).
- [ ] **38-DOD-20**: **Kenotic boundary (ADR D55)** — zero `cordis`, `cordisClient`, or host-store imports in `zoom/`; content arrives exclusively via `CardContentProvider` (grep-asserted).
- [ ] **38-DOD-21**: **Studio extension path documented** — the porting checklist names the studio files to register extra providers for (`Spatial3dViewlet`, `WebappZenViewlet`, `MeshTopologyViewlet`, `MerkleProofViewlet`, `PayloadCasViewlet` card types) without package changes.

---

## 4. Verification

| Gate | Command / artifact |
| :--- | :--- |
| Unit | `npx vitest run tests/unit/mcard-explorer/zoom` |
| Fixtures | `npm run seed:media` corpus (`collection.db`, `turn.satori.xml`, `workflow.pcard.json`, `sample.zx.json`) |
| Isolation | `make check-vcs-isolation` (extended targets) |
| Contract B | `node scripts/audit-testids.mjs --check` |
| Types | `npx tsc --noEmit` |
| Regression | `npx vitest run` |
| Studio parity | `tests/conformance/studio-parity.test.ts` — `toStudioTreeNode` field parity; `NavigationProvider` shape parity |
| Layer placement | grep gate for `@layer` headers, root-only kernel specifiers, and provider delegation to kernel codecs |

**Acceptance demonstration.** Selecting `collection.db` from the seeded corpus reveals a zoom affordance; entering it lists the collection's tables **and** its contained cards as first-class positions; entering one of those cards renders it in the viewer with `data-zoom-depth="2"`, and the breadcrumb walks back to the root. Attempting an inner composition that would retype a port exposed by the enclosing collection leaves the commit direction absent, with the reason announced through the live region.
