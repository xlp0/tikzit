/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';
import type { CardPortProvider, CardPortInput, CardPort } from '../ports';

export class PcardProcessPortProvider implements CardPortProvider {
  public readonly id = 'pcard';

  public appliesTo(j: TypeJudgment, handle: string): boolean {
    const mime = j.mime || (j as { mimeType?: string }).mimeType || '';
    return (
      mime === 'application/vnd.pcard+json' ||
      j.universe === 'U1' ||
      handle.startsWith('clm:pcard:')
    );
  }

  public derivePorts(_input: CardPortInput): readonly CardPort[] {
    return [
      {
        id: 'in:token',
        direction: 'in',
        type: { mime: 'application/json', universe: 'U1', arity: 'many' },
        label: 'Input Token',
        required: true
      },
      {
        id: 'out:token',
        direction: 'out',
        type: { mime: 'application/json', universe: 'U1', arity: 'many' },
        label: 'Output Token',
        required: false
      }
    ];
  }
}
