/** @layer L4 interface/membrane */
import { parseSatoriXml, type SatoriElement } from 'clm-kernel';
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class SatoriStructureProvider implements CardStructureProvider {
  public readonly id = 'satori';

  public appliesTo(handle: string, mimeType?: string): boolean {
    return (
      mimeType === 'application/vnd.satori.turn+xml' ||
      handle.endsWith('.satori.xml') ||
      handle.startsWith('satori:')
    );
  }

  public deriveStructure(input: CardStructureInput): readonly StructureNode[] {
    const raw = input.text || (input.content ? new TextDecoder().decode(input.content) : '');
    if (!raw.trim()) return [];

    try {
      const inner = raw.replace(/<turn[^>]*>/i, '').replace(/<\/turn>/i, '').trim();
      const elements: readonly SatoriElement[] = parseSatoriXml(inner);
      const nodes: StructureNode[] = [];

      for (let i = 0; i < elements.length; i++) {
        const elem = elements[i];
        if (elem.type === 'text' && !elem.text?.trim()) continue;

        if (elem.type === 'card') {
          nodes.push({
            id: `satori:card:${i}`,
            label: elem.handle || 'Embedded Card',
            kind: 'card',
            handle: elem.handle,
            meta: { cardType: elem.cardType }
          });
        } else if ((elem.type as string) === 'message') {
          nodes.push({
            id: `satori:msg:${i}`,
            label: 'Message',
            kind: 'section'
          });
        } else {
          nodes.push({
            id: `satori:elem:${i}`,
            label: elem.type,
            kind: 'element'
          });
        }
      }

      return nodes;
    } catch {
      return [];
    }
  }
}
