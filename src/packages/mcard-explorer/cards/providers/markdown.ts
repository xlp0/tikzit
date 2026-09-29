/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';
import type { CardPortProvider, CardPortInput, CardPort } from '../ports';

export class MarkdownPortProvider implements CardPortProvider {
  public readonly id = 'markdown';

  public appliesTo(j: TypeJudgment, handle: string): boolean {
    const mime = j.mime || (j as { mimeType?: string }).mimeType || '';
    return (
      mime === 'text/markdown' ||
      mime === 'text/plain' ||
      mime === 'application/json' ||
      handle.endsWith('.md') ||
      handle.endsWith('.txt') ||
      handle.endsWith('.json')
    );
  }

  public derivePorts(input: CardPortInput): readonly CardPort[] {
    const mime = input.judgment.mime || (input.judgment as { mimeType?: string }).mimeType || 'text/markdown';
    return [
      {
        id: 'out:data',
        direction: 'out',
        type: { mime, universe: 'U0', arity: 'one' },
        label: 'Text Data',
        required: false
      }
    ];
  }
}
