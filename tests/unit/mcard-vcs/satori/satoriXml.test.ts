import { describe, it, expect } from 'vitest';
import { SatoriXmlCodec } from '../../../../src/packages/mcard-vcs/satori/SatoriXmlCodec';
import type {
  SatoriCardElement,
  SatoriVersionDagElement,
  SatoriDiffViewElement,
  SatoriExplorerElement
} from '../../../../src/packages/mcard-vcs/satori/types';

describe('Sprint 27: Satori Protocol XML Codec', () => {
  const codec = new SatoriXmlCodec();

  it('27-DOD-07 & 27-DOD-08: serializes and parses <card> tag', () => {
    const card: SatoriCardElement = {
      tag: 'card',
      attrs: {
        hash: 'blake3:abc123',
        handle: 'doc:test',
        type: 'mcard',
        readonly: true
      }
    };

    const xml = codec.serializeCard(card);
    expect(xml).toContain('hash="blake3:abc123"');
    expect(xml).toContain('handle="doc:test"');
    expect(xml).toContain('readonly="true"');

    const parsed = codec.parseXml(xml);
    expect(parsed?.tag).toBe('card');
    expect(parsed?.attrs.hash).toBe('blake3:abc123');
    expect(parsed?.attrs.handle).toBe('doc:test');
  });

  it('serializes and parses <version-dag> and nested <commit> tags', () => {
    const dag: SatoriVersionDagElement = {
      tag: 'version-dag',
      attrs: {
        handle: 'zx:circuit:teleport',
        headCommit: 'blake3:c2',
        branch: 'master'
      },
      children: [
        {
          tag: 'commit',
          attrs: {
            id: 'blake3:c1',
            authorDid: 'did:key:alice',
            date: '2026-09-29T10:00:00Z',
            message: 'Init circuit'
          }
        },
        {
          tag: 'commit',
          attrs: {
            id: 'blake3:c2',
            parent: 'blake3:c1',
            authorDid: 'did:key:bob',
            date: '2026-09-29T10:15:00Z',
            message: 'Add measurement'
          }
        }
      ]
    };

    const xml = codec.serializeVersionDag(dag);
    expect(xml).toContain('<version-dag handle="zx:circuit:teleport"');
    expect(xml).toContain('<commit id="blake3:c1"');
    expect(xml).toContain('<commit id="blake3:c2"');

    const parsed = codec.parseXml(xml);
    expect(parsed?.tag).toBe('version-dag');
    expect(parsed?.attrs.handle).toBe('zx:circuit:teleport');
    expect(parsed?.children.length).toBe(2);
    expect(parsed?.children[0].attrs.id).toBe('blake3:c1');
    expect(parsed?.children[1].attrs.parent).toBe('blake3:c1');
  });

  it('serializes and parses <diff-view> tag with unified hunks', () => {
    const diff: SatoriDiffViewElement = {
      tag: 'diff-view',
      attrs: {
        handle: 'code:example',
        base: 'blake3:b1',
        target: 'blake3:b2',
        additions: 1,
        deletions: 1
      },
      content: '@@ -1,1 +1,1 @@\n-old text\n+new text'
    };

    const xml = codec.serializeDiffView(diff);
    expect(xml).toContain('<diff-view handle="code:example"');
    expect(xml).toContain('+new text');

    const parsed = codec.parseXml(xml);
    expect(parsed?.tag).toBe('diff-view');
    expect(parsed?.attrs.additions).toBe(1);
    expect(parsed?.attrs.deletions).toBe(1);
    expect(parsed?.content).toContain('+new text');
  });

  it('serializes and parses <mcard-explorer> and <mcard-item> tags', () => {
    const explorer: SatoriExplorerElement = {
      tag: 'mcard-explorer',
      attrs: {
        query: 'quantum',
        view: 'tree',
        limit: 10
      },
      children: [
        {
          tag: 'mcard-item',
          attrs: {
            handle: 'q:1',
            hash: 'blake3:q1',
            mimeType: 'text/plain'
          }
        }
      ]
    };

    const xml = codec.serializeExplorer(explorer);
    expect(xml).toContain('<mcard-explorer query="quantum"');
    expect(xml).toContain('<mcard-item handle="q:1"');

    const parsed = codec.parseXml(xml);
    expect(parsed?.tag).toBe('mcard-explorer');
    expect(parsed?.attrs.query).toBe('quantum');
    expect(parsed?.children?.length).toBe(1);
    expect(parsed?.children?.[0].attrs.handle).toBe('q:1');
  });
});
