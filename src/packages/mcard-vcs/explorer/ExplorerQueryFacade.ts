/**
 * ExplorerQueryFacade: Headless MCard Explorer Query Facade
 *
 * Exposes plain serializable DTOs for React panels, CLI, and multi-agent systems.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../storage/OperadicMCardVfs';
import { MCardVcsEngine } from '../vcs/MCardVcsEngine';
import type { SemanticDiffResult } from '../vcs/types/commit';

export interface ExplorerSearchFilter {
  pattern?: string;
  mimeType?: string;
  limit?: number;
}

export interface ExplorerCardSummaryDto {
  handle: string;
  hash: string;
  mimeType: string;
  updatedAt: string;
}

export interface ExplorerHistoryEntryDto {
  hash: string;
  changedAt: string;
  authorDid: string;
  message: string;
  position?: number;
  isHead?: boolean;
}

export class ExplorerQueryFacade {
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
      SELECT h.handle, h.hash, h.updated_at, c.mime_type
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
    }>('mcard', sql, params);

    return rows.map(r => ({
      handle: r.handle,
      hash: r.hash,
      mimeType: r.mime_type,
      updatedAt: r.updated_at
    }));
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
    // Ensure clean JSON serializability without circular references or prototypes
    return JSON.parse(JSON.stringify(diffResult));
  }

  public subscribe(cb: (event: any) => void): () => void {
    return this.storage.on('*', cb);
  }
}
