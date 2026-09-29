import React, { useState, useEffect } from 'react';
import { ExplorerEntryRow, type ExplorerItem } from './ExplorerEntryRow';

export interface DiagramListViewProps {
  readonly items: readonly ExplorerItem[];
  readonly query: string;
  readonly activeHandle: string;
  readonly onSelect: (handle: string) => void;
  readonly onRenameCommit: (handle: string, title: string) => void;
  readonly onDuplicate: (handle: string) => void;
  readonly onToggleArchive: (handle: string, archived: boolean) => void;
  readonly onExport: (handle: string) => void;
  readonly onPreview?: (handle: string) => void;
  readonly onCreateFirstDiagram?: () => void;
}

export const DiagramListView: React.FC<DiagramListViewProps> = ({
  items,
  query,
  activeHandle,
  onSelect,
  onRenameCommit,
  onDuplicate,
  onToggleArchive,
  onExport,
  onPreview,
  onCreateFirstDiagram
}) => {
  const [openMenuHandle, setOpenMenuHandle] = useState<string | null>(null);
  const [editingHandle, setEditingHandle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    const handleClose = () => setOpenMenuHandle(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const filtered = items.filter(
    (item) => !query || item.title.toLowerCase().includes(query.toLowerCase())
  );

  const drafts = filtered.filter((i) => i.type === 'draft');
  const diagrams = filtered.filter((i) => i.type === 'diagram');
  const examples = filtered.filter((i) => i.type === 'example');
  const userDiagramsCount = items.filter((i) => i.type === 'diagram').length + drafts.length;

  const handleCommit = (handle: string) => {
    if (editTitle.trim()) {
      onRenameCommit(handle, editTitle.trim());
    }
    setEditingHandle(null);
  };

  const renderSection = (title: string, sectionItems: ExplorerItem[], emptyText: string) => {
    if (sectionItems.length === 0 && query) return null;
    return (
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center justify-between px-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          <span>{title}</span>
          <span className="font-mono">{sectionItems.length}</span>
        </div>
        {sectionItems.length === 0 ? (
          <div className="px-2 py-1 text-xs text-neutral-600 italic">{emptyText}</div>
        ) : (
          sectionItems.map((item) => (
            <ExplorerEntryRow
              key={item.handle}
              item={item}
              isActive={item.handle === activeHandle}
              onSelect={onSelect}
              openMenuHandle={openMenuHandle}
              onToggleMenu={(h, e) => {
                e.stopPropagation();
                setOpenMenuHandle(openMenuHandle === h ? null : h);
              }}
              editingHandle={editingHandle}
              editTitle={editTitle}
              onEditTitleChange={setEditTitle}
              onRenameCommit={handleCommit}
              onRenameCancel={() => setEditingHandle(null)}
              onStartRename={(itm) => {
                setEditingHandle(itm.handle);
                setEditTitle(itm.title);
                setOpenMenuHandle(null);
              }}
              onDuplicate={(h) => { onDuplicate(h); setOpenMenuHandle(null); }}
              onToggleArchive={(h, arch) => { onToggleArchive(h, arch); setOpenMenuHandle(null); }}
              onExport={(h) => { onExport(h); setOpenMenuHandle(null); }}
              onPreview={(h) => { onPreview?.(h); setOpenMenuHandle(null); }}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {userDiagramsCount === 0 && !query && (
        <div
          data-testid="empty-diagrams-card"
          className="p-4 m-2 bg-neutral-950/60 rounded border border-neutral-800 text-center text-xs text-neutral-400"
        >
          <p className="mb-2">No user diagrams created yet.</p>
          <button
            type="button"
            data-testid="btn-empty-state-new-diagram"
            onClick={onCreateFirstDiagram}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-xs"
          >
            Create First Diagram
          </button>
        </div>
      )}

      {drafts.length > 0 && renderSection('Unsaved Drafts', drafts, '')}
      {renderSection('User Diagrams', diagrams, 'No diagrams found.')}
      {renderSection('Seeded Examples', examples, 'No examples found.')}
    </div>
  );
};
