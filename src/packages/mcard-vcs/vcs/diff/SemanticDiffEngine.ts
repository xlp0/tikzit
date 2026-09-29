/**
 * SemanticDiffEngine: Multi-Modal Semantic Diffing Engine
 *
 * Implements line-based Myers diffing with unified hunks and Graph AST lenses.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type { SemanticDiffResult, DiffHunk } from '../types/commit';
import { GraphAstDiffer, type GraphAst } from './GraphAstDiffer';

export class SemanticDiffEngine {
  private graphDiffer = new GraphAstDiffer();

  public diff(
    handle: string,
    baseText: string | null,
    targetText: string | null,
    baseHash: string | null = null,
    targetHash: string | null = null
  ): SemanticDiffResult {
    const oldStr = baseText ?? '';
    const newStr = targetText ?? '';

    if (oldStr === newStr) {
      return {
        handle,
        baseHash,
        targetHash,
        additions: 0,
        deletions: 0,
        hunks: [],
        isIdentical: true
      };
    }

    const oldLines = oldStr.length > 0 ? oldStr.split('\n') : [];
    const newLines = newStr.length > 0 ? newStr.split('\n') : [];

    const { hunks, additions, deletions } = this.computeLineDiff(oldLines, newLines);

    let graphDiff: SemanticDiffResult['graphDiff'];
    const baseGraph = this.tryParseGraph(oldStr);
    const targetGraph = this.tryParseGraph(newStr);

    if (baseGraph || targetGraph) {
      const gDiff = this.graphDiffer.diff(baseGraph, targetGraph);
      graphDiff = {
        nodes: gDiff.nodes,
        edges: gDiff.edges
      };
    }

    return {
      handle,
      baseHash,
      targetHash,
      additions,
      deletions,
      hunks,
      isIdentical: additions === 0 && deletions === 0,
      ...(graphDiff ? { graphDiff } : {})
    };
  }

  private tryParseGraph(text: string): GraphAst | null {
    if (!text.trim().startsWith('{')) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed && (Array.isArray(parsed.nodes) || Array.isArray(parsed.edges))) {
        return parsed as GraphAst;
      }
    } catch {
      // not JSON or not graph
    }
    return null;
  }

  private computeLineDiff(
    oldLines: string[],
    newLines: string[]
  ): { hunks: DiffHunk[]; additions: number; deletions: number } {
    // LCS Matrix
    const m = oldLines.length;
    const n = newLines.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find edits
    let i = m;
    let j = n;
    const edits: Array<{ type: '+' | '-' | ' '; text: string; oldLine?: number; newLine?: number }> = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        edits.unshift({ type: ' ', text: oldLines[i - 1], oldLine: i, newLine: j });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        edits.unshift({ type: '+', text: newLines[j - 1], newLine: j });
        j--;
      } else if (i > 0) {
        edits.unshift({ type: '-', text: oldLines[i - 1], oldLine: i });
        i--;
      }
    }

    let additions = 0;
    let deletions = 0;
    for (const edit of edits) {
      if (edit.type === '+') additions++;
      else if (edit.type === '-') deletions++;
    }

    if (additions === 0 && deletions === 0) {
      return { hunks: [], additions: 0, deletions: 0 };
    }

    // Group into hunks with context
    const hunks = this.groupIntoHunks(edits, oldLines.length, newLines.length);
    return { hunks, additions, deletions };
  }

  private groupIntoHunks(
    edits: Array<{ type: '+' | '-' | ' '; text: string; oldLine?: number; newLine?: number }>,
    totalOldLines: number,
    totalNewLines: number
  ): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let currentHunkLines: string[] = [];
    let oldStart = 1;
    let newStart = 1;
    let oldLines = 0;
    let newLines = 0;
    let inHunk = false;

    for (let idx = 0; idx < edits.length; idx++) {
      const edit = edits[idx];

      if (edit.type !== ' ') {
        if (!inHunk) {
          inHunk = true;
          // Capture leading context (up to 3 lines)
          const contextStart = Math.max(0, idx - 3);
          for (let c = contextStart; c < idx; c++) {
            const ctx = edits[c];
            if (ctx.type === ' ') {
              if (currentHunkLines.length === 0) {
                oldStart = ctx.oldLine ?? 1;
                newStart = ctx.newLine ?? 1;
              }
              currentHunkLines.push(` ${ctx.text}`);
              oldLines++;
              newLines++;
            }
          }
          if (currentHunkLines.length === 0) {
            oldStart = edit.oldLine ?? (idx === 0 ? 1 : totalOldLines);
            newStart = edit.newLine ?? (idx === 0 ? 1 : totalNewLines);
          }
        }

        currentHunkLines.push(`${edit.type}${edit.text}`);
        if (edit.type === '+') newLines++;
        if (edit.type === '-') oldLines++;
      } else if (inHunk) {
        currentHunkLines.push(` ${edit.text}`);
        oldLines++;
        newLines++;

        // Lookahead to see if there are more edits within 3 lines
        let hasMoreEdits = false;
        for (let l = idx + 1; l < Math.min(edits.length, idx + 4); l++) {
          if (edits[l].type !== ' ') {
            hasMoreEdits = true;
            break;
          }
        }

        if (!hasMoreEdits) {
          hunks.push({
            oldStart,
            oldLines,
            newStart,
            newLines,
            lines: currentHunkLines
          });
          currentHunkLines = [];
          oldLines = 0;
          newLines = 0;
          inHunk = false;
        }
      }
    }

    if (inHunk && currentHunkLines.length > 0) {
      hunks.push({
        oldStart,
        oldLines,
        newStart,
        newLines,
        lines: currentHunkLines
      });
    }

    return hunks;
  }
}
