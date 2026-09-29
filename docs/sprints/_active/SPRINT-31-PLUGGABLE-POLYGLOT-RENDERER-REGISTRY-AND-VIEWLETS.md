# Sprint 31: Pluggable Polyglot Renderer Registry & Base Viewlet Suite

**Sprint ID:** `SPRINT-31`  
**Subsystem Category:** `interactions`  
**Target:** `@clm/mcard-explorer/renderers` & Polyglot Viewlet Suite  
**Dependencies:** Sprint 30 (`CardTypeJudgeService`), `mcard-studio` verified sources (`src/components/studio/views/cardViewlets/CardViewletRegistry.ts` + `types.ts` `CardViewletDefinition`, `src/services/cardTypeDetector.ts`)  
**Target LOC:** $\le 250$ LOC per file (Contract D)  
**UI Ergonomics:** High-contrast dark/light mode parity, responsive scrolling, zero host coupling  

---

## 1. Context & Motivation
`mcard-studio` already solves polyglot card display — but with a **different, verified architecture** than earlier drafts assumed:

- **`CardViewletRegistry`** (`src/components/studio/views/cardViewlets/CardViewletRegistry.ts`, studio Sprint 200): a `Map<id, CardViewletDefinition>` registry with `register`/`unregister`, priority-sorted `getAllViewlets()`, and `findBestViewlet(mcard, tab)` selection.
- **`CardViewletDefinition`** (`cardViewlets/types.ts`): `{ id, priority, supportedTabs: CardTabKind[], supportedExtensions?, supportedMimes?, predicate?, component }` where `CardTabKind = 'visual'|'text'|'raw_data'|'raw'|'merkle'` — viewlets like `TikzDiagramViewlet`, `MarkdownViewlet`, `ClmPcardViewlet`, `WitnessVcardViewlet`, `TableGridCsvViewlet`, `JsonObjectViewlet` are lazy React components.
- **`cardTypeDetector.ts`**: a path/content sniffer returning `{ detectedType, mimeType, category, subclass: 'MCard'|'PCard'|'VCard', renderer }` — a string-keyed renderer lookup, not a component registry.

Paths cited in earlier drafts (`src/domain/renderers.ts`, `src/utils/artifactRenderers.tsx`, `src/components/renderers/`, `MarkdownViewer`/`DataViewer` component names) **do not exist** — porting targets the files above.

In TikZiT, `MCard Explorer` currently only knows how to list card handles and hashes. When a non-TikZ card is selected (e.g. a markdown research document, a JSON training set, a CSV benchmark report, or an image asset), the explorer has no mechanism to render it.

Sprint 31 ports and refines `mcard-studio`'s registry architecture into `@clm/mcard-explorer/renderers`, establishing a prioritized, pluggable `RendererRegistry` whose descriptor is a **bidirectional superset of `CardViewletDefinition`** (ADR D34), and shipping a complete suite of lightweight, production-grade base viewlets satisfying Contract D ($\le 250$ LOC each).

---

## 2. Deliverables & Technical Architecture

### 2.1 Renderer Registry & Descriptor Types (`src/packages/mcard-explorer/renderers/registry/`)

