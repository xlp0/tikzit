/** @layer L4 interface/membrane */
import type { NavigationProvider, Position } from './types';

/**
 * NavigationProviderRegistry: Registry and dispatcher for navigable structure sources.
 * Grounded in ADR D56 and mcard-navigation URL-as-state specification.
 */
export class NavigationProviderRegistry {
  private providers = new Map<string, NavigationProvider>();

  /**
   * Register a navigation provider; returns a disposer.
   */
  public register(provider: NavigationProvider): () => void {
    this.providers.set(provider.id, provider);
    return () => {
      this.providers.delete(provider.id);
    };
  }

  /**
   * List all registered navigation providers.
   */
  public list(): readonly NavigationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Root positions across all applicable providers, in registration order.
   */
  public async resolveRoot(): Promise<readonly Position[]> {
    const results: Position[] = [];
    for (const provider of this.providers.values()) {
      if (provider.appliesTo(null)) {
        const roots = await provider.resolveRoot();
        results.push(...roots);
      }
    }
    return results;
  }

  /**
   * Child positions for a given position.
   */
  public async children(position: Position): Promise<readonly Position[]> {
    for (const provider of this.providers.values()) {
      if (provider.appliesTo(position) && provider.resolveChildren) {
        return provider.resolveChildren(position);
      }
    }
    return [];
  }

  /**
   * Position for a URL address fragment, or null when no provider claims it.
   */
  public fromAddress(address: string): Position | null {
    for (const provider of this.providers.values()) {
      if (provider.decodeAddress) {
        const pos = provider.decodeAddress(address);
        if (pos) return pos;
      }
    }
    return null;
  }
}
