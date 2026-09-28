import { Context, Service } from 'cordis';
import {
  MCard,
  textPayload,
  structuredPayload,
  BooleanPCard,
  type BooleanPCardOptions,
  evaluateVCard,
  AgentDid,
  TriDatabaseManager,
  MCardCollection,
  ContentHash,
  type BailVerdict,
} from 'clm-kernel';
import { safeParse } from '../../core/parser/parser';
import type { GraphAST, ParseDiagnostic } from '../../core/domain/types';

declare module 'cordis' {
  interface Context {
    documentCommit: DocumentCommitService;
  }
}

export class PredicateBooleanPCard extends BooleanPCard {
  public predicate: (card: MCard) => boolean | BailVerdict;

  constructor(
    options: BooleanPCardOptions,
    predicate: (card: MCard) => boolean | BailVerdict
  ) {
    super(options);
    this.predicate = predicate;
  }
}

export interface CommitDocumentOptions {
  handle: string;
  sourceText: string;
  uri?: string;
  authorDid?: AgentDid;
  sequence?: number;
}

export interface CommitDocumentResult {
  success: boolean;
  hash?: string;
  reason?: string;
  receiptHash: string;
  ast?: GraphAST;
  diagnostics?: ParseDiagnostic[];
}

/**
 * Cordis Service that coordinates gated document persistence.
 * Validates AST syntax and invariants via BooleanPCard & evaluateVCard.
 * Success advances the handle in mcard pillar; bails preserve prior handle state.
 * All audit receipts route exclusively to executionLog.
 */
export class DocumentCommitService extends Service {
  private triDb: TriDatabaseManager;
  private collection: MCardCollection;
  private defaultAuthorDid: AgentDid;

  constructor(
    ctx: Context,
    triDb: TriDatabaseManager,
    collection: MCardCollection,
    defaultAuthorDid: AgentDid
  ) {
    super(ctx, 'documentCommit');
    this.triDb = triDb;
    this.collection = collection;
    this.defaultAuthorDid = defaultAuthorDid;
  }

  saveDocumentWithGate(options: CommitDocumentOptions): CommitDocumentResult {
    const authorDid = options.authorDid ?? this.defaultAuthorDid;
    const history = this.collection.history(options.handle);
    const sequence = options.sequence ?? history.length;
    const uri = options.uri ?? `tikzit://diagram/${options.handle.replace(/^zx:/, '')}`;

    // 1. Create candidate MCard
    const candidateCard = MCard.create(
      uri,
      textPayload(options.sourceText),
      authorDid,
      sequence
    );

    // 2. Parse candidate TikZ text
    const parseResult = safeParse(options.sourceText);

    // 3. Formulate BooleanPCard validation gate
    const validationPCard = new PredicateBooleanPCard(
      {
        id: 'vcard:diagram-validation:v1',
        phase: 'postcondition',
        expression: 'ast_valid_and_non_empty',
        targetPattern: 'tikzit://diagram/*',
        coeffects: { requiredServices: ['graph'] },
      },
      (): boolean | BailVerdict => {
        if (!parseResult.success) {
          return {
            verdict: 'bail',
            reason: parseResult.errors.map((e: ParseDiagnostic) => e.message).join('; ') || 'TikZ parse error',
            invariantCode: 'INVALID_TIKZ_SYNTAX',
          };
        }
        if (!parseResult.ast) {
          return {
            verdict: 'bail',
            reason: 'Parser returned null AST',
            invariantCode: 'NULL_AST',
          };
        }
        return { verdict: 'pass' };
      }
    );

    // 4. Evaluate gate through clm-kernel evaluateVCard
    const evalResult = evaluateVCard(validationPCard, candidateCard);
    const isPass = evalResult.verdict === 'pass';
    const reason = 'reason' in evalResult ? evalResult.reason : undefined;

    // 5. Mint audit receipt into executionLog pillar
    const receiptUri = `tikzit://receipt/eval/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const receiptPayload = structuredPayload({
      verdict: isPass ? 'pass' : 'bail',
      handle: options.handle,
      candidateHash: candidateCard.hash.asHex(),
      sequence,
      reason: isPass ? undefined : reason,
      diagnostics: parseResult.errors,
      nodeCount: parseResult.ast?.nodes?.length,
      edgeCount: parseResult.ast?.edges?.length,
      timestamp: Date.now(),
    });

    const receiptCard = MCard.create(receiptUri, receiptPayload, authorDid, 0);
    this.triDb.executionLog.putCard(receiptCard);

    if (!isPass) {
      // Gate bailed: Emit diagnostics, preserve prior handle in mcard pillar
      this.ctx.emit('tikzit/diagnostics:emit', parseResult.errors);
      return {
        success: false,
        reason: reason || 'Document validation bailed',
        receiptHash: receiptCard.hash.asHex(),
        diagnostics: parseResult.errors,
      };
    }

    // Gate passed: Record candidate in mcard pillar under handle
    this.collection.putWithHandle(candidateCard, options.handle);

    // Update active working AST on Cordis GraphService
    if (parseResult.ast && this.ctx.graph) {
      this.ctx.graph.setAST(parseResult.ast);
    }

    // Emit typed document change event
    this.ctx.emit('tikzit/document:change', {
      handle: options.handle,
      hash: candidateCard.hash.asHex(),
      sequence: candidateCard.sequence,
    });

    return {
      success: true,
      hash: candidateCard.hash.asHex(),
      receiptHash: receiptCard.hash.asHex(),
      ast: parseResult.ast ?? undefined,
    };
  }

  getDocumentHistory(handle: string): ContentHash[] {
    return this.collection.history(handle);
  }

  resolveDocument(handle: string): MCard | undefined {
    const hash = this.collection.resolveHandle(handle);
    if (!hash) return undefined;
    return this.collection.get(hash);
  }
}
