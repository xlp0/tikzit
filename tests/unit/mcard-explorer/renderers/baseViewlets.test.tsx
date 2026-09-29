import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { hypermediaToAnsi } from 'clm-kernel';

import {
  TextCardRenderer, textDescriptor,
  MarkdownCardRenderer, markdownDescriptor,
  DataCardRenderer, dataDescriptor,
  YamlCardRenderer, yamlDescriptor,
  CsvCardRenderer, csvDescriptor,
  ImageCardRenderer, imageDescriptor,
  PdfCardRenderer, pdfDescriptor,
  BinaryHexCardRenderer, binaryHexDescriptor,
  registerBaseViewlets,
} from '../../../../src/packages/mcard-explorer/renderers/base';
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

describe('Sprint 31: Base Polyglot Viewlet Suite (D45 Fixture Corpus)', () => {
  it('registers all 8 base viewlets into RendererRegistry', () => {
    const registry = new RendererRegistry();
    registerBaseViewlets(registry);
    const list = registry.listAll();
    expect(list.length).toBe(8);

    const ids = list.map(d => d.id);
    expect(ids).toContain('image');
    expect(ids).toContain('pdf');
    expect(ids).toContain('markdown');
    expect(ids).toContain('csv');
    expect(ids).toContain('yaml');
    expect(ids).toContain('data');
    expect(ids).toContain('text');
    expect(ids).toContain('binary-hex');

    // Test fallbacks
    const textFallback = registry.getFallbackDescriptor(false);
    expect(textFallback.id).toBe('text');
    const binaryFallback = registry.getFallbackDescriptor(true);
    expect(binaryFallback.id).toBe('binary-hex');
  });

  describe('1. TextCardRenderer (viewport: scroll)', () => {
    it('declares viewport scroll and matches text mime', () => {
      expect(textDescriptor.viewport).toBe('scroll');
      expect(textDescriptor.matches({ mimeType: 'text/plain', handle: 'test.txt', isBinary: false })).toBe(true);
    });

    it('renders with line numbers, wrap toggle, copy button, and metadata', () => {
      const { bytes, text } = readFixture('notes.md');
      const html = renderToString(
        <TextCardRenderer
          handle="notes.md"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="text/plain"
          universe="U0"
          category="text"
        />
      );

      expect(html).toContain('data-testid="renderer-text"');
      expect(html).toContain('data-testid="text-metadata-badge"');
      expect(html).toContain('data-testid="btn-toggle-line-numbers"');
      expect(html).toContain('data-testid="btn-toggle-word-wrap"');
      expect(html).toContain('data-testid="btn-copy-text"');
    });

    it('produces valid HypermediaNode and ANSI output', () => {
      const { bytes, text } = readFixture('notes.md');
      const node = textDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'text/plain',
        universe: 'U0',
        category: 'text',
      });
      expect(node.type).toBe('text');
      const ansi = hypermediaToAnsi(node);
      expect(ansi.length).toBeGreaterThan(0);
      expect(ansi).toContain('Quantum Process');
    });
  });

  describe('2. MarkdownCardRenderer (viewport: split)', () => {
    it('declares viewport split and matches markdown', () => {
      expect(markdownDescriptor.viewport).toBe('split');
      expect(markdownDescriptor.matches({ mimeType: 'text/markdown', handle: 'notes.md', isBinary: false })).toBe(true);
    });

    it('renders headings, blockquotes, lists and view-mode toggles', () => {
      const { bytes, text } = readFixture('notes.md');
      const html = renderToString(
        <MarkdownCardRenderer
          handle="notes.md"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="text/markdown"
          universe="U0"
          category="text"
        />
      );

      expect(html).toContain('data-testid="renderer-markdown"');
      expect(html).toContain('data-testid="toggle-markdown-rendered"');
      expect(html).toContain('data-testid="toggle-markdown-split"');
      expect(html).toContain('data-testid="toggle-markdown-raw"');
      expect(html).toContain('Quantum Process Foundations');
    });

    it('produces valid HypermediaNode', () => {
      const { bytes, text } = readFixture('notes.md');
      const node = markdownDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'text/markdown',
        universe: 'U0',
        category: 'text',
      });
      expect(node.type).toBe('card');
      const ansi = hypermediaToAnsi(node);
      expect(ansi.length).toBeGreaterThan(0);
    });
  });

  describe('3. DataCardRenderer (viewport: scroll)', () => {
    it('declares viewport scroll and matches JSON/XML', () => {
      expect(dataDescriptor.viewport).toBe('scroll');
      expect(dataDescriptor.matches({ mimeType: 'application/json', handle: 'graph.json', isBinary: false })).toBe(true);
    });

    it('renders tree nodes, search filter, and expand/collapse buttons', () => {
      const { bytes, text } = readFixture('graph.json');
      const html = renderToString(
        <DataCardRenderer
          handle="graph.json"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="application/json"
          universe="U0"
          category="data"
        />
      );

      expect(html).toContain('data-testid="renderer-data"');
      expect(html).toContain('data-testid="input-data-search"');
      expect(html).toContain('data-testid="btn-expand-all"');
      expect(html).toContain('data-testid="btn-collapse-all"');
      expect(html).toContain('data-testid="btn-copy-json"');
      expect(html).toContain('data-testid="data-tree-node"');
    });

    it('produces valid HypermediaNode', () => {
      const { bytes, text } = readFixture('graph.json');
      const node = dataDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/json',
        universe: 'U0',
        category: 'data',
      });
      expect(node.type).toBe('card');
      expect(hypermediaToAnsi(node).length).toBeGreaterThan(0);
    });
  });

  describe('4. YamlCardRenderer (viewport: split)', () => {
    it('declares viewport split and matches YAML', () => {
      expect(yamlDescriptor.viewport).toBe('split');
      expect(yamlDescriptor.matches({ mimeType: 'application/x-yaml', handle: 'config.yaml', isBinary: false })).toBe(true);
    });

    it('renders metadata badge, copy buttons, and formatted YAML lines', () => {
      const { bytes, text } = readFixture('config.yaml');
      const html = renderToString(
        <YamlCardRenderer
          handle="config.yaml"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="application/x-yaml"
          universe="U0"
          category="data"
        />
      );

      expect(html).toContain('data-testid="renderer-yaml"');
      expect(html).toContain('data-testid="yaml-metadata-badge"');
      expect(html).toContain('data-testid="btn-copy-as-json"');
      expect(html).toContain('data-testid="btn-copy-yaml"');
    });

    it('produces valid HypermediaNode', () => {
      const { bytes, text } = readFixture('config.yaml');
      const node = yamlDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/x-yaml',
        universe: 'U0',
        category: 'data',
      });
      expect(node.type).toBe('text');
      expect(hypermediaToAnsi(node).length).toBeGreaterThan(0);
    });
  });

  describe('5. CsvCardRenderer (viewport: paged)', () => {
    it('declares viewport paged and matches CSV', () => {
      expect(csvDescriptor.viewport).toBe('paged');
      expect(csvDescriptor.matches({ mimeType: 'text/csv', handle: 'dataset.csv', isBinary: false })).toBe(true);
    });

    it('renders table headers, rows, pager controls, and search input', () => {
      const { bytes, text } = readFixture('dataset.csv');
      const html = renderToString(
        <CsvCardRenderer
          handle="dataset.csv"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="text/csv"
          universe="U0"
          category="data"
        />
      );

      expect(html).toContain('data-testid="renderer-csv"');
      expect(html).toContain('data-testid="csv-metadata-badge"');
      expect(html).toContain('data-testid="input-csv-search"');
      expect(html).toContain('data-testid="btn-csv-prev"');
      expect(html).toContain('data-testid="btn-csv-next"');
      expect(html).toContain('data-testid="csv-page-indicator"');
      expect(html).toContain('Alice');
      expect(html).toContain('Bob');
    });

    it('produces valid HypermediaNode', () => {
      const { bytes, text } = readFixture('dataset.csv');
      const node = csvDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'text/csv',
        universe: 'U0',
        category: 'data',
      });
      expect(node.type).toBe('card');
      expect(hypermediaToAnsi(node).length).toBeGreaterThan(0);
    });
  });

  describe('6. ImageCardRenderer (viewport: zoom)', () => {
    it('declares viewport zoom and matches image formats', () => {
      expect(imageDescriptor.viewport).toBe('zoom');
      expect(imageDescriptor.matches({ mimeType: 'image/png', handle: 'icon.png', isBinary: true })).toBe(true);
      expect(imageDescriptor.matches({ mimeType: 'image/svg+xml', handle: 'logo.svg', isBinary: false })).toBe(true);
    });

    it('renders SVG image with zoom controls and metadata badge', () => {
      const { bytes, text } = readFixture('logo.svg');
      const html = renderToString(
        <ImageCardRenderer
          handle="logo.svg"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="image/svg+xml"
          universe="U0"
          category="diagram"
        />
      );

      expect(html).toContain('data-testid="renderer-image"');
      expect(html).toContain('data-testid="image-meta-badge"');
      expect(html).toContain('data-testid="btn-zoom-in"');
      expect(html).toContain('data-testid="btn-zoom-out"');
      expect(html).toContain('data-testid="btn-zoom-reset"');
      expect(html).toContain('data-testid="image-zoom-level"');
    });

    it('produces valid HypermediaNode', () => {
      const { bytes, text } = readFixture('icon.png');
      const node = imageDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'image/png',
        universe: 'U0',
        category: 'blob',
      });
      expect(node.type).toBe('card');
      expect(hypermediaToAnsi(node)).toContain('Image: image/png');
    });
  });

  describe('7. PdfCardRenderer (viewport: paged)', () => {
    it('declares viewport paged and matches PDF', () => {
      expect(pdfDescriptor.viewport).toBe('paged');
      expect(pdfDescriptor.matches({ mimeType: 'application/pdf', handle: 'paper.pdf', isBinary: true })).toBe(true);
      expect(pdfDescriptor.actions?.[0].id).toBe('export.pdf');
    });

    it('renders headless fallback when running in server environment', () => {
      const { bytes, text } = readFixture('paper.pdf');
      const html = renderToString(
        <PdfCardRenderer
          handle="paper.pdf"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="application/pdf"
          universe="U0"
          category="document"
        />
      );

      expect(html).toContain('data-testid="renderer-pdf"');
      expect(html).toContain('data-testid="pdf-meta-badge"');
      expect(html).toContain('data-testid="btn-pdf-download"');
      expect(html).toContain('data-testid="pdf-headless-fallback"');
    });

    it('produces valid HypermediaNode', () => {
      const { bytes, text } = readFixture('paper.pdf');
      const node = pdfDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/pdf',
        universe: 'U0',
        category: 'document',
      });
      expect(node.type).toBe('card');
      expect(hypermediaToAnsi(node)).toContain('PDF Document');
    });
  });

  describe('8. BinaryHexCardRenderer (viewport: scroll)', () => {
    it('declares viewport scroll and matches binary blobs', () => {
      expect(binaryHexDescriptor.viewport).toBe('scroll');
      expect(binaryHexDescriptor.matches({ mimeType: 'application/octet-stream', handle: 'blob.bin', isBinary: true })).toBe(true);
    });

    it('renders 3-column hex dump with offset, bytes, ascii, and pager controls', () => {
      const { bytes, text } = readFixture('blob.bin');
      const html = renderToString(
        <BinaryHexCardRenderer
          handle="blob.bin"
          hash="blake3:abc"
          content={bytes}
          text={text}
          mimeType="application/octet-stream"
          universe="U0"
          category="blob"
        />
      );

      expect(html).toContain('data-testid="renderer-binary-hex"');
      expect(html).toContain('data-testid="hex-byte-count"');
      expect(html).toContain('data-testid="hex-offset-badge"');
      expect(html).toContain('data-testid="btn-hex-prev"');
      expect(html).toContain('data-testid="btn-hex-next"');
      expect(html).toContain('256 bytes total');
    });

    it('produces valid HypermediaNode and formatted ANSI hex dump', () => {
      const { bytes, text } = readFixture('blob.bin');
      const node = binaryHexDescriptor.toHypermediaNode!(bytes, text, {
        mime: 'application/octet-stream',
        universe: 'U0',
        category: 'blob',
      });
      expect(node.type).toBe('text');
      const ansi = hypermediaToAnsi(node);
      expect(ansi.length).toBeGreaterThan(0);
      expect(ansi).toContain('00000000');
    });
  });
});
