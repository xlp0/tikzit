/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';
import type { CardPortProvider, CardPortInput, CardPort } from '../ports';

export class SqliteCollectionPortProvider implements CardPortProvider {
  public readonly id = 'sqlite';

  public appliesTo(j: TypeJudgment, handle: string): boolean {
    const mime = j.mime || (j as { mimeType?: string }).mimeType || '';
    return (
      mime === 'application/x-sqlite3' ||
      mime === 'application/vnd.sqlite3' ||
      handle.endsWith('.db') ||
      handle.endsWith('.sqlite')
    );
  }

  public derivePorts(_input: CardPortInput): readonly CardPort[] {
    return [
      {
        id: 'in:card',
        direction: 'in',
        type: { mime: 'application/octet-stream', universe: 'U2', arity: 'many' },
        label: 'Store Card',
        required: false
      },
      {
        id: 'out:card',
        direction: 'out',
        type: { mime: 'application/octet-stream', universe: 'U2', arity: 'many' },
        label: 'Contained Cards',
        required: false
      }
    ];
  }
}
