import { Service, type Context } from 'cordis';
import { AgentDid, ContentHash, MCard, MCardCollection, structuredPayload, textPayload } from 'clm-kernel';
import type {
  DocumentCommitService,
  CommitDocumentResult,
  DocumentHistoryResult,
  RestoreVersionOptions,
  RestoreVersionResult,
} from './documentCommitService';
import { defaultWorkspaceManager } from '../workspace/WorkspaceManager';
import { isDiagramHandle, type CorpusIndexRecord } from './corpusPersistence';
import { safeParse } from '../../core/parser/parser';
import type { GraphAST } from '../../core/domain/types';

declare module 'cordis' {
  interface Context {
    corpusExplorer: CorpusExplorerService;
  }
}

export interface DiagramMetadata {
  title: string;
  archived: boolean;
  createdAt: number;
  source: 'user' | 'duplicate' | 'legacy-import';
  forkedFrom?: string;
  legacyId?: string;
  legacySavedAt?: number;
  isImported?: boolean;
  updatedAt?: number;
  labels?: Record<string, string>;
}

export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
}

export interface CorpusManifestEntry {
  id: string;
  title: string;
  tikz_file: string;
  tikz_bytes: number;
  tikz_sha256: string;
}

export interface CorpusEntry {
  handle: string;
  hash: string;
  name: string;
  title: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt: number;
  archived?: boolean;
  createdAt?: number;
  source?: 'user' | 'duplicate' | 'legacy-import';
  isImported?: boolean;
  forkedFrom?: string;
}

export interface CorpusIndexIssue {
  handle: string;
  reason: string;
}

export interface CorpusListing {
  entries: CorpusEntry[];
  issues: CorpusIndexIssue[];
}

export interface CorpusSeedResult {
  committed: number;
  failed: number;
  complete: boolean;
  failures: CorpusIndexIssue[];
  /** Persistence-layer warning (e.g. temporary session without IndexedDB). */
  persistenceError?: string;
}

export interface CorpusCommitResult extends CommitDocumentResult {
  unchanged?: boolean;
  persisted: boolean;
  persistenceError?: string;
}

export type CorpusFetcher = (url: string) => Promise<Response>;

export interface CorpusExplorerOptions {
  collection: MCardCollection;
  commitService: DocumentCommitService;
  persistence: { flush(): Promise<void> };
  authorDid: AgentDid;
  manifest?: CorpusManifestEntry[];
  initialIndex?: CorpusIndexRecord[];
  fetcher?: CorpusFetcher;
  baseUrl?: string;
}

export interface OpenCorpusEntry {
  entry: CorpusEntry;
  source: string;
  ast: GraphAST;
  sequence: number;
}

