/** @layer L4 interface/membrane */
import { parsePortableSqlite } from 'clm-kernel';
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class SqliteStructureProvider implements CardStructureProvider {
  public readonly id = 'sqlite';

  public appliesTo(handle: string, mimeType?: string): boolean {
    return (
      mimeType === 'application/x-sqlite3' ||
      mimeType === 'application/vnd.sqlite3' ||
      handle.endsWith('.db') ||
      handle.endsWith('.sqlite')
    );
  }

  public async deriveStructure(input: CardStructureInput): Promise<readonly StructureNode[]> {
    if (!input.content || input.content.length === 0) return [];

    try {
      const parsed = await parsePortableSqlite(input.content);
      const nodes: StructureNode[] = [];

      // 1. Contained cards
      if (parsed.cards && Array.isArray(parsed.cards)) {
        for (const card of parsed.cards) {
          if (card && card.handle) {
            nodes.push({
              id: `card:${card.handle}`,
              label: card.handle,
              kind: 'card',
              handle: card.handle,
              meta: {
                hash: card.hash,
                mimeType: card.mime_type,
                createdAt: card.created_at
              }
            });
          }
        }
      }

      // 2. Tables
      if (parsed.tables && Array.isArray(parsed.tables)) {
        for (const table of parsed.tables) {
          nodes.push({
            id: `table:${table}`,
            label: `Table: ${table}`,
            kind: 'table'
          });
        }
      }

      return nodes;
    } catch {
      return [];
    }
  }
}
