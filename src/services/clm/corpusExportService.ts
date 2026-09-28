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
import { isDiagramHandle, type CorpusIndexRecord } from './corpusPersistence';

export type CorpusSaveStatus = 'success' | 'failure' | 'cancelled';

export interface CorpusSaveResult {
  status: CorpusSaveStatus;
  cardCount: number;
  filename: string;
  persisted: boolean;
  persistenceError?: string;
  failureCode?: string;
  failureReason?: string;
  method?: 'picker' | 'fallback';
  failingHandle?: string;
}

export interface CollectionExportSummary {
  diagramsCount: number;
  archivedCount: number;
  versionsCount: number;
  totalCardsCount: number;
  orphanCardsCount: number;
  excludedReceiptsCount: number;
  excludedKnowledgeCount: number;
  defaultFilename: string;
}

export interface ExportCorpusDbOptions {
  onProgress?: (step: 'verifying' | 'writing') => void;
  filename?: string;
}

export interface SaveCorpusDbOptions {
  onProgress?: (step: 'verifying' | 'writing') => void;
  filename?: string;
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

export function getDiagramsDbFilename(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `tikzit-diagrams-${yyyy}${mm}${dd}.db`;
}

function verifyCard(card: MCard, handle?: string): void {
  const recomputed = MCard.create(card.uri, card.payload, card.author, card.sequence);
  if (!recomputed.hash.equals(card.hash)) {
    const handleSuffix = handle ? ` for handle ${handle}` : '';
    throw new Error(`Card payload does not match hash ${card.hash.asHex()}${handleSuffix}`);
  }
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

export interface CorpusExportArtifact {
  bytes: Uint8Array;
  cardCount: number;
  manifestDigest: string;
  filename: string;
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

  async getCollectionExportSummary(): Promise<CollectionExportSummary> {
    try {
      await this.flush();
    } catch {
      // In-memory collection remains available
    }

    const rows = this.getIndex().map((r) => ({ ...r }));
    const diagramRows = rows.filter((r) => isDiagramHandle(r.handle));
    const diagramsCount = diagramRows.length;
    const archivedCount = diagramRows.filter((r) => Boolean(r.archived)).length;

    let versionsCount = 0;
    const reachableHashes = new Set<string>();
    const allHistoryRows = (this.getHistoryRows?.() ?? []).map((r) => ({ ...r }));

    for (const row of diagramRows) {
      const rawChain = this.collection.history(row.handle);
      const chain = rawChain.filter((h, idx) => idx === 0 || !h.equals(rawChain[idx - 1]));
      versionsCount += Math.max(1, chain.length);
      for (const hash of chain) {
        reachableHashes.add(hash.asHex());
      }
      const head = this.collection.resolveHandle(row.handle);
      if (head) {
        reachableHashes.add(head.asHex());
      }
      const matchingHistory = allHistoryRows.filter((r) => r.handle === row.handle);
      for (const hist of matchingHistory) {
        reachableHashes.add(hist.previous_hash);
      }

      if (row.handle.startsWith('zx:diagrams:')) {
        const uuid = row.handle.slice('zx:diagrams:'.length);
        const metaHandle = `zx:meta:diagrams:${uuid}`;
        const metaHead = this.collection.resolveHandle(metaHandle);
        if (metaHead) {
          reachableHashes.add(metaHead.asHex());
          const rawMetaChain = this.collection.history(metaHandle);
          const metaChain = rawMetaChain.filter((h, idx) => idx === 0 || !h.equals(rawMetaChain[idx - 1]));
          for (const mHash of metaChain) {
            reachableHashes.add(mHash.asHex());
          }
          const metaHistory = allHistoryRows.filter((r) => r.handle === metaHandle);
          for (const mHist of metaHistory) {
            reachableHashes.add(mHist.previous_hash);
          }
        }
      }
    }

    const totalCollectionCards = this.collection.count();
    const totalCardsCount = reachableHashes.size;
    const orphanCardsCount = Math.max(0, totalCollectionCards - totalCardsCount);

    let excludedReceiptsCount = 0;
    try {
      excludedReceiptsCount = this.triDb.executionLog.list().length;
    } catch {
      excludedReceiptsCount = 0;
    }

    let excludedKnowledgeCount = 0;
    try {
      excludedKnowledgeCount = this.triDb.knowledge.list().length;
    } catch {
      excludedKnowledgeCount = 0;
    }

    return {
      diagramsCount,
      archivedCount,
      versionsCount,
      totalCardsCount,
      orphanCardsCount,
      excludedReceiptsCount,
      excludedKnowledgeCount,
      defaultFilename: getDiagramsDbFilename(),
    };
  }

  async exportCorpusDb(options?: ExportCorpusDbOptions): Promise<Uint8Array> {
    const artifact = await this.exportCorpusDbWithMetadata(options);
    return artifact.bytes;
  }

  async exportCorpusDbWithMetadata(options?: ExportCorpusDbOptions): Promise<CorpusExportArtifact> {
    // Coherent single snapshot capture at export initiation (19-AC-08)
    const rows = this.getIndex().map((r) => ({ ...r }));
    const allHistoryRows = (this.getHistoryRows?.() ?? []).map((r) => ({ ...r }));

    options?.onProgress?.('verifying');
    try {
      await this.flush();
    } catch {
      // Persistence may be unavailable (temporary session, missing IndexedDB);
      // the in-memory corpus is still exportable.
    }

    // Check for duplicate handles in index
    const seenHandles = new Set<string>();
    for (const row of rows) {
      if (seenHandles.has(row.handle)) {
        throw new Error(`Duplicate corpus handle index row for handle ${row.handle}`);
      }
      seenHandles.add(row.handle);
    }

    interface TargetHandle {
      handle: string;
      isMeta: boolean;
      expectedHash?: string;
    }

    const targets: TargetHandle[] = [];
    for (const row of rows) {
      if (!row || !isDiagramHandle(row.handle) || !Number.isFinite(row.committedAt)) {
        throw new Error(`Malformed corpus handle index for handle ${row?.handle ?? 'unknown'}`);
      }
      targets.push({ handle: row.handle, isMeta: false, expectedHash: row.hash });
      if (row.handle.startsWith('zx:diagrams:')) {
        const uuid = row.handle.slice('zx:diagrams:'.length);
        targets.push({ handle: `zx:meta:diagrams:${uuid}`, isMeta: true });
      }
    }

    const cards = new Map<string, MCard>();
    const histories: Array<{ handle: string; previousHash: string; changedAt: string }> = [];
    const handleHeads = new Map<string, string>();

    for (const target of targets) {
      const currentHash = this.collection.resolveHandle(target.handle);
      if (!currentHash) {
        if (target.isMeta) {
          // If metadata handle is not registered, skip it
          continue;
        }
        throw new Error(`Missing head for handle ${target.handle}`);
      }

      if (target.expectedHash && currentHash.asHex() !== target.expectedHash) {
        throw new Error(`Stale corpus index for handle ${target.handle}`);
      }

      const rawChain = this.collection.history(target.handle);
      const chain = rawChain.filter((h, idx) => idx === 0 || !h.equals(rawChain[idx - 1]));
      if (chain.length === 0) {
        throw new Error(`Incomplete corpus history for handle ${target.handle}`);
      }
      if (!chain.at(-1)?.equals(currentHash)) {
        throw new Error(`History chain does not end at HEAD for handle ${target.handle}`);
      }

      const matchingHistory = allHistoryRows.filter((record) => record.handle === target.handle);
      if (chain.length > 1 && matchingHistory.length === 0) {
        throw new Error(`Missing genuine history rows for handle ${target.handle}`);
      }

      const fsHistory = matchingHistory.map((record) => ({
        previousHash: ContentHash.parse(record.previous_hash),
        changedAt: (record as any).changed_at ?? (record as any).changedAt ?? new Date().toISOString(),
      }));

      // History rows record superseded heads; only the final row — the transition
      // that produced the current head — must never point back at the head itself.
      if (fsHistory.at(-1)?.previousHash.equals(currentHash)) {
        throw new Error(`HEAD appears as its own history for handle ${target.handle}`);
      }

      // Assert history previous_hash closure set equality (no prior head dropped)
      const priorHeads = new Set(chain.slice(0, -1).map((h) => h.asHex()));
      const recordedPrevious = new Set(fsHistory.map((h) => h.previousHash.asHex()));
      for (const prior of priorHeads) {
        if (!recordedPrevious.has(prior)) {
          throw new Error(`Missing genuine history rows for handle ${target.handle}`);
        }
      }

      const referenced = new Map<string, ContentHash>([[currentHash.asHex(), currentHash]]);
      for (const record of fsHistory) referenced.set(record.previousHash.asHex(), record.previousHash);
      for (const hash of chain) referenced.set(hash.asHex(), hash);

      for (const [hex, hash] of referenced) {
        const card = this.collection.get(hash);
        if (!card) throw new Error(`Missing historical MCard ${hex} for handle ${target.handle}`);
        verifyCard(card, target.handle);
        cards.set(hex, card);
      }

      for (const record of fsHistory) {
        histories.push({ handle: target.handle, previousHash: record.previousHash.asHex(), changedAt: record.changedAt });
      }
      handleHeads.set(target.handle, currentHash.asHex());
    }

    options?.onProgress?.('writing');

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
        if (backend.resolveHandle(Handle.parse(handle))?.asHex() !== hash) {
          throw new Error(`Exported handle mismatch for handle ${handle}`);
        }
      }
      const bytes = backend.exportBinary();
      if (!bytes || !isSqlite3Binary(bytes)) throw new Error('Export did not produce a SQLite 3 database');
      const cardCount = cards.size;

      const sortedHandles = Array.from(handleHeads.entries()).sort(([a], [b]) => a.localeCompare(b));
      const manifestDigest = ContentHash.computeString(
        JSON.stringify({
          handles: sortedHandles,
          cardCount: cards.size,
          historyCount: histories.length,
        })
      ).asHex();

      const filename = options?.filename ?? getDiagramsDbFilename();

      return {
        bytes: new Uint8Array(bytes),
        cardCount,
        manifestDigest,
        filename,
      };
    } finally {
      backend.close();
    }
  }

