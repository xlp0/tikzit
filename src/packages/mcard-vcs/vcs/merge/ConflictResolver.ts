/**
 * ConflictResolver: Conflict Resolution Strategies & VCard Witness Generation
 *
 * Grounded in INV-03 VCard Sandwich certification.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import { OperadicMCardVfs } from '../../storage/OperadicMCardVfs';
import { ContentHasher } from '../../storage/hash/ContentHasher';
import type { MergeConflict, TreeEntry } from '../types/commit';
import { GraphAstDiffer } from '../diff/GraphAstDiffer';

export type ConflictStrategy = 'ours' | 'theirs' | 'union' | 'manual';

export interface ResolutionResult {
  resolvedEntries: TreeEntry[];
  unresolvedConflicts: MergeConflict[];
  witnessHash: string;
}

export class ConflictResolver {
  private hasher = new ContentHasher();
  private graphDiffer = new GraphAstDiffer();

  constructor(private storage: OperadicMCardVfs) {}

  public async resolve(
    conflicts: MergeConflict[],
    strategy: ConflictStrategy,
    manualResolutions?: Record<string, string | Uint8Array>
  ): Promise<ResolutionResult> {
    const resolvedEntries: TreeEntry[] = [];
    const unresolvedConflicts: MergeConflict[] = [];
    const resolutionLog: Array<{ handle: string; strategy: string; resolvedHash: string }> = [];

    for (const conflict of conflicts) {
      let resolvedHash: string | null = null;

      if (strategy === 'manual' && manualResolutions && manualResolutions[conflict.handle] !== undefined) {
        const content = manualResolutions[conflict.handle];
        const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
        resolvedHash = await this.storage.putCard(bytes, 'application/octet-stream', 1);
      } else if (strategy === 'ours' && conflict.oursHash) {
        resolvedHash = conflict.oursHash;
      } else if (strategy === 'theirs' && conflict.theirsHash) {
        resolvedHash = conflict.theirsHash;
      } else if (strategy === 'union') {
        resolvedHash = await this.tryUnionResolve(conflict);
      }

      if (resolvedHash) {
        resolvedEntries.push({ handle: conflict.handle, hash: resolvedHash });
        resolutionLog.push({ handle: conflict.handle, strategy, resolvedHash });
      } else {
        unresolvedConflicts.push(conflict);
      }
    }

    const witnessPayload = JSON.stringify({
      strategy,
      resolutionCount: resolvedEntries.length,
      unresolvedCount: unresolvedConflicts.length,
      log: resolutionLog,
      timestamp: new Date().toISOString()
    });
    const witnessHash = this.hasher.hash(witnessPayload);

    return {
      resolvedEntries,
      unresolvedConflicts,
      witnessHash
    };
  }

  private async tryUnionResolve(conflict: MergeConflict): Promise<string | null> {
    if (!conflict.oursHash || !conflict.theirsHash) {
      return conflict.oursHash ?? conflict.theirsHash;
    }

    const oursCard = await this.storage.getByHash(conflict.oursHash);
    const theirsCard = await this.storage.getByHash(conflict.theirsHash);
    if (!oursCard || !theirsCard) return null;

    try {
      const oursJson = JSON.parse(oursCard.text);
      const theirsJson = JSON.parse(theirsCard.text);

      if (oursJson.nodes && theirsJson.nodes) {
        let baseJson = {};
        if (conflict.baseHash) {
          const baseCard = await this.storage.getByHash(conflict.baseHash);
          if (baseCard) try { baseJson = JSON.parse(baseCard.text); } catch {}
        }
        const merged = this.graphDiffer.merge(baseJson, oursJson, theirsJson);
        if (merged.conflicts.length === 0) {
          const mergedJson = JSON.stringify(merged.merged);
          return await this.storage.putCard(mergedJson, 'application/json', 2);
        }
      }
    } catch {
      // not graph or JSON
    }

    return null;
  }
}
