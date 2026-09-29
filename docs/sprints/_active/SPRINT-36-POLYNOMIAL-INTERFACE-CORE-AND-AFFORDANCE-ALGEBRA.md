# Sprint 36: Polynomial Interface Core & Affordance Algebra

**Sprint ID:** `SPRINT-36`
**Subsystem Category:** `interactions`
**Target:** `@clm/mcard-explorer/poly` & `@clm/mcard-explorer/core` decomposition
**Dependencies:** Sprints 30–35 (graduated), `clm-kernel` root exports (`TypeJudgment`, `UNIVERSE_NAMES`, `PolynomialFunctor` for numeric censuses only), `ExplorerDataSource` / `CardContentProvider` ports (ADR D42)
**Target LOC:** ≤ 250 LOC per file (Contract D) · **≤ 150 LOC concern target** (ADR D53/D54)
**Zero-DOM Gate:** Contract E — `poly/` and `core/` are 100% headless
**Kernel Stratum:** `@layer L4` (interface/membrane) consuming **L5** (`TypeJudgment`, `UNIVERSE_NAMES` — root export only) and **L2** filter vocabulary; no L0/L1 logic
**Host Boundary:** kenotic (ADR D55) — no `cordis`, `cordisClient`, or host-store imports in either package
**Contract B Gate:** 295 literal `data-testid` selectors + 17 dynamic prefix families preserved; new selectors registered deliberately
**Status:** 📋 Drafted / Ready

---

## 1. Context & Motivation

The explorer currently has **no notion of an affordance**. Actions are registered globally and filtered by a card-shaped predicate (`ExplorerActionRegistry.isAvailable?(card)`, `ExplorerActionRegistry.ts:31`), and the host list hardcodes five menu items behind a single `type !== 'draft'` test (`ExplorerEntryRow.tsx:131-151`). Neither can express the central property of a polynomial interface: **the set of available inputs depends on the current position**.

Three further defects are structural, and all three are fixed in this sprint:

1. **Facets are substring matches.** `MCardExplorerEngine.refresh()` sends only `{ pattern, limit }` to the data source and then filters with `item.handle.toLowerCase().includes(facet)` (`MCardExplorerEngine.ts:117`) — even though `ExplorerQueryFacade.search()` already emits SQL `WHERE` clauses for `universe`, `category`, and `payloadKind` (`ExplorerQueryFacade.ts:59-69`) and `ExplorerSearchFilter` documents them as SQL-level. The capability exists; the engine does not use it.
2. **The engine is seven concerns in 193 LOC** — query, facet, tree construction, selection, sorting, view mode, action routing — with `buildTree` (`:134`) splitting handles on `:` and `sortItems` mutating shared arrays in place (`:127`).
3. **`MCardExplorer.tsx` is six concerns in 193 LOC** — search, facet strip, tree/flat toggle, keyboard scope, dual-pane layout, preview toggle.

This sprint establishes the algebra and pays down the decomposition debt so that Sprints 37–39 have somewhere coherent to live.

---

## 2. Deliverables & Technical Architecture

```mermaid
flowchart TD
    subgraph Poly["@clm/mcard-explorer/poly (headless, zero-DOM)"]
        Types["types.ts<br/>Position · Direction · PolyInterface · Fiber"]
        Lens["lens.ts<br/>InterfaceLens · view/update · law checkers"]
        Guard["guardrails.ts<br/>legality combinators · allOf/anyOf/never"]
        Reg["registry.ts<br/>PolyInterfaceRegistry.resolveDirections(position)"]
        Cens["census.ts<br/>kernel PolynomialFunctor adapter (numeric only)"]
    end

    subgraph Core["@clm/mcard-explorer/core (headless, zero-DOM)"]
        Store["ExplorerStateStore<br/>state + subscribe + immutable updates"]
        Proj["TreeProjection<br/>positions → tree (structure-aware hook)"]
        Facet["FacetResolver<br/>typed facet → ExplorerSearchFilter"]
        Sel["SelectionModel<br/>active · multi-select · range"]
        Facade["ExplorerEngine (facade ≤120 LOC)"]
    end

    subgraph UI["@clm/mcard-explorer/ui"]
        Toolbar["ExplorerToolbar (search + view mode)"]
        Strip["FacetStrip (typed facets)"]
        ListPane["ExplorerListPane"]
        Preview["ExplorerPreviewPane"]
        Keys["ExplorerKeyboardScope"]
    end

    Types --> Lens
    Types --> Guard
    Lens --> Reg
    Guard --> Reg
    Reg --> ListPane
    Facet --> Facade
    Proj --> Facade
    Sel --> Facade
    Store --> Facade
    Facade --> ListPane
    Facade --> Preview
    Cens -.->|test/diagnostics only| Reg
```

