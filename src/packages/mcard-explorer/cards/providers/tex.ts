/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';
import type { CardPortProvider, CardPortInput, CardPort } from '../ports';

export class TexPortProvider implements CardPortProvider {
  public readonly id = 'tex';

  public appliesTo(j: TypeJudgment, handle: string): boolean {
    const mime = j.mime || (j as { mimeType?: string }).mimeType || '';
    return (
      mime === 'application/x-latex' ||
      mime === 'text/x-latex' ||
      handle.endsWith('.tex')
    );
  }

  public derivePorts(_input: CardPortInput): readonly CardPort[] {
    return [
      {
        id: 'in:source',
        direction: 'in',
        type: { mime: 'application/x-latex', universe: 'U0', arity: 'one' },
        label: 'LaTeX Source',
        required: true
      },
      {
        id: 'out:pdf',
        direction: 'out',
        type: { mime: 'application/pdf', universe: 'U0', arity: 'one' },
        label: 'Compiled PDF',
        required: false
      }
    ];
  }
}