  async saveCorpusDb(environment: CorpusSaveEnvironment = {}, options?: SaveCorpusDbOptions): Promise<CorpusSaveResult> {
    const filename = options?.filename ?? getDiagramsDbFilename();
    let status: CorpusSaveStatus = 'failure';
    let cardCount = 0;
    let failureCode: string | undefined;
    let failureReason: string | undefined;
    let failingHandle: string | undefined;
    let manifestDigest = '';
    let method: 'picker' | 'fallback' = 'picker';

    try {
      const artifact = await this.exportCorpusDbWithMetadata({
        onProgress: options?.onProgress,
        filename,
      });
      const bytes = artifact.bytes;
      cardCount = artifact.cardCount;
      manifestDigest = artifact.manifestDigest;

      const picker = environment.showSaveFilePicker ?? (
        typeof window === 'undefined'
          ? undefined
          : (window as Window & { showSaveFilePicker?: CorpusSaveEnvironment['showSaveFilePicker'] }).showSaveFilePicker?.bind(window)
      );

      if (picker) {
        let file: PickerHandle | undefined;
        try {
          file = await picker({
            suggestedName: filename,
            types: [{ description: 'SQLite database', accept: { 'application/vnd.sqlite3': ['.db', '.sqlite', '.sqlite3'] } }],
          });
        } catch (pickerError) {
          if (pickerError instanceof Error && pickerError.name === 'AbortError') {
            status = 'cancelled';
          } else {
            await (environment.downloadBlob ?? browserDownload)(bytes, filename);
            status = 'success';
            method = 'fallback';
          }
        }
        if (file) {
          try {
            const writable = await file.createWritable();
            await writable.write(new Blob([Uint8Array.from(bytes).buffer], { type: 'application/vnd.sqlite3' }));
            await writable.close();
            status = 'success';
            method = 'picker';
          } catch (writeError) {
            status = 'failure';
            failureCode = 'WriteError';
            failureReason = writeError instanceof Error ? writeError.message : String(writeError);
          }
        }
      } else {
        await (environment.downloadBlob ?? browserDownload)(bytes, filename);
        status = 'success';
        method = 'fallback';
      }
    } catch (error) {
      status = 'failure';
      const msg = error instanceof Error ? error.message : String(error);
      const handleMatch = msg.match(/for handle ([^\s:]+:[^\s]+)/i);
      failingHandle = handleMatch ? handleMatch[1] : undefined;
      failureCode = (failingHandle || msg.includes('for handle')) ? 'VerificationError' : (error instanceof Error ? error.name || 'ExportError' : 'ExportError');
      failureReason = msg;
    }

    if (!manifestDigest) {
      manifestDigest = ContentHash.computeString(
        JSON.stringify(this.getIndex().slice().sort((a, b) => a.handle.localeCompare(b.handle)))
      ).asHex();
    }

    const receiptValue: Record<string, unknown> = { status, cardCount, manifestDigest, filename, timestamp: Date.now() };
    if (failureCode !== undefined) receiptValue.failureCode = failureCode;
    if (failingHandle !== undefined) receiptValue.failingHandle = failingHandle;

    const receipt = MCard.create(
      `tikzit://receipt/corpus-export/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      structuredPayload(receiptValue),
      this.authorDid,
      0,
    );
    this.triDb.executionLog.putCard(receipt);

    try {
      await this.flush();
      return { status, method, cardCount, filename, persisted: true, failureCode, failureReason, failingHandle };
    } catch (error) {
      return {
        status,
        method,
        cardCount,
        filename,
        persisted: false,
        persistenceError: error instanceof Error ? error.message : String(error),
        failureCode,
        failureReason,
        failingHandle,
      };
    }
  }
}