*Diagram: the polynomial core, the decomposed engine, and the UI surfaces that consume only resolved directions.*

### 2.1 `poly/types.ts` — the interface polynomial (≤ 140 LOC)

```typescript
import type { TypeJudgment } from 'clm-kernel'; // root export only (ADR D43/D46)

/** A position is a *card-shaped* state: what the interface currently shows. */
export interface Position {
  /** Stable identity of this position within the interface (e.g. `list:zx:diagrams:ghz`). */
  readonly id: string;
  /** The card this position presents — MCard is the unit of manipulation (ADR D48). */
  readonly handle: string;
  readonly hash: string;
  readonly mimeType: string;
  /** Kernel judgment fields, passed through verbatim (never re-derived here). */
  readonly universe?: string;        // 'U0'..'U5'
  readonly universeName?: string;
  readonly category?: string;
  readonly clmCategory?: string;
  readonly payloadKind?: string;
  /** View context: which surface is showing this position. */
  readonly surface: 'tree' | 'list' | 'grid' | 'composition' | 'zoom' | 'timeline';
  /** Nesting context (Sprint 38 zoom path; empty at root). */
  readonly zoomPath?: readonly string[];
  /** Selection context. */
  readonly selected?: boolean;
  readonly active?: boolean;
  /** Arbitrary projection metadata supplied by the surface (never required by the algebra). */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** A direction is one *legal input* at a position. */
export interface Direction<P extends Position = Position> {
  readonly id: string;                 // 'card.rename' | 'card.compose.tensor' | 'zoom.enter' | …
  readonly label: string;
  readonly icon?: string;
  readonly shortcut?: string;
  /** Grouping hint for menus (`'mutate' | 'compose' | 'export' | 'navigate' | …`). */
  readonly group?: string;
  /** Legality is a *predicate on the position*, not a validation callback (ADR D47). */
  readonly legality: (position: P) => boolean;
  /** Effects run only after legality has been resolved; the host supplies the implementation. */
  readonly execute: (position: P, payload?: unknown) => Promise<DirectionResult>;
  /** Directions may declare their own dependent sub-directions (nested menus / ports). */
  readonly sub?: (position: P) => readonly Direction<P>[];
}

export interface DirectionResult {
  readonly success: boolean;
  readonly message?: string;
  /** Card-level outcome: MCard is the unit of manipulation (ADR D48). */
  readonly producedHandle?: string;
  readonly producedHash?: string;
  /** Revertible-effect token (Sprint 39); opaque here. */
  readonly inverse?: () => Promise<void>;
}

/** A polynomial interface: positions + the direction fiber over each position. */
export interface PolyInterface<P extends Position = Position> {
  readonly id: string;
  /** Forward map: state → position (the lens *getter*). */
  readonly positions: (state: unknown) => readonly P[];
  /** Backward map: legal directions at a position (the *fiber* p[position]). */
  readonly directions: (position: P) => readonly Direction<P>[];
}
```

