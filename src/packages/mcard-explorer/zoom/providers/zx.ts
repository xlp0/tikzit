/** @layer L4 interface/membrane */
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class ZxGraphStructureProvider implements CardStructureProvider {
  public readonly id = 'zx';

  public appliesTo(handle: string, mimeType?: string): boolean {
    return (
      mimeType === 'application/vnd.zx-graph+json' ||
      handle.endsWith('.zx.json') ||
      (handle.startsWith('zx:diagrams:') && !handle.endsWith('.tikz'))
    );
  }

  public deriveStructure(input: CardStructureInput): readonly StructureNode[] {
    const raw = input.text || (input.content ? new TextDecoder().decode(input.content) : '');
    if (!raw.trim()) return [];

    try {
      const graph = JSON.parse(raw);
      const nodes: StructureNode[] = [];
      const spiders = graph.spiders || graph.nodes || [];

      if (Array.isArray(spiders)) {
        for (const s of spiders) {
          nodes.push({
            id: `node:${s.id}`,
            label: `${s.spider_type || 'Spider'} (${s.id})`,
            kind: 'node',
            meta: { phase: s.phase, position: s.position }
          });
        }
      }

      if (Array.isArray(graph.edges)) {
        for (const e of graph.edges) {
          nodes.push({
            id: `edge:${e.source}->${e.target}`,
            label: `${e.source} -> ${e.target}`,
            kind: 'edge',
            meta: { hadamard: e.hadamard }
          });
        }
      }

      return nodes;
    } catch {
      return [];
    }
  }
}