#### `types.ts`
**Headless rule**: this module must remain inside the Contract E zero-DOM scan — use `import type` exclusively so React is erased at compile time (no runtime React dependency in the registry):
```typescript
import type { ComponentType, CSSProperties, LazyExoticComponent } from 'react';

export interface BaseCardRendererProps {
  handle: string;
  hash: string;
  content: Uint8Array;
  text: string;
  mimeType: string;
  universe: string;      // kernel 'U0'..'U5'
  category: string;
  metadata?: Record<string, unknown>;
  style?: CSSProperties;
  onAction?: (actionId: string, payload?: unknown) => Promise<void>;
}

export interface RendererResolutionInput {
  mimeType: string;
  handle: string;
  isBinary: boolean;
  universe?: string;
  category?: string;
  /** MCardPayload.kind — enables two-level dispatch: first by kind, then by mimeType (Gap 3). */
  payloadKind?: 'scalar' | 'text' | 'satori' | 'binary' | 'structured' | 'executable';
  content?: Uint8Array | string | null;
}

/**
 * Bidirectional superset of mcard-studio's CardViewletDefinition
 * ({id, priority, supportedTabs, supportedExtensions?, supportedMimes?, predicate?, component}).
 * `matches` is the generalized form of studio's extension/mime/predicate checks;
 * the optional `supported*` fields let a descriptor map 1:1 onto CardViewletDefinition
 * via the documented toCardViewletDefinition() adapter (D34 porting seam).
 */
export interface RendererDescriptor {
  id: string;
  priority: number;
  matches: (input: RendererResolutionInput) => boolean;
  /** Studio-parity selection fields (optional; used by the studio adapter). */
  supportedTabs?: readonly ('visual' | 'text' | 'raw_data' | 'raw' | 'merkle')[];
  supportedMimes?: readonly string[];
  supportedExtensions?: readonly string[];
  /** D44 — viewport the MCardViewer container should adopt for this media type. */
  viewport?: ViewportMode;
  /** D45 — toolbar actions surfaced by MCardViewer (export, openInCanvas, copy…). */
  actions?: RendererAction[];
  component: ComponentType<BaseCardRendererProps> | LazyExoticComponent<ComponentType<BaseCardRendererProps>>;
  /**
   * Headless fallback: produces a kernel HypermediaNode tree for non-React environments
   * (CLI, headless agents, mcard-studio Satori renderer). Enables hypermediaToAnsi()/hypermediaToHtml()
   * rendering without React. Optional — omitted descriptors fall back to BinaryHex text node.
   * Mirrors RuntimeAdapter.execute() pattern (Gap 1, Gap 5 — isomorphic to kernel RuntimeAdapterRegistry).
   */
  toHypermediaNode?: (content: Uint8Array, text: string, judgment: { mime: string; universe: string; category: string }) => import('clm-kernel').HypermediaNode;
}

/** D44: adaptive viewport modes. MCardViewer maps these to container classes + chrome. */
export type ViewportMode =
  | 'fit'    // scale-to-pane (images, SVG diagrams)
  | 'scroll' // vertical scroll (text, code, hex, markdown — default)
  | 'zoom'   // pan/zoom chrome (images, TikZ previews, large PDFs)
  | 'paged'  // pager controls (PDFs, multi-record data sets)
  | 'split'; // dual raw+rendered panes (markdown, YAML, data)

/** D45: declarative toolbar action — emitted through onAction(actionId, payload). */
export interface RendererAction {
  id: string;            // 'export.png' | 'export.pdf' | 'export.svg' | 'export.tikz' | 'openInCanvas' | …
  label: string;
  icon?: string;
  payload?: Record<string, unknown>; // e.g. { format: 'png', pngScale: 2 }
}
```

#### `RendererRegistry.ts`
Implements a monoidal priority filter supporting dynamic registration and guaranteed fallback cascades. Headless: no DOM APIs, `import type` only. `resolve(input)` mirrors studio's `findBestViewlet` ordering (priority desc, predicate wins over extension/mime).

**Isomorphism with kernel `RuntimeAdapterRegistry`** (Gap 5): `RendererDescriptor.matches(input)` ≅ `RuntimeAdapter.canExecute(pcard)`. `RendererRegistry.resolve(input)` ≅ `RuntimeAdapterRegistry.getAdapter(pcard)`. This is a deliberate Baldwin porting of the kernel's adapter dispatch pattern.

**Studio adapter extraction** (Gap 9): `toCardViewletDefinition(descriptor)` is defined in a separate module `renderers/adapters/studioAdapter.ts` ($\le 60$ LOC) — not inside `RendererRegistry.ts` — keeping the registry generic and the studio-specific mapping isolated:
```typescript
export class RendererRegistry {
  private descriptors: RendererDescriptor[] = [];

  public register(descriptor: RendererDescriptor): void {
    this.descriptors = this.descriptors.filter(d => d.id !== descriptor.id);
    this.descriptors.push(descriptor);
    this.descriptors.sort((a, b) => b.priority - a.priority);
  }

  /** Ordered candidate list: all matching descriptors, priority desc, fallback appended last. */
  public resolveAll(input: RendererResolutionInput): RendererDescriptor[] {
    const hits = this.descriptors.filter(d => {
      try { return d.matches(input); }
      catch (e) { console.error(`[RendererRegistry] Match error in ${d.id}:`, e); return false; }
    });
    return [...hits, this.getFallbackDescriptor(input.isBinary)];
  }

  /** Best match — first candidate of resolveAll. */
  public resolve(input: RendererResolutionInput): RendererDescriptor {
    return this.resolveAll(input)[0];
  }

  /** Enumeration for agent/CLI introspection and conformance iteration (studio `getAllViewlets` parity). */
  public listAll(): readonly RendererDescriptor[] { return this.descriptors; }
}
```