**Design notes.**
- `Position` carries kernel judgment fields **by reference** (`TypeJudgment` values), never recomputed — `TypeInterpreter` remains the SSOT (ADR D43).
- `Direction.legality` is a pure predicate so guardrails are testable in isolation and the UI can render from a resolved fiber without branching logic.
- `DirectionResult.inverse` is the seam Sprint 39 fills with the revertible-effect journal; it is optional here so Sprint 36 ships independently.

### 2.2 `poly/guardrails.ts` — legality combinators (≤ 100 LOC)

Small, composable predicates so views never write ad-hoc conditions:

```typescript
export const allOf = <P extends Position>(...ps: Array<(x: P) => boolean>) => (x: P) => ps.every(p => p(x));
export const anyOf = <P extends Position>(...ps: Array<(x: P) => boolean>) => (x: P) => ps.some(p => p(x));
export const never  = <P extends Position>() => (_x: P) => false;

export const isUniverse   = (...u: string[]) => (p: Position) => !!p.universe && u.includes(p.universe);
export const isCategory   = (...c: string[]) => (p: Position) => !!p.clmCategory && c.includes(p.clmCategory);
export const isSurface    = (...s: Position['surface'][]) => (p: Position) => s.includes(p.surface);
export const isMutable    = (p: Position) => p.meta?.mutable === true;      // drafts & user cards
export const isImmutable  = (p: Position) => p.meta?.mutable === false;     // examples, artifacts
export const isHead       = (p: Position) => p.meta?.isHead !== false;      // has version history
export const hasExporter  = (p: Position) => p.meta?.exportFormats instanceof Array
                                          && (p.meta.exportFormats as string[]).length > 0;
```

**Guardrail contract (ADR D47):** a direction whose `legality(position)` is false is **absent** from `resolveDirections()` output. Views must render exactly what is resolved — no `disabled` buttons standing in for legality, and no hardcoded action lists. "Absent, not disabled" is the Semagrams property: an illegal act must have no DOM affordance at all.

### 2.3 `poly/registry.ts` — the resolver (≤ 130 LOC)

```typescript
export class PolyInterfaceRegistry {
  private directions = new Map<string, Direction>();

  /** Register a direction; returns a disposer (kernel DisposableList-compatible). */
  register(direction: Direction): () => void;

  /** The direction fiber p[position]: all *legal* directions, ordered by group then id. */
  resolveDirections(position: Position): readonly Direction[];

  /** Enumerate registered directions (agent/CLI introspection; conformance iteration). */
  listAll(): readonly Direction[];

  /** Resolve one direction by id, returning undefined when illegal at this position. */
  resolve(id: string, position: Position): Direction | undefined;
}
```

Resolution is deterministic: filter by `legality`, expand `sub(position)` recursively, sort by `(group, id)`. A throw inside any `legality` predicate is caught, logged in dev mode, and treated as **illegal** (fail-closed) — a broken predicate must never grant a direction.

### 2.4 `poly/census.ts` — numeric-polynomial adapter (≤ 80 LOC)

The kernel's `PolynomialFunctor` is numeric arithmetic (ADR D46). It is used **only** for cardinality/degree assertions over a resolved fiber:

```typescript
import { PolynomialFunctor } from 'clm-kernel';

/** Census a resolved fiber as a numeric polynomial: one monomial per direction group. */
export function censusFiber(directions: readonly Direction[]): PolynomialFunctor<string>;
/** Degree = number of distinct direction groups; leading coefficient = largest group size. */
export function fiberDegree(directions: readonly Direction[]): number;
```

This gives the conformance suite an exact, kernel-backed invariant: *"a position with no legal directions has degree 0"* — the algebraic statement of a guardrail.

### 2.5 `core/` decomposition — engine split (ADR D53)

