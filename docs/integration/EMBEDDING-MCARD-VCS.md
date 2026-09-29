# Embedding @clm/mcard-vcs & @clm/mcard-explorer in Host Applications

This guide outlines how to embed the Operadic Virtual File System (`@clm/mcard-vcs`) and the Reusable MCard Explorer (`@clm/mcard-explorer`) in any JavaScript/TypeScript host (including `mcard-studio`, CLI tools, or custom web workbenches).

---

## 1. Architecture & Invariants

The subsystem is built on **Double Operadic Theory of Systems (DOTS)** and enforces:

- **Dependency Inversion ($\dashv$)**: Context is passed IN, never imported.
- **Hermetic Isolation (Contract E)**: Zero DOM globals (`window`, `document`, `HTMLElement`) in the core engines.
- **Contract D**: Every module strictly satisfies $\le 250$ LOC.

---

## 2. Bootstrapping with Bare Cordis Context

Any host can bootstrap the entire system using a bare `new Context()`:

```typescript
import { Context } from 'cordis';
import {
  OperadicMCardVfs,
  MCardVcsEngine,
  ExplorerQueryFacade,
  MCardStorageService,
  MCardVcsService,
  MCardExplorerService
} from '@clm/mcard-vcs';

// 1. Create bare context and storage backend
const ctx = new Context();
const vfs = await OperadicMCardVfs.createOptimal({ backend: 'memory' });

// 2. Instantiate VCS engine and explorer facade
const vcs = new MCardVcsEngine(vfs);
await vcs.init();
const facade = new ExplorerQueryFacade(vfs, vcs);

// 3. Mount services via dependency inversion
new MCardStorageService(ctx, vfs);
new MCardVcsService(ctx, vcs);
new MCardExplorerService(ctx, facade);
```

---

## 3. Mounting as a PTR Microkernel Plugin

In modular microkernels (such as `mcard-studio`), install the plugin manifest directly:

```typescript
import { createMCardVcsPlugin } from '@clm/mcard-vcs';

const plugin = createMCardVcsPlugin(ctx);
// Registers Petri places and transitions (vcs:stageCard, vcs:commitDag, etc.)
```

---

## 4. Mounting the Explorer UI

Embed the composite React viewlet into panels or drawers:

```tsx
import React from 'react';
import { MCardExplorer, MCardExplorerEngine, ExplorerActionRegistry } from '@clm/mcard-explorer';

const actions = new ExplorerActionRegistry();
actions.register({
  id: 'open',
  label: 'Open Document',
  execute: async (card) => {
    console.log('Open:', card.handle);
    return { success: true };
  }
});

export const MyExplorerPanel: React.FC = () => {
  const engine = new MCardExplorerEngine(facade, actions);

  return (
    <div className="h-full w-full">
      <MCardExplorer
        engine={engine}
        actionRegistry={actions}
        facets={['all', 'diagram', 'draft']}
        onCardSelect={(handle) => console.log('Selected:', handle)}
      />
    </div>
  );
};
```

---

## 5. Automated Conformance Verification

Verify your host environment meets all invariant requirements by running the built-in self-check:

```typescript
import { runHostSelfCheck } from '@clm/mcard-vcs/conformance/hostSelfCheck';

const report = await runHostSelfCheck();
if (!report.success) {
  console.error('Host failed invariants:', report.results);
  process.exit(1);
}
console.log('Host successfully verified against all CLM invariants!');
```
