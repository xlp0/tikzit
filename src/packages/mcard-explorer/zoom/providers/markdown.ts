/** @layer L4 interface/membrane */
import type { CardStructureProvider, CardStructureInput, StructureNode } from '../types';

export class MarkdownStructureProvider implements CardStructureProvider {
  public readonly id = 'markdown';

  public appliesTo(handle: string, mimeType?: string): boolean {
    return (
      mimeType === 'text/markdown' ||
      mimeType === 'text/plain' && handle.endsWith('.md') ||
      handle.endsWith('.md')
    );
  }

  public deriveStructure(input: CardStructureInput): readonly StructureNode[] {
    const raw = input.text || (input.content ? new TextDecoder().decode(input.content) : '');
    if (!raw.trim()) return [];

    const nodes: StructureNode[] = [];
    const lines = raw.split('\n');

    let sectionIdx = 0;
    let codeBlockIdx = 0;
    let inCodeBlock = false;
    let codeBlockLang = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockIdx++;
          codeBlockLang = trimmed.slice(3).trim();
          nodes.push({
            id: `code:${codeBlockIdx}`,
            label: codeBlockLang ? `Code (${codeBlockLang})` : `Code Block ${codeBlockIdx}`,
            kind: 'element',
            meta: { lang: codeBlockLang }
          });
        }
        continue;
      }

      if (!inCodeBlock && trimmed.startsWith('#')) {
        sectionIdx++;
        const title = trimmed.replace(/^#+\s*/, '');
        nodes.push({
          id: `section:${sectionIdx}`,
          label: title,
          kind: 'section'
        });
      }
    }

    return nodes;
  }
}
