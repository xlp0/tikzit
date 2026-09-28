import { Service, type Context } from 'cordis';
import { AgentDid, ContentHash, MCardCollection } from 'clm-kernel';
import type { DocumentCommitService, CommitDocumentResult } from './documentCommitService';
import type { CorpusIndexRecord } from './corpusPersistence';
import { safeParse } from '../../core/parser/parser';
import type { GraphAST } from '../../core/domain/types';

declare module 'cordis' {
  interface Context {
    corpusExplorer: CorpusExplorerService;
  }
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

  listCorpusEntries(): CorpusListing {
    const entries: CorpusEntry[] = [];
    const issues: CorpusIndexIssue[] = [];
    const manifestById = new Map(this.manifest.map((entry) => [entry.id, entry]));
    for (const row of this.index) {
      if (!row || typeof row.handle !== 'string' || !row.handle.startsWith('zx:examples:') || !/^[a-f0-9]{64}$/i.test(row.hash)) {
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
      const parsed = safeParse(card.payload.value);
      if (!parsed.success || !parsed.ast) {
        issues.push({ handle: row.handle, reason: 'Corpus card source no longer parses' });
        continue;
      }
      const id = row.handle.slice('zx:examples:'.length);
      const manifestEntry = manifestById.get(id);
      entries.push({
        handle: row.handle,
        hash: currentHash.asHex(),
        name: `${id}.tikz`,
        title: manifestEntry?.title ?? id,
        nodeCount: parsed.ast.nodes.length,
        edgeCount: parsed.ast.edges.length,
        updatedAt: Number.isFinite(row.committedAt) ? row.committedAt : 0,
      });
    }
    entries.sort((a, b) => a.title.localeCompare(b.title) || a.handle.localeCompare(b.handle));
    this.issues = issues;
    return { entries, issues };
  }

  searchCorpus(query: string): CorpusEntry[] {
    const normalizedQuery = normalize(query);
    const entries = this.listCorpusEntries().entries;
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
    const parsed = safeParse(card.payload.value);
    if (!parsed.success || !parsed.ast) throw new Error(`Corpus entry failed parsing: ${handle}`);
    const entry = this.listCorpusEntries().entries.find((candidate) => candidate.handle === handle);
    if (!entry) throw new Error(`Corpus entry failed index validation: ${handle}`);
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
          if (!this.index.some((row) => row.handle === handle)) {
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
    for (const item of prepared) {
      const result = await this.commitCorpusDocument({ handle: item.handle, sourceText: item.source, uri: `tikzit://diagram/${item.manifest.id}`, activate: false });
      if (result.success) committed++;
      else failures.push({ handle: item.handle, reason: result.reason ?? 'Commit gate bailed' });
      if (!result.persisted) failures.push({ handle: item.handle, reason: `Committed, not persisted: ${result.persistenceError ?? 'storage unavailable'}` });
    }
    if (prepared.length === 0 && this.index.length !== initialIndexSize) {
      try {
        await this.persistence.flush();
      } catch (error) {
        failures.push({ handle: 'zx:examples', reason: error instanceof Error ? error.message : String(error) });
      }
    }
    return {
      committed,
      failed: failures.length,
      complete: failures.length === 0 && this.manifest.every((entry) => Boolean(this.collection.resolveHandle(`zx:examples:${entry.id}`))),
      failures,
    };
  }

  async commitCorpusDocument(options: { handle: string; sourceText: string; uri?: string; activate?: boolean }): Promise<CorpusCommitResult> {
    const currentHash = this.collection.resolveHandle(options.handle);
    const currentCard = currentHash ? this.collection.get(currentHash) : undefined;
    if (currentHash && currentCard?.payload.kind === 'text' && currentCard.payload.value === options.sourceText) {
      return { success: true, unchanged: true, persisted: true, hash: currentHash.asHex(), sequence: currentCard.sequence, receiptHash: '' };
    }
    const result = this.commitService.saveDocumentWithGate({ ...options, authorDid: this.authorDid });
    if (result.success && result.hash) {
      this.index = this.index.filter((row) => row.handle !== options.handle);
      this.index.push({ handle: options.handle, hash: result.hash, committedAt: Date.now() });
    }
    try {
      await this.persistence.flush();
      return { ...result, persisted: true };
    } catch (error) {
      return { ...result, persisted: false, persistenceError: error instanceof Error ? error.message : String(error) };
    }
  }

  async flush(): Promise<void> {
    await this.persistence.flush();
  }

  get lastIssues(): CorpusIndexIssue[] {
    return [...this.issues];
  }
}
