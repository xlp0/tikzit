/**
 * src/services/clm/documentCommitService.ts - Sprint 29
 * Refactored commit coordinator lens adapter.
 * Target: <= 220 LOC. Satisfies Contract D (ceiling 250 LOC).
 */
import { Context, Service } from 'cordis';
import {
  MCard, textPayload, structuredPayload, BooleanPCard, type BooleanPCardOptions,
  evaluateVCard, AgentDid, TriDatabaseManager, MCardCollection, ContentHash, type BailVerdict
} from 'clm-kernel';
import { safeParse } from '../../core/parser/parser';
import type { GraphAST, ParseDiagnostic } from '../../core/domain/types';
import { getVcsEngine, getOperadicVfs } from './vcsAdapterInstance';
import type {
  CommitDocumentOptions, CommitDocumentResult, HistoryRow,
  DocumentHistoryResult, RestoreVersionOptions, RestoreVersionResult, SqlDatabaseQueryable
} from './documentCommitTypes';

export type {
  CommitDocumentOptions, CommitDocumentResult, HistoryRow,
  DocumentHistoryResult, RestoreVersionOptions, RestoreVersionResult, SqlDatabaseQueryable
};

declare module 'cordis' {
  interface Context { documentCommit: DocumentCommitService; }
}

export class PredicateBooleanPCard extends BooleanPCard {
  public predicate: (card: MCard) => boolean | BailVerdict;
  constructor(options: BooleanPCardOptions, predicate: (card: MCard) => boolean | BailVerdict) {
    super(options);
    this.predicate = predicate;
  }
}

export class DocumentCommitService extends Service {
  private triDb: TriDatabaseManager;
  private collection: MCardCollection;
  private defaultAuthorDid: AgentDid;
  private historyDb?: SqlDatabaseQueryable;
  private inMemoryTransitions = new Map<string, Array<{ hash: string; changedAt: string }>>();
  private vcs = getVcsEngine();
  private vfs = getOperadicVfs();

  constructor(
    ctx: Context, triDb: TriDatabaseManager, collection: MCardCollection,
    defaultAuthorDid: AgentDid, options?: { historyDb?: SqlDatabaseQueryable }
  ) {
    super(ctx, 'documentCommit');
    this.triDb = triDb;
    this.collection = collection;
    this.defaultAuthorDid = defaultAuthorDid;
    this.historyDb = options?.historyDb;
  }

