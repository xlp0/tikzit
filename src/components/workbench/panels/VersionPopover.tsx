import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { defaultDocumentStore, type DocumentRevision } from '../../../services/storage/DocumentStore';
import { defaultWorkspaceManager } from '../../../services/workspace/WorkspaceManager';
import { isDiagramHandle } from '../../../services/clm/corpusPersistence';
import type { WorkbenchRuntime } from '../../../services/createWorkbenchRuntime';
import { useWorkbenchRuntime } from '../WorkbenchRuntimeContext';
import type { HistoryRow, DocumentHistoryResult } from '../../../services/clm/documentCommitService';
import { ContentHash } from 'clm-kernel';
import { safeParse } from '../../../core/parser/parser';

export interface VersionPopoverProps {
  documentId: string;
  onClose: () => void;
  onRestored?: (content: string) => void;
  runtime?: WorkbenchRuntime;
}

function computeLineDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }
  const result: Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }> = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'unchanged', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: newLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }
  return result;
}

export const VersionPopover: React.FC<VersionPopoverProps> = ({
  documentId,
  onClose,
  onRestored,
  runtime: propRuntime,
}) => {
  let contextRuntime: WorkbenchRuntime | null = null;
  try {
    contextRuntime = useWorkbenchRuntime();
  } catch {
    // Context unavailable
  }
  const runtime = propRuntime ?? contextRuntime ?? ((globalThis as any).defaultWorkbenchRuntime as WorkbenchRuntime | undefined);

  const isMCard = useMemo(() => isDiagramHandle(documentId), [documentId]);

  // Legacy store state
  const [legacyRevisions, setLegacyRevisions] = useState<DocumentRevision[]>([]);

  // MCard history state
  const [history, setHistory] = useState<DocumentHistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Modals & sub-panels
  const [previewVersion, setPreviewVersion] = useState<HistoryRow | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  const [compareVersion, setCompareVersion] = useState<HistoryRow | null>(null);
  const [compareContent, setCompareContent] = useState<string | null>(null);

  const [restoreTarget, setRestoreTarget] = useState<HistoryRow | null>(null);
  const [restoreMode, setRestoreMode] = useState<'clean' | 'dirty' | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ kind: 'already-current' | 'conflict' | 'error' | 'success'; text: string } | null>(null);

  const activeDoc = defaultWorkspaceManager.getActiveDocument();

  // Load history whenever documentId changes
  const loadHistory = useCallback(async () => {
    setLoading(true);
    setPreviewVersion(null);
    setCompareVersion(null);
    setRestoreTarget(null);
    setRestoreMode(null);
    setStatusMessage(null);

    if (isMCard && runtime) {
      try {
        const hist = runtime.documentHistory(documentId);
        setHistory(hist);
      } catch (err) {
        console.warn('Failed loading document history:', err);
        setHistory(null);
      }
    } else {
      const revs = await defaultDocumentStore.getRevisions(documentId);
      setLegacyRevisions(revs);
    }
    setLoading(false);
  }, [documentId, isMCard, runtime]);

  const refreshHistoryOnly = useCallback(() => {
    if (isMCard && runtime) {
      try {
        const hist = runtime.documentHistory(documentId);
        setHistory(hist);
      } catch (err) {
        console.warn('Failed loading document history:', err);
      }
    }
  }, [documentId, isMCard, runtime]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Refresh history on external save completions without resetting preview/compare or unsubmitted message
  useEffect(() => {
    if (!runtime || !isMCard) return;
    const unsub = runtime.stores.$diagramSaveState.subscribe((saveStateMap) => {
      const docSave = saveStateMap[documentId];
      if (docSave?.lastResult?.success && !docSave.isSaving) {
        refreshHistoryOnly();
      }
    });
    return () => unsub();
  }, [runtime, documentId, isMCard, refreshHistoryOnly]);

  // Handle keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (restoreMode !== null) {
          setRestoreMode(null);
          setRestoreTarget(null);
        } else if (previewVersion !== null) {
          setPreviewVersion(null);
        } else if (compareVersion !== null) {
          setCompareVersion(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restoreMode, previewVersion, compareVersion, onClose]);

  // Copy hash helper
  const handleCopyHash = (hash: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(hash).then(() => {
        setCopySuccess(key);
        setTimeout(() => setCopySuccess(null), 2000);
      }).catch(() => undefined);
    }
  };

  // Create savepoint / Save with label
  const handleCreateSavepoint = async () => {
    const trimmed = message.trim();
    if (isMCard && runtime) {
      const result = await runtime.saveDiagram(documentId, { message: trimmed || undefined });
      if (result?.success) {
        setMessage('');
        refreshHistoryOnly();
        setLiveAnnouncement(trimmed ? `Saved version with label "${trimmed}".` : 'Saved version.');
      }
    } else {
      const active = defaultWorkspaceManager.getActiveDocument();
      if (!active) return;
      await defaultDocumentStore.saveDocument({
        id: documentId,
        title: active.title,
        content: active.content,
        ast: active.ast,
        message: trimmed || 'Manual Savepoint',
      });
      setMessage('');
      await loadHistory();
    }
  };

  // Preview version
  const handleOpenPreview = (row: HistoryRow) => {
    if (row.unavailable || !runtime) return;
    try {
      const card = runtime.mcardCollection.get(ContentHash.fromHex(row.hash));
      if (card && card.payload.kind === 'text') {
        setPreviewContent(card.payload.value);
        setPreviewVersion(row);
      }
    } catch {
      // Card missing
    }
  };

  // Compare version
  const handleOpenCompare = (row: HistoryRow) => {
    if (row.unavailable || !runtime) return;
    try {
      const card = runtime.mcardCollection.get(ContentHash.fromHex(row.hash));
      if (card && card.payload.kind === 'text') {
        setCompareContent(card.payload.value);
        setCompareVersion(row);
      }
    } catch {
      // Card missing
    }
  };

  // Trigger restore click
  const handleRestoreClick = (row: HistoryRow) => {
    if (row.unavailable) return;

    if (!isMCard) {
      // Legacy restore
      void (async () => {
        const restored = await defaultDocumentStore.restoreRevision(documentId, row.hash);
        if (restored) {
          defaultWorkspaceManager.updateContent(documentId, restored.content, restored.ast);
          if (onRestored) onRestored(restored.content);
          onClose();
        }
      })();
      return;
    }

    if (row.isHead || (history?.head && row.hash === history.head)) {
      setStatusMessage({ kind: 'already-current', text: 'Already the current version.' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setRestoreTarget(row);
    if (activeDoc?.isDirty) {
      setRestoreMode('dirty');
    } else {
      setRestoreMode('clean');
    }
  };

  // Execute restore
  const executeRestore = async (saveCurrentFirst: boolean = false) => {
    if (!restoreTarget || !runtime) return;

    let expectedHeadHash = history?.head;
    if (saveCurrentFirst) {
      const saveRes = await runtime.saveDiagram(documentId);
      if (!saveRes.success || !saveRes.persisted) {
        setStatusMessage({
          kind: 'error',
          text: saveRes.reason || 'Failed to save current diagram before restore. Restore aborted.',
        });
        return;
      }
      expectedHeadHash = saveRes.hash;
    }

    const currentDoc = defaultWorkspaceManager.getActiveDocument();

    const result = await runtime.restoreVersion({
      handle: documentId,
      targetHash: restoreTarget.hash,
      expectedHeadHash,
    });

    if (result.status === 'already-current') {
      setStatusMessage({ kind: 'already-current', text: 'Already the current version.' });
      setRestoreMode(null);
      setRestoreTarget(null);
      setTimeout(() => setStatusMessage(null), 3000);
    } else if (result.status === 'conflict') {
      setStatusMessage({ kind: 'conflict', text: 'Conflict: diagram was modified by another action. Restore aborted.' });
      setRestoreMode(null);
      setRestoreTarget(null);
      await loadHistory();
    } else if (result.status === 'success') {
      setLiveAnnouncement(`Restored version v${restoreTarget.position}.`);
      setRestoreMode(null);
      setRestoreTarget(null);
      await loadHistory();
      if (onRestored) {
        onRestored(result.content);
      }
    } else {
      setStatusMessage({ kind: 'error', text: `Restore failed: ${'reason' in result ? result.reason : 'error' in result ? result.error : 'unavailable'}` });
      setRestoreMode(null);
      setRestoreTarget(null);
    }
  };

  const rows = history?.rows ?? [];
  const reversedRows = useMemo(() => [...rows].reverse(), [rows]);

  return (
    <div
      className="absolute right-4 top-10 w-96 max-w-[calc(100vw-2rem)] bg-[#1a1d26] border border-[#2e3446] rounded-lg shadow-2xl z-50 text-xs text-slate-300 flex flex-col font-sans max-h-[85vh] overflow-hidden"
      data-testid="version-popover"
      role="dialog"
      aria-label="Version History"
    >
      <div data-testid="history-live-announcer" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-[#2e3446] bg-[#161820]">
        <div className="flex flex-col flex-1 min-w-0 pr-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-100 truncate">
              {activeDoc?.title || documentId}
            </span>
            {isMCard && (
              <span
                className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono"
                data-testid="history-version-count"
              >
                {rows.length} {rows.length === 1 ? 'version' : 'versions'}
              </span>
            )}
          </div>
          {isMCard && history?.head && (
            <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-slate-400">
              <span>Head:</span>
              <span className="font-mono text-blue-400" data-testid="history-head-hash">
                {history.head.slice(0, 8)}
              </span>
              <button
                type="button"
                onClick={() => handleCopyHash(history.head!, 'head')}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Copy full head hash"
                data-testid="btn-copy-head-hash"
              >
                {copySuccess === 'head' ? '✓' : '📋'}
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-slate-800 transition-colors"
          data-testid="btn-close-history"
          aria-label="Close history"
        >
          ✕
        </button>
      </div>

      {/* Non-MCard Legacy Heading */}
      {!isMCard && (
        <div
          className="px-3 py-1.5 bg-amber-950/40 border-b border-amber-800/40 text-amber-300 text-[10px] font-medium"
          data-testid="heading-legacy-revisions"
        >
          Local revisions (not MCard history)
        </div>
      )}

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`px-3 py-1.5 text-[11px] font-medium border-b ${
            statusMessage.kind === 'already-current'
              ? 'bg-blue-950/40 border-blue-800/40 text-blue-300'
              : statusMessage.kind === 'conflict'
              ? 'bg-amber-950/40 border-amber-800/40 text-amber-300'
              : 'bg-red-950/40 border-red-800/40 text-red-300'
          }`}
          data-testid={statusMessage.kind === 'already-current' ? 'history-already-current' : statusMessage.kind === 'conflict' ? 'history-conflict' : 'history-status'}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Savepoint Input */}
      <div className="p-3 border-b border-[#2e3446]/60 bg-[#12141a]/50 flex space-x-1.5">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreateSavepoint();
          }}
          placeholder="Version label (optional)..."
          className="flex-1 bg-[#12141a] border border-[#2e3446] rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-blue-500 text-[11px]"
          data-testid="savepoint-input"
        />
        <button
          onClick={handleCreateSavepoint}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-[11px] transition-colors"
          data-testid="btn-create-savepoint"
        >
          Save
        </button>
      </div>

      {/* Restore Prompts / Confirmation Dialog */}
      {restoreMode === 'dirty' && restoreTarget && (
        <div
          className="p-3 bg-amber-950/30 border-b border-amber-700/50 flex flex-col space-y-2"
          data-testid="restore-dirty-dialog"
        >
          <div className="text-[11px] text-amber-200 font-medium">
            You have unsaved edits. What would you like to do before restoring v{restoreTarget.position}?
          </div>
          <div className="flex space-x-1.5">
            <button
              onClick={() => executeRestore(true)}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-medium"
              data-testid="btn-restore-save-first"
            >
              Save first
            </button>
            <button
              onClick={() => executeRestore(false)}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-medium"
              data-testid="btn-restore-discard"
            >
              Discard edits
            </button>
            <button
              onClick={() => {
                setRestoreMode(null);
                setRestoreTarget(null);
              }}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px]"
              data-testid="btn-restore-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {restoreMode === 'clean' && restoreTarget && (
        <div
          className="p-3 bg-[#1e222d] border-b border-blue-500/40 flex flex-col space-y-2"
          data-testid="restore-confirm-dialog"
        >
          <div className="text-[11px] text-slate-200">
            Makes <strong className="text-white">v{restoreTarget.position}</strong> the current version. Later versions stay in history.
          </div>
          <div className="flex space-x-1.5">
            <button
              onClick={() => executeRestore(false)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium"
              data-testid="btn-confirm-restore"
            >
              Confirm Restore
            </button>
            <button
              onClick={() => {
                setRestoreMode(null);
                setRestoreTarget(null);
              }}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px]"
              data-testid="btn-cancel-restore"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {previewVersion && previewContent !== null && (
        <div
          className="p-3 bg-[#14161f] border-b border-[#2e3446] flex flex-col space-y-2 max-h-56 overflow-hidden"
          data-testid="history-preview-panel"
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-200 text-[11px]">
              Preview v{previewVersion.position} ({previewVersion.hash.slice(0, 8)})
            </span>
            <button
              onClick={() => setPreviewVersion(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
              data-testid="btn-close-preview"
            >
              Close
            </button>
          </div>
          <pre
            className="p-2 bg-[#0c0e14] border border-[#232838] rounded text-[10px] font-mono text-slate-300 overflow-y-auto max-h-40 whitespace-pre-wrap select-text"
            data-testid="preview-source-code"
          >
            {previewContent}
          </pre>
        </div>
      )}

      {/* Compare Panel */}
      {compareVersion && compareContent !== null && activeDoc && (
        <div
          className="p-3 bg-[#14161f] border-b border-[#2e3446] flex flex-col space-y-2 max-h-64 overflow-hidden"
          data-testid="history-compare-panel"
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-200 text-[11px]">
              Compare v{compareVersion.position} with Current
            </span>
            <button
              onClick={() => setCompareVersion(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
              data-testid="btn-close-compare"
            >
              Close
            </button>
          </div>

          {/* Stats Deltas */}
          {(() => {
            const histAst = safeParse(compareContent).ast;
            const currAst = activeDoc.ast;
            const hNodes = histAst?.nodes.length ?? 0;
            const cNodes = currAst?.nodes.length ?? 0;
            const hEdges = histAst?.edges.length ?? 0;
            const cEdges = currAst?.edges.length ?? 0;
            const nodeDiff = cNodes - hNodes;
            const edgeDiff = cEdges - hEdges;
            return (
              <div
                className="text-[10px] text-slate-400 bg-[#0c0e14] px-2 py-1 rounded border border-[#232838] flex space-x-3"
                data-testid="compare-stat-deltas"
              >
                <span>Nodes: {hNodes} → {cNodes} ({nodeDiff >= 0 ? `+${nodeDiff}` : nodeDiff})</span>
                <span>Edges: {hEdges} → {cEdges} ({edgeDiff >= 0 ? `+${edgeDiff}` : edgeDiff})</span>
              </div>
            );
          })()}

          {/* Line Diff */}
          <div
            className="p-2 bg-[#0c0e14] border border-[#232838] rounded text-[10px] font-mono overflow-y-auto max-h-40 space-y-0.5 select-text"
            data-testid="compare-diff-view"
          >
            {computeLineDiff(compareContent, activeDoc.content).map((line, idx) => (
              <div
                key={idx}
                className={
                  line.type === 'added'
                    ? 'text-emerald-400 bg-emerald-950/40 px-1 rounded'
                    : line.type === 'removed'
                    ? 'text-rose-400 bg-rose-950/40 px-1 rounded'
                    : 'text-slate-400 px-1'
                }
              >
                <span className="inline-block w-3 select-none">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" data-testid="revisions-list">
        {loading ? (
          <div className="p-4 text-center text-slate-500" data-testid="history-loading">
            Loading revisions...
          </div>
        ) : isMCard ? (
          rows.length === 0 ? (
            <div className="p-4 text-center text-slate-500 italic" data-testid="history-empty">
              No history yet (uncommitted draft).
            </div>
          ) : (
            reversedRows.map((row) => (
              <div
                key={`pos-${row.position}-${row.hash}`}
                className={`p-2 bg-[#12141a] border rounded flex flex-col transition-colors ${
                  row.isHead
                    ? 'border-blue-500/50 bg-[#141926]'
                    : 'border-[#2e3446]/60 hover:border-blue-500/40'
                }`}
                data-testid={`version-row-${row.position}`}
              >
                {/* Row Header: Position, Badges, Timestamp */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="font-mono text-[10px] font-semibold text-blue-300 bg-blue-950/70 px-1.5 py-0.5 rounded"
                      data-testid="version-position"
                    >
                      v{row.position}
                    </span>
                    {row.isHead && (
                      <span
                        className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-1 rounded"
                        data-testid="badge-current-version"
                      >
                        Current
                      </span>
                    )}
                    {row.unavailable && (
                      <span
                        className="text-[9px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/50 px-1 rounded"
                        data-testid="version-unavailable"
                      >
                        Unavailable
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500" data-testid="version-timestamp">
                    {new Date(row.changedAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Optional Label */}
                {row.label && (
                  <div
                    className="text-slate-200 text-[11px] font-medium mb-1 truncate"
                    data-testid="version-label"
                  >
                    {row.label}
                  </div>
                )}

                {/* Hash & Author */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
                  <div className="flex items-center space-x-1">
                    <span className="font-mono text-slate-400" data-testid="version-hash">
                      {row.hash.slice(0, 8)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyHash(row.hash, `row-${row.position}`)}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                      title="Copy full hash"
                      data-testid="btn-copy-version-hash"
                    >
                      {copySuccess === `row-${row.position}` ? '✓' : '📋'}
                    </button>
                  </div>
                  {row.authorDid && (
                    <span
                      className="text-[9px] text-slate-500 font-mono truncate max-w-[120px]"
                      data-testid="version-author"
                      title={row.authorDid}
                    >
                      {row.authorDid.slice(0, 16)}...
                    </span>
                  )}
                </div>

                {/* Actions */}
                {!row.unavailable && (
                  <div className="flex justify-end space-x-2 pt-1 border-t border-[#232838]/60 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(row)}
                      className="text-slate-400 hover:text-slate-200 font-medium hover:underline"
                      data-testid="btn-preview-version"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCompare(row)}
                      className="text-slate-400 hover:text-slate-200 font-medium hover:underline"
                      data-testid="btn-compare-version"
                    >
                      Compare
                    </button>
                    {!row.isHead && (
                      <button
                        type="button"
                        onClick={() => handleRestoreClick(row)}
                        className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                        data-testid="btn-restore-version"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          // Legacy revisions list
          legacyRevisions.length === 0 ? (
            <div className="p-4 text-center text-slate-500 italic">No revisions saved yet.</div>
          ) : (
            legacyRevisions.map((rev) => (
              <div
                key={rev.hash}
                className="p-2 bg-[#12141a] border border-[#2e3446]/60 rounded flex flex-col hover:border-blue-500/40 transition-colors"
                data-testid="revision-item"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[10px] text-blue-400 bg-blue-950/60 px-1 rounded">
                    {rev.hash.substring(0, 10)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(rev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] truncate mb-1">
                  {rev.message || 'Auto-saved revision'}
                </div>
                <button
                  onClick={() => handleRestoreClick({ position: 0, hash: rev.hash, changedAt: new Date(rev.timestamp).toISOString() })}
                  className="self-end text-[10px] text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                  data-testid="btn-restore-revision"
                >
                  Restore this version
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
