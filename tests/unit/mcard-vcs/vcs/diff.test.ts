import { describe, it, expect } from 'vitest';
import { SemanticDiffEngine } from '../../../../src/packages/mcard-vcs/vcs/diff/SemanticDiffEngine';
import { GraphAstDiffer } from '../../../../src/packages/mcard-vcs/vcs/diff/GraphAstDiffer';

describe('Sprint 26: Semantic Diff Lenses (Text & Graph AST)', () => {
  const diffEngine = new SemanticDiffEngine();
  const graphDiffer = new GraphAstDiffer();

  it('26-DOD-06: produces line-based text diffs with unified hunks', () => {
    const textA = 'line 1\nline 2\nline 3';
    const textB = 'line 1\nline 2 modified\nline 3\nline 4';

    const res = diffEngine.diff('doc:test', textA, textB);
    expect(res.isIdentical).toBe(false);
    expect(res.additions).toBe(2);
    expect(res.deletions).toBe(1);
    expect(res.hunks.length).toBeGreaterThan(0);
    expect(res.hunks[0].lines.some(l => l.startsWith('+line 2 modified'))).toBe(true);
    expect(res.hunks[0].lines.some(l => l.startsWith('-line 2'))).toBe(true);
  });

  it('returns identical result when contents match', () => {
    const text = 'exact content';
    const res = diffEngine.diff('doc:same', text, text);
    expect(res.isIdentical).toBe(true);
    expect(res.additions).toBe(0);
    expect(res.deletions).toBe(0);
    expect(res.hunks.length).toBe(0);
  });

  it('26-DOD-07: GraphAstDiffer detects additions, deletions, moves, and modifications in graphs', () => {
    const graphA = {
      nodes: [
        { id: 'n1', x: 0, y: 0, style: 'dot' },
        { id: 'n2', x: 10, y: 10, style: 'box' }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', style: 'plain' }
      ]
    };

    const graphB = {
      nodes: [
        { id: 'n1', x: 5, y: 5, style: 'dot' }, // moved
        { id: 'n3', x: 20, y: 20, style: 'circle' } // added (n2 removed)
      ],
      edges: [
        { id: 'e2', source: 'n1', target: 'n3', style: 'dashed' } // added (e1 removed)
      ]
    };

    const diff = graphDiffer.diff(graphA, graphB);
    expect(diff.isIdentical).toBe(false);

    const n1Diff = diff.nodes.find(n => n.id === 'n1');
    expect(n1Diff?.change).toBe('modified');
    expect(n1Diff?.after?.x).toBe(5);

    const n2Diff = diff.nodes.find(n => n.id === 'n2');
    expect(n2Diff?.change).toBe('removed');

    const n3Diff = diff.nodes.find(n => n.id === 'n3');
    expect(n3Diff?.change).toBe('added');

    const e1Diff = diff.edges.find(e => e.id === 'e1');
    expect(e1Diff?.change).toBe('removed');

    const e2Diff = diff.edges.find(e => e.id === 'e2');
    expect(e2Diff?.change).toBe('added');
  });

  it('SemanticDiffEngine integrates GraphAstDiffer automatically on JSON diagrams', () => {
    const diagram1 = JSON.stringify({
      nodes: [{ id: 'a', x: 1, y: 2, style: 'green' }]
    });
    const diagram2 = JSON.stringify({
      nodes: [{ id: 'a', x: 1, y: 2, style: 'blue' }]
    });

    const res = diffEngine.diff('diagram:main', diagram1, diagram2);
    expect(res.graphDiff).toBeDefined();
    expect(res.graphDiff?.nodes.length).toBe(1);
    expect(res.graphDiff?.nodes[0].change).toBe('modified');
  });
});