**Render-failure cascade**: `resolveAll` exists so `MCardViewer`'s error boundary can fall through the ordered candidate list on mount/render throw — a crashing `MarkdownCardRenderer` degrades to the next match, ultimately `BinaryHexCardRenderer` (the absorbing element). Match-time exceptions and render-time exceptions are both covered, so the 100%-renderability guarantee is structural, not aspirational.

### 2.2 Base Polyglot Viewlet Suite (`src/packages/mcard-explorer/renderers/base/`)

All viewlets are built with pure React and Tailwind classes, fully respecting dark and light modes, and strictly bounded by Contract D ($\le 250$ LOC). Each descriptor also declares its **D44 `viewport` mode** and any **D45 `actions`**:

1. **`TextCardRenderer.tsx` ($\le 140$ LOC)** — `viewport: 'scroll'`:
   - For `text/plain` and generic text formats.
   - Features: Line numbering, word-wrap toggle, copy-to-clipboard affordance, byte count badge (`data-testid="renderer-text"`).
2. **`MarkdownCardRenderer.tsx` ($\le 180$ LOC)** — `viewport: 'split'`:
   - For `text/markdown`.
   - Features: Rendered HTML typography, tables, blockquotes, code fences, and raw markdown toggle (`data-testid="renderer-markdown"`); `split` shows source + rendered side-by-side on wide panes.
3. **`DataCardRenderer.tsx` ($\le 200$ LOC)`** — `viewport: 'scroll'`:
   - For `application/json` and `application/xml`.
   - Features: Collapsible tree nodes for JSON objects/arrays, syntax coloring for keys/values/primitives, search filter within tree (`data-testid="renderer-data"`).
4. **`YamlCardRenderer.tsx` ($\le 180$ LOC)`** — `viewport: 'split'`:
   - For `application/x-yaml` and `text/yaml`.
   - Features: Formatted YAML syntax rendering, section folding, copy-as-JSON button (`data-testid="renderer-yaml"`).
5. **`CsvCardRenderer.tsx` ($\le 200$ LOC)`** — `viewport: 'paged'`:
   - For `text/csv`.
   - Features: Tabular grid with sticky header, row indices, search filter, pager for large sheets, and column count badge (`data-testid="renderer-csv"`).
6. **`ImageCardRenderer.tsx` ($\le 160$ LOC)`** — `viewport: 'zoom'`:
   - For `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`.
   - Features: Centered canvas container with checkerboard transparency background, zoom/pan controls, intrinsic dimension badges (`data-testid="renderer-image"`).
7. **`PdfCardRenderer.tsx` ($\le 210$ LOC)`** — `viewport: 'paged'`:
   - For `application/pdf` (registered in the kernel SSOT dictionary; studio parity: `PdfViewlet` in `DocumentViewlets`).
   - Features: Embedded page preview via blob-URL `<iframe>`/`object`, page-count + producer metadata badges, open-in-new-tab and download affordances (`export.pdf` passthrough through `onAction`), graceful headless fallback to metadata + hex summary when no DOM iframe is available (`data-testid="renderer-pdf"`).
8. **`BinaryHexCardRenderer.tsx` ($\le 220$ LOC)`** — `viewport: 'scroll'`:
   - Fallback for binary blobs and unclassified assets (absorbing element of the sieve).
   - Features: Classical 3-column hex dump (16-bit offset, 16 hex byte pairs, ASCII glyph translation) with virtual scrolling for performance (`data-testid="renderer-binary-hex"`).

### 2.3 Multimodal Sample Media Fixture Corpus (`tests/fixtures/multimodal-media/`)

A deterministic fixture set — regenerated by `scripts/generate-media-fixtures.mjs`, never hand-edited — exercising every viewlet and every viewport mode:

