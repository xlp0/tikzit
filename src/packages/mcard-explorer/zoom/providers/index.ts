/** @layer L4 interface/membrane */
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';
import { SqliteStructureProvider } from './sqlite';
import { SatoriStructureProvider } from './satori';
import { PcardStructureProvider } from './pcard';
import { ZxGraphStructureProvider } from './zx';
import { TikzStructureProvider } from './tikz';
import { MarkdownStructureProvider } from './markdown';
import { JsonYamlStructureProvider } from './json';
import { HandleNamespaceProvider } from './namespace';

export class StructureRegistry {
  private providers: CardStructureProvider[] = [];

  public register(provider: CardStructureProvider): () => void {
    this.providers.unshift(provider);
    return () => {
      this.providers = this.providers.filter(p => p !== provider);
    };
  }

  public listProviders(): readonly CardStructureProvider[] {
    return this.providers;
  }

  public resolveProvider(handle: string, mimeType?: string): CardStructureProvider | null {
    for (const p of this.providers) {
      try {
        if (p.appliesTo(handle, mimeType)) {
          return p;
        }
      } catch {
        // fail closed
      }
    }
    return null;
  }

  public async deriveStructure(input: CardStructureInput): Promise<readonly StructureNode[]> {
    const provider = this.resolveProvider(input.handle, input.mimeType);
    if (!provider) return [];

    try {
      return await provider.deriveStructure(input);
    } catch {
      return [];
    }
  }
}

export function createDefaultStructureRegistry(): StructureRegistry {
  const reg = new StructureRegistry();
  reg.register(new HandleNamespaceProvider());
  reg.register(new JsonYamlStructureProvider());
  reg.register(new MarkdownStructureProvider());
  reg.register(new TikzStructureProvider());
  reg.register(new ZxGraphStructureProvider());
  reg.register(new PcardStructureProvider());
  reg.register(new SatoriStructureProvider());
  reg.register(new SqliteStructureProvider());
  return reg;
}

export * from './sqlite';
export * from './satori';
export * from './pcard';
export * from './zx';
export * from './tikz';
export * from './markdown';
export * from './json';
export * from './namespace';
