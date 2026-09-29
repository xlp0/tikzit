/**
 * tests/conformance/headless-rendering.test.ts - Sprint 34
 * Headless Rendering Conformance (Gap 13).
 * Verifies toHypermediaNode() -> hypermediaToAnsi() across all 14 multimodal media fixtures.
 * Proves that the full viewlet suite renders without React in headless environments.
 * Contract D: <= 250 LOC ceiling.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { hypermediaToAnsi } from 'clm-kernel';
import {
  RendererRegistry,
  registerBaseViewlets,
  registerClmViewlets,
} from '../../src/packages/mcard-explorer';
import { CardTypeJudgeService } from '../../src/packages/mcard-vcs';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/fixtures/multimodal-media');

function loadFixture(filename: string): { bytes: Uint8Array; text: string } {
  const filePath = path.join(FIXTURES_DIR, filename);
  const buf = fs.readFileSync(filePath);
  return {
    bytes: new Uint8Array(buf),
    text: buf.toString('utf8'),
  };
}

describe('Headless Rendering Conformance (Gap 13, Sprint 34)', () => {
  let registry: RendererRegistry;
  let judgeService: CardTypeJudgeService;

  beforeAll(() => {
    registry = new RendererRegistry();
    registerBaseViewlets(registry);
    registerClmViewlets(registry);
    judgeService = new CardTypeJudgeService();
  });

  const FIXTURES = [
    { name: 'sample.tikz', expectedDescriptor: 'tikz', expectedMime: 'text/x-tikz' },
    { name: 'notes.md', expectedDescriptor: 'markdown', expectedMime: 'text/markdown' },
    { name: 'graph.json', expectedDescriptor: 'data', expectedMime: 'application/json' },
    { name: 'sample.zx.json', expectedDescriptor: 'tikz', expectedMime: 'application/vnd.zx-graph+json' },
    { name: 'config.yaml', expectedDescriptor: 'yaml', expectedMime: 'application/yaml' },
    { name: 'dataset.csv', expectedDescriptor: 'csv', expectedMime: 'text/csv' },
    { name: 'icon.png', expectedDescriptor: 'image', expectedMime: 'image/png' },
    { name: 'logo.svg', expectedDescriptor: 'image', expectedMime: 'image/svg+xml' },
    { name: 'paper.pdf', expectedDescriptor: 'pdf', expectedMime: 'application/pdf' },
    { name: 'blob.bin', expectedDescriptor: 'binary-hex', expectedMime: 'application/octet-stream' },
    { name: 'collection.db', expectedDescriptor: 'sqlite', expectedMime: 'application/x-sqlite3' },
    { name: 'workflow.pcard.json', expectedDescriptor: 'pcard', expectedMime: 'application/vnd.pcard+json' },
    { name: 'receipt.vcard.json', expectedDescriptor: 'vcard', expectedMime: 'application/vnd.vcard+json' },
    { name: 'turn.satori.xml', expectedDescriptor: 'satori', expectedMime: 'application/vnd.satori.turn+xml' },
  ];

  it.each(FIXTURES)(
    'converts $name to HypermediaNode and renders non-empty ANSI string via $expectedDescriptor',
    async ({ name, expectedDescriptor, expectedMime }) => {
      const { bytes, text } = loadFixture(name);

      const judgment = judgeService.judge({
        filename: name,
        data: bytes,
      });

      expect(judgment.mime).toBe(expectedMime);

      const descriptor = registry.resolve({
        mimeType: judgment.mime,
        handle: `corpus:test:${name}`,
        isBinary: judgment.isBinary,
        universe: judgment.universe,
        category: judgment.clmCategory ?? 'data',
        content: bytes,
      });

      expect(descriptor).toBeDefined();
      expect(descriptor.id).toBe(expectedDescriptor);
      expect(descriptor.toHypermediaNode).toBeDefined();

      const node = descriptor.toHypermediaNode!(bytes, text, {
        mime: judgment.mime,
        universe: judgment.universe,
        category: judgment.clmCategory ?? 'data',
      });
      expect(node).toBeDefined();
      expect(node.type).toBeDefined();

      const ansi = hypermediaToAnsi(node);
      expect(typeof ansi).toBe('string');
      expect(ansi.length).toBeGreaterThan(0);
    }
  );

  it('proves 100% headless rendering across entire multimodal fixture suite without React DOM', async () => {
    for (const { name } of FIXTURES) {
      const { bytes, text } = loadFixture(name);
      const judgment = judgeService.judge({
        filename: name,
        data: bytes,
      });
      const descriptor = registry.resolve({
        mimeType: judgment.mime,
        handle: `corpus:test:${name}`,
        isBinary: judgment.isBinary,
        universe: judgment.universe,
        category: judgment.clmCategory ?? 'data',
        content: bytes,
      });
      const node = descriptor.toHypermediaNode!(bytes, text, {
        mime: judgment.mime,
        universe: judgment.universe,
        category: judgment.clmCategory ?? 'data',
      });
      const ansi = hypermediaToAnsi(node);
      expect(ansi.trim().length).toBeGreaterThan(0);
    }
  });
});
