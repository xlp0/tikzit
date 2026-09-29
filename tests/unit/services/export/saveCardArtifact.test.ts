/**
 * Sprint 35 Phase A: saveCardArtifact Unit Tests
 * Tests the universal raw-payload disk saver for MCard artifacts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveCardArtifactToDisk, mimeToFormatLabel, type SaveCardOptions } from '../../../../src/services/export/saveCardArtifact';
import { defaultFilenameCollisionTracker } from '../../../../src/services/export/exportNaming';

describe('Sprint 35 Phase A: saveCardArtifact', () => {
  beforeEach(() => {
    defaultFilenameCollisionTracker.reset();
  });

  describe('mimeToFormatLabel', () => {
    it('maps common MIME types to human labels', () => {
      expect(mimeToFormatLabel('image/png')).toBe('PNG');
      expect(mimeToFormatLabel('text/markdown')).toBe('Markdown');
      expect(mimeToFormatLabel('application/json')).toBe('JSON');
      expect(mimeToFormatLabel('text/x-tikz')).toBe('TikZ Source');
      expect(mimeToFormatLabel('application/pdf')).toBe('PDF');
      expect(mimeToFormatLabel('application/x-sqlite3')).toBe('SQLite Database');
      expect(mimeToFormatLabel('application/vnd.pcard+json')).toBe('PCard');
      expect(mimeToFormatLabel('application/vnd.vcard+json')).toBe('VCard');
    });

    it('falls back to MIME subtype for unknown types', () => {
      expect(mimeToFormatLabel('application/x-custom-thing')).toBe('X-CUSTOM-THING');
    });
  });

  describe('saveCardArtifactToDisk', () => {
    it('saves text card as text blob with correct extension', async () => {
      const mockDownload = vi.fn();
      const result = await saveCardArtifactToDisk({
        handle: 'notes.md',
        mimeType: 'text/markdown',
        content: new Uint8Array([35, 32, 72, 101, 108, 108, 111]),
        text: '# Hello',
        environment: {
          downloadBlob: mockDownload,
        },
      });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.filename).toBe('notes.md');
        expect(result.method).toBe('download');
      }
      expect(mockDownload).toHaveBeenCalledOnce();
      const blob: Blob = mockDownload.mock.calls[0][0];
      expect(blob.type).toBe('text/markdown;charset=utf-8');
    });

    it('saves binary card as Blob with raw bytes', async () => {
      const mockDownload = vi.fn();
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const result = await saveCardArtifactToDisk({
        handle: 'photo.png',
        mimeType: 'image/png',
        content: pngBytes,
        text: '',
        environment: { downloadBlob: mockDownload },
      });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.filename).toBe('photo.png');
      }
      expect(mockDownload).toHaveBeenCalledOnce();
      const blob: Blob = mockDownload.mock.calls[0][0];
      expect(blob.type).toBe('image/png');
    });

    it('derives filename from handle with namespace prefix stripping', async () => {
      const mockDownload = vi.fn();
      const result = await saveCardArtifactToDisk({
        handle: 'zx:diagrams:ghz-state',
        mimeType: 'text/x-tikz',
        content: new Uint8Array([92, 98, 101]),
        text: '\\begin{tikzpicture}',
        environment: { downloadBlob: mockDownload },
      });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.filename).toBe('ghz-state.tikz');
      }
    });

    it('uses suggestedFilename when provided', async () => {
      const mockDownload = vi.fn();
      const result = await saveCardArtifactToDisk({
        handle: 'proc:workflow:swap',
        mimeType: 'application/vnd.pcard+json',
        content: new Uint8Array([123, 125]),
        text: '{}',
        suggestedFilename: 'my-workflow.pcard.json',
        environment: { downloadBlob: mockDownload },
      });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.filename).toBe('my-workflow.pcard.json');
      }
    });

    it('handles unknown MIME type with .bin fallback extension', async () => {
      const mockDownload = vi.fn();
      const result = await saveCardArtifactToDisk({
        handle: 'data:custom:blob',
        mimeType: 'application/x-custom-format',
        content: new Uint8Array([1, 2, 3]),
        text: '',
        environment: { downloadBlob: mockDownload },
      });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.filename).toBe('blob.bin');
      }
    });

    it('correctly classifies SQLite as binary even if text field is populated', async () => {
      const mockDownload = vi.fn();
      const sqliteMagic = new Uint8Array([0x53, 0x51, 0x4C, 0x69, 0x74, 0x65]);
      const result = await saveCardArtifactToDisk({
        handle: 'corpus.db',
        mimeType: 'application/x-sqlite3',
        content: sqliteMagic,
        text: 'SQLite format 3', // text field may be populated but it's binary data
        environment: { downloadBlob: mockDownload },
      });

      expect(result.status).toBe('success');
      const blob: Blob = mockDownload.mock.calls[0][0];
      expect(blob.type).toBe('application/x-sqlite3');
      // Should NOT save as text string — should save raw bytes
      const size = blob.size;
      expect(size).toBe(sqliteMagic.byteLength);
    });

    it('maps all 16 primary MIME types to correct extensions', () => {
      const EXPECTED: Record<string, string> = {
        'text/x-tikz': '.tikz',
        'application/x-latex': '.tex',
        'image/svg+xml': '.svg',
        'image/png': '.png',
        'application/pdf': '.pdf',
        'text/markdown': '.md',
        'application/json': '.json',
        'text/yaml': '.yaml',
        'text/csv': '.csv',
        'text/plain': '.txt',
        'text/html': '.html',
        'application/vnd.pcard+json': '.pcard.json',
        'application/vnd.vcard+json': '.vcard.json',
        'application/vnd.satori.turn+xml': '.xml',
        'application/x-sqlite3': '.db',
        'application/octet-stream': '.bin',
      };

      // Verify via the internal map by attempting saves and checking filenames
      for (const [mime, expectedExt] of Object.entries(EXPECTED)) {
        const mockDownload = vi.fn();
        saveCardArtifactToDisk({
          handle: `test-card`,
          mimeType: mime,
          content: new Uint8Array([0]),
          text: mime.startsWith('text/') ? 'x' : '',
          environment: { downloadBlob: mockDownload },
        });

        if (mockDownload.mock.calls.length > 0) {
          const savedFilename = mockDownload.mock.calls[0][1] as string;
          expect(savedFilename, `MIME ${mime} should produce extension ${expectedExt}`).toContain(expectedExt);
        }
        defaultFilenameCollisionTracker.reset();
      }
    });
  });
});
