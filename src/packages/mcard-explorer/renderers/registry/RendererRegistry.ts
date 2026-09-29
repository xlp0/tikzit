/**
 * @clm/mcard-explorer: Universal Renderer Registry
 *
 * Monoidal priority sieve with guaranteed fallback cascades.
 * Headless: zero DOM globals, Contract D ceiling: <= 150 LOC.
 */

import type { RendererDescriptor, RendererResolutionInput } from './types';

export class RendererRegistry {
  private descriptors: RendererDescriptor[] = [];
  private fallbackTextDescriptor?: RendererDescriptor;
  private fallbackBinaryDescriptor?: RendererDescriptor;

  public register(descriptor: RendererDescriptor): void {
    this.descriptors = this.descriptors.filter(d => d.id !== descriptor.id);
    this.descriptors.push(descriptor);
    this.descriptors.sort((a, b) => b.priority - a.priority);
  }

  public unregister(id: string): void {
    this.descriptors = this.descriptors.filter(d => d.id !== id);
  }

  public registerFallback(kind: 'text' | 'binary', descriptor: RendererDescriptor): void {
    if (kind === 'text') {
      this.fallbackTextDescriptor = descriptor;
    } else {
      this.fallbackBinaryDescriptor = descriptor;
    }
  }

  public getFallbackDescriptor(isBinary: boolean): RendererDescriptor {
    if (isBinary) {
      if (this.fallbackBinaryDescriptor) return this.fallbackBinaryDescriptor;
      const found = this.descriptors.find(d => d.id === 'binary-hex');
      if (found) return found;
    } else {
      if (this.fallbackTextDescriptor) return this.fallbackTextDescriptor;
      const found = this.descriptors.find(d => d.id === 'text');
      if (found) return found;
    }

    if (this.descriptors.length > 0) {
      return this.descriptors[this.descriptors.length - 1];
    }

    throw new Error('RendererRegistry: No descriptors or fallbacks available');
  }

  /**
   * Returns ordered list of candidates: all matching descriptors in descending priority,
   * with the guaranteed fallback descriptor appended last if not already included.
   */
  public resolveAll(input: RendererResolutionInput): RendererDescriptor[] {
    const hits = this.descriptors.filter(d => {
      try {
        return d.matches(input);
      } catch (e) {
        console.error(`[RendererRegistry] Match error in descriptor '${d.id}':`, e);
        return false;
      }
    });

    try {
      const fallback = this.getFallbackDescriptor(input.isBinary);
      if (!hits.some(h => h.id === fallback.id)) {
        return [...hits, fallback];
      }
    } catch {
      // No fallback registered yet; return matches as-is
    }

    return hits;
  }

  /**
   * Resolves the single highest-priority matching descriptor, falling back if none match.
   */
  public resolve(input: RendererResolutionInput): RendererDescriptor {
    const candidates = this.resolveAll(input);
    if (candidates.length > 0) {
      return candidates[0];
    }
    return this.getFallbackDescriptor(input.isBinary);
  }

  public getDescriptor(id: string): RendererDescriptor | undefined {
    return this.descriptors.find(d => d.id === id);
  }

  public listAll(): readonly RendererDescriptor[] {
    return this.descriptors;
  }

  public clear(): void {
    this.descriptors = [];
    this.fallbackTextDescriptor = undefined;
    this.fallbackBinaryDescriptor = undefined;
  }
}
