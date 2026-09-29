import type { Context } from 'cordis';
import type { HostEffectContext, MinimalCoeffectHost } from '../../packages/mcard-explorer/time';

/**
 * Maps a Cordis Context into the package's headless HostEffectContext.
 * Isolates Cordis runtime primitives from the time/ and poly/ domains (ADR D55).
 */
export function createCordisHostEffectContext(ctx: Context): HostEffectContext {
  return {
    effect<T>(fn: () => T, dispose: (value: T) => void | Promise<void>): () => void {
      const val = fn();
      let disposed = false;
      const disposer = async () => {
        if (!disposed) {
          disposed = true;
          await dispose(val);
        }
      };
      const unreg = ctx.effect(() => {
        return () => {
          void disposer();
        };
      });
      return () => {
        unreg();
        void disposer();
      };
    },
    provide(name: string, value: unknown): () => void {
      (ctx as unknown as Record<string, unknown>)[name] = value;
      ctx.emit('explorer:provided' as never, name, value);
      return () => {
        if ((ctx as unknown as Record<string, unknown>)[name] === value) {
          delete (ctx as unknown as Record<string, unknown>)[name];
          ctx.emit('explorer:unprovided' as never, name);
        }
      };
    },
    isolate(name: string): HostEffectContext {
      const child = ctx.isolate(name as never);
      return createCordisHostEffectContext(child);
    }
  };
}

export class CordisCoeffectHost implements MinimalCoeffectHost {
  constructor(private readonly ctx: Context) {}

  subscriptions(): Readonly<Record<string, readonly string[]>> {
    return {
      cordis: ['events', 'services']
    };
  }

  emit(event: string, ...args: unknown[]): void {
    this.ctx.emit(event as never, ...args);
  }

  on(event: string, listener: (...args: unknown[]) => void): () => void {
    return this.ctx.on(event as never, listener);
  }
}