| New module | ≤ LOC | Responsibility (single) | Extracted from |
| :--- | ---: | :--- | :--- |
| `ExplorerStateStore.ts` | 120 | Immutable state + `subscribe`/`notify`; no domain logic | `MCardExplorerEngine` state + listeners |
| `TreeProjection.ts` | 130 | Positions → tree nodes; `:`-namespace grouping **plus** a `structureChildren?` hook for Sprint 38 | `buildTree` (`:134`) |
| `FacetResolver.ts` | 110 | Typed facet id → `ExplorerSearchFilter`; **deletes** client-side substring filtering | `refresh()` facet block (`:116-118`) |
| `SelectionModel.ts` | 110 | `activeHandle`, multi-select, range select, clear; pure functions over state | `selectHandle` (`:77`), `selectedHandles` |
| `ExplorerEngine.ts` | 120 | Façade wiring the four above + data source + action execution | remainder of `MCardExplorerEngine` |

`MCardExplorerEngine.ts` is retained as a **deprecated re-export shim** for one sprint (host call sites keep working) and removed in Sprint 40.

**Typed facet resolution** (`FacetResolver`) is the substantive fix:

```typescript
export interface FacetDefinition {
  readonly id: string;                    // 'all' | 'diagram' | 'markdown' | 'data' | …
  readonly label: string;
  readonly filter: Partial<ExplorerSearchFilter>;   // pushed to the data source (ADR D49)
  readonly positionPredicate?: (p: Position) => boolean; // client-side refinement when needed
}

export const CORE_FACETS: readonly FacetDefinition[] = [
  { id: 'all',          label: 'All',          filter: {} },
  { id: 'diagram',      label: 'Diagrams',     filter: { category: 'diagram' } },
  { id: 'markdown',     label: 'Notes',        filter: { mimeType: 'text/markdown' } },
  { id: 'data',         label: 'Data',         filter: { category: 'data' } },
  { id: 'process',      label: 'Processes',    filter: { universe: 'U1' } },
  { id: 'proof',        label: 'Proofs',       filter: { universe: 'U2' } },
  { id: 'conversation', label: 'Conversations',filter: { universe: 'U3' } },
  { id: 'artifacts',    label: 'Artifacts',    filter: { pattern: 'zx:artifacts:' } },
];
```

The facet strip therefore renders **typed positions**, and the data source does the filtering in SQL — no `includes()` on handles anywhere.

### 2.6 UI decomposition

| New module | ≤ LOC | Responsibility |
| :--- | ---: | :--- |
| `ui/ExplorerToolbar.tsx` | 110 | Search input mount + tree/flat/grid mode toggle |
| `ui/FacetStrip.tsx` | 100 | Renders `FacetDefinition[]` as chips (`facet-chip-${id}`) |
| `ui/ExplorerListPane.tsx` | 130 | Resolves directions per position and renders rows (no hardcoded actions) |
| `ui/ExplorerPreviewPane.tsx` | 100 | Hosts `MCardViewer`; owns preview toggle + responsive split |
| `ui/ExplorerKeyboardScope.tsx` | 110 | Keyboard → direction mapping via the resolved fiber (arrows move, `Enter` executes the *default legal* direction) |
| `ui/MCardExplorer.tsx` | 120 | Composition only — mounts the five above |

`MCardExplorer.tsx` drops from 193 → ≤ 120 LOC by *moving* concerns, not deleting them.

