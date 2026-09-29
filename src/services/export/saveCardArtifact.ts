/**
 * src/services/export/saveCardArtifact.ts - Sprint 35 Phase A
 * Universal raw-payload disk saver for MCard artifacts.
 * Saves card content bytes as-is to local filesystem via saveArtifact().
 * Does NOT render TikZ → PNG/SVG/PDF — rendered exports stay in diagramExportCoordinator.
 * Contract D ceiling: ≤ 120 LOC.
 */

import { saveArtifact, type SaveArtifactResult, type SaveArtifactEnvironment } from './saveArtifact';
import { sanitizeFilename, defaultFilenameCollisionTracker } from './exportNaming';

export interface SaveCardOptions {
  handle: string;
  mimeType: string;
  content: Uint8Array;
  text?: string;
  suggestedFilename?: string;
  environment?: SaveArtifactEnvironment;
}

/**
 * MIME → extension map covering all renderer-registered types + binary fallback.
 * Ordered by prevalence in the MCard Explorer corpus.
 */
const MIME_EXTENSION_MAP: Record<string, { ext: string; description: string }> = {
  'text/x-tikz':                          { ext: '.tikz',  description: 'TikZ source file' },
  'application/x-latex':                  { ext: '.tex',   description: 'LaTeX document' },
  'image/svg+xml':                        { ext: '.svg',   description: 'SVG image' },
  'image/png':                            { ext: '.png',   description: 'PNG image' },
  'application/pdf':                      { ext: '.pdf',   description: 'PDF document' },
  'text/markdown':                        { ext: '.md',    description: 'Markdown document' },
  'application/json':                     { ext: '.json',  description: 'JSON data' },
  'application/vnd.zx-graph+json':        { ext: '.zx.json', description: 'ZX-Graph JSON' },
  'text/yaml':                            { ext: '.yaml',  description: 'YAML data' },
  'text/csv':                             { ext: '.csv',   description: 'CSV tabular data' },
  'text/plain':                           { ext: '.txt',   description: 'Plain text' },
  'text/html':                            { ext: '.html',  description: 'HTML document' },
  'application/vnd.pcard+json':           { ext: '.pcard.json', description: 'PCard process' },
  'application/vnd.vcard+json':           { ext: '.vcard.json', description: 'VCard proof' },
  'application/vnd.satori.turn+xml':      { ext: '.xml',   description: 'Satori turn' },
  'application/x-sqlite3':               { ext: '.db',    description: 'SQLite database' },
  'image/jpeg':                           { ext: '.jpg',   description: 'JPEG image' },
  'image/webp':                           { ext: '.webp',  description: 'WebP image' },
  'application/octet-stream':             { ext: '.bin',   description: 'Binary file' },
};

/** Resolve MIME type to file extension and description. */
function resolveMimeInfo(mimeType: string): { ext: string; description: string } {
  return MIME_EXTENSION_MAP[mimeType] ?? { ext: '.bin', description: 'Binary file' };
}

/** Derive a human-readable format label from MIME type (e.g., 'PNG', 'Markdown', 'JSON'). */
export function mimeToFormatLabel(mimeType: string): string {
  const LABEL_MAP: Record<string, string> = {
    'text/x-tikz': 'TikZ Source', 'application/x-latex': 'LaTeX',
    'image/svg+xml': 'SVG', 'image/png': 'PNG', 'application/pdf': 'PDF',
    'text/markdown': 'Markdown', 'application/json': 'JSON',
    'application/vnd.zx-graph+json': 'ZX-Graph', 'text/yaml': 'YAML',
    'text/csv': 'CSV', 'text/plain': 'Text', 'text/html': 'HTML',
    'application/vnd.pcard+json': 'PCard', 'application/vnd.vcard+json': 'VCard',
    'application/vnd.satori.turn+xml': 'Satori Turn',
    'application/x-sqlite3': 'SQLite Database', 'image/jpeg': 'JPEG',
    'image/webp': 'WebP', 'application/octet-stream': 'Binary',
  };
  return LABEL_MAP[mimeType] ?? mimeType.split('/').pop()?.toUpperCase() ?? 'File';
}

/**
 * Derive a filename from handle. Strips namespace prefixes (e.g., 'zx:diagrams:ghz' → 'ghz').
 */
function deriveBaseName(handle: string): string {
  const segments = handle.split(/[:/\\]/);
  const last = segments[segments.length - 1] || 'untitled';
  // Strip existing extension if present — we'll add the correct one
  const dotIdx = last.lastIndexOf('.');
  return dotIdx > 0 ? last.slice(0, dotIdx) : last;
}

/**
 * Save a card's raw payload to the user's local filesystem.
 * For text cards, saves as text with UTF-8 charset. For binary, saves raw bytes.
 */
export async function saveCardArtifactToDisk(options: SaveCardOptions): Promise<SaveArtifactResult> {
  const { handle, mimeType, content, text, suggestedFilename, environment } = options;
  const mimeInfo = resolveMimeInfo(mimeType);

  // Build filename
  const baseName = suggestedFilename
    ? suggestedFilename
    : sanitizeFilename(deriveBaseName(handle), mimeInfo.ext.slice(1));

  const filename = defaultFilenameCollisionTracker.getUniqueFilename(baseName);

  // Text cards: save as string for proper charset handling
  const isText = Boolean(text) && !mimeType.startsWith('image/') &&
    mimeType !== 'application/pdf' &&
    mimeType !== 'application/x-sqlite3' &&
    mimeType !== 'application/octet-stream';

  if (isText && text) {
    return saveArtifact(text, filename, { mimeType }, environment);
  }

  // Binary cards: save raw Uint8Array as Blob
  const blob = new Blob([new Uint8Array(content)], { type: mimeType });
  return saveArtifact(blob, filename, { mimeType }, environment);
}
