/** @layer L4 interface/membrane */
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class TikzStructureProvider implements CardStructureProvider {
  public readonly id = 'tikz';

  public appliesTo(handle: string, mimeType?: string): boolean {
    return (
      mimeType === 'text/x-tikz' ||
      mimeType === 'text/plain' && handle.endsWith('.tikz') ||
      handle.endsWith('.tikz')
    );
  }

  public deriveStructure(input: CardStructureInput): readonly StructureNode[] {
    const raw = input.text || (input.content ? new TextDecoder().decode(input.content) : '');
    if (!raw.trim()) return [];

    const nodes: StructureNode[] = [];
    const lines = raw.split('\n');

    let nodeIdx = 0;
    let edgeIdx = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('\\node')) {
        nodeIdx++;
        const match = trimmed.match(/\\node(?:\[[^\]]*\])?\s*\(([^)]+)\)/);
        const name = match ? match[1] : `node_${nodeIdx}`;
        nodes.push({
          id: `node:${name}`,
          label: `Node (${name})`,
          kind: 'node'
        });
      } else if (trimmed.startsWith('\\draw')) {
        edgeIdx++;
        const match = trimmed.match(/\(([^)]+)\)\s*(?:--|to)\s*\(([^)]+)\)/);
        const label = match ? `${match[1]} -> ${match[2]}` : `Edge ${edgeIdx}`;
        nodes.push({
          id: `edge:${edgeIdx}`,
          label,
          kind: 'edge'
        });
      }
    }

    return nodes;
  }
}
