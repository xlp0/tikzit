/** @layer L4 interface/membrane */
import type { PetriNetTopology } from 'clm-kernel';
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class PcardStructureProvider implements CardStructureProvider {
  public readonly id = 'pcard';

  public appliesTo(handle: string, mimeType?: string): boolean {
    return (
      mimeType === 'application/vnd.pcard+json' ||
      handle.endsWith('.pcard.json') ||
      handle.startsWith('clm:pcard:')
    );
  }

  public deriveStructure(input: CardStructureInput): readonly StructureNode[] {
    const raw = input.text || (input.content ? new TextDecoder().decode(input.content) : '');
    if (!raw.trim()) return [];

    try {
      const net = JSON.parse(raw) as Partial<PetriNetTopology>;
      const nodes: StructureNode[] = [];

      if (Array.isArray(net.places)) {
        for (const p of net.places) {
          nodes.push({
            id: `place:${p.id}`,
            label: (p as { label?: string }).label || p.id,
            kind: 'place',
            meta: { tokens: (p as { tokens?: number }).tokens ?? 0 }
          });
        }
      }

      if (Array.isArray(net.transitions)) {
        for (const t of net.transitions) {
          nodes.push({
            id: `transition:${t.id}`,
            label: (t as { label?: string }).label || t.id,
            kind: 'transition'
          });
        }
      }

      if (Array.isArray(net.arcs)) {
        for (const a of net.arcs) {
          nodes.push({
            id: `arc:${a.source}->${a.target}`,
            label: `${a.source} -> ${a.target}`,
            kind: 'edge'
          });
        }
      }

      return nodes;
    } catch {
      return [];
    }
  }
}
