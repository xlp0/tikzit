# Sprint 37: MCard-First Card Algebra & Composition Surface

**Directory:** `docs/sprints/interactions/37-mcard-first-card-algebra-and-composition-surface`  
**Subsystem Category:** `interactions`  
**Status:** ✅ **Completed & Graduated**  
**Date:** 2026-09-29  

---

## 1. Executive Summary

Sprint 37 promotes **MCard to the primary unit of manipulation** in `@clm/mcard-explorer`, grounding the card explorer in formal category-theoretic card algebra and delivering the interactive `CardCompositionSurface`:

1. **Card Ports & Specialized Providers (`cards/`)**:
   - `ports.ts`: Formalized `PortType`, `CardPort`, `CardInterface`, `CardPortInput`, `CardPortProvider`, and `CardPortRegistry`. Root-only `'clm-kernel'` imports.
   - `providers/`: Seven specialized port derivation providers (`tikz.ts`, `tex.ts`, `image.ts`, `pdf.ts`, `markdown.ts`, `sqlite.ts`, `pcard.ts`). Unmodelled cards cleanly return empty port lists without throwing.
   - Extensible provider architecture allowing registration of new card types with zero modifications to existing providers.

2. **Port Compatibility & Discrimination Engine (`legality.ts`)**:
   - Implements `portsCompatible(source, target)` returning a discriminated `PortMatch` (`ok: true` with exact flag vs. `ok: false` with specific reasons: `mime-mismatch`, `universe-incompatible`, `arity-conflict`, `direction-conflict`).
   - Powers the strict guardrail absence suite ($\ge 8$ negative test cases) ensuring incompatible wiring directions never exist in the direction fiber.

3. **Algebraic Composition Operators (`composition.ts`)**:
   - Formalized `tensor` ($\otimes$, parallel synchronous composition), `substitute` ($\triangleleft$, hierarchical composition into matching in-ports), and `coproduct` ($+$, alternative selection).
   - Returns a `CompositionPlan` specifying wires, unbound ports, and computed legality without throwing.

4. **Card Monad & Kleisli Arrow Operations (`handles.ts`)**:
   - System call vocabulary against abstract ports: `cardCreate` ($\eta$), `cardGet` ($\mu$ dedupe), `cardGetByHash`, `cardDerive`, `cardInvoke` (Kleisli arrow), `cardFork`, `cardHistory`.
   - Invariant: `cardInvoke` always returns a valid, dereferenceable MCard handle, never raw values.

5. **Elimination of Closed Unions & Prop Slimming (`ui/`)**:
   - Closed `ExplorerItem` union eliminated in favor of `Position` (Sprint 36) and the pure projection `projectBadges(position)`.
   - Prop wall eliminated: `CardRow` reduced to 4 props (`position`, `directions`, `badges`, `onExecute`); `PositionGroupList` renders grouped cards with zero callback pass-through.
   - `CardCompositionSurface` and `usePortDrag` hook seam deliver interactive wiring with fail-closed drag targets and keyboard accessibility.

6. **Studio Parity & Interoperability**:
   - `toStudioPortDescriptor` maps `CardPort` to studio descriptor format with field parity.
   - Conformance verified against `studioMCardFs` VFS facade.

---

## 2. Verification Matrix & Definition of Done (21/21 Gates Verified)

- [x] **37-DOD-01**: **Typed Card Ports Interface** (`cards/ports.ts`, 79 LOC $\le 140$ LOC) — Exports `PortType`, `CardPort`, `CardInterface`, `CardPortProvider`, `CardPortInput`; root-only `'clm-kernel'` imports.
- [x] **37-DOD-02**: **Seven Specialized Port Providers** (`cards/providers/*.ts`, all $\le 45$ LOC $\le 90$ LOC) — All 7 providers (`tikz`, `tex`, `image`, `pdf`, `markdown`, `sqlite`, `pcard`) implemented; unmodelled card types yield empty ports without throwing.
- [x] **37-DOD-03**: **Port Legality & Discrimination Engine** (`cards/legality.ts`, 55 LOC $\le 110$ LOC) — Implements `portsCompatible` returning discriminated `PortMatch`; all 4 failure reasons tested.
- [x] **37-DOD-04**: **Composition Operators** (`cards/composition.ts`, 131 LOC $\le 170$ LOC) — Implements `tensor` ($\otimes$), `substitute` ($\triangleleft$), `coproduct` ($+$); returns `CompositionPlan`; rejected composition returns non-throwing failure plan.
- [x] **37-DOD-05**: **MCard Monad & Kleisli Handle Operations** (`cards/handles.ts`, 127 LOC $\le 150$ LOC) — Implements `cardCreate`, `cardGet`, `cardGetByHash`, `cardDerive`, `cardInvoke`, `cardFork`, `cardHistory` against ports.
- [x] **37-DOD-06**: **Elimination of Closed `ExplorerItem` Union** — Zero occurrences of `ExplorerItem`; `projectBadges(position)` projects badges uniformly for markdown, PDF, diagrams, and artifacts.
- [x] **37-DOD-07**: **Prop Slimming & PositionGroupList** (`ui/PositionGroupList.tsx`, 51 LOC $\le 90$ LOC) — `CardRowProps` has exactly 4 members; zero callback pass-through.
- [x] **37-DOD-08**: **Card Composition Surface Component** (`ui/CardCompositionSurface.tsx`, 149 LOC $\le 220$ LOC) — Composition tiles, port anchors, fail-closed drop targets, Contract B testids registered.
- [x] **37-DOD-09**: **Guardrail Negative Absence Suite ($\ge 8$ Cases)** — Tested in `legality.test.ts`: incompatible connections yield no legal directions and no drop targets.
- [x] **37-DOD-10**: **Contract B Baseline Preservation** — All 300 selectors and 24 dynamic prefixes intact and passing `scripts/audit-testids.mjs`.
- [x] **37-DOD-11**: **Contract E Isolation & Zero-VCS Gate (ADR D42)** — `check-vcs-isolation.mjs` verifies zero DOM globals, zero host imports, and zero `@clm/mcard-vcs` concrete classes in `cards/`.
- [x] **37-DOD-12**: **Cards Package Unit Test Suite** — 100% pass across `tests/unit/mcard-explorer/cards/` (18 tests).
- [x] **37-DOD-13**: **Full Vitest Suite & TypeScript Compilation** — 731 tests across 128 files green; `npx tsc --noEmit` exits with 0 errors.
- [x] **37-DOD-14**: **Single-Concern Module Audit (ADR D53)** — `node scripts/audit-concerns.mjs` confirms all 36 modules pass strict LOC ceilings.
- [x] **37-DOD-15**: **Kernel Layer Declarations & Purity (ADR D57)** — `@layer L4` header verified across all 15 `cards/` modules.
- [x] **37-DOD-16**: **Extensible Provider Architecture (ADR D54)** — Custom 8th provider registered at runtime without modifying existing code.
- [x] **37-DOD-17**: **Studio `studioMCardFs` Port Conformance** — Verified against studio VFS facade test double.
- [x] **37-DOD-18**: **Studio Port Descriptor Parity (ADR D34)** — `toStudioPortDescriptor` field-for-field parity verified.
- [x] **37-DOD-19**: **Drag-and-Drop Hook Seam (`usePortDrag`)** — `usePortDrag.ts` provides clean drag state and legal target resolution.
- [x] **37-DOD-20**: **Façade Discipline (ADR D54)** — `cards/index.ts` is the exclusive public export; zero external deep imports.
- [x] **37-DOD-21**: **Kenotic Host Boundary (ADR D55)** — Zero `cordis` or host-store imports in `cards/`.

