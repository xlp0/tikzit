/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';
import type { CardPortProvider, CardPortInput, CardPort } from '../ports';

export class ImagePortProvider implements CardPortProvider {
  public readonly id = 'image';

  public appliesTo(j: TypeJudgment, handle: string): boolean {
    const mime = j.mime || (j as { mimeType?: string }).mimeType || '';
    return (
      mime === 'image/png' ||
      mime === 'image/svg+xml' ||
      mime === 'image/jpeg' ||
      mime.startsWith('image/') ||
      handle.endsWith('.png') ||
      handle.endsWith('.svg')
    );
  }

  public derivePorts(input: CardPortInput): readonly CardPort[] {
    const mime = input.judgment.mime || (input.judgment as { mimeType?: string }).mimeType || 'image/png';
    return [
      {
        id: 'out:artifact',
        direction: 'out',
        type: { mime, universe: 'U0', arity: 'one' },
        label: 'Image Artifact',
        required: false
      }
    ];
  }
}