  saveDocumentWithGate(options: CommitDocumentOptions): CommitDocumentResult {
    const authorDid = options.authorDid ?? this.defaultAuthorDid;
    const history = this.collection.history(options.handle);
    const sequence = options.sequence ?? history.length;
    const uri = options.uri ?? `tikzit://diagram/${options.handle.replace(/^zx:/, '')}`;

    const candidateCard = MCard.create(uri, textPayload(options.sourceText), authorDid, sequence);
    const parseResult = safeParse(options.sourceText);

    const validationPCard = new PredicateBooleanPCard(
      {
        id: 'vcard:diagram-validation:v1', phase: 'postcondition', expression: 'ast_valid',
        targetPattern: 'tikzit://diagram/*', coeffects: { requiredServices: ['graph'] },
      },
      (): boolean | BailVerdict => {
        if (!parseResult.success) {
          return { verdict: 'bail', reason: parseResult.errors.map((e: ParseDiagnostic) => e.message).join('; ') || 'TikZ parse error', invariantCode: 'INVALID_TIKZ_SYNTAX' };
        }
        return parseResult.ast ? { verdict: 'pass' } : { verdict: 'bail', reason: 'Parser returned null AST', invariantCode: 'NULL_AST' };
      }
    );

    const evalResult = evaluateVCard(validationPCard, candidateCard);
    const isPass = evalResult.verdict === 'pass';
    const reason = 'reason' in evalResult ? evalResult.reason : undefined;

    const receiptUri = `tikzit://receipt/eval/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const receiptValue: Record<string, unknown> = {
      verdict: isPass ? 'pass' : 'bail', handle: options.handle, candidateHash: candidateCard.hash.asHex(),
      sequence, diagnostics: parseResult.errors, timestamp: Date.now(),
    };
    if (options.message) receiptValue.message = options.message;
    if (!isPass && reason !== undefined) receiptValue.reason = reason;
    if (parseResult.ast) {
      receiptValue.nodeCount = parseResult.ast.nodes.length;
      receiptValue.edgeCount = parseResult.ast.edges.length;
    }

    const receiptCard = MCard.create(receiptUri, structuredPayload(receiptValue), authorDid, 0);
    this.triDb.executionLog.putCard(receiptCard);

    if (!isPass) {
      this.ctx.emit('tikzit/diagnostics:emit', parseResult.errors);
      return { success: false, sequence, reason: reason || 'Document validation bailed', receiptHash: receiptCard.hash.asHex(), diagnostics: parseResult.errors };
    }

    this.collection.putWithHandle(candidateCard, options.handle);
    void this.vfs.set(options.handle, options.sourceText, { mimeType: 'text/vnd.tikz', mcardType: 0x01 }).catch(() => undefined);

    const list = this.inMemoryTransitions.get(options.handle) ?? [];
    list.push({ hash: candidateCard.hash.asHex(), changedAt: new Date().toISOString() });
    this.inMemoryTransitions.set(options.handle, list);

    if (options.activate !== false) {
      if (parseResult.ast && this.ctx.graph) this.ctx.graph.setAST(parseResult.ast);
      this.ctx.emit('tikzit/document:change', { handle: options.handle, hash: candidateCard.hash.asHex(), sequence: candidateCard.sequence });
    }

    return { success: true, hash: candidateCard.hash.asHex(), sequence: candidateCard.sequence, receiptHash: receiptCard.hash.asHex(), ast: parseResult.ast ?? undefined };
  }

  getDocumentHistory(handle: string): ContentHash[] {
    return this.collection.history(handle);
  }

  documentHistory(handle: string): DocumentHistoryResult {
    const currentHead = this.collection.resolveHandle(handle);
    if (!currentHead) return { handle, rows: [] };
    const currentHeadHex = currentHead.asHex();
    let rows: HistoryRow[] = [];

    if (this.historyDb) {
      try {
        const regRes = this.historyDb.exec('SELECT current_hash, created_at, updated_at FROM handle_registry WHERE handle = ?', [handle]);
        const histRes = this.historyDb.exec('SELECT previous_hash, changed_at FROM handle_history WHERE handle = ? ORDER BY id ASC', [handle]);
        if (regRes.length && regRes[0].values.length) {
          const [regCurrent, createdAt, updatedAt] = regRes[0].values[0];
          const histValues = (histRes[0]?.values ?? []) as Array<[unknown, unknown]>;
          if (histValues.length === 0) {
            rows.push({ position: 1, hash: String(regCurrent), changedAt: String(createdAt), isHead: true });
          } else {
            rows.push({ position: 1, hash: String(histValues[0][0]), changedAt: String(createdAt), isHead: false });
            for (let i = 1; i < histValues.length; i++) {
              rows.push({ position: i + 1, hash: String(histValues[i][0]), changedAt: String(histValues[i - 1][1]), isHead: false });
            }
            rows.push({ position: histValues.length + 1, hash: String(regCurrent), changedAt: String(histValues[histValues.length - 1][1] ?? updatedAt), isHead: true });
          }
        }
      } catch (err) {
        console.warn('Failed querying SQLite history for handle:', handle, err);
      }
    }

    if (rows.length === 0) {
      const inMem = this.inMemoryTransitions.get(handle);
      if (inMem && inMem.length > 0) {
        rows = inMem.map((entry, idx) => ({ position: idx + 1, hash: entry.hash, changedAt: entry.changedAt, isHead: idx === inMem.length - 1 }));
      } else {
        const hist = this.collection.history(handle);
        const now = new Date().toISOString();
        rows = hist.length > 0
          ? hist.map((ch, idx) => ({ position: idx + 1, hash: ch.asHex(), changedAt: now, isHead: idx === hist.length - 1 }))
          : [{ position: 1, hash: currentHeadHex, changedAt: now, isHead: true }];
      }
    }

    let labels: Record<string, string> | undefined;
    if (handle.startsWith('zx:diagrams:')) {
      const metaHash = this.collection.resolveHandle(`zx:meta:diagrams:${handle.slice('zx:diagrams:'.length)}`);
      if (metaHash) {
        const metaCard = this.collection.get(metaHash);
        if (metaCard && metaCard.payload.kind === 'structured') {
          labels = (metaCard.payload.value as { labels?: Record<string, string> }).labels;
        }
      }
    }

    for (const row of rows) {
      if (labels && labels[String(row.position)]) row.label = labels[String(row.position)];
      try {
        const card = this.collection.get(ContentHash.fromHex(row.hash));
        if (!card || card.payload.kind !== 'text') row.unavailable = true;
        else row.authorDid = card.author.asString();
      } catch {
        row.unavailable = true;
      }
    }
    return { handle, head: currentHeadHex, rows };
  }

  async restoreVersion(options: RestoreVersionOptions): Promise<RestoreVersionResult> {
    const currentHead = this.collection.resolveHandle(options.handle);
    if (!currentHead) return { status: 'failure', error: `Handle not registered: ${options.handle}` };
    const currentHeadHex = currentHead.asHex();

    if (options.expectedHeadHash && currentHeadHex !== options.expectedHeadHash) {
      return { status: 'conflict', currentHead: currentHeadHex, expectedHead: options.expectedHeadHash };
    }
    if (options.targetHash === currentHeadHex) return { status: 'already-current' };

    let card: MCard | undefined;
    try { card = this.collection.get(ContentHash.fromHex(options.targetHash)); } catch { return { status: 'missing-card', hash: options.targetHash }; }
    if (!card) return { status: 'missing-card', hash: options.targetHash };
    if (card.payload.kind !== 'text') return { status: 'invalid-card', reason: 'Historical card payload is not text' };

    const content = card.payload.value;
    const parsed = safeParse(content);
    if (!parsed.success || !parsed.ast) return { status: 'invalid-card', reason: 'Historical card content failed syntax validation' };

    this.collection.putWithHandle(card, options.handle);
    void this.vfs.set(options.handle, content, { mimeType: 'text/vnd.tikz', mcardType: 0x01 }).catch(() => undefined);

    const list = this.inMemoryTransitions.get(options.handle) ?? [];
    list.push({ hash: options.targetHash, changedAt: new Date().toISOString() });
    this.inMemoryTransitions.set(options.handle, list);

    this.ctx.emit('tikzit/document:change', { handle: options.handle, hash: options.targetHash, sequence: card.sequence });
    return { status: 'success', hash: options.targetHash, content, ast: parsed.ast };
  }

  resolveDocument(handle: string): MCard | undefined {
    const hash = this.collection.resolveHandle(handle);
    if (!hash) return undefined;
    return this.collection.get(hash);
  }
}
