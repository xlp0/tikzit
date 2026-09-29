/**
 * tests/unit/services/clm/cardPersistenceService.test.ts — Sprint 35 Phase B
 * Tests commitCardToDatabase: VFS commit, text/binary classification, error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the vcsAdapterInstance module to control ensureVcsInitialized
const mockVfsSet = vi.fn<(handle: string, content: string | Uint8Array, options?: Record<string, unknown>) => Promise<string>>();
const mockEnsureVcsInitialized = vi.fn();

const mockSaveArtifact = vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.mock('../../../../src/services/clm/vcsAdapterInstance', () => ({
  ensureVcsInitialized: () => mockEnsureVcsInitialized(),
}));

// Phase B regression guard: the database path must never route through disk APIs.
vi.mock('../../../../src/services/export/saveArtifact', () => ({
  saveArtifact: (...args: unknown[]) => mockSaveArtifact(...args),
}));

import { commitCardToDatabase, commitExportedArtifact } from '../../../../src/services/clm/cardPersistenceService';
import type { DiagramExportCoordinator } from '../../../../src/services/export/diagramExportCoordinator';

describe('Sprint 35 Phase B: cardPersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureVcsInitialized.mockResolvedValue({ vfs: { set: mockVfsSet } });
    mockVfsSet.mockResolvedValue('abc123hash456');
  });

  it('commits text card to database with Blake3 hash', async () => {
    const result = await commitCardToDatabase({
      handle: 'docs/readme.md',
      content: new Uint8Array([72, 101, 108, 108, 111]),
      text: '# Hello',
      mimeType: 'text/markdown',
    });

    expect(result.success).toBe(true);
    expect(result.hash).toBe('abc123hash456');
    expect(result.handle).toBe('docs/readme.md');
    expect(result.message).toContain('abc123hash456'.slice(0, 16));

    // Text payload should be passed as string, not Uint8Array
    expect(mockVfsSet).toHaveBeenCalledWith(
      'docs/readme.md',
      '# Hello',
      expect.objectContaining({ mimeType: 'text/markdown' })
    );
  });

  it('commits binary card (image) as Uint8Array', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const result = await commitCardToDatabase({
      handle: 'images/logo.png',
      content: pngBytes,
      text: undefined,
      mimeType: 'image/png',
    });

    expect(result.success).toBe(true);
    expect(mockVfsSet).toHaveBeenCalledWith(
      'images/logo.png',
      pngBytes,
      expect.objectContaining({ mimeType: 'image/png' })
    );
  });

  it('passes authorDid, universe, and metadata through to VFS', async () => {
    await commitCardToDatabase({
      handle: 'test/card',
      content: new Uint8Array([1]),
      text: 'data',
      mimeType: 'text/plain',
      authorDid: 'did:key:user123',
      universe: 'U3',
      category: 'document',
      metadata: { label: 'test' },
    });

    expect(mockVfsSet).toHaveBeenCalledWith(
      'test/card',
      'data',
      expect.objectContaining({
        authorDid: 'did:key:user123',
        universe: 'U3',
        category: 'document',
        companionMetadata: { label: 'test' },
      })
    );
  });

  it('treats PDF as binary even if text is present', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    await commitCardToDatabase({
      handle: 'docs/paper.pdf',
      content: pdfBytes,
      text: '%PDF header text',
      mimeType: 'application/pdf',
    });

    // PDF should be sent as binary
    expect(mockVfsSet).toHaveBeenCalledWith(
      'docs/paper.pdf',
      pdfBytes,
      expect.anything()
    );
  });

  it('returns failure when VFS is unavailable', async () => {
    mockEnsureVcsInitialized.mockRejectedValue(new Error('IndexedDB not available'));

    const result = await commitCardToDatabase({
      handle: 'test/card',
      content: new Uint8Array([1]),
      mimeType: 'text/plain',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Database unavailable');
    expect(result.message).toContain('IndexedDB not available');
  });

  it('returns failure when vfs.set() throws', async () => {
    mockVfsSet.mockRejectedValue(new Error('Disk full'));

    const result = await commitCardToDatabase({
      handle: 'test/card',
      content: new Uint8Array([1]),
      text: 'data',
      mimeType: 'text/plain',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Commit failed');
    expect(result.message).toContain('Disk full');
  });

  it('uses default authorDid when not specified', async () => {
    await commitCardToDatabase({
      handle: 'test/card',
      content: new Uint8Array([1]),
      mimeType: 'text/plain',
    });

    expect(mockVfsSet).toHaveBeenCalledWith(
      'test/card',
      expect.anything(),
      expect.objectContaining({ authorDid: 'did:key:interactive-user' })
    );
  });
});

describe('Sprint 35 Phase B: commitExportedArtifact (destination x format)', () => {
  const makeCoordinator = () => ({
    generateDiagramArtifact: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureVcsInitialized.mockResolvedValue({ vfs: { set: mockVfsSet } });
    mockVfsSet.mockResolvedValue('blake3:artifact1');
  });

  it('commits rendered PNG artifact under zx:artifacts handle — no file picker', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const coordinator = makeCoordinator();
    coordinator.generateDiagramArtifact.mockResolvedValue({
      status: 'success',
      filename: 'ghz.png',
      mimeType: 'image/png',
      payload: new Blob([pngBytes], { type: 'image/png' }),
    });

    const result = await commitExportedArtifact(coordinator as unknown as DiagramExportCoordinator, {
      sourceHandle: 'zx:diagrams:ghz',
      format: 'png',
      sourceText: '\\node {GHZ};',
    });

    expect(result.success).toBe(true);
    expect(result.hash).toBe('blake3:artifact1');
    expect(coordinator.generateDiagramArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ handle: 'zx:diagrams:ghz', format: 'png', sourceKind: 'saved' })
    );
    expect(mockVfsSet).toHaveBeenCalledWith(
      'zx:artifacts:ghz/ghz.png',
      expect.any(Uint8Array),
      expect.objectContaining({
        mimeType: 'image/png',
        companionMetadata: expect.objectContaining({
          sourceHandle: 'zx:diagrams:ghz',
          format: 'png',
          derivedFrom: 'zx:diagrams:ghz',
        }),
      })
    );
    // The database path must never touch disk delivery
    expect(mockSaveArtifact).not.toHaveBeenCalled();
  });

  it('commits TeX artifact as text payload with canonical MIME', async () => {
    const coordinator = makeCoordinator();
    coordinator.generateDiagramArtifact.mockResolvedValue({
      status: 'success',
      filename: 'bell.tex',
      mimeType: 'application/x-latex',
      payload: '\\documentclass{standalone}\\begin{document}x\\end{document}',
    });

    const result = await commitExportedArtifact(coordinator as unknown as DiagramExportCoordinator, {
      sourceHandle: 'zx:diagrams:bell',
      format: 'tex',
    });

    expect(result.success).toBe(true);
    expect(mockVfsSet).toHaveBeenCalledWith(
      'zx:artifacts:bell/bell.tex',
      expect.stringContaining('documentclass'),
      expect.objectContaining({ mimeType: 'application/x-latex' })
    );
    expect(mockSaveArtifact).not.toHaveBeenCalled();
  });

  it('propagates generation failure without writing to the VFS', async () => {
    const coordinator = makeCoordinator();
    coordinator.generateDiagramArtifact.mockResolvedValue({
      status: 'failure',
      error: 'Diagram source contains syntax errors',
      code: 'ParseError',
    });

    const result = await commitExportedArtifact(coordinator as unknown as DiagramExportCoordinator, {
      sourceHandle: 'zx:diagrams:bad',
      format: 'pdf',
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Generation failed');
    expect(mockVfsSet).not.toHaveBeenCalled();
    expect(mockSaveArtifact).not.toHaveBeenCalled();
  });
});
