import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { hypermediaToAnsi } from 'clm-kernel';

import { MCardViewer, renderCardToHypermedia } from '../../../../src/packages/mcard-explorer/ui/MCardViewer';
import type { CardContentDto, CardContentProvider } from '../../../../src/packages/mcard-explorer/core/datasource/types';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/fixtures/multimodal-media');

function readFixture(name: string): { bytes: Uint8Array; text: string } {
  const filePath = path.join(FIXTURES_DIR, name);
  const buf = fs.readFileSync(filePath);
  return {
    bytes: new Uint8Array(buf),
    text: buf.toString('utf8'),
  };
}

describe('Sprint 33: Universal MCardViewer', () => {
  it('renders empty state when no card is provided', () => {
    const html = renderToString(<MCardViewer card={null} />);
    expect(html).toContain('data-testid="mcard-viewer"');
    expect(html).toContain('data-testid="mcard-viewer-empty"');
    expect(html).toContain('Select an MCard');
  });

  describe('Multimodal Universe Level Rendering (U0 -> U3)', () => {
    it('renders U0 TikZ diagram card with zoom viewport mode and export actions', () => {
      const { bytes, text } = readFixture('sample.tikz');
      const card: CardContentDto = {
        handle: 'zx:diagrams:ghz',
        hash: 'blake3:7a4f1234567890abcdef',
        content: bytes,
        text,
        mimeType: 'text/x-tikz',
        payloadKind: 'text',
        metadata: { universe: 'U0' },
      };

      const html = renderToString(
        <MCardViewer card={card} />
      );

      expect(html).toContain('data-testid="mcard-viewer"');
      expect(html).toContain('data-viewport-mode="zoom"');
      expect(html).toContain('data-testid="mcard-viewer-handle"');
      expect(html).toContain('zx:diagrams:ghz');
      expect(html).toContain('data-testid="mcard-viewer-universe"');
      expect(html).toContain('data-testid="mcard-viewer-mime"');
      expect(html).toContain('text/x-tikz');
      expect(html).toContain('data-testid="btn-copy-hash"');
      expect(html).toContain('data-testid="renderer-tikz"');
      expect(html).toContain('data-testid="viewer-zoom-controls"');
      expect(html).toContain('data-testid="btn-viewer-action-export-png"');
      expect(html).toContain('data-testid="btn-viewer-action-export-pdf"');
    });

    it('renders U1 PCard process with fit viewport mode and Petri topology', () => {
      const { bytes, text } = readFixture('workflow.pcard.json');
      const card: CardContentDto = {
        handle: 'proc:workflow:swap',
        hash: 'blake3:pcard777',
        content: bytes,
        text,
        mimeType: 'application/vnd.pcard+json',
        payloadKind: 'structured',
      };

      const html = renderToString(<MCardViewer card={card} />);
      expect(html).toContain('data-viewport-mode="fit"');
      expect(html).toContain('data-testid="renderer-pcard"');
      expect(html).toContain('proc:workflow:swap');
      expect(html).toContain('U1_Pcard');
    });

    it('renders U2 VCard witness receipt with scroll viewport mode', () => {
      const { bytes, text } = readFixture('receipt.vcard.json');
      const card: CardContentDto = {
        handle: 'proof:bell:receipt',
        hash: 'blake3:vcard888',
        content: bytes,
        text,
        mimeType: 'application/vnd.vcard+json',
        payloadKind: 'structured',
      };

      const html = renderToString(<MCardViewer card={card} />);
      expect(html).toContain('data-viewport-mode="scroll"');
      expect(html).toContain('data-testid="renderer-vcard"');
      expect(html).toContain('proof:bell:receipt');
      expect(html).toContain('Verified Witness');
      expect(html).toContain('Hoare Triad Sandwich');
    });

    it('renders U3 Satori dialogue turn with scroll viewport mode', () => {
      const { bytes, text } = readFixture('turn.satori.xml');
      const card: CardContentDto = {
        handle: 'satori:dialogue:turn1',
        hash: 'blake3:satori999',
        content: bytes,
        text,
        mimeType: 'application/vnd.satori.turn+xml',
        payloadKind: 'satori',
      };

      const html = renderToString(<MCardViewer card={card} />);
      expect(html).toContain('data-viewport-mode="scroll"');
      expect(html).toContain('data-testid="renderer-satori"');
      expect(html).toContain('data-testid="satori-turn-bubble"');
      expect(html).toContain('assistant');
    });
  });

  describe('Adaptive Viewport Modes (D44)', () => {
    it('sets data-viewport-mode="zoom" for raster images', () => {
      const { bytes } = readFixture('icon.png');
      const card: CardContentDto = {
        handle: 'icon.png',
        hash: 'blake3:icon',
        content: bytes,
        text: '',
        mimeType: 'image/png',
        payloadKind: 'binary',
      };
      const html = renderToString(<MCardViewer card={card} />);
      expect(html).toContain('data-viewport-mode="zoom"');
      expect(html).toContain('data-testid="viewer-zoom-controls"');
    });

    it('sets data-viewport-mode="paged" for PDF documents', () => {
      const { bytes } = readFixture('paper.pdf');
      const card: CardContentDto = {
        handle: 'paper.pdf',
        hash: 'blake3:pdf',
        content: bytes,
        text: '',
        mimeType: 'application/pdf',
        payloadKind: 'binary',
      };
      const html = renderToString(<MCardViewer card={card} />);
      expect(html).toContain('data-viewport-mode="paged"');
      expect(html).toContain('data-testid="viewer-pager"');
    });

    it('sets data-viewport-mode="split" for Markdown documents', () => {
      const { bytes, text } = readFixture('notes.md');
      const card: CardContentDto = {
        handle: 'notes.md',
        hash: 'blake3:notes',
        content: bytes,
        text,
        mimeType: 'text/markdown',
        payloadKind: 'text',
      };
      const html = renderToString(<MCardViewer card={card} />);
      expect(html).toContain('data-viewport-mode="split"');
    });
  });

  describe('Headless Hypermedia Projection (Gap 13)', () => {
    it('renders valid HypermediaNode trees and ANSI for each media type without React', () => {
      const fixtures = [
        { name: 'sample.tikz', mime: 'text/x-tikz', kind: 'text' as const },
        { name: 'workflow.pcard.json', mime: 'application/vnd.pcard+json', kind: 'structured' as const },
        { name: 'receipt.vcard.json', mime: 'application/vnd.vcard+json', kind: 'structured' as const },
        { name: 'turn.satori.xml', mime: 'application/vnd.satori.turn+xml', kind: 'satori' as const },
        { name: 'notes.md', mime: 'text/markdown', kind: 'text' as const },
        { name: 'dataset.csv', mime: 'text/csv', kind: 'text' as const },
      ];

      for (const f of fixtures) {
        const { bytes, text } = readFixture(f.name);
        const card: CardContentDto = {
          handle: f.name,
          hash: `blake3:${f.name}`,
          content: bytes,
          text,
          mimeType: f.mime,
          payloadKind: f.kind,
        };

        const node = renderCardToHypermedia(card);
        expect(node).toBeDefined();
        const ansi = hypermediaToAnsi(node);
        expect(ansi.length).toBeGreaterThan(0);
      }
    });
  });
});
