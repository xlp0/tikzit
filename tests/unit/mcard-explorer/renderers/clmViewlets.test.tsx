import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { hypermediaToAnsi } from 'clm-kernel';

import {
  TikzCardRenderer, tikzDescriptor,
  SqliteCollectionRenderer, sqliteDescriptor,
  PCardRenderer, pcardDescriptor,
  VCardRenderer, vcardDescriptor,
  SatoriCardRenderer, satoriDescriptor,
  registerClmViewlets,
} from '../../../../src/packages/mcard-explorer/renderers/clm';
import { registerBaseViewlets } from '../../../../src/packages/mcard-explorer/renderers/base';
import { RendererRegistry } from '../../../../src/packages/mcard-explorer/renderers/registry/RendererRegistry';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/fixtures/multimodal-media');

function readFixture(name: string): { bytes: Uint8Array; text: string } {
  const filePath = path.join(FIXTURES_DIR, name);
  const buf = fs.readFileSync(filePath);
  return {
    bytes: new Uint8Array(buf),
    text: buf.toString('utf8'),
  };
}

describe('Sprint 32: CLM Higher-Universe Card Renderers (U0 -> U3)', () => {
  it('registers all 5 CLM viewlets and preempts generic polyglot fallbacks', () => {
    const registry = new RendererRegistry();
    registerBaseViewlets(registry);
    registerClmViewlets(registry);

    // Assert priority ordering: Satori (500) > VCard (450) > PCard (400) > SQLite (350) > TikZ (300) > Base viewlets
    expect(satoriDescriptor.priority).toBe(500);
    expect(vcardDescriptor.priority).toBe(450);
    expect(pcardDescriptor.priority).toBe(400);
    expect(sqliteDescriptor.priority).toBe(350);
    expect(tikzDescriptor.priority).toBe(300);

    // Preemption tests
    const tikzMatch = registry.resolve({ mimeType: 'text/x-tikz', handle: 'fig.tikz', isBinary: false });
    expect(tikzMatch.id).toBe('tikz');

    const zxMatch = registry.resolve({ mimeType: 'application/vnd.zx-graph+json', handle: 'graph.zx.json', isBinary: false });
    expect(zxMatch.id).toBe('tikz');

    const sqliteMatch = registry.resolve({ mimeType: 'application/x-sqlite3', handle: 'store.db', isBinary: true });
    expect(sqliteMatch.id).toBe('sqlite');

    const pcardMatch = registry.resolve({ mimeType: 'application/vnd.pcard+json', handle: 'process.pcard.json', isBinary: false });
    expect(pcardMatch.id).toBe('pcard');

    const vcardMatch = registry.resolve({ mimeType: 'application/vnd.vcard+json', handle: 'proof.vcard.json', isBinary: false });
    expect(vcardMatch.id).toBe('vcard');

    const satoriMatch = registry.resolve({ mimeType: 'application/vnd.satori.turn+xml', handle: 'dialogue.satori.xml', isBinary: false });
    expect(satoriMatch.id).toBe('satori');
  });

  describe('1. TikzCardRenderer (U0 Diagram, viewport: zoom)', () => {
    it('declares viewport zoom and export actions', () => {
      expect(tikzDescriptor.viewport).toBe('zoom');
      const actionIds = tikzDescriptor.actions?.map(a => a.id);
      expect(actionIds).toEqual(['openInCanvas', 'export.png', 'export.pdf', 'export.svg', 'export.tikz', 'export.tex']);
    });

    it('renders with SVG/PGF preview, stats badge, open-in-canvas, and export action buttons', () => {
      const { bytes, text } = readFixture('sample.tikz');
      const html = renderToString(
        <TikzCardRenderer
          handle="sample.tikz"
          hash="blake3:tikz1"
          content={bytes}
          text={text}
          mimeType="text/x-tikz"
          universe="U0"
          category="diagram"
        />
      );

      expect(html).toContain('data-testid="renderer-tikz"');
      expect(html).toContain('data-testid="tikz-meta-badge"');
      expect(html).toContain('data-testid="btn-open-in-canvas"');
      expect(html).toContain('data-testid="btn-viewer-action-export-png"');
      expect(html).toContain('data-testid="btn-viewer-action-export-pdf"');
      expect(html).toContain('data-testid="btn-viewer-action-export-svg"');
      expect(html).toContain('data-testid="btn-viewer-action-export-tikz"');
      expect(html).toContain('data-testid="btn-viewer-action-export-tex"');
      expect(html).toContain('tikzpicture');
    });

    it('produces valid HypermediaNode and ANSI output', () => {
      const { bytes, text } = readFixture('sample.tikz');
      const node = tikzDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'text/x-tikz',
        universe: 'U0',
        category: 'diagram',
      });
      expect(node.type).toBe('card');
      const ansi = hypermediaToAnsi(node);
      expect(ansi).toContain('tikzpicture');
    });
  });

  describe('2. SqliteCollectionRenderer (U0 Archive, viewport: paged)', () => {
    it('declares viewport paged and matches application/x-sqlite3', () => {
      expect(sqliteDescriptor.viewport).toBe('paged');
      expect(sqliteDescriptor.matches({ mimeType: 'application/x-sqlite3', handle: 'collection.db', isBinary: true })).toBe(true);
    });

    it('renders SQLite metadata, table schema inspection, and import button', () => {
      const { bytes, text } = readFixture('collection.db');
      const html = renderToString(
        <SqliteCollectionRenderer
          handle="collection.db"
          hash="blake3:sql1"
          content={bytes}
          text={text}
          mimeType="application/x-sqlite3"
          universe="U0"
          category="collection"
        />
      );

      expect(html).toContain('data-testid="renderer-sqlite"');
      expect(html).toContain('data-testid="sqlite-meta-badge"');
      expect(html).toContain('data-testid="btn-import-sqlite-collection"');
      expect(html).toContain('SQLite format 3');
      expect(html).toContain('CREATE TABLE card');
    });

    it('produces valid HypermediaNode and ANSI output', () => {
      const { bytes, text } = readFixture('collection.db');
      const node = sqliteDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/x-sqlite3',
        universe: 'U0',
        category: 'collection',
      });
      expect(node.type).toBe('card');
      const ansi = hypermediaToAnsi(node);
      expect(ansi).toContain('SQLite Collection');
    });
  });

  describe('3. PCardRenderer (U1 Process, viewport: fit)', () => {
    it('declares viewport fit and matches application/vnd.pcard+json', () => {
      expect(pcardDescriptor.viewport).toBe('fit');
      expect(pcardDescriptor.matches({ mimeType: 'application/vnd.pcard+json', handle: 'workflow.pcard.json', isBinary: false })).toBe(true);
    });

    it('renders places with tokens, transitions, and flow arcs', () => {
      const { bytes, text } = readFixture('workflow.pcard.json');
      const html = renderToString(
        <PCardRenderer
          handle="workflow.pcard.json"
          hash="blake3:pcard1"
          content={bytes}
          text={text}
          mimeType="application/vnd.pcard+json"
          universe="U1"
          category="process"
        />
      );

      expect(html).toContain('data-testid="renderer-pcard"');
      expect(html).toContain('data-testid="pcard-meta-badge"');
      expect(html).toContain('data-testid="btn-fire-transition"');
      expect(html).toContain('U1_Pcard');
      expect(html).toContain('Ready');
      expect(html).toContain('Initiate');
    });

    it('produces valid HypermediaNode and ANSI output', () => {
      const { bytes, text } = readFixture('workflow.pcard.json');
      const node = pcardDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/vnd.pcard+json',
        universe: 'U1',
        category: 'process',
      });
      expect(node.type).toBe('card');
      const ansi = hypermediaToAnsi(node);
      expect(ansi).toContain('p_init');
    });
  });

  describe('4. VCardRenderer (U2 Proof, viewport: scroll)', () => {
    it('declares viewport scroll and matches application/vnd.vcard+json', () => {
      expect(vcardDescriptor.viewport).toBe('scroll');
      expect(vcardDescriptor.matches({ mimeType: 'application/vnd.vcard+json', handle: 'receipt.vcard.json', isBinary: false })).toBe(true);
    });

    it('renders Hoare sandwich [P]{C}[Q] and cryptographic receipt badge', () => {
      const { bytes, text } = readFixture('receipt.vcard.json');
      const html = renderToString(
        <VCardRenderer
          handle="receipt.vcard.json"
          hash="blake3:vcard1"
          content={bytes}
          text={text}
          mimeType="application/vnd.vcard+json"
          universe="U2_Vcard"
          category="proof"
        />
      );

      expect(html).toContain('data-testid="renderer-vcard"');
      expect(html).toContain('data-testid="vcard-receipt-badge"');
      expect(html).toContain('Verified Witness');
      expect(html).toContain('U2_Vcard');
      expect(html).toContain('x &gt;= 0');
      expect(html).toContain('y = sqrt(x)');
      expect(html).toContain('y * y == x');
      expect(html).toContain('blake3:8f4c2e1b9a7d3f5e');
    });

    it('produces witness HypermediaNode and ANSI pass badge', () => {
      const { bytes, text } = readFixture('receipt.vcard.json');
      const node = vcardDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/vnd.vcard+json',
        universe: 'U2',
        category: 'proof',
      });
      expect(node.type).toBe('witness');
      const ansi = hypermediaToAnsi(node);
      expect(ansi).toContain('WITNESS: PASS');
    });
  });

  describe('5. SatoriCardRenderer (U3 Dialogue, viewport: scroll)', () => {
    it('declares viewport scroll and matches application/vnd.satori.turn+xml', () => {
      expect(satoriDescriptor.viewport).toBe('scroll');
      expect(satoriDescriptor.matches({ mimeType: 'application/vnd.satori.turn+xml', handle: 'turn.satori.xml', isBinary: false })).toBe(true);
    });

    it('renders turn speech act bubbles, speaker avatar, and embedded card links', () => {
      const { bytes, text } = readFixture('turn.satori.xml');
      const html = renderToString(
        <SatoriCardRenderer
          handle="turn.satori.xml"
          hash="blake3:satori1"
          content={bytes}
          text={text}
          mimeType="application/vnd.satori.turn+xml"
          universe="U3"
          category="conversation"
        />
      );

      expect(html).toContain('data-testid="renderer-satori"');
      expect(html).toContain('data-testid="satori-meta-badge"');
      expect(html).toContain('data-testid="satori-turn-bubble"');
      expect(html).toContain('U3_Satori');
      expect(html).toContain('assistant');
      expect(html).toContain('Here is the verified teleportation circuit.');
      expect(html).toContain('zx:diagrams:teleportation');
      expect(html).toContain('verify-receipt');
    });

    it('produces valid HypermediaNode and ANSI output', () => {
      const { bytes, text } = readFixture('turn.satori.xml');
      const node = satoriDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/vnd.satori.turn+xml',
        universe: 'U3',
        category: 'conversation',
      });
      expect(node.type).toBe('card');
      const ansi = hypermediaToAnsi(node);
      expect(ansi).toContain('teleportation');
    });
  });
});
