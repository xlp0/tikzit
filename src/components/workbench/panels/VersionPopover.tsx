import React, { useState, useEffect } from 'react';
import { defaultDocumentStore } from '../../../services/storage/DocumentStore';
import type { DocumentRevision } from '../../../services/storage/DocumentStore';
import { defaultWorkspaceManager } from '../../../services/workspace/WorkspaceManager';

export interface VersionPopoverProps {
  documentId: string;
  onClose: () => void;
  onRestored?: (content: string) => void;
}

export const VersionPopover: React.FC<VersionPopoverProps> = ({
  documentId,
  onClose,
  onRestored,
}) => {
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRevisions();
  }, [documentId]);

  const loadRevisions = async () => {
    setLoading(true);
    const revs = await defaultDocumentStore.getRevisions(documentId);
    setRevisions(revs);
    setLoading(false);
  };

  const handleCreateSavepoint = async () => {
    const active = defaultWorkspaceManager.getActiveDocument();
    if (!active) return;

    await defaultDocumentStore.saveDocument({
      id: documentId,
      title: active.title,
      content: active.content,
      ast: active.ast,
      message: message.trim() || 'Manual Savepoint',
    });
    setMessage('');
    await loadRevisions();
  };

  const handleRestore = async (hash: string) => {
    const restored = await defaultDocumentStore.restoreRevision(documentId, hash);
    if (restored) {
      defaultWorkspaceManager.updateContent(documentId, restored.content, restored.ast);
      if (onRestored) {
        onRestored(restored.content);
      }
      onClose();
    }
  };

  return (
    <div
      className="absolute right-4 top-10 w-80 bg-[#1a1d26] border border-[#2e3446] rounded-lg shadow-2xl z-50 text-xs text-slate-300 flex flex-col font-sans"
      data-testid="version-popover"
    >
      <div className="flex justify-between items-center p-3 border-b border-[#2e3446]">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-100">Version History & MCard Lineage</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs">
          ✕
        </button>
      </div>

      {/* Savepoint Input */}
      <div className="p-3 border-b border-[#2e3446]/60 bg-[#12141a]/50 flex space-x-1.5">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Savepoint label..."
          className="flex-1 bg-[#12141a] border border-[#2e3446] rounded px-2 py-1 text-slate-200 focus:outline-none text-[11px]"
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

      {/* Revision List */}
      <div className="max-h-60 overflow-y-auto p-2 space-y-1.5" data-testid="revisions-list">
        {loading ? (
          <div className="p-4 text-center text-slate-500">Loading revisions...</div>
        ) : revisions.length === 0 ? (
          <div className="p-4 text-center text-slate-500 italic">No revisions saved yet.</div>
        ) : (
          revisions.map((rev) => (
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
                onClick={() => handleRestore(rev.hash)}
                className="self-end text-[10px] text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                data-testid="btn-restore-revision"
              >
                Restore this version
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
