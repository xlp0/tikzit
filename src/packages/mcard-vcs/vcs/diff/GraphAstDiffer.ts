/**
 * GraphAstDiffer: Diagram Property Graph & TikZ AST Differ
 *
 * Computes semantic differences and non-overlapping 3-way merges across graph ASTs.
 * Zero DOM dependencies. Contract D ceiling: <= 250 LOC.
 */

import type { GraphNodeDiff, GraphEdgeDiff, DiffChangeType } from '../types/commit';

export interface GraphAst {
  nodes?: Array<{ id: string; x?: number; y?: number; style?: string; label?: string }>;
  edges?: Array<{ id: string; source: string; target: string; style?: string; bend?: number; in?: number; out?: number }>;
  [key: string]: unknown;
}

export class GraphAstDiffer {
  public diff(before: GraphAst | null, after: GraphAst | null): {
    nodes: GraphNodeDiff[];
    edges: GraphEdgeDiff[];
    isIdentical: boolean;
  } {
    const nodeDiffs = this.diffNodes(before?.nodes ?? [], after?.nodes ?? []);
    const edgeDiffs = this.diffEdges(before?.edges ?? [], after?.edges ?? []);
    const isIdentical =
      nodeDiffs.every(d => d.change === 'unchanged') &&
      edgeDiffs.every(d => d.change === 'unchanged');

    return { nodes: nodeDiffs, edges: edgeDiffs, isIdentical };
  }

  private diffNodes(
    beforeNodes: Array<{ id: string; x?: number; y?: number; style?: string; label?: string }>,
    afterNodes: Array<{ id: string; x?: number; y?: number; style?: string; label?: string }>
  ): GraphNodeDiff[] {
    const beforeMap = new Map(beforeNodes.map(n => [n.id, n]));
    const afterMap = new Map(afterNodes.map(n => [n.id, n]));
    const diffs: GraphNodeDiff[] = [];

    for (const [id, afterNode] of afterMap) {
      const beforeNode = beforeMap.get(id);
      if (!beforeNode) {
        diffs.push({
          id,
          change: 'added',
          after: { x: afterNode.x ?? 0, y: afterNode.y ?? 0, style: afterNode.style ?? '', label: afterNode.label }
        });
      } else {
        const modified =
          beforeNode.x !== afterNode.x ||
          beforeNode.y !== afterNode.y ||
          beforeNode.style !== afterNode.style ||
          beforeNode.label !== afterNode.label;

        diffs.push({
          id,
          change: modified ? 'modified' : 'unchanged',
          before: { x: beforeNode.x ?? 0, y: beforeNode.y ?? 0, style: beforeNode.style ?? '', label: beforeNode.label },
          after: { x: afterNode.x ?? 0, y: afterNode.y ?? 0, style: afterNode.style ?? '', label: afterNode.label }
        });
      }
    }

    for (const [id, beforeNode] of beforeMap) {
      if (!afterMap.has(id)) {
        diffs.push({
          id,
          change: 'removed',
          before: { x: beforeNode.x ?? 0, y: beforeNode.y ?? 0, style: beforeNode.style ?? '', label: beforeNode.label }
        });
      }
    }

    return diffs;
  }

