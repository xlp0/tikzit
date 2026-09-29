/**
 * HypermediaRenderer: Satori Hypermedia Card & Viewlet Generator
 *
 * Renders HTML and ASCII representations for DAGs, diffs, and explorer viewlets.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type {
  SatoriVersionDagElement,
  SatoriDiffViewElement,
  SatoriExplorerElement
} from './types';

export class HypermediaRenderer {
  public renderDagAscii(dag: SatoriVersionDagElement): string {
    const lines: string[] = [
      `* DAG for ${dag.attrs.handle} (HEAD: ${dag.attrs.headCommit.slice(0, 8)})`
    ];

    for (let i = 0; i < dag.children.length; i++) {
      const c = dag.children[i].attrs;
      const isLast = i === dag.children.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}[${c.id.slice(0, 8)}] ${c.message} (${c.authorDid})`);
    }

    return lines.join('\n');
  }

  public renderDiffHtml(diff: SatoriDiffViewElement): string {
    const a = diff.attrs;
    const hunkHtml = diff.content
      .split('\n')
      .map(line => {
        if (line.startsWith('+')) {
          return `<div class="diff-line diff-add" style="background:#e6ffec;color:#1a7f37;">${this.escape(line)}</div>`;
        }
        if (line.startsWith('-')) {
          return `<div class="diff-line diff-del" style="background:#ffebe9;color:#cf222e;">${this.escape(line)}</div>`;
        }
        return `<div class="diff-line diff-ctx" style="color:#57609a;">${this.escape(line)}</div>`;
      })
      .join('\n');

    return `
<div class="satori-diff-card" data-handle="${this.escape(a.handle)}">
  <div class="satori-diff-header" style="font-weight:bold;margin-bottom:8px;">
    <span>${this.escape(a.handle)}</span>
    <span class="diff-badge" style="margin-left:8px;padding:2px 6px;border-radius:4px;background:#ddf4ff;">
      +${a.additions} -${a.deletions}
    </span>
  </div>
  <pre class="satori-diff-body" style="font-family:monospace;padding:8px;background:#f6f8fa;border-radius:6px;overflow-x:auto;">
${hunkHtml}
  </pre>
</div>
`.trim();
  }

  public renderExplorerHtml(explorer: SatoriExplorerElement): string {
    const a = explorer.attrs;
    const items = explorer.children ?? [];
    const itemRows = items
      .map(item => {
        const ia = item.attrs;
        return `
    <li class="mcard-explorer-item" data-handle="${this.escape(ia.handle)}" data-hash="${this.escape(ia.hash)}" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;">
      <span class="mcard-handle" style="font-weight:500;">${this.escape(ia.handle)}</span>
      <span class="mcard-hash" style="font-family:monospace;color:#666;">${ia.hash.slice(0, 12)}</span>
    </li>
        `.trim();
      })
      .join('\n');

    return `
<div class="satori-explorer-viewlet" data-query="${this.escape(a.query ?? '')}">
  <div class="satori-explorer-header" style="font-weight:bold;padding-bottom:6px;border-bottom:2px solid #ddd;">
    MCard Corpus (${items.length} cards)
  </div>
  <ul class="satori-explorer-list" style="list-style:none;padding:0;margin:0;">
${itemRows}
  </ul>
</div>
`.trim();
  }

  public renderCardBadge(handle: string, hash: string): string {
    return `<span class="mcard-badge" data-handle="${this.escape(handle)}" style="display:inline-block;padding:2px 8px;background:#f0f3f6;border:1px solid #d0d7de;border-radius:12px;font-size:12px;"><span style="font-weight:600;">${this.escape(handle)}</span> @ <code>${hash.slice(0, 8)}</code></span>`;
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
