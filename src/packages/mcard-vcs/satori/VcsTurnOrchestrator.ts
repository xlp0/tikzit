/**
 * VcsTurnOrchestrator: 5-Phase Satori Conversational Turn Pipeline
 *
 * Implements Proposal -> Gatekeeper -> Dispatch -> Witness -> Commit turn transitions.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { ContentHasher } from '../storage/hash/ContentHasher';
import { MCardVcsService, MCardExplorerService } from '../cordis/services';
import { SatoriXmlCodec } from './SatoriXmlCodec';
import type { TurnProposal, TurnExecutionResult } from './types';
import { VcsFiber } from '../cordis/VcsFiber';

export class VcsTurnOrchestrator {
  private hasher = new ContentHasher();

  constructor(
    private vcsService: MCardVcsService,
    private explorerService: MCardExplorerService,
    private satoriCodec: SatoriXmlCodec = new SatoriXmlCodec()
  ) {}

  public async processTurn(proposal: TurnProposal): Promise<TurnExecutionResult> {
    // Phase 1 & 2: Proposal & Gatekeeper (V_pre Check)
    const gateError = this.validatePreconditions(proposal);
    if (gateError) {
      return {
        status: 'rejected',
        satoriXml: `<bail reason="${this.satoriCodec.escapeAttr(gateError)}" />`,
        errorMessage: gateError
      };
    }

    const fiber = new VcsFiber(`turn_${Date.now()}`);

    try {
      return await fiber.executeSandwich(
        async () => { /* Setup enclave */ },
        async () => {
          // Phase 3: Dispatch Phase
          switch (proposal.command) {
            case 'explore': {
              const results = await this.explorerService.query({
                pattern: proposal.query,
                limit: 50
              });
              const satoriXml = this.satoriCodec.serializeExplorer({
                tag: 'mcard-explorer',
                attrs: { query: proposal.query, view: 'cards', limit: results.length },
                children: results.map(r => ({
                  tag: 'mcard-item',
                  attrs: { handle: r.handle, hash: r.hash, mimeType: r.mimeType }
                }))
              });
              const witnessHash = this.hasher.hash(satoriXml);
              return { status: 'queried', satoriXml, witnessHash };
            }

            case 'commit': {
              if (proposal.payload && proposal.handle) {
                await this.vcsService.vcs.step({
                  type: 'stage',
                  handle: proposal.handle,
                  payload: proposal.payload
                });
              }
              const out = await this.vcsService.vcs.step({
                type: 'commit',
                authorDid: proposal.authorDid,
                message: proposal.message ?? 'Update via Satori turn'
              });
              const satoriXml = this.satoriCodec.serializeCommit({
                tag: 'commit',
                attrs: {
                  id: out.commitHash ?? '',
                  authorDid: proposal.authorDid,
                  date: new Date().toISOString(),
                  message: proposal.message ?? ''
                }
              });
              const witnessHash = this.hasher.hash(satoriXml);
              return { status: 'committed', satoriXml, witnessHash };
            }

            case 'branch': {
              const out = await this.vcsService.vcs.step({
                type: 'branch',
                name: proposal.handle ?? 'new-branch',
                startRef: proposal.baseRef
              });
              if (out.status === 'rejected') {
                return {
                  status: 'rejected',
                  satoriXml: `<bail reason="${this.satoriCodec.escapeAttr(out.error ?? 'Branch failed')}" />`,
                  errorMessage: out.error
                };
              }
              const satoriXml = `<branch name="${this.satoriCodec.escapeAttr(proposal.handle)}" />`;
              return { status: 'branched', satoriXml, witnessHash: this.hasher.hash(satoriXml) };
            }

            case 'checkout': {
              const out = await this.vcsService.vcs.step({
                type: 'checkout',
                ref: proposal.baseRef ?? 'master'
              });
              if (out.status === 'rejected') {
                return {
                  status: 'rejected',
                  satoriXml: `<bail reason="${this.satoriCodec.escapeAttr(out.error ?? 'Checkout failed')}" />`,
                  errorMessage: out.error
                };
              }
              const satoriXml = `<checkout ref="${this.satoriCodec.escapeAttr(proposal.baseRef)}" />`;
              return { status: 'checked_out', satoriXml, witnessHash: this.hasher.hash(satoriXml) };
            }

            case 'diff': {
              const diffRes = await this.vcsService.vcs.diff(
                proposal.handle ?? '',
                proposal.baseRef ?? 'HEAD~1',
                proposal.targetRef ?? 'HEAD'
              );
              const hunkText = diffRes.hunks.map(h => h.lines.join('\n')).join('\n');
              const satoriXml = this.satoriCodec.serializeDiffView({
                tag: 'diff-view',
                attrs: {
                  handle: proposal.handle ?? '',
                  base: proposal.baseRef ?? '',
                  target: proposal.targetRef ?? '',
                  additions: diffRes.additions,
                  deletions: diffRes.deletions
                },
                content: hunkText
              });
              return { status: 'diffed', satoriXml, witnessHash: this.hasher.hash(satoriXml) };
            }

            case 'merge': {
              const out = await this.vcsService.vcs.step({
                type: 'merge',
                baseRef: proposal.baseRef ?? 'master',
                incomingRef: proposal.incomingRef ?? '',
                authorDid: proposal.authorDid
              });
              if (out.status === 'conflict') {
                const satoriXml = `<merge-conflict count="${out.conflicts?.length ?? 0}" />`;
                return { status: 'conflict', satoriXml, witnessHash: this.hasher.hash(satoriXml) };
              }
              const satoriXml = `<merge commit="${out.commitHash ?? ''}" />`;
              return { status: 'merged', satoriXml, witnessHash: this.hasher.hash(satoriXml) };
            }

            default:
              return {
                status: 'rejected',
                satoriXml: `<bail reason="Unknown command: ${(proposal as any).command}" />`,
                errorMessage: `Unknown command: ${(proposal as any).command}`
              };
          }
        },
        async () => { /* Teardown enclave */ }
      );
    } catch (err: any) {
      return {
        status: 'rejected',
        satoriXml: `<bail reason="${this.satoriCodec.escapeAttr(err?.message ?? 'Execution error')}" />`,
        errorMessage: err?.message ?? String(err)
      };
    }
  }

  private validatePreconditions(proposal: TurnProposal): string | null {
    if (!proposal.command) return 'Missing proposal command';
    if (!proposal.authorDid) return 'Missing authorDid';
    if (proposal.command === 'commit' && !proposal.message) return 'Missing commit message';
    if (proposal.command === 'merge' && !proposal.incomingRef) return 'Missing incomingRef for merge';
    if (proposal.command === 'diff' && !proposal.handle) return 'Missing handle for diff';
    return null;
  }
}
