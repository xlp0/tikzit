/**
 * OperadicMCardVfs: Unified Operadic Virtual File System
 *
 * Implements bidirectional Conversational Lenses (S ⊣ G) and Dispatch/Callback
 * event wiring, grounded on clm-kernel and sovereign TriDatabase pillars.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type { StorageVFS, TriDatabasePillar, VfsOptions } from './vfs/types';
import { MemoryStorageVFS } from './vfs/MemoryStorageVFS';
import { IndexedDbStorageVFS } from './vfs/IndexedDbStorageVFS';
import { NodeFsStorageVFS } from './vfs/NodeFsStorageVFS';
import { ContentHasher } from './hash/ContentHasher';
import { VfsEventBus } from './events/VfsEventBus';
import { SavepointGuard } from './kernel/SavepointGuard';
import { CardTypeJudgeService } from '../type/CardTypeJudgeService';
import type {
  ConversationalLens,
  CardView,
  SetCardOptions,
  LensLawVerificationResult
} from './lens/types';

export class OperadicMCardVfs {
  private hasher = new ContentHasher();
  private eventBus = new VfsEventBus();
  private savepoints: SavepointGuard;
  private judgeService = new CardTypeJudgeService();

  constructor(private vfs: StorageVFS) {
    this.savepoints = new SavepointGuard(vfs, this.eventBus);
  }

  public static async createOptimal(options: VfsOptions = {}): Promise<OperadicMCardVfs> {
    let backend: StorageVFS;
    if (options.backend === 'node-fs' && options.dbPath) {
      backend = new NodeFsStorageVFS(options.dbPath);
    } else if (options.backend === 'indexeddb') {
      backend = new IndexedDbStorageVFS();
    } else if (typeof process !== 'undefined' && options.dbPath) {
      backend = new NodeFsStorageVFS(options.dbPath);
    } else {
      backend = new MemoryStorageVFS();
    }

    if ('init' in backend && typeof (backend as any).init === 'function') {
      await (backend as any).init();
    }

    return new OperadicMCardVfs(backend);
  }

  public getVfs(): StorageVFS {
    return this.vfs;
  }

  private mapCardRow(handle: string, hash: string, row: any, updatedAt: string): CardView {
    const rawBytes = row.content instanceof Uint8Array ? row.content : new Uint8Array(row.content);
    let parsedMetadata: Record<string, unknown> | undefined;
    if (row.metadata) {
      try { parsedMetadata = JSON.parse(row.metadata); } catch { /* ignore */ }
    }
    const userCompanion = parsedMetadata && '_userCompanion' in parsedMetadata
      ? (parsedMetadata._userCompanion as Record<string, unknown>)
      : parsedMetadata;
    const tj = parsedMetadata?.typeJudgment as any;
    return {
      handle, hash, content: rawBytes, text: new TextDecoder().decode(rawBytes),
      mimeType: row.mime_type, mcardType: row.mcard_type, companionMetadata: userCompanion, updatedAt,
      typeJudgment: tj,
      universe: (parsedMetadata?.universe as string) || tj?.universe || 'U0',
      category: (parsedMetadata?.category as string) || tj?.category,
      clmCategory: (parsedMetadata?.clmCategory as any) || tj?.clmCategory,
      payloadKind: parsedMetadata?.payloadKind as any
    };
  }

  public async get(handle: string): Promise<CardView | null> {
    const handleRows = await this.vfs.query<{ hash: string; updated_at: string }>(
      'mcard', 'SELECT hash, updated_at FROM handles WHERE handle = ? LIMIT 1;', [handle]
    );
    if (!handleRows || handleRows.length === 0) return null;
    const { hash, updated_at } = handleRows[0];
    const cardRows = await this.vfs.query<any>(
      'mcard', 'SELECT content, mime_type, mcard_type, metadata FROM cards WHERE hash = ? LIMIT 1;', [hash]
    );
    if (!cardRows || cardRows.length === 0) return null;
    return this.mapCardRow(handle, hash, cardRows[0], updated_at);
  }

  public async getContent(handle: string) {
    const card = await this.get(handle);
    if (!card) return null;
    return {
      handle: card.handle, hash: card.hash, content: card.content, text: card.text,
      mimeType: card.mimeType, payloadKind: card.payloadKind as any,
      typeJudgment: card.typeJudgment, metadata: card.companionMetadata
    };
  }

  public async getByHash(hash: string): Promise<CardView | null> {
    const rows = await this.vfs.query<any>(
      'mcard', 'SELECT content, mime_type, mcard_type, metadata, created_at FROM cards WHERE hash = ? LIMIT 1;', [hash]
    );
    if (!rows || rows.length === 0) return null;
    return this.mapCardRow('', hash, rows[0], rows[0].created_at);
  }

  public async putCard(
    content: Uint8Array | string,
    mimeType?: string,
    mcardType = 2,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const hash = this.hasher.hash(bytes);
    const now = new Date().toISOString();
    const judgment = this.judgeService.judge({
      data: bytes,
      declaredMime: mimeType && mimeType !== 'application/json' ? mimeType : undefined
    });
    const finalMime = mimeType ?? judgment.mime;
    const enrichedMeta = {
      ...(metadata || {}),
      universe: metadata?.universe ?? judgment.universe,
      universeName: metadata?.universeName ?? judgment.universeName,
      category: metadata?.category ?? judgment.category,
      clmCategory: metadata?.clmCategory ?? judgment.clmCategory,
      typeJudgment: metadata?.typeJudgment ?? judgment,
      ...(metadata ? { _userCompanion: metadata } : {})
    };
    await this.vfs.execute('mcard',
      'INSERT OR IGNORE INTO cards (hash, content, mime_type, mcard_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [hash, bytes, finalMime, mcardType, JSON.stringify(enrichedMeta), now]
    );
    return hash;
  }

  public async set(
    handle: string,
    content: string | Uint8Array,
    options: SetCardOptions = {}
  ): Promise<string> {
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const hash = this.hasher.hash(bytes);
    const now = new Date().toISOString();
    const judgment = this.judgeService.judge({ data: bytes, handle, declaredMime: options.mimeType });
    const mimeType = options.mimeType ?? judgment.mime;
    const mcardType = options.mcardType ?? 1;
    const enrichedMeta = {
      ...(options.companionMetadata || {}),
      universe: options.universe ?? options.companionMetadata?.universe ?? judgment.universe,
      universeName: options.companionMetadata?.universeName ?? judgment.universeName,
      category: options.category ?? options.companionMetadata?.category ?? judgment.category,
      clmCategory: options.clmCategory ?? options.companionMetadata?.clmCategory ?? judgment.clmCategory,
      typeJudgment: options.typeJudgment ?? options.companionMetadata?.typeJudgment ?? judgment,
      ...(options.companionMetadata ? { _userCompanion: options.companionMetadata } : {})
    };
    const metadataStr = JSON.stringify(enrichedMeta);
    const authorDid = options.authorDid ?? 'did:key:anonymous';

    await this.withSavepoint(`set_${handle}`, async () => {
      await this.vfs.execute('mcard',
        'INSERT OR IGNORE INTO cards (hash, content, mime_type, mcard_type, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        [hash, bytes, mimeType, mcardType, metadataStr, now]
      );
      await this.vfs.execute('mcard', 'INSERT OR REPLACE INTO handles (handle, hash, updated_at) VALUES (?, ?, ?);', [handle, hash, now]);
      await this.vfs.execute('mcard',
        'INSERT INTO handle_history (handle, hash, changed_at, author_did, message) VALUES (?, ?, ?, ?, ?);',
        [handle, hash, now, authorDid, 'Card updated via Operadic lens']
      );
    });

    await this.eventBus.dispatch('card:staged', { handle, hash, mimeType });
    return hash;
  }

  public on<T = any>(type: string, callback: (event: T) => void): () => void {
    return this.eventBus.on(type, callback);
  }

  public async withSavepoint<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return await this.savepoints.withSavepoint('mcard', name, fn);
  }

  public async listHandles(prefix?: string): Promise<string[]> {
    let sql = 'SELECT handle FROM handles';
    const params: unknown[] = [];
    if (prefix) {
      sql += ' WHERE handle LIKE ?';
      params.push(`${prefix}%`);
    }
    sql += ' ORDER BY handle ASC;';
    const rows = await this.vfs.query<{ handle: string }>('mcard', sql, params);
    return rows.map(r => r.handle);
  }

  public async has(handle: string): Promise<boolean> {
    return (await this.vfs.query('mcard', 'SELECT 1 FROM handles WHERE handle = ? LIMIT 1;', [handle])).length > 0;
  }

  public async delete(handle: string): Promise<boolean> {
    if (!(await this.has(handle))) return false;
    await this.vfs.execute('mcard', 'DELETE FROM handles WHERE handle = ?;', [handle]);
    await this.eventBus.dispatch('card:deleted', { handle });
    return true;
  }

  public async getHandleHistory(handle: string): Promise<Array<{ hash: string; changedAt: string; authorDid: string; message: string }>> {
    const rows = await this.vfs.query<{ hash: string; changed_at: string; author_did: string; message: string }>(
      'mcard', 'SELECT hash, changed_at, author_did, message FROM handle_history WHERE handle = ? ORDER BY id DESC;', [handle]
    );
    return rows.map(r => ({ hash: r.hash, changedAt: r.changed_at, authorDid: r.author_did, message: r.message }));
  }

  public exportSovereignDb = (pillar: TriDatabasePillar = 'mcard') => this.vfs.exportBinary(pillar);
  public exportBinary = (pillar: TriDatabasePillar = 'mcard') => this.vfs.exportBinary(pillar);

  public async importBinary(pillar: TriDatabasePillar, data: Uint8Array): Promise<void> {
    await this.vfs.importBinary(pillar, data);
    await this.eventBus.dispatch('vfs:imported', { pillar, byteLength: data.length });
  }

  public async verifyLensLaws(handle: string, val1: string, val2: string): Promise<LensLawVerificationResult> {
    const violations: string[] = [];
    await this.set(handle, val1);
    const initial = await this.get(handle);
    await this.set(handle, initial!.text);
    const afterGetPut = await this.get(handle);
    const getPutPassed = afterGetPut?.hash === initial?.hash;
    if (!getPutPassed) violations.push('Get-Put law violated');
    await this.set(handle, val2);
    const afterPutGet = await this.get(handle);
    const putGetPassed = afterPutGet?.text === val2;
    if (!putGetPassed) violations.push('Put-Get law violated');
    await this.set(handle, val1);
    await this.set(handle, val2);
    const seq = await this.get(handle);
    const putPutPassed = seq?.text === val2;
    if (!putPutPassed) violations.push('Put-Put law violated');
    return { getPutPassed, putGetPassed, putPutPassed, violations };
  }

  public async close(): Promise<void> {
    await this.vfs.close();
    this.eventBus.clear();
  }
}
