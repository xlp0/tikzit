# RFC-CLM-002: Operadic Virtual File System & Standardized Explorer Subsystem

- **Author:** Winston (System Architect) & Amelia (Senior Software Engineer)
- **Status:** Proposed
- **Target:** `clm-kernel` v0.2.0 & `mcard-studio`
- **Related:** Sprint 25-29 Architecture Series

---

## 1. Executive Summary

This RFC proposes the canonical architectural evolution of `clm-kernel`'s layer 2 (`MCardFileSystem`) and layer 4 (`chatbot` / `explorer`) subsystems. Grounded in the Double Operadic Theory of Systems (DOTS), this specification formalizes:
1. **Conversational Lenses ($S \dashv G$)** replacing ad-hoc mutable filesystem mutations.
2. **First-Class Merkle DAG Lineage** (`CommitMCard` and `TreeMCard`) supporting true multi-parent branching and 3-way merges.
3. **A Standardized Headless Explorer Subsystem** (`MCardExplorerEngine` and `ExplorerActionRegistry`) decouplable into web, desktop, and conversational surfaces.

---

## 2. Motivation & Current Limitations

In `clm-kernel` v0.1.x:
- `MCardFileSystem` provides raw SQLite and memory primitives, but lacks formal lens laws ($S(s, G(s)) = s$, $G(S(s, b)) = b$).
- Lineage is historically modeled as linear `handle_history` rows, precluding collaborative agent branching, cherry-picking, and DAG LCA merges.
- Explorer viewlets in consumer applications (`tikzit`, `mcard-studio`) have developed fragmented, divergent implementations of search, faceting, and actions.

---

## 3. Detailed Proposed Specification

### 3.1 Operadic Conversational Lenses (`layer2/storage`)
The storage layer shall expose bidirectional lenses satisfying the classical lens laws:

```typescript
export interface ConversationalLens<S, A, B> {
  get(source: S): Promise<A | null>;
  set(source: S, update: B): Promise<string>;
  verifyLensLaws(source: S, val1: B, val2: B): Promise<LensLawResult>;
}
```

### 3.2 Native Merkle DAG Schemas (`layer2/vcs`)
`clm-kernel` shall adopt content-addressed `CommitMCard` and `TreeMCard` records:

```typescript
export interface CommitMCard {
  readonly parents: string[];
  readonly treeHash: string;
  readonly authorDid: string;
  readonly timestamp: string;
  readonly message: string;
}

export interface TreeMCard {
  readonly entries: Array<{ handle: string; hash: string }>;
}
```

### 3.3 Headless Explorer & Action Registry (`layer4/explorer`)
A unified headless state machine decouples the browsing logic from host DOM environments:

```typescript
export class MCardExplorerEngine {
  public getState(): ExplorerState;
  public setQuery(query: string): Promise<void>;
  public setFacet(facet: string): Promise<void>;
  public buildTree(items: CardSummary[]): TreeNode[];
  public executeAction(actionId: string, handle: string): Promise<ActionResult>;
}
```

---

## 4. Migration & Compatibility

1. **Zero-Regression Dual Views**: The legacy `handle_history` table remains available as a compatibility projection over `TreeMCard` history.
2. **Hermetic Packaging**: The storage and headless explorer engines enforce Contract E (zero DOM globals), ensuring identical behavior under Node.js, Cloudflare Workers, and browser WASM runtimes.
3. **Pluggable Backends**: Storage continues to support in-memory WASM (`sql.js`), filesystem binary persistence (`NodeFs`), and browser indexed storage (`IndexedDB`).