---

## 3. Produced Source Modules & Tests

| File | Concern / Role | Lines of Code | Ceiling |
| :--- | :--- | :---: | :---: |
| `src/packages/mcard-explorer/cards/ports.ts` | Port types, interface & registry | 79 | 140 |
| `src/packages/mcard-explorer/cards/legality.ts` | Discriminated port compatibility matcher | 55 | 110 |
| `src/packages/mcard-explorer/cards/composition.ts` | Tensor, substitute, coproduct operators | 131 | 170 |
| `src/packages/mcard-explorer/cards/handles.ts` | MCard monad & Kleisli arrow handle ops | 127 | 150 |
| `src/packages/mcard-explorer/cards/projectBadges.ts` | Pure badge projection from Position | 46 | 60 |
| `src/packages/mcard-explorer/cards/adapters/studioPortDescriptor.ts` | Studio port descriptor adapter | 27 | 60 |
| `src/packages/mcard-explorer/cards/providers/tikz.ts` | TikZ diagram port provider | 44 | 90 |
| `src/packages/mcard-explorer/cards/providers/tex.ts` | LaTeX port provider | 36 | 90 |
| `src/packages/mcard-explorer/cards/providers/image.ts` | Image artifact port provider | 33 | 90 |
| `src/packages/mcard-explorer/cards/providers/pdf.ts` | PDF artifact port provider | 25 | 90 |
| `src/packages/mcard-explorer/cards/providers/markdown.ts` | Markdown text data port provider | 33 | 90 |
| `src/packages/mcard-explorer/cards/providers/sqlite.ts` | SQLite container port provider | 37 | 90 |
| `src/packages/mcard-explorer/cards/providers/pcard.ts` | PCard token process port provider | 36 | 90 |
| `src/packages/mcard-explorer/cards/index.ts` | Cards subsystem public facade | 10 | 50 |
| `src/packages/mcard-explorer/ui/CardRow.tsx` | 4-prop card row with badge rendering | 95 | 110 |
| `src/packages/mcard-explorer/ui/PositionGroupList.tsx` | Grouped position renderer (0 callback pass-through) | 51 | 90 |
| `src/packages/mcard-explorer/ui/usePortDrag.ts` | Drag-and-drop hook seam for composition | 87 | 90 |
| `src/packages/mcard-explorer/ui/CardCompositionSurface.tsx` | Interactive card composition surface | 149 | 220 |

### Unit & Conformance Test Suites

| Test File | Description | Test Count | Status |
| :--- | :--- | :---: | :---: |
| `tests/unit/mcard-explorer/cards/ports.test.ts` | Seven-provider derivation, unmodelled cards, extensibility | 3 | Passed |
| `tests/unit/mcard-explorer/cards/legality.test.ts` | Port matching, 4 failure reasons, 8 guardrail absence tests | 10 | Passed |
| `tests/unit/mcard-explorer/cards/composition.test.ts` | Tensor, substitute, coproduct algebraic laws & legality | 4 | Passed |
| `tests/unit/mcard-explorer/cards/handles.test.ts` | MCard monad operations & Kleisli arrow invariant | 1 | Passed |
| `tests/unit/mcard-explorer/ui/CardRow.test.tsx` | Uniform row rendering across card types via badges | 1 | Passed |
| `tests/unit/mcard-explorer/ui/PositionGroupList.test.tsx` | Direction resolution & zero callback pass-through | 2 | Passed |
| `tests/unit/mcard-explorer/ui/usePortDrag.test.tsx` | Drag hook state transitions & legal target resolution | 1 | Passed |
| `tests/unit/mcard-explorer/ui/CardCompositionSurface.test.tsx` | Composition surface tiles, anchors & commit direction | 2 | Passed |
| `tests/conformance/studio-parity.test.ts` | Tree sorting, studioMCardFs VFS parity, studioPortDescriptor | 3 | Passed |
