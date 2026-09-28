import {
  AgentDid,
  ContentHash,
  Handle,
  MCard,
  MCardCollection,
  MCardFileSystem,
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
  mcardFs: MCardFileSystem;
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
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export class CorpusExportService {
  private readonly triDb: TriDatabaseManager;
  private readonly collection: MCardCollection;
  private readonly mcardFs: MCardFileSystem;
  private readonly authorDid: AgentDid;
  private readonly getIndex: CorpusExportOptions['getIndex'];
  private readonly getHistoryRows: CorpusExportOptions['getHistoryRows'];
  private readonly flush: CorpusExportOptions['flush'];

  constructor(options: CorpusExportOptions) {
    this.triDb = options.triDb;
    this.collection = options.collection;
    this.mcardFs = options.mcardFs;
    this.authorDid = options.authorDid;
    this.getIndex = options.getIndex;
    this.getHistoryRows = options.getHistoryRows;
    this.flush = options.flush;
  }

  async exportCorpusDb(): Promise<Uint8Array> {
    await this.flush();
    const rows = this.getIndex();
    if (new Set(rows.map((row) => row.handle)).size !== rows.length) throw new Error('Duplicate corpus handle index rows');
    const cards = new Map<string, MCard>();
    const histories: Array<{ handle: string; previousHash: string; changedAt: string }> = [];
    const handleHeads = new Map<string, string>();
    for (const row of rows) {
      if (!row || !row.handle.startsWith('zx:examples:') || !Number.isFinite(row.committedAt)) throw new Error('Malformed corpus handle index');
      const indexedHash = ContentHash.parse(row.hash);
      const currentHash = this.collection.resolveHandle(row.handle);
      if (!currentHash || !currentHash.equals(indexedHash)) throw new Error(`Stale corpus index for ${row.handle}`);
      const chain = this.collection.history(row.handle);
      if (chain.length === 0 || !chain.at(-1)?.equals(currentHash)) throw new Error(`Incomplete corpus history for ${row.handle}`);
      const historyRows = this.getHistoryRows?.() ?? this.mcardFs.exportHistory().map((record) => ({
        handle: record.handle,
        previous_hash: record.previousHash,
        changed_at: record.changedAt,
      }));
      const fsHistory = historyRows
        .filter((record) => record.handle === row.handle)
        .map((record) => ({ previousHash: ContentHash.parse(record.previous_hash), changedAt: record.changed_at }));
      if (fsHistory.length !== chain.length - 1) throw new Error(`Incomplete filesystem history for ${row.handle}`);
      for (let index = 0; index < chain.length; index++) {
        const hash = chain[index];
        if (!hash) throw new Error(`Invalid hash in corpus history for ${row.handle}`);
        const card = this.collection.get(hash);
        if (!card) throw new Error(`Missing historical MCard ${hash.asHex()} for ${row.handle}`);
        verifyCard(card);
        cards.set(card.hash.asHex(), card);
        if (index < fsHistory.length) {
          const record = fsHistory[index];
          if (!record.previousHash.equals(hash)) throw new Error(`History/hash mismatch for ${row.handle}`);
          if (record.previousHash.equals(currentHash)) throw new Error(`HEAD appears as its own history for ${row.handle}`);
          histories.push({ handle: row.handle, previousHash: record.previousHash.asHex(), changedAt: record.changedAt });
        }
      }
      handleHeads.set(row.handle, currentHash.asHex());
    }
    const { initializeSqlJs } = await import('./sqliteRuntime');
    const SQL = await initializeSqlJs();
    const database = new SQL.Database();
    const backend = new SqlJsBackend(database as unknown as SqlJsDatabaseLike);
    try {
      const exportFs = MCardFileSystem.withBackend(backend);
      for (const card of cards.values()) backend.put(card.hash, card);
      for (const [handle, hash] of handleHeads) backend.registerHandle(Handle.parse(handle), ContentHash.parse(hash));
      exportFs.importHistory(histories);
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
