/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';
import type { CardPortProvider, CardPortInput, CardPort } from '../ports';

export class PdfPortProvider implements CardPortProvider {
  public readonly id = 'pdf';

  public appliesTo(j: TypeJudgment, handle: string): boolean {
    const mime = j.mime || (j as { mimeType?: string }).mimeType || '';
    return mime === 'application/pdf' || handle.endsWith('.pdf');
  }

  public derivePorts(_input: CardPortInput): readonly CardPort[] {
    return [
      {
        id: 'out:artifact',
        direction: 'out',
        type: { mime: 'application/pdf', universe: 'U0', arity: 'one' },
        label: 'PDF Document',
        required: false
      }
    ];
  }
}
