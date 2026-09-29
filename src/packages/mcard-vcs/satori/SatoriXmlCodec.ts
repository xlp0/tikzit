/**
 * SatoriXmlCodec: Satori Protocol XML Parser & Serializer
 *
 * Implements bidirectional AST serialization for VCS and MCard Explorer.
 * Zero DOM (DOMParser) dependencies. Contract D ceiling: <= 250 LOC.
 */

import type {
  SatoriCardElement,
  SatoriCommitElement,
  SatoriVersionDagElement,
  SatoriDiffViewElement,
  SatoriExplorerElement,
  SatoriExplorerItemElement
} from './types';

export class SatoriXmlCodec {
  public escapeAttr(val: any): string {
    if (val === undefined || val === null) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  public escapeContent(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  public unescape(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  public serializeCard(card: SatoriCardElement): string {
    const { hash, handle, type, readonly } = card.attrs;
    let attrs = `hash="${this.escapeAttr(hash)}" handle="${this.escapeAttr(handle)}"`;
    if (type) attrs += ` type="${this.escapeAttr(type)}"`;
    if (readonly !== undefined) attrs += ` readonly="${readonly}"`;
    return `<card ${attrs} />`;
  }

  public serializeCommit(commit: SatoriCommitElement): string {
    const { id, parent, authorDid, date, message } = commit.attrs;
    let attrs = `id="${this.escapeAttr(id)}" authorDid="${this.escapeAttr(authorDid)}" date="${this.escapeAttr(date)}" message="${this.escapeAttr(message)}"`;
    if (parent) attrs += ` parent="${this.escapeAttr(parent)}"`;
    return `<commit ${attrs} />`;
  }

  public serializeVersionDag(dag: SatoriVersionDagElement): string {
    const { handle, headCommit, branch } = dag.attrs;
    let attrs = `handle="${this.escapeAttr(handle)}" headCommit="${this.escapeAttr(headCommit)}"`;
    if (branch) attrs += ` branch="${this.escapeAttr(branch)}"`;

    const children = dag.children.map(c => `  ${this.serializeCommit(c)}`).join('\n');
    return `<version-dag ${attrs}>\n${children}\n</version-dag>`;
  }

  public serializeDiffView(diff: SatoriDiffViewElement): string {
    const { handle, base, target, additions, deletions } = diff.attrs;
    const attrs = `handle="${this.escapeAttr(handle)}" base="${this.escapeAttr(base)}" target="${this.escapeAttr(target)}" additions="${additions}" deletions="${deletions}"`;
    return `<diff-view ${attrs}>\n${this.escapeContent(diff.content)}\n</diff-view>`;
  }

  public serializeExplorer(explorer: SatoriExplorerElement): string {
    const { query, facet, activeHandle, limit, view } = explorer.attrs;
    const attrParts: string[] = [];
    if (query) attrParts.push(`query="${this.escapeAttr(query)}"`);
    if (facet) attrParts.push(`facet="${this.escapeAttr(facet)}"`);
    if (activeHandle) attrParts.push(`activeHandle="${this.escapeAttr(activeHandle)}"`);
    if (limit) attrParts.push(`limit="${limit}"`);
    if (view) attrParts.push(`view="${view}"`);

    const attrStr = attrParts.length > 0 ? ' ' + attrParts.join(' ') : '';
    if (!explorer.children || explorer.children.length === 0) {
      return `<mcard-explorer${attrStr} />`;
    }

    const items = explorer.children.map(item => {
      const a = item.attrs;
      let itemAttrs = `handle="${this.escapeAttr(a.handle)}" hash="${this.escapeAttr(a.hash)}"`;
      if (a.mimeType) itemAttrs += ` mimeType="${this.escapeAttr(a.mimeType)}"`;
      if (a.mcardType) itemAttrs += ` mcardType="${a.mcardType}"`;
      if (a.facet) itemAttrs += ` facet="${this.escapeAttr(a.facet)}"`;
      if (a.selected) itemAttrs += ` selected="${a.selected}"`;
      return `  <mcard-item ${itemAttrs} />`;
    }).join('\n');

    return `<mcard-explorer${attrStr}>\n${items}\n</mcard-explorer>`;
  }

  public parseAttrs(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const regex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(attrStr)) !== null) {
      attrs[match[1]] = this.unescape(match[2]);
    }
    return attrs;
  }

  public parseXml(xml: string): any {
    const trimmed = xml.trim();

    if (trimmed.startsWith('<card')) {
      const match = /<card\s+([^>]*)\s*\/?>/.exec(trimmed);
      return { tag: 'card', attrs: match ? this.parseAttrs(match[1]) : {} };
    }

    if (trimmed.startsWith('<commit')) {
      const match = /<commit\s+([^>]*)\s*\/?>/.exec(trimmed);
      return { tag: 'commit', attrs: match ? this.parseAttrs(match[1]) : {} };
    }

    if (trimmed.startsWith('<version-dag')) {
      const tagMatch = /<version-dag\s+([^>]*)>([\s\S]*?)<\/version-dag>/.exec(trimmed);
      if (!tagMatch) return null;
      const attrs = this.parseAttrs(tagMatch[1]);
      const body = tagMatch[2];
      const commits: SatoriCommitElement[] = [];
      const commitRegex = /<commit\s+([^>]*)\s*\/?>/g;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = commitRegex.exec(body)) !== null) {
        commits.push({ tag: 'commit', attrs: this.parseAttrs(cMatch[1]) as any });
      }
      return { tag: 'version-dag', attrs, children: commits };
    }

    if (trimmed.startsWith('<diff-view')) {
      const match = /<diff-view\s+([^>]*)>([\s\S]*?)<\/diff-view>/.exec(trimmed);
      if (!match) return null;
      const attrs = this.parseAttrs(match[1]);
      return {
        tag: 'diff-view',
        attrs: {
          ...attrs,
          additions: parseInt(attrs.additions ?? '0', 10),
          deletions: parseInt(attrs.deletions ?? '0', 10)
        },
        content: this.unescape(match[2].trim())
      };
    }

    if (trimmed.startsWith('<mcard-explorer')) {
      const match = /<mcard-explorer\s*([^>]*)>([\s\S]*?)<\/mcard-explorer>/.exec(trimmed);
      if (!match) {
        const selfClose = /<mcard-explorer\s*([^>]*)\s*\/>/.exec(trimmed);
        return { tag: 'mcard-explorer', attrs: selfClose ? this.parseAttrs(selfClose[1]) : {}, children: [] };
      }
      const attrs = this.parseAttrs(match[1]);
      const body = match[2];
      const items: SatoriExplorerItemElement[] = [];
      const itemRegex = /<mcard-item\s+([^>]*)\s*\/?>/g;
      let iMatch: RegExpExecArray | null;
      while ((iMatch = itemRegex.exec(body)) !== null) {
        items.push({ tag: 'mcard-item', attrs: this.parseAttrs(iMatch[1]) as any });
      }
      return { tag: 'mcard-explorer', attrs, children: items };
    }

    return null;
  }
}