**Keyboard semantics change:** `Enter` no longer calls a hardcoded `openCard` action; it executes `resolveDirections(position)[0]` (the position's default direction, marked `default: true` in the registry). If the fiber is empty, `Enter` does nothing — guardrail-consistent.

### 2.7 Kernel Layer Placement (ADR D57)

Both new strata are **L4 (interface/membrane)**. They consume kernel layers *below* them and never absorb their logic.

| Module | Declared stratum | Kernel symbols consumed | From | Why not lower |
| :--- | :--- | :--- | :--- | :--- |
| `poly/types.ts` | L4 | `TypeJudgment` (by reference) | root export | Judgment is L5; carried, never recomputed |
| `poly/guardrails.ts` | L4 | `UNIVERSE_NAMES` (label lookups) | root export | Pure predicates; no typing logic |
| `poly/registry.ts` | L4 | — | — | Direction resolution is interface logic |
| `poly/census.ts` | L4 | `PolynomialFunctor`, `Monomial` | root export | **L0 arithmetic** used for counting only (ADR D46) |
| `core/FacetResolver.ts` | L4 | — (mirrors the `classifyClm` category vocabulary as data) | — | Filter *vocabulary* is L2-shaped; the resolver only maps ids → filters |
| `core/{ExplorerStateStore,TreeProjection,SelectionModel}.ts` | L4 | — | — | Presentation state |

> [!IMPORTANT]
> **`layer5` is not an importable subpath.** The kernel's `exports` map omits `./layer5` (verified against the installed package), so `TypeInterpreter`/`TypeJudgment`/`UniverseLevel`/`UNIVERSE_NAMES` must come from the **root** `'clm-kernel'` specifier. A `clm-kernel/layer5` or `clm-kernel/dist/*` import fails module resolution — and from Sprint 40 it also fails `check-layer-imports.mjs`.

### 2.8 `mcard-studio` Alignment (ADRs D54–D56)

`mcard-studio` is the reference implementation of generalized MCard browsing. Three of its artefacts map directly onto this sprint's deliverables — and in two cases the studio's version is the *ad-hoc* form of what this sprint makes principled.

| Studio artefact (verified) | Relationship to this sprint | Action |
| :--- | :--- | :--- |
| `src/utils/artifactTree.ts` — `buildArtifactTree(artifacts, rootName, rootPath)`, `filterArtifacts`, `TreeNode` with **directories-first** sorting | The studio's tree projection. Our `TreeProjection` must be *semantically compatible* so either host can adopt one implementation. | `TreeProjection` reproduces the studio's semantics exactly (path split on `/` or `:`, dir-first then case-insensitive alpha) and is validated by a **parity test** against `buildArtifactTree` on the same input. |
| `src/lib/renderers/forwardBrowsing.ts` — `findForwardBrowsingTargets(selected, allCards)` returning `{ reason: 'consumes' \| 'same-runtime' \| 'transition' }`, computed by **regex over card YAML**, capped at 8 | The studio's *informal* affordance fiber: "which cards can I move to from this one?" | This is the behaviour `PolyInterfaceRegistry` generalizes. The studio's three `reason` values become **direction groups** (`group: 'forward.consumes' \| 'forward.same-runtime' \| 'forward.transition'`) so the studio's UI can keep its labels while gaining legality, ordering, and sub-directions. A `forwardBrowsingAdapter.ts` (≤ 60 LOC) converts a `ForwardTarget[]` into `Direction[]` for studio-side reuse. |
| `src/components/studio/views/fileTree/MCardFileTree.tsx` — *"thin orchestrator (≤150 lines, INV-304-09)"* + five hooks (`useFileTreeSync`, `useInlineRename`, `useDragAndDrop`, `useFolderContext`, `useCardInsertion`) | The studio's decomposition precedent, and its own statement of the ≤150-LOC orchestrator ceiling our ADR D53/D54 adopts. | Our UI split (`ExplorerToolbar` · `FacetStrip` · `ExplorerListPane` · `ExplorerPreviewPane` · `ExplorerKeyboardScope`) mirrors it: **presentation concerns become hooks/local state, not props.** |
| `.agents/skills/mcard-navigation/SKILL.md` — *"Plugin System: Allow registering custom navigation providers"*, **"URL as State"** | The studio's navigation extensibility plan has no counterpart in TikZiT. | This sprint **defines** the `NavigationProvider` port (§2.9) so Sprint 38's tree/breadcrumb and Sprint 39's timeline are consumers of one seam rather than three navigation stacks. |

### 2.9 `NavigationProvider` port (≤ 110 LOC)

```typescript
/** A source of navigable structure. Registered by hosts; consumed by every navigation surface. */
export interface NavigationProvider {
  readonly id: string;                 // 'core.namespace' | 'core.containment' | 'studio.remote'
  readonly label: string;
  /** Does this provider contribute at this position? (root providers match the root position) */
  readonly appliesTo: (position: Position | null) => boolean;
  /** Root positions contributed by this provider. */
  readonly resolveRoot: () => Promise<readonly Position[]>;
  /** Child positions for a position (containment, folders, zoom levels). */
  readonly resolveChildren?: (position: Position) => Promise<readonly Position[]>;
  /** Deep-link codec: position ↔ stable, serialisable address (ADR D56). */
  readonly encodeAddress?: (position: Position) => string;
  readonly decodeAddress?: (address: string) => Position | null;
}

export class NavigationProviderRegistry {
  register(provider: NavigationProvider): () => void;
  list(): readonly NavigationProvider[];
  /** Root positions across all applicable providers, in registration order. */
  resolveRoot(): Promise<readonly Position[]>;
  children(position: Position): Promise<readonly Position[]>;
  /** Position for a URL fragment, or null when no provider claims it. */
  fromAddress(address: string): Position | null;
}
```

The port is **defined** here (so `Position` has an addressable identity from the start) and **consumed** in Sprints 38–39. It is deliberately not implemented by any host in this sprint — the default `core.namespace` provider lands in Sprint 38 with `PositionTree`.

---

## 3. Definition of Done (DoD) Criteria

- [ ] **36-DOD-01**: **Polynomial Core Types** (`src/packages/mcard-explorer/poly/types.ts`, $\le 140$ LOC).
  - **Observable Rule:** Exports `Position`, `Direction`, `DirectionResult`, `PolyInterface`, `InterfaceLens`. All kernel imports come exclusively from the `'clm-kernel'` root export (zero deep `dist/` or `layer*` subpaths).
  - **Verification Command:** `npx tsc --noEmit && ! grep -rn "from 'clm-kernel/" src/packages/mcard-explorer/poly/types.ts`
- [ ] **36-DOD-02**: **Affordance Guardrail Combinators** (`src/packages/mcard-explorer/poly/guardrails.ts`, $\le 100$ LOC).
  - **Observable Rule:** Exports `allOf`, `anyOf`, `never`, and position predicates (`isSource`, `isArtifact`, `isCollection`, `isProcess`, `hasMime`); `never(p)` always returns `false`; `allOf` short-circuits on first false; unit-tested in isolation.
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/poly/guardrails.test.ts`
- [ ] **36-DOD-03**: **Fail-Closed Affordance Registry** (`src/packages/mcard-explorer/poly/registry.ts`, $\le 130$ LOC).
  - **Observable Rule:** Exports `PolyInterfaceRegistry` with `register` (returns working disposer function), `resolveDirections`, `resolve`, `listAll`. A throwing `legality` predicate fail-closes to `false` (direction omitted, never throws to caller).
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/poly/registry.test.ts`
- [ ] **36-DOD-04**: **Numeric Fiber Census Adapter** (`src/packages/mcard-explorer/poly/census.ts`, $\le 80$ LOC).
  - **Observable Rule:** Wraps kernel `PolynomialFunctor` for fiber censuses; `fiberDegree([]) === 0` asserted. No other kernel `PolynomialFunctor` imports exist anywhere in `@clm/mcard-explorer` (grep-asserted).
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/poly/census.test.ts && ! grep -rn "PolynomialFunctor" src/packages/mcard-explorer/core/ src/packages/mcard-explorer/ui/`
- [ ] **36-DOD-05**: **Engine Decomposition into 5 Single-Concern Modules**.
  - **Observable Rule:** Modules authored: `core/ExplorerStateStore.ts` ($\le 120$ LOC), `core/TreeProjection.ts` ($\le 130$ LOC), `core/FacetResolver.ts` ($\le 110$ LOC), `core/SelectionModel.ts` ($\le 110$ LOC), `core/ExplorerEngine.ts` ($\le 120$ LOC). `MCardExplorerEngine.ts` retained as deprecated re-export shim ($\le 40$ LOC).
  - **Verification Command:** `wc -l src/packages/mcard-explorer/core/{ExplorerStateStore,TreeProjection,FacetResolver,SelectionModel,ExplorerEngine}.ts`
- [ ] **36-DOD-06**: **Typed Facets with SQL-Level Filtering**.
  - **Observable Rule:** `FacetResolver` maps `FacetDefinition` to `ExplorerSearchFilter` fields (`universe`, `category`, `mimeType`, `pattern`). Passing facet `{ id: 'process' }` passes `{ universe: 'U1' }` to `ExplorerDataSource.search()`. Zero `String.prototype.includes` string-matching remains in `mcard-explorer` (grep-asserted).
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/core/FacetResolver.test.ts && ! grep -rn "\.includes(" src/packages/mcard-explorer/core/FacetResolver.ts`
- [ ] **36-DOD-07**: **UI Decomposition into 5 Focused Viewlets**.
  - **Observable Rule:** Modules authored: `ui/ExplorerToolbar.tsx` ($\le 110$ LOC), `ui/FacetStrip.tsx` ($\le 100$ LOC), `ui/ExplorerListPane.tsx` ($\le 130$ LOC), `ui/ExplorerPreviewPane.tsx` ($\le 100$ LOC), `ui/ExplorerKeyboardScope.tsx` ($\le 110$ LOC). `ui/MCardExplorer.tsx` reduced to pure composition root ($\le 120$ LOC).
  - **Verification Command:** `wc -l src/packages/mcard-explorer/ui/{ExplorerToolbar,FacetStrip,ExplorerListPane,ExplorerPreviewPane,ExplorerKeyboardScope,MCardExplorer}.tsx`
- [ ] **36-DOD-08**: **Resolved Directions Only (Zero Hardcoded Action Arrays)**.
  - **Observable Rule:** `ExplorerListPane` renders directions returned exclusively by `registry.resolveDirections(position)`. Illegal directions are completely absent from the DOM (`queryByTestId('direction-...') === null`), never disabled. Zero hardcoded action-id arrays in views (grep-asserted).
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/ui/ExplorerListPane.test.tsx`
- [ ] **36-DOD-09**: **Contract B Selector Audit & Dynamic Family Registration**.
  - **Observable Rule:** `node scripts/audit-testids.mjs --check` passes with 0 missing selectors across all 295 baseline literals + 17 dynamic prefix families; new selectors `facet-chip-${id}` and `direction-${id}` are registered.
  - **Verification Command:** `node scripts/audit-testids.mjs --check`
- [ ] **36-DOD-10**: **Contract E Zero-DOM Isolation Gate**.
  - **Observable Rule:** `scripts/check-vcs-isolation.mjs` targets extended with `mcard-explorer/poly` and `mcard-explorer/core`. Reports 0 DOM globals (`window`, `document`), 0 host imports, type-only React.
  - **Verification Command:** `node scripts/check-vcs-isolation.mjs`
- [ ] **36-DOD-11**: **Poly Algebra Unit Test Suite**.
  - **Observable Rule:** 100% pass across `tests/unit/mcard-explorer/poly/{guardrails,registry,census}.test.ts`: combinator laws, fail-closed resolution, deterministic priority ordering, and degree 0 equivalence.
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/poly`
- [ ] **36-DOD-12**: **Core Engine Unit Test Suite**.
  - **Observable Rule:** 100% pass across `tests/unit/mcard-explorer/core/{FacetResolver,TreeProjection,SelectionModel,ExplorerEngine}.test.ts`: typed facet to SQL filter mapping, multi-selection, and tree projection.
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/core`
- [ ] **36-DOD-13**: **Vitest Regression Suite & Type Check**.
  - **Observable Rule:** 100% pass with 0 regressions against the 670 passing test baseline; `tsc --noEmit` exits with status 0.
  - **Verification Command:** `npx vitest run && npx tsc --noEmit`
- [ ] **36-DOD-14**: **Concern Audit & LOC Thresholds (ADR D53)**.
  - **Observable Rule:** Every new module in `poly/` and `core/` is $\le 150$ LOC; LOC deltas for `MCardExplorer.tsx` and `MCardExplorerEngine.ts` recorded in graduation evidence ledger.
  - **Verification Command:** `node scripts/audit-concerns.mjs`
- [ ] **36-DOD-15**: **Kernel Layer Declarations (ADR D57)**.
  - **Observable Rule:** Every file in `poly/` and `core/` carries `@layer L4` header; kernel imports use `'clm-kernel'` root export only with zero deep paths (`dist/`, `layer*`, `./layer5`).
  - **Verification Command:** `grep -rn "@layer L4" src/packages/mcard-explorer/{poly,core}/`
- [ ] **36-DOD-16**: **Studio Tree Parity (ADR D54)**.
  - **Observable Rule:** `TreeProjection` produces directory-first, case-insensitive alphabetical sorting identical to `mcard-studio`'s `buildArtifactTree`, verified by `tests/conformance/studio-parity.test.ts`.
  - **Verification Command:** `npx vitest run tests/conformance/studio-parity.test.ts -t "TreeProjection"`
- [ ] **36-DOD-17**: **Direction-Group Compatibility (ADR D54)**.
  - **Observable Rule:** `forwardBrowsingAdapter.ts` ($\le 60$ LOC) maps studio `ForwardTarget['reason']` vocabulary (`forward.consumes`, `forward.same-runtime`, `forward.transition`) to `Direction[]`; tested against sample targets.
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/renderers/forwardBrowsingAdapter.test.ts`
- [ ] **36-DOD-18**: **Façade Discipline (ADR D54)**.
  - **Observable Rule:** `poly/index.ts` and `core/index.ts` are the exclusive public import boundaries; no sibling package imports internal modules directly (grep-asserted).
  - **Verification Command:** `! grep -rn "from '.*mcard-explorer/\(poly\|core\)/[a-zA-Z]" src/components/ src/services/`
- [ ] **36-DOD-19**: **Kenotic Host Boundary (ADR D55)**.
  - **Observable Rule:** Zero `cordis`, `cordisClient`, or host-store imports inside `mcard-explorer/poly` and `mcard-explorer/core`; host context passed as parameter only.
  - **Verification Command:** `! grep -rn "cordis" src/packages/mcard-explorer/{poly,core}/`
- [ ] **36-DOD-20**: **NavigationProvider Port Definition (ADR D56)**.
  - **Observable Rule:** `NavigationProvider` port interface exported from `poly/types.ts` ($\le 110$ LOC); `encodeAddress`/`decodeAddress` round-trip test asserts identity for card handle addresses.
  - **Verification Command:** `npx vitest run tests/unit/mcard-explorer/poly/navigation.test.ts`

---

## 4. Verification

| Gate | Command / artifact |
| :--- | :--- |
| Unit | `npx vitest run tests/unit/mcard-explorer/poly tests/unit/mcard-explorer/core` |
| Isolation | `make check-vcs-isolation` (extended targets) |
| Contract B | `node scripts/audit-testids.mjs --check` |
| Types | `npx tsc --noEmit` |
| Regression | `npx vitest run` (670 baseline + new) |
| Concern audit | new `scripts/audit-concerns.mjs` — reports modules > 150 LOC with declared concerns |
| Layer placement | grep gate for `@layer` headers and root-only kernel specifiers (formalised as `check-layer-imports.mjs` in Sprint 40) |
| Studio parity | `tests/conformance/studio-parity.test.ts` — `TreeProjection` ≡ `buildArtifactTree`; `forwardBrowsingAdapter` direction groups |

**Acceptance demonstration.** With a seeded corpus, the `proof` facet issues a SQL-level `universe = 'U2'` query (observable in the facade test double), and a `Position` for a seeded example card resolves **zero** mutate directions — `Rename`, `Duplicate`, and `Archive` are *absent from the DOM*, not disabled.