export function formatContentId(hash: string): string {
  return hash ? ContentHash.parse(hash).asPrefixed() : '';
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function subsequenceDistance(query: string, candidate: string): number | null {
  let cursor = 0;
  let first = -1;
  let last = -1;
  for (const character of query) {
    const found = candidate.indexOf(character, cursor);
    if (found < 0) return null;
    if (first < 0) first = found;
    last = found;
    cursor = found + 1;
  }
  const span = last - first + 1;
  return span - query.length <= Math.max(2, query.length * 2) ? span : null;
}

export class CorpusExplorerService extends Service {
  private readonly collection: MCardCollection;
  private readonly commitService: DocumentCommitService;
  private persistence: CorpusExplorerOptions['persistence'];
  private readonly authorDid: AgentDid;
  private manifest: CorpusManifestEntry[];
  private fetcher: CorpusFetcher;
  private readonly baseUrl: string;
  private index: CorpusIndexRecord[];
  private issues: CorpusIndexIssue[] = [];
  // Cards are content-addressed and immutable, so parse results keyed by hash never stale.
  private readonly parseCache = new Map<string, { ast: GraphAST; nodeCount: number; edgeCount: number }>();

  private parseCard(hashHex: string, source: string): { ast: GraphAST; nodeCount: number; edgeCount: number } | null {
    const cached = this.parseCache.get(hashHex);
    if (cached) return cached;
    const parsed = safeParse(source);
    if (!parsed.success || !parsed.ast) return null;
    const result = { ast: parsed.ast, nodeCount: parsed.ast.nodes.length, edgeCount: parsed.ast.edges.length };
    this.parseCache.set(hashHex, result);
    return result;
  }

  constructor(ctx: Context, options: CorpusExplorerOptions) {
    super(ctx, 'corpusExplorer');
    this.collection = options.collection;
    this.commitService = options.commitService;
    this.persistence = options.persistence;
    this.authorDid = options.authorDid;
    this.manifest = options.manifest ?? [];
    this.fetcher = options.fetcher ?? fetch;
    this.baseUrl = options.baseUrl ?? '/docs/examples/';
    this.index = [...(options.initialIndex ?? [])];
  }

  configure(options: Pick<CorpusExplorerOptions, 'manifest' | 'fetcher' | 'initialIndex' | 'persistence'>): void {
    if (options.manifest) this.manifest = options.manifest;
    if (options.fetcher) this.fetcher = options.fetcher;
    if (options.persistence) this.persistence = options.persistence;
    if (options.initialIndex) this.restoreIndex(options.initialIndex);
  }

  getCorpusIndex(): CorpusIndexRecord[] {
    return this.index.map((row) => ({ ...row }));
  }

  restoreIndex(records: CorpusIndexRecord[]): void {
    this.index = records.map((row) => ({ ...row }));
  }

  getDiagramMetadata(handle: string): DiagramMetadata | null {
    if (!handle.startsWith('zx:diagrams:')) {
      if (handle.startsWith('zx:examples:')) {
        const id = handle.slice('zx:examples:'.length);
        const manifestEntry = this.manifest.find((m) => m.id === id);
        return {
          title: manifestEntry?.title ?? id,
          archived: false,
          createdAt: 0,
          source: 'user',
        };
      }
      return null;
    }
    const uuid = handle.slice('zx:diagrams:'.length);
    const metaHandle = `zx:meta:diagrams:${uuid}`;
    const hash = this.collection.resolveHandle(metaHandle);
    if (!hash) return null;
    const card = this.collection.get(hash);
    if (!card || card.payload.kind !== 'structured') return null;
    return card.payload.value as DiagramMetadata;
  }

  async renameDiagram(handle: string, newTitle: string): Promise<{ success: boolean; error?: string }> {
    if (!handle.startsWith('zx:diagrams:')) {
      return { success: false, error: 'Only user diagrams can be renamed' };
    }
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return { success: false, error: 'Title cannot be empty' };
    }
    const uuid = handle.slice('zx:diagrams:'.length);
    const metaHandle = `zx:meta:diagrams:${uuid}`;
    const existing = this.getDiagramMetadata(handle);
    const updatedMeta = cleanPayload<DiagramMetadata>({
      title: trimmed,
      archived: existing?.archived ?? false,
      createdAt: existing?.createdAt ?? Date.now(),
      source: existing?.source ?? 'user',
      forkedFrom: existing?.forkedFrom,
      legacyId: existing?.legacyId,
      legacySavedAt: existing?.legacySavedAt,
      isImported: existing?.isImported,
      updatedAt: Date.now(),
    });
    const metaCard = MCard.create(
      `tikzit://meta/diagrams/${uuid}`,
      structuredPayload(updatedMeta),
      this.authorDid,
      0
    );
    this.collection.putWithHandle(metaCard, metaHandle);
    const row = this.index.find((r) => r.handle === handle);
    if (row) {
      row.title = trimmed;
    }
    try {
      await this.persistence.flush();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async archiveDiagram(handle: string, archived: boolean = true): Promise<{ success: boolean; error?: string }> {
    if (!handle.startsWith('zx:diagrams:')) {
      return { success: false, error: 'Only user diagrams can be archived' };
    }
    const uuid = handle.slice('zx:diagrams:'.length);
    const metaHandle = `zx:meta:diagrams:${uuid}`;
    const existing = this.getDiagramMetadata(handle);
    const updatedMeta = cleanPayload<DiagramMetadata>({
      title: existing?.title ?? `Diagram ${uuid.slice(0, 8)}`,
      archived,
      createdAt: existing?.createdAt ?? Date.now(),
      source: existing?.source ?? 'user',
      forkedFrom: existing?.forkedFrom,
      legacyId: existing?.legacyId,
      legacySavedAt: existing?.legacySavedAt,
      isImported: existing?.isImported,
      updatedAt: Date.now(),
    });
    const metaCard = MCard.create(
      `tikzit://meta/diagrams/${uuid}`,
      structuredPayload(updatedMeta),
      this.authorDid,
      0
    );
    this.collection.putWithHandle(metaCard, metaHandle);
    const row = this.index.find((r) => r.handle === handle);
    if (row) {
      row.archived = archived;
    }
    try {
      await this.persistence.flush();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async duplicateDiagram(handle: string, newTitle?: string): Promise<{ success: boolean; newHandle?: string; error?: string }> {
    if (!isDiagramHandle(handle)) {
      return { success: false, error: `Invalid diagram handle: ${handle}` };
    }
    const sourceHash = this.collection.resolveHandle(handle);
    if (!sourceHash) {
      return { success: false, error: `Cannot resolve source handle: ${handle}` };
    }
    const sourceCard = this.collection.get(sourceHash);
    if (!sourceCard || sourceCard.payload.kind !== 'text') {
      return { success: false, error: 'Source diagram card is missing or not text' };
    }
    const sourceMeta = this.getDiagramMetadata(handle);
    const sourceTitle = sourceMeta?.title ?? this.index.find((r) => r.handle === handle)?.title ?? 'Diagram';
    const targetTitle = newTitle?.trim() || `${sourceTitle} (Copy)`;

    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newHandle = `zx:diagrams:${uuid}`;
    const newUri = `tikzit://diagrams/${uuid}`;
    const newCard = MCard.create(newUri, textPayload(sourceCard.payload.value), this.authorDid, 0);
    this.collection.putWithHandle(newCard, newHandle);

    const metaHandle = `zx:meta:diagrams:${uuid}`;
    const metaCard = MCard.create(
      `tikzit://meta/diagrams/${uuid}`,
      structuredPayload(cleanPayload({
        title: targetTitle,
        archived: false,
        createdAt: Date.now(),
        source: 'duplicate',
        forkedFrom: `${handle}@${sourceHash.asHex()}`,
      })),
      this.authorDid,
      0
    );
    this.collection.putWithHandle(metaCard, metaHandle);

    this.index.push({
      handle: newHandle,
      hash: newCard.hash.asHex(),
      committedAt: Date.now(),
      title: targetTitle,
      archived: false,
    });

    try {
      await this.persistence.flush();
      return { success: true, newHandle };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async markDiagramOpened(handle: string): Promise<void> {
    if (!handle.startsWith('zx:diagrams:')) return;
    const meta = this.getDiagramMetadata(handle);
    if (meta && meta.isImported) {
      meta.isImported = false;
      const uuid = handle.slice('zx:diagrams:'.length);
      const metaHandle = `zx:meta:diagrams:${uuid}`;
      const metaCard = MCard.create(
        `tikzit://meta/diagrams/${uuid}`,
        structuredPayload(cleanPayload(meta)),
        this.authorDid,
        0
      );
      this.collection.putWithHandle(metaCard, metaHandle);
      try {
        await this.persistence.flush();
      } catch {
        // ignore flush error on badge clear
      }
    }
  }

  listCorpusEntries(options?: { includeArchived?: boolean }): CorpusListing {
    const entries: CorpusEntry[] = [];
    const issues: CorpusIndexIssue[] = [];
    const manifestById = new Map(this.manifest.map((entry) => [entry.id, entry]));
    for (const row of this.index) {
      if (!row || typeof row.handle !== 'string' || !isDiagramHandle(row.handle) || !/^[a-f0-9]{64}$/i.test(row.hash)) {
        issues.push({ handle: String(row?.handle ?? ''), reason: 'Malformed corpus index row' });
        continue;
      }
      const currentHash = this.collection.resolveHandle(row.handle);
      if (!currentHash || currentHash.asHex() !== row.hash.toLowerCase()) {
        issues.push({ handle: row.handle, reason: 'Corpus index head is stale or missing' });
        continue;
      }
      const card = this.collection.get(currentHash);
      if (!card || card.payload.kind !== 'text') {
        issues.push({ handle: row.handle, reason: 'Corpus card is missing or is not text' });
        continue;
      }
      const parsed = this.parseCard(currentHash.asHex(), card.payload.value);
      if (!parsed) {
        issues.push({ handle: row.handle, reason: 'Corpus card source no longer parses' });
        continue;
      }
      let name: string;
      let title: string;
      let isArchived = Boolean(row.archived);
      let metadata: DiagramMetadata | null = null;
      if (row.handle.startsWith('zx:examples:')) {
        const id = row.handle.slice('zx:examples:'.length);
        const manifestEntry = manifestById.get(id);
        name = `${id}.tikz`;
        title = row.title ?? manifestEntry?.title ?? id;
        isArchived = false;
      } else {
        const id = row.handle.slice('zx:diagrams:'.length);
        name = `${id}.tikz`;
        metadata = this.getDiagramMetadata(row.handle);
        if (metadata) {
          title = metadata.title ?? row.title ?? `Diagram ${id.slice(0, 8)}`;
          isArchived = Boolean(metadata.archived);
          row.title = title;
          row.archived = isArchived;
        } else {
          title = row.title ?? `Diagram ${id.slice(0, 8)}`;
        }
      }

      if (isArchived && !options?.includeArchived) {
        continue;
      }

      entries.push({
        handle: row.handle,
        hash: currentHash.asHex(),
        name,
        title,
        nodeCount: parsed.nodeCount,
        edgeCount: parsed.edgeCount,
        updatedAt: Number.isFinite(row.committedAt) ? row.committedAt : 0,
        archived: isArchived,
        createdAt: metadata?.createdAt ?? (Number.isFinite(row.committedAt) ? row.committedAt : 0),
        source: metadata?.source,
        isImported: metadata?.isImported,
        forkedFrom: metadata?.forkedFrom,
      });
    }
    entries.sort((a, b) => a.title.localeCompare(b.title) || a.handle.localeCompare(b.handle));
    this.issues = issues;
    return { entries, issues };
  }

  searchCorpus(query: string, options?: { includeArchived?: boolean }): CorpusEntry[] {
    const normalizedQuery = normalize(query);
    const entries = this.listCorpusEntries(options).entries;
    if (!normalizedQuery) return entries;
    return entries
      .map((entry) => {
        const title = normalize(entry.title);
        const handle = normalize(entry.handle);
        if (title === normalizedQuery || handle === normalizedQuery) return { entry, rank: 0 };
        if (title.startsWith(normalizedQuery) || handle.startsWith(normalizedQuery)) return { entry, rank: 1 };
        if (title.includes(normalizedQuery) || handle.includes(normalizedQuery)) return { entry, rank: 2 };
        const fuzzy = subsequenceDistance(normalizedQuery, `${title} ${handle}`);
        return fuzzy === null ? null : { entry, rank: 3 + fuzzy / 1000 };
      })
      .filter((result): result is { entry: CorpusEntry; rank: number } => result !== null)
      .sort((a, b) => a.rank - b.rank || a.entry.title.localeCompare(b.entry.title) || a.entry.handle.localeCompare(b.entry.handle))
      .map(({ entry }) => entry);
  }

  openEntry(handle: string): OpenCorpusEntry {
    const row = this.index.find((entry) => entry.handle === handle);
    if (!row) throw new Error(`Corpus entry not indexed: ${handle}`);
    const hash = this.collection.resolveHandle(handle);
    if (!hash || hash.asHex() !== row.hash.toLowerCase()) throw new Error(`Corpus entry is stale: ${handle}`);
    const card = this.collection.get(hash);
    if (!card || card.payload.kind !== 'text') throw new Error(`Corpus entry is not a TikZ text card: ${handle}`);
    const parsed = this.parseCard(hash.asHex(), card.payload.value);
    if (!parsed) throw new Error(`Corpus entry failed parsing: ${handle}`);
    const entry = this.listCorpusEntries({ includeArchived: true }).entries.find((candidate) => candidate.handle === handle);
    if (!entry) throw new Error(`Corpus entry failed index validation: ${handle}`);
    void this.markDiagramOpened(handle);
    return { entry, source: card.payload.value, ast: parsed.ast, sequence: card.sequence };
  }

  async seedZxCorpus(): Promise<CorpusSeedResult> {
    const failures: CorpusIndexIssue[] = [];
    const initialIndexSize = this.index.length;
    const prepared: Array<{ manifest: CorpusManifestEntry; handle: string; source: string }> = [];
    const encoder = new TextDecoder('utf-8', { fatal: true });
    for (const entry of this.manifest) {
      const handle = `zx:examples:${entry.id}`;
      try {
        const existingHash = this.collection.resolveHandle(handle);
        if (existingHash) {
          const card = this.collection.get(existingHash);
          if (!card || card.payload.kind !== 'text' || !safeParse(card.payload.value).success) {
            throw new Error('Existing corpus head is not a valid TikZ card');
          }
          const row = this.index.find((record) => record.handle === handle);
          if (row) {
            // Rebuild stale app-owned index rows so a valid resolved head is not reported missing.
            row.hash = existingHash.asHex();
          } else {
            this.index.push({ handle, hash: existingHash.asHex(), committedAt: Date.now() });
          }
          continue;
        }
        const response = await this.fetcher(`${this.baseUrl}${entry.tikz_file}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength !== entry.tikz_bytes) throw new Error(`Byte count mismatch: ${bytes.byteLength}`);
        if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is unavailable');
        const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
        const actualHash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
        if (actualHash.toLowerCase() !== entry.tikz_sha256.toLowerCase()) throw new Error('SHA-256 mismatch');
        const source = encoder.decode(bytes);
        const parsed = safeParse(source);
        if (!parsed.success || !parsed.ast) throw new Error('TikZ parse failed');
        prepared.push({ manifest: entry, handle, source });
      } catch (error) {
        failures.push({ handle, reason: error instanceof Error ? error.message : String(error) });
      }
    }

    let committed = 0;
    let persistenceError: string | undefined;
    for (const item of prepared) {
      const result = await this.commitCorpusDocument({ handle: item.handle, sourceText: item.source, uri: `tikzit://diagram/${item.manifest.id}`, activate: false });
      if (result.success) committed++;
      else failures.push({ handle: item.handle, reason: result.reason ?? 'Commit gate bailed' });
      if (!result.persisted) persistenceError = result.persistenceError ?? 'storage unavailable';
    }
    if (prepared.length === 0 && this.index.length !== initialIndexSize) {
      try {
        await this.persistence.flush();
      } catch (error) {
        persistenceError = error instanceof Error ? error.message : String(error);
      }
    }
    return {
      committed,
      failed: failures.length,
      complete: failures.length === 0 && this.manifest.every((entry) => Boolean(this.collection.resolveHandle(`zx:examples:${entry.id}`))),
      failures,
      persistenceError,
    };
  }

  async commitCorpusDocument(options: {
    handle: string;
    sourceText: string;
    uri?: string;
    activate?: boolean;
    title?: string;
    message?: string;
    metadata?: Partial<DiagramMetadata>;
  }): Promise<CorpusCommitResult> {
    if (!isDiagramHandle(options.handle)) {
      return { success: false, reason: `Not a corpus handle: ${options.handle}`, persisted: false, receiptHash: '' };
    }
    const currentHash = this.collection.resolveHandle(options.handle);
    const currentCard = currentHash ? this.collection.get(currentHash) : undefined;
    if (currentHash && currentCard?.payload.kind === 'text' && currentCard.payload.value === options.sourceText) {
      try {
        await this.persistence.flush();
        return { success: true, unchanged: true, persisted: true, hash: currentHash.asHex(), sequence: currentCard.sequence, receiptHash: '' };
      } catch (error) {
        return {
          success: true,
          unchanged: true,
          persisted: false,
          persistenceError: error instanceof Error ? error.message : String(error),
          hash: currentHash.asHex(),
          sequence: currentCard.sequence,
          receiptHash: '',
        };
      }
    }
    const result = this.commitService.saveDocumentWithGate({
      ...options,
      authorDid: this.authorDid,
      message: options.message,
    });
    if (result.success && result.hash) {
      const existing = this.index.find((row) => row.handle === options.handle);
      const title = options.title ?? existing?.title ?? (options.handle.startsWith('zx:diagrams:') ? `Diagram ${options.handle.slice('zx:diagrams:'.length).slice(0, 8)}` : undefined);
      const isArchived = options.metadata?.archived ?? existing?.archived ?? false;

      if (options.handle.startsWith('zx:diagrams:')) {
        const uuid = options.handle.slice('zx:diagrams:'.length);
        const metaHandle = `zx:meta:diagrams:${uuid}`;
        const existingMeta = this.getDiagramMetadata(options.handle);
        const hist = this.commitService.documentHistory(options.handle);
        const currentPos = hist.rows.length;
        const labels = { ...(existingMeta?.labels ?? {}) };
        if (options.message) {
          labels[String(currentPos)] = options.message;
        }

        const metaCard = MCard.create(
          `tikzit://meta/diagrams/${uuid}`,
          structuredPayload(cleanPayload({
            title: title ?? existingMeta?.title ?? `Diagram ${uuid.slice(0, 8)}`,
            archived: isArchived,
            createdAt: existingMeta?.createdAt ?? options.metadata?.createdAt ?? Date.now(),
            source: existingMeta?.source ?? options.metadata?.source ?? 'user',
            legacyId: existingMeta?.legacyId ?? options.metadata?.legacyId,
            legacySavedAt: existingMeta?.legacySavedAt ?? options.metadata?.legacySavedAt,
            isImported: existingMeta?.isImported ?? options.metadata?.isImported,
            forkedFrom: existingMeta?.forkedFrom ?? options.metadata?.forkedFrom,
            updatedAt: Date.now(),
            labels: Object.keys(labels).length > 0 ? labels : undefined,
          })),
          this.authorDid,
          0
        );
        const currentMetaHash = this.collection.resolveHandle(metaHandle);
        if (!currentMetaHash || !currentMetaHash.equals(metaCard.hash)) {
          this.collection.putWithHandle(metaCard, metaHandle);
        }
      }

      this.index = this.index.filter((row) => row.handle !== options.handle);
      this.index.push({ handle: options.handle, hash: result.hash, committedAt: Date.now(), title, archived: isArchived });
    }
    try {
      await this.persistence.flush();
      return { ...result, persisted: true };
    } catch (error) {
      return { ...result, persisted: false, persistenceError: error instanceof Error ? error.message : String(error) };
    }
  }

  documentHistory(handle: string): DocumentHistoryResult {
    return this.commitService.documentHistory(handle);
  }

  async restoreVersion(options: RestoreVersionOptions): Promise<RestoreVersionResult> {
    const result = await this.commitService.restoreVersion(options);
    if (result.status === 'success') {
      const row = this.index.find((r) => r.handle === options.handle);
      if (row) {
        row.hash = result.hash;
        row.committedAt = Date.now();
      }
      defaultWorkspaceManager.applyRestoredHead(options.handle, result.content, result.ast, result.hash);
      try {
        await this.persistence.flush();
        this.ctx.emit('tikzit/document:persisted', {
          handle: options.handle,
          hash: result.hash,
        });
      } catch (err) {
        console.warn('Failed to flush after restore:', err);
      }
    }
    return result;
  }

  async flush(): Promise<void> {
    await this.persistence.flush();
  }

  get lastIssues(): CorpusIndexIssue[] {
    return [...this.issues];
  }
}
