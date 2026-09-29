/** @layer L4 interface/membrane */
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class JsonYamlStructureProvider implements CardStructureProvider {
  public readonly id = 'json';

  public appliesTo(handle: string, mimeType?: string): boolean {
    return (
      mimeType === 'application/json' ||
      mimeType === 'text/yaml' ||
      mimeType === 'application/x-yaml' ||
      handle.endsWith('.json') ||
      handle.endsWith('.yaml') ||
      handle.endsWith('.yml')
    );
  }

  public deriveStructure(input: CardStructureInput): readonly StructureNode[] {
    const raw = input.text || (input.content ? new TextDecoder().decode(input.content) : '');
    if (!raw.trim()) return [];

    try {
      const data = JSON.parse(raw);
      const nodes: StructureNode[] = [];

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          nodes.push({
            id: `item:${i}`,
            label: `Item [${i}]`,
            kind: 'element'
          });
        }
      } else if (typeof data === 'object' && data !== null) {
        for (const [key, val] of Object.entries(data)) {
          const isObj = typeof val === 'object' && val !== null;
          nodes.push({
            id: `key:${key}`,
            label: `${key}: ${isObj ? (Array.isArray(val) ? `[${val.length}]` : '{...}') : String(val)}`,
            kind: isObj ? 'record' : 'field'
          });
        }
      }

      return nodes;
    } catch {
      // Fallback for simple YAML lines: key: value
      const lines = raw.split('\n');
      const nodes: StructureNode[] = [];
      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (match) {
          nodes.push({
            id: `field:${match[1]}`,
            label: `${match[1]}: ${match[2] || '...'}`,
            kind: 'field'
          });
        }
      }
      return nodes;
    }
  }
}
