/**
 * ExplorerQueryFacade: Headless MCard Explorer Query Facade
 *
 * Implements ExplorerDataSource and CardContentProvider ports (ADR D42).
 * Exposes plain serializable DTOs for React panels, CLI, and multi-agent systems.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type {
  ExplorerDataSource,
  CardContentDto,
  CardContentProvider,
  ExplorerCardSummaryDto,
  ExplorerSearchFilter,
  ExplorerHistoryEntryDto
} from '@clm/mcard-explorer';
import { OperadicMCardVfs } from '../storage/OperadicMCardVfs';
import { MCardVcsEngine } from '../vcs/MCardVcsEngine';
import type { SemanticDiffResult } from '../vcs/types/commit';

export type {
  ExplorerDataSource,
  CardContentDto,
  CardContentProvider,
  ExplorerCardSummaryDto,
  ExplorerSearchFilter,
  ExplorerHistoryEntryDto
};

export class ExplorerQueryFacade implements ExplorerDataSource, CardContentProvider {
  constructor(
    private storage: OperadicMCardVfs,
    private vcs?: MCardVcsEngine
  ) {}

  public async listHandles(prefix?: string): Promise<string[]> {
    const handles = await this.storage.listHandles(prefix);
    return Array.from(handles);
  }

  public async search(filter: ExplorerSearchFilter = {}): Promise<ExplorerCardSummaryDto[]> {
    const vfs = this.storage.getVfs();
    let sql = `
      SELECT h.handle, h.hash, h.updated_at, c.mime_type, c.metadata
      FROM handles h
      JOIN cards c ON h.hash = c.hash
    `;
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    if (filter.pattern) {
      whereClauses.push('(h.handle LIKE ? OR c.hash LIKE ? OR CAST(c.content AS TEXT) LIKE ?)');
      params.push(`%${filter.pattern}%`, `%${filter.pattern}%`, `%${filter.pattern}%`);
    }
    if (filter.mimeType) {
      whereClauses.push('c.mime_type = ?');
      params.push(filter.mimeType);
    }
    if (filter.universe) {
      whereClauses.push('(json_valid(c.metadata) = 1 AND json_extract(c.metadata, "$.universe") = ?)');
      params.push(filter.universe);
    }
    if (filter.category) {
      whereClauses.push('(json_valid(c.metadata) = 1 AND (json_extract(c.metadata, "$.category") = ? OR json_extract(c.metadata, "$.clmCategory") = ?))');
      params.push(filter.category, filter.category);
    }
    if (filter.payloadKind) {
      whereClauses.push('(json_valid(c.metadata) = 1 AND json_extract(c.metadata, "$.payloadKind") = ?)');
      params.push(filter.payloadKind);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY h.updated_at DESC';
    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    const rows = await vfs.query<{
      handle: string;
      hash: string;
      updated_at: string;
      mime_type: string;
      metadata: string | null;
    }>('mcard', sql, params);

    return rows.map(r => {
      let meta: Record<string, any> | undefined;
      if (r.metadata) {
        try { meta = JSON.parse(r.metadata); } catch { /* ignore */ }
      }
      const tj = meta?.typeJudgment;
      return {
        handle: r.handle,
        hash: r.hash,
        mimeType: r.mime_type,
        updatedAt: r.updated_at,
        universe: meta?.universe || tj?.universe,
        universeName: meta?.universeName || tj?.universeName,
        category: meta?.category || tj?.category,
        clmCategory: meta?.clmCategory || tj?.clmCategory,
        payloadKind: meta?.payloadKind,
        isBinary: tj?.isBinary,
        confidence: tj?.confidence,
        fndClassification: tj?.fndClassification
      };
    });
  }

  public async getContent(handle: string): Promise<CardContentDto | null> {
    return await this.storage.getContent(handle);
  }

  public async getHistory(handle: string): Promise<ExplorerHistoryEntryDto[]> {
    if (!this.vcs) {
      const history = await this.storage.getHandleHistory(handle);
      return history.map((h, i) => ({
        hash: h.hash,
        changedAt: h.changedAt,
        authorDid: h.authorDid,
        message: h.message,
        position: i,
        isHead: i === 0
      }));
    }
    const history = await this.vcs.getMCardHashHistory(handle);
    return history.map(h => ({
      hash: h.hash,
      changedAt: h.changedAt,
      authorDid: h.authorDid,
      message: h.message,
      ...(h.position !== undefined ? { position: h.position } : {}),
      ...(h.isHead !== undefined ? { isHead: h.isHead } : {})
    }));
  }

  public async describeDiff(
    handle: string,
    baseRef: string,
    targetRef: string
  ): Promise<SemanticDiffResult> {
    if (!this.vcs) throw new Error('VCS engine required for diff');
    const diffResult = await this.vcs.diff(handle, baseRef, targetRef);
    return JSON.parse(JSON.stringify(diffResult));
  }

  public subscribe(cb: (event: any) => void): () => void {
    return this.storage.on('*', cb);
  }
}
