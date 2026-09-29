/** @layer L4 interface/membrane */
import type { OperationJournal } from './journal';

/**
 * Host-side binding contract — implemented by TikZiT and by mcard-studio;
 * zero cordis imports inside the package.
 */
export interface HostEffectContext {
  /** Mirrors Cordis ctx.effect(fn): run eagerly, return a disposer. */
  effect<T>(fn: () => T, dispose: (value: T) => void | Promise<void>): () => void;
  /** Mirrors ctx.provide(name, value) + module augmentation. */
  provide(name: string, value: unknown): () => void;
  /** Isolated child scope, mirroring ctx.isolate('fiber:name'). */
  isolate(name: string): HostEffectContext;
}

export interface MinimalCoeffectHost {
  subscriptions(): Readonly<Record<string, readonly string[]>>;
}

/**
 * Bind the journal + coeffect host to any host context (pure package function).
 */
export function bindHostEffects(
  ctx: HostEffectContext,
  journal: OperationJournal,
  host: MinimalCoeffectHost
): () => void {
  const unprovideJournal = ctx.provide('explorer.journal', journal);
  const unprovideHost = ctx.provide('explorer.coeffects', host);

  const unregisterEffect = ctx.effect(
    () => {
      const mark = journal.mark();
      return { mark };
    },
    async (scope) => {
      await journal.rollbackTo(scope.mark);
    }
  );

  return () => {
    unregisterEffect();
    unprovideHost();
    unprovideJournal();
  };
}
