/** @layer L4 interface/membrane */
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class HandleNamespaceProvider implements CardStructureProvider {
  public readonly id = 'namespace';

  public appliesTo(handle: string): boolean {
    return handle.includes(':');
  }

  public async deriveStructure(input: CardStructureInput): Promise<readonly StructureNode[]> {
    if (input.listHandles) {
      try {
        const prefix = input.handle.endsWith(':') ? input.handle : `${input.handle}:`;
        const handles = await input.listHandles(prefix);
        return handles.map(h => ({
          id: `ns:${h}`,
          label: h.slice(prefix.length) || h,
          kind: 'card',
          handle: h
        }));
      } catch {
        // fallback to segment splitting
      }
    }

    const segments = input.handle.split(':').filter(Boolean);
    if (segments.length <= 1) return [];

    const nodes: StructureNode[] = [];
    let acc = '';
    for (let i = 0; i < segments.length - 1; i++) {
      acc = acc ? `${acc}:${segments[i]}` : segments[i];
      nodes.push({
        id: `ns:${acc}`,
        label: segments[i],
        kind: 'element',
        meta: { prefix: acc }
      });
    }

    return nodes;
  }
}