  private diffEdges(
    beforeEdges: Array<{ id: string; source: string; target: string; style?: string; bend?: number; in?: number; out?: number }>,
    afterEdges: Array<{ id: string; source: string; target: string; style?: string; bend?: number; in?: number; out?: number }>
  ): GraphEdgeDiff[] {
    const beforeMap = new Map(beforeEdges.map(e => [e.id, e]));
    const afterMap = new Map(afterEdges.map(e => [e.id, e]));
    const diffs: GraphEdgeDiff[] = [];

    for (const [id, afterEdge] of afterMap) {
      const beforeEdge = beforeMap.get(id);
      if (!beforeEdge) {
        diffs.push({
          id,
          source: afterEdge.source,
          target: afterEdge.target,
          change: 'added',
          after: { style: afterEdge.style ?? '', bend: afterEdge.bend, in: afterEdge.in, out: afterEdge.out }
        });
      } else {
        const modified =
          beforeEdge.source !== afterEdge.source ||
          beforeEdge.target !== afterEdge.target ||
          beforeEdge.style !== afterEdge.style ||
          beforeEdge.bend !== afterEdge.bend ||
          beforeEdge.in !== afterEdge.in ||
          beforeEdge.out !== afterEdge.out;

        diffs.push({
          id,
          source: afterEdge.source,
          target: afterEdge.target,
          change: modified ? 'modified' : 'unchanged',
          before: { style: beforeEdge.style ?? '', bend: beforeEdge.bend, in: beforeEdge.in, out: beforeEdge.out },
          after: { style: afterEdge.style ?? '', bend: afterEdge.bend, in: afterEdge.in, out: afterEdge.out }
        });
      }
    }

    for (const [id, beforeEdge] of beforeMap) {
      if (!afterMap.has(id)) {
        diffs.push({
          id,
          source: beforeEdge.source,
          target: beforeEdge.target,
          change: 'removed',
          before: { style: beforeEdge.style ?? '', bend: beforeEdge.bend, in: beforeEdge.in, out: beforeEdge.out }
        });
      }
    }

    return diffs;
  }

  public merge(
    base: GraphAst,
    ours: GraphAst,
    theirs: GraphAst
  ): { merged: GraphAst; conflicts: Array<{ id: string; reason: string }> } {
    const conflicts: Array<{ id: string; reason: string }> = [];
    const baseNodeMap = new Map((base.nodes ?? []).map(n => [n.id, n]));
    const oursNodeMap = new Map((ours.nodes ?? []).map(n => [n.id, n]));
    const theirsNodeMap = new Map((theirs.nodes ?? []).map(n => [n.id, n]));

    const allNodeIds = new Set([...baseNodeMap.keys(), ...oursNodeMap.keys(), ...theirsNodeMap.keys()]);
    const mergedNodes: any[] = [];

    for (const id of allNodeIds) {
      const b = baseNodeMap.get(id);
      const o = oursNodeMap.get(id);
      const t = theirsNodeMap.get(id);

      const oChanged = JSON.stringify(b) !== JSON.stringify(o);
      const tChanged = JSON.stringify(b) !== JSON.stringify(t);

      if (!oChanged && !tChanged) {
        if (b) mergedNodes.push(b);
      } else if (oChanged && !tChanged) {
        if (o) mergedNodes.push(o);
      } else if (!oChanged && tChanged) {
        if (t) mergedNodes.push(t);
      } else {
        if (JSON.stringify(o) === JSON.stringify(t)) {
          if (o) mergedNodes.push(o);
        } else {
          conflicts.push({ id, reason: `Conflicting node changes for node ${id}` });
          if (o) mergedNodes.push(o); // default to ours in intermediate
        }
      }
    }

    const baseEdgeMap = new Map((base.edges ?? []).map(e => [e.id, e]));
    const oursEdgeMap = new Map((ours.edges ?? []).map(e => [e.id, e]));
    const theirsEdgeMap = new Map((theirs.edges ?? []).map(e => [e.id, e]));

    const allEdgeIds = new Set([...baseEdgeMap.keys(), ...oursEdgeMap.keys(), ...theirsEdgeMap.keys()]);
    const mergedEdges: any[] = [];

    for (const id of allEdgeIds) {
      const b = baseEdgeMap.get(id);
      const o = oursEdgeMap.get(id);
      const t = theirsEdgeMap.get(id);

      const oChanged = JSON.stringify(b) !== JSON.stringify(o);
      const tChanged = JSON.stringify(b) !== JSON.stringify(t);

      if (!oChanged && !tChanged) {
        if (b) mergedEdges.push(b);
      } else if (oChanged && !tChanged) {
        if (o) mergedEdges.push(o);
      } else if (!oChanged && tChanged) {
        if (t) mergedEdges.push(t);
      } else {
        if (JSON.stringify(o) === JSON.stringify(t)) {
          if (o) mergedEdges.push(o);
        } else {
          conflicts.push({ id, reason: `Conflicting edge changes for edge ${id}` });
          if (o) mergedEdges.push(o);
        }
      }
    }

    return {
      merged: { ...ours, nodes: mergedNodes, edges: mergedEdges },
      conflicts
    };
  }
}