| Fixture | Type / MIME | Renderer | Viewport |
| :--- | :--- | :--- | :--- |
| `sample.tikz` | `text/x-tikz` | `TikzCardRenderer` | `zoom` |
| `sample.zx.json` | `application/vnd.zx-graph+json` | `TikzCardRenderer` | `zoom` |
| `notes.md` | `text/markdown` | `MarkdownCardRenderer` | `split` |
| `dataset.csv` | `text/csv` | `CsvCardRenderer` | `paged` |
| `config.yaml` | `application/x-yaml` | `YamlCardRenderer` | `split` |
| `graph.json` | `application/json` | `DataCardRenderer` | `scroll` |
| `icon.png` | `image/png` (tiny, generated) | `ImageCardRenderer` | `zoom` |
| `logo.svg` | `image/svg+xml` | `ImageCardRenderer` | `zoom` |
| `paper.pdf` | `application/pdf` (via `pdf-lib`) | `PdfCardRenderer` | `paged` |
| `workflow.pcard.json` | `application/vnd.pcard+json` | `PCardRenderer` | `fit` |
| `receipt.vcard.json` | `application/vnd.vcard+json` | `VCardRenderer` | `scroll` |
| `turn.satori.xml` | `application/vnd.satori.turn+xml` | `SatoriCardRenderer` | `scroll` |
| `collection.db` | `application/x-sqlite3` (via kernel `compilePortableSqlite`) | `SqliteCollectionRenderer` | `paged` |
| `blob.bin` | `application/octet-stream` | `BinaryHexCardRenderer` | `scroll` |

`npm run seed:media` mounts the corpus as MCards into a dev `IndexedDbStorageVFS` (TikZiT) or `studioMCardFs` (`mcard-studio`) for manual QA in both hosts.

---

## 3. Definition of Done (DoD) Criteria

- [ ] **31-DOD-01**: `src/packages/mcard-explorer/renderers/registry/types.ts` is created satisfying Contract D ($\le 120$ LOC), exporting `BaseCardRendererProps`, `RendererResolutionInput` (with `payloadKind`), and `RendererDescriptor` (with optional `toHypermediaNode`) with studio-parity `supportedTabs`/`supportedMimes`/`supportedExtensions` fields. React and `HypermediaNode` appear only via `import type`.
- [ ] **31-DOD-02**: `RendererRegistry.ts` is authored ($\le 150$ LOC) providing deterministic priority sorting, `resolveAll()` ordered candidates (match-time + render-time fallback cascade), `listAll()` enumeration, and `resolve()` best-match. `toCardViewletDefinition(descriptor)` adapter lives in a separate `renderers/adapters/studioAdapter.ts` ($\le 60$ LOC) emitting `mcard-studio`'s `CardViewletDefinition` shape.
- [ ] **31-DOD-03**: `TextCardRenderer.tsx` is implemented ($\le 140$ LOC) with line numbering, word wrap, and copy action (`data-testid="renderer-text"`).
- [ ] **31-DOD-04**: `MarkdownCardRenderer.tsx` is implemented ($\le 180$ LOC) with rendered markdown, raw toggle, and `viewport: 'split'` (`data-testid="renderer-markdown"`).
- [ ] **31-DOD-05**: `DataCardRenderer.tsx` is implemented ($\le 200$ LOC) with collapsible tree nodes for JSON/XML (`data-testid="renderer-data"`).
- [ ] **31-DOD-06**: `YamlCardRenderer.tsx` and `CsvCardRenderer.tsx` are implemented ($\le 200$ LOC each) with `split` YAML display and `paged` CSV grid.
- [ ] **31-DOD-07**: `ImageCardRenderer.tsx` ($\le 160$ LOC, `zoom`), `PdfCardRenderer.tsx` ($\le 210$ LOC, `paged`, blob-URL embed + headless fallback), and `BinaryHexCardRenderer.tsx` ($\le 220$ LOC, virtual scroll) are implemented.
- [ ] **31-DOD-08**: `tests/unit/mcard-explorer/renderers/RendererRegistry.test.ts` passes with 100% green assertions for priority matching, fallback logic, and `toCardViewletDefinition` parity.
- [ ] **31-DOD-09**: `tests/unit/mcard-explorer/renderers/baseViewlets.test.tsx` passes, verifying correct rendering of all 8 base viewlets **against the D45 fixture corpus**.
- [ ] **31-DOD-10**: Existing 505 tests in the TikZiT test suite pass with zero regressions.
- [ ] **31-DOD-11**: Contract E: `check-vcs-isolation.mjs` `TARGET_DIRECTORIES` extended to scan `mcard-explorer/renderers/registry` — 0 DOM globals, 0 host imports, 0 runtime React import (type-only). `mcard-explorer` contains zero `mcard-vcs` imports (D42).
- [ ] **31-DOD-12**: `scripts/generate-media-fixtures.mjs` deterministically regenerates the 14-file `tests/fixtures/multimodal-media/` corpus (PNG/SVG/PDF/MD/CSV/YAML/JSON/TikZ/ZX/PCard/VCard/Satori/SQLite/blob); `npm run seed:media` mounts it as MCards for manual QA; every descriptor declares a valid `viewport` mode.
