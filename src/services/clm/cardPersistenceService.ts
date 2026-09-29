/**
 * src/services/clm/cardPersistenceService.ts — Sprint 35 Phase B
 * Commits card artifacts into the sovereign SQLite database (OperadicMCardVfs).
 * Assigns Blake3 CIDs, universe coordinates, and updates handles.
 * Contract D: ≤ 100 LOC.
 */

import { ensureVcsInitialized } from './vcsAdapterInstance';
import type { OperadicMCardVfs } from '../../packages/mcard-vcs';
import type { DiagramExportCoordinator } from '../export/diagramExportCoordinator';

export interface CommitCardOptions {
  handle: string;
  content: Uint8Array;
  text?: string;
  mimeType: string;
  authorDid?: string;
  universe?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface CommitCardResult {
  success: boolean;
  hash?: string;
  handle?: string;
  message: string;
}

/**
 * Commit a card artifact into the local sovereign database.
 * Uses OperadicMCardVfs.set() which:
 *   1. Hashes content with Blake3 → deterministic CID
 *   2. Stores content in the cards table (INSERT OR IGNORE — content-addressed)
 *   3. Updates handle → hash mapping
 *   4. Records handle_history entry with author DID
 */
export async function commitCardToDatabase(options: CommitCardOptions): Promise<CommitCardResult> {
  let vfs: OperadicMCardVfs;
  try {
    const initialized = await ensureVcsInitialized();
    vfs = initialized.vfs;
  } catch (err) {
    return {
      success: false,
      message: `Database unavailable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Determine whether to commit as text or binary
  const isTextPayload = Boolean(options.text) &&
    !options.mimeType.startsWith('image/') &&
    options.mimeType !== 'application/pdf' &&
    options.mimeType !== 'application/x-sqlite3' &&
    options.mimeType !== 'application/octet-stream';

  const payload: string | Uint8Array = isTextPayload && options.text
    ? options.text
    : options.content;

  try {
    const hash = await vfs.set(options.handle, payload, {
      mimeType: options.mimeType,
      authorDid: options.authorDid ?? 'did:key:interactive-user',
      universe: options.universe,
      category: options.category,
      companionMetadata: options.metadata,
    });

    return {
      success: true,
      hash,
      handle: options.handle,
      message: `Committed ${options.handle} → ${hash.slice(0, 16)}…`,
    };
  } catch (err) {
    return {
      success: false,
      handle: options.handle,
      message: `Commit failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export interface CommitExportedArtifactOptions {
  sourceHandle: string;
  format: 'tikz' | 'tex' | 'svg' | 'png' | 'pdf';
  sourceKind?: 'current' | 'saved';
  pngScale?: 1 | 2 | 4;
  sourceText?: string;
  authorDid?: string;
}

/**
 * Generate a rendered diagram artifact (PNG/SVG/PDF/TeX/TikZ) and commit it
 * to the sovereign VFS as a provenance card under `zx:artifacts:<src>/<file>`.
 * Never touches saveArtifact / file pickers / Blob downloads.
 */
export async function commitExportedArtifact(
  coordinator: DiagramExportCoordinator,
  options: CommitExportedArtifactOptions
): Promise<CommitCardResult> {
  const generated = await coordinator.generateDiagramArtifact({
    handle: options.sourceHandle,
    format: options.format,
    sourceKind: options.sourceKind ?? 'saved',
    pngScale: options.pngScale,
    sourceText: options.sourceText,
  });
  if (generated.status === 'failure') {
    return { success: false, handle: options.sourceHandle, message: `Generation failed: ${generated.error}` };
  }

  const isText = typeof generated.payload === 'string';
  const text = isText ? (generated.payload as string) : undefined;
  const content = isText
    ? new TextEncoder().encode(generated.payload as string)
    : new Uint8Array(await (generated.payload as Blob).arrayBuffer());

  const slug = (options.sourceHandle.split(/[:/\\]/).pop() || 'card').replace(/[/\\:*?"<>|]/g, '_');
  const artifactHandle = `zx:artifacts:${slug}/${generated.filename}`;

  return commitCardToDatabase({
    handle: artifactHandle,
    content,
    text,
    mimeType: generated.mimeType,
    authorDid: options.authorDid,
    metadata: {
      sourceHandle: options.sourceHandle,
      format: options.format,
      exportedAt: new Date().toISOString(),
      derivedFrom: options.sourceHandle,
    },
  });
}
