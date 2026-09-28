import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceManager } from '../../../src/services/workspace/WorkspaceManager';

describe('WorkspaceManager', () => {
  let wm: WorkspaceManager;

  beforeEach(() => {
    wm = new WorkspaceManager();
  });

  it('initializes with default diagram tab', () => {
    const active = wm.getActiveDocument();
    expect(active).toBeDefined();
    expect(active?.title).toBe('01_spider_fusion.tikz');
    expect(wm.getOpenDocuments().length).toBe(1);
  });

  it('creates new tabs and switches active document', () => {
    const newDoc = wm.createNewDocument('Teleportation.tikz');
    expect(wm.getOpenDocuments().length).toBe(2);
    expect(wm.getActiveDocument()?.id).toBe(newDoc.id);

    // Switch back
    const defaultDoc = wm.getOpenDocuments()[0];
    wm.setActiveDocument(defaultDoc.id);
    expect(wm.getActiveDocument()?.id).toBe(defaultDoc.id);
  });

  it('closes document tabs while maintaining at least one active tab', () => {
    const newDoc = wm.createNewDocument('Temp.tikz');
    expect(wm.getOpenDocuments().length).toBe(2);

    const closed = wm.closeDocument(newDoc.id);
    expect(closed).toBe(true);
    expect(wm.getOpenDocuments().length).toBe(1);

    // Cannot close last remaining tab
    const closeLast = wm.closeDocument(wm.getOpenDocuments()[0].id);
    expect(closeLast).toBe(false);
    expect(wm.getOpenDocuments().length).toBe(1);
  });

  it('tracks dirty buffer state on content update', () => {
    const active = wm.getActiveDocument()!;
    expect(active.isDirty).toBe(false);

    wm.updateContent(active.id, 'mutated content');
    expect(wm.getActiveDocument()?.isDirty).toBe(true);

    wm.markClean(active.id);
    expect(wm.getActiveDocument()?.isDirty).toBe(false);
  });
});
