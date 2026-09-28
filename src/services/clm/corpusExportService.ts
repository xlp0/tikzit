import {
  AgentDid,
  ContentHash,
  Handle,
  MCard,
  MCardCollection,
  SqlJsBackend,
  structuredPayload,
  TriDatabaseManager,
} from 'clm-kernel';
import type { SqlJsDatabaseLike } from 'clm-kernel/layer0';
import type { CorpusIndexRecord } from './corpusPersistence';

export type CorpusSaveStatus = 'success' | 'failure' | 'cancelled';

export interface CorpusSaveResult {
  status: CorpusSaveStatus;
  cardCount: number;
  filename: string;
  persisted: boolean;
  persistenceError?: string;
  failureCode?: string;
  failureReason?: string;
}

interface CorpusExportOptions {
  triDb: TriDatabaseManager;
  collection: MCardCollection;
  authorDid: AgentDid;
  getIndex(): CorpusIndexRecord[];
  getHistoryRows?(): Array<{ handle: string; previous_hash: string; changed_at: string }>;
  flush(): Promise<void>;
}

interface PickerWritable {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface PickerHandle {
  createWritable(): Promise<PickerWritable>;
}

export interface CorpusSaveEnvironment {
  showSaveFilePicker?: (options: unknown) => Promise<PickerHandle>;
  downloadBlob?: (bytes: Uint8Array, filename: string) => void | Promise<void>;
}

function verifyCard(card: MCard): void {
  const recomputed = MCard.create(card.uri, card.payload, card.author, card.sequence);
  if (!recomputed.hash.equals(card.hash)) throw new Error(`Card payload does not match hash ${card.hash.asHex()}`);
}

function isSqlite3Binary(bytes: Uint8Array): boolean {
  return bytes.length >= 16 && new TextDecoder().decode(bytes.subarray(0, 16)) === 'SQLite format 3\0';
}

function requiredTables(database: SqlJsDatabaseLike): void {
  const tables = new Set(database.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.map(([name]) => String(name)) ?? []);
  for (const table of ['card', 'handle_registry', 'handle_history']) {
    if (!tables.has(table)) throw new Error(`SQLite schema is missing ${table}`);
  }
}

function browserDownload(bytes: Uint8Array, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') throw new Error('Blob download is unavailable');
  const blob = new Blob([Uint8Array.from(bytes).buffer], { type: 'application/vnd.sqlite3' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function reconstructHistoryRows(handle: string, chain: ContentHash[], currentHash: ContentHash) {
  const previous = chain.at(-1)?.equals(currentHash) ? chain.slice(0, -1) : chain;
  return previous.map((hash) => ({
    handle,
    previous_hash: hash.asHex(),
    changed_at: new Date(0).toISOString(),
  }));
}

export class CorpusExportService {
  private readonly triDb: TriDatabaseManager;
  private readonly collection: MCardCollection;
  private readonly authorDid: AgentDid;
  private readonly getIndex: CorpusExportOptions['getIndex'];
  private readonly getHistoryRows: CorpusExportOptions['getHistoryRows'];
  private readonly flush: CorpusExportOptions['flush'];

  constructor(options: CorpusExportOptions) {
    this.triDb = options.triDb;
    this.collection = options.collection;
    this.authorDid = options.authorDid;
    this.getIndex = options.getIndex;
    this.getHistoryRows = options.getHistoryRows;
    this.flush = options.flush;
  }

  async exportCorpusDb(): Promise<Uint8Array> {
    try {
      await this.flush();
    } catch {
      // Persistence may be unavailable (temporary session, missing IndexedDB);
      // the in-memory corpus is still exportable.
    }
    const rows = this.getIndex();
    if (new Set(rows.map((row) => row.handle)).size !== rows.length) throw new Error('Duplicate corpus handle index rows');
    const cards = new Map<string, MCard>();
    const histories: Array<{ handle: string; previousHash: string; changedAt: string }> = [];
    const handleHeads = new Map<string, string>();
    const allHistoryRows = this.getHistoryRows?.();
    for (const row of rows) {
      if (!row || !row.handle.startsWith('zx:examples:') || !Number.isFinite(row.committedAt)) throw new Error('Malformed corpus handle index');
      const indexedHash = ContentHash.parse(row.hash);
      const currentHash = this.collection.resolveHandle(row.handle);
      if (!currentHash || !currentHash.equals(indexedHash)) throw new Error(`Stale corpus index for ${row.handle}`);
      const chain = this.collection.history(row.handle);
      if (chain.length === 0) throw new Error(`Incomplete corpus history for ${row.handle}`);
      const fsHistory = (allHistoryRows ?? reconstructHistoryRows(row.handle, chain, currentHash))
        .filter((record) => record.handle === row.handle)
        .map((record) => ({ previousHash: ContentHash.parse(record.previous_hash), changedAt: record.changed_at }));
      // History rows record superseded heads; only the final row — the transition
      // that produced the current head — must never point back at the head itself.
      if (fsHistory.at(-1)?.previousHash.equals(currentHash)) {
        throw new Error(`HEAD appears as its own history for ${row.handle}`);
      }
      const referenced = new Map<string, ContentHash>([[currentHash.asHex(), currentHash]]);
      for (const record of fsHistory) referenced.set(record.previousHash.asHex(), record.previousHash);
      for (const [hex, hash] of referenced) {
        const card = this.collection.get(hash);
        if (!card) throw new Error(`Missing historical MCard ${hex} for ${row.handle}`);
        verifyCard(card);
        cards.set(hex, card);
      }
      for (const record of fsHistory) {
        histories.push({ handle: row.handle, previousHash: record.previousHash.asHex(), changedAt: record.changedAt });
      }
      handleHeads.set(row.handle, currentHash.asHex());
    }
    const { initializeSqlJs } = await import('./sqliteRuntime');
    const SQL = await initializeSqlJs();
    const database = new SQL.Database();
    const backend = new SqlJsBackend(database as unknown as SqlJsDatabaseLike);
    try {
      for (const card of cards.values()) backend.put(card.hash, card);
      for (const [handle, hash] of handleHeads) backend.registerHandle(Handle.parse(handle), ContentHash.parse(hash));
      for (const history of histories) {
        database.run(
          'INSERT INTO handle_history (handle, previous_hash, changed_at) VALUES (?, ?, ?)',
          [history.handle, history.previousHash, history.changedAt],
        );
      }
      requiredTables(database as unknown as SqlJsDatabaseLike);
      if (backend.count() !== cards.size) throw new Error('Exported card count does not match verified corpus');
      for (const [handle, hash] of handleHeads) {
        if (backend.resolveHandle(Handle.parse(handle))?.asHex() !== hash) throw new Error(`Exported handle mismatch for ${handle}`);
      }
      const bytes = backend.exportBinary();
      if (!bytes || !isSqlite3Binary(bytes)) throw new Error('Export did not produce a SQLite 3 database');
      return new Uint8Array(bytes);
    } finally {
      backend.close();
    }
  }

  async saveCorpusDb(environment: CorpusSaveEnvironment = {}): Promise<CorpusSaveResult> {
    const filename = 'tikzit-corpus.db';
    let status: CorpusSaveStatus = 'failure';
    let cardCount = 0;
    let failureCode: string | undefined;
    let failureReason: string | undefined;
    try {
      const bytes = await this.exportCorpusDb();
      cardCount = new Set(this.getIndex().flatMap((row) => this.collection.history(row.handle).map((hash) => hash.asHex()))).size;
      const picker = environment.showSaveFilePicker ?? (
        typeof window === 'undefined'
          ? undefined
          : (window as Window & { showSaveFilePicker?: CorpusSaveEnvironment['showSaveFilePicker'] }).showSaveFilePicker?.bind(window)
      );
      if (picker) {
        try {
          const file = await picker({
            suggestedName: filename,
            types: [{ description: 'SQLite database', accept: { 'application/vnd.sqlite3': ['.db', '.sqlite', '.sqlite3'] } }],
          });
          const writable = await file.createWritable();
          await writable.write(new Blob([Uint8Array.from(bytes).buffer], { type: 'application/vnd.sqlite3' }));
          await writable.close();
          status = 'success';
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            status = 'cancelled';
          } else {
            await (environment.downloadBlob ?? browserDownload)(bytes, filename);
            status = 'success';
          }
        }
      } else {
        await (environment.downloadBlob ?? browserDownload)(bytes, filename);
        status = 'success';
      }
    } catch (error) {
      status = 'failure';
      failureCode = error instanceof Error ? error.name || 'ExportError' : 'ExportError';
      failureReason = error instanceof Error ? error.message : String(error);
    }
    const manifestDigest = ContentHash.computeString(JSON.stringify(this.getIndex().slice().sort((a, b) => a.handle.localeCompare(b.handle)))).asHex();
    const receiptValue: Record<string, unknown> = { status, cardCount, manifestDigest, timestamp: Date.now() };
    if (failureCode !== undefined) receiptValue.failureCode = failureCode;
    const receipt = MCard.create(
      `tikzit://receipt/corpus-export/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      structuredPayload(receiptValue),
      this.authorDid,
      0,
    );
    this.triDb.executionLog.putCard(receipt);
    try {
      await this.flush();
      return { status, cardCount, filename, persisted: true, failureCode, failureReason };
    } catch (error) {
      return {
        status,
        cardCount,
        filename,
        persisted: false,
        persistenceError: error instanceof Error ? error.message : String(error),
        failureCode,
        failureReason,
      };
    }
  }
}
