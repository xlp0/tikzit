/** @layer L4 interface/membrane */
import type { TypeJudgment } from 'clm-kernel';
import type { CardPortProvider, CardPortInput, CardPort } from '../ports';

export class TikzDiagramPortProvider implements CardPortProvider {
  public readonly id = 'tikz';

  public appliesTo(j: TypeJudgment, handle: string): boolean {
    const mime = j.mime || (j as { mimeType?: string }).mimeType || '';
    return (
      mime === 'text/x-tikz' ||
      mime === 'application/vnd.zx-graph+json' ||
      handle.endsWith('.tikz') ||
      handle.startsWith('zx:diagrams:')
    );
  }

  public derivePorts(_input: CardPortInput): readonly CardPort[] {
    return [
      {
        id: 'in:source',
        direction: 'in',
        type: { mime: 'text/x-tikz', universe: 'U0', arity: 'one' },
        label: 'TikZ Source',
        required: true
      },
      {
        id: 'out:render',
        direction: 'out',
        type: { mime: 'image/svg+xml', universe: 'U0', arity: 'one' },
        label: 'Render SVG',
        required: false
      },
      {
        id: 'out:tex',
        direction: 'out',
        type: { mime: 'application/x-latex', universe: 'U0', arity: 'one' },
        label: 'LaTeX Export',
        required: false
      }
    ];
  }
}
