/** @layer L4 interface/membrane */

export interface CoeffectDeclaration<S = unknown> {
  readonly panelId: string;
  /** Slice selectors over the host context — never the whole store. */
  readonly slices: readonly string[];
  /** Called only when one of the declared slices changes (referential comparison). */
  readonly onChange: (next: S, prev: S) => void;
  /** Optional equality override for slice comparison. */
  readonly equals?: (a: unknown, b: unknown) => boolean;
}

export class CoeffectHost {
  private sliceValues = new Map<string, unknown>();
  private bindings = new Set<CoeffectDeclaration<any>>();

  /**
   * Bind a panel coeffect declaration; returns a disposer.
   */
  public bind<S>(decl: CoeffectDeclaration<S>): () => void {
    this.bindings.add(decl);
    return () => {
      this.bindings.delete(decl);
    };
  }

  /**
   * Publish a context slice value; only panels declaring it are notified.
   */
  public publish(slice: string, value: unknown): void {
    const prev = this.sliceValues.get(slice);
    this.sliceValues.set(slice, value);

    for (const binding of this.bindings) {
      if (binding.slices.includes(slice)) {
        const isEq = binding.equals ? binding.equals(value, prev) : value === prev;
        if (!isEq) {
          binding.onChange(value, prev);
        }
      }
    }
  }

  /**
   * Get the current value of a slice.
   */
  public get(slice: string): unknown {
    return this.sliceValues.get(slice);
  }

  /**
   * Diagnostics: which panels are subscribed to which slices.
   */
  public subscriptions(): Readonly<Record<string, readonly string[]>> {
    const map: Record<string, string[]> = {};
    for (const binding of this.bindings) {
      map[binding.panelId] = [...binding.slices];
    }
    return map;
  }

  /**
   * Snapshot of all slice values (used for deep-equality zero-residue check).
   */
  public snapshot(): Readonly<Record<string, unknown>> {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of this.sliceValues.entries()) {
      obj[k] = v;
    }
    return obj;
  }
}

export interface EnvironmentCapabilities {
  viewport?: { width: number; height: number };
  permissions?: Readonly<Record<string, boolean>>;
  storageQuota?: { used: number; total: number };
  activeDevice?: 'desktop' | 'mobile' | 'tablet';
}

export class CoeffectEnvironment {
  private capabilities: EnvironmentCapabilities;
  private listeners = new Set<(caps: EnvironmentCapabilities) => void>();

  constructor(initial: EnvironmentCapabilities = {}) {
    this.capabilities = { ...initial };
  }

  public get(): EnvironmentCapabilities {
    return { ...this.capabilities };
  }

  public update(patch: Partial<EnvironmentCapabilities>): void {
    this.capabilities = { ...this.capabilities, ...patch };
    for (const listener of this.listeners) {
      listener(this.get());
    }
  }

  public subscribe(listener: (caps: EnvironmentCapabilities) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
