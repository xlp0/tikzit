/**
 * Multi-Document Workspace Manager for TikZiT Web
 * Tracks multiple open diagram tabs, dirty buffers, active tab selection, and session persistence.
 */

import type { GraphAST } from '../../core/domain/types';
import { defaultDocumentStore } from '../storage/DocumentStore';
import type { DocumentRecord } from '../storage/DocumentStore';
import { parseTikz } from '../../core/parser/parser';

export interface WorkspaceState {
  activeDocId: string;
  openDocs: DocumentRecord[];
}

export type WorkspaceListener = (state: WorkspaceState) => void;

const DEFAULT_DOC_ID = 'default-doc';
const STORAGE_KEY = 'tikzit:workspace-state';

export class WorkspaceManager {
  private activeDocId: string = DEFAULT_DOC_ID;
  private openDocs: Map<string, DocumentRecord> = new Map();
  private listeners: Set<WorkspaceListener> = new Set();

  constructor() {
    this.initDefault();
  }

  private initDefault(): void {
    const defaultDoc: DocumentRecord = {
      id: DEFAULT_DOC_ID,
      title: '01_spider_fusion.tikz',
      content: `\\begin{tikzpicture}
	\\begin{pgfonlayer}{nodelayer}
		\\node [style=green spider] (0) at (-1.5, 0) {$\\alpha$};
		\\node [style=green spider] (1) at (1.5, 0) {$\\beta$};
	\\end{pgfonlayer}
	\\begin{pgfonlayer}{edgelayer}
		\\draw (0) to (1);
	\\end{pgfonlayer}
\\end{tikzpicture}`,
      hash: 'init_hash',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      isDirty: false,
    };
    try {
      defaultDoc.ast = parseTikz(defaultDoc.content);
    } catch {
      // ignore
    }
    this.openDocs.set(defaultDoc.id, defaultDoc);
    this.activeDocId = defaultDoc.id;
  }

  public getActiveDocument(): DocumentRecord | undefined {
    return this.openDocs.get(this.activeDocId);
  }

  public getOpenDocuments(): DocumentRecord[] {
    return Array.from(this.openDocs.values());
  }

  public setActiveDocument(id: string): void {
    if (this.openDocs.has(id)) {
      this.activeDocId = id;
      this.notify();
    }
  }

  public openDocument(doc: DocumentRecord): void {
    this.openDocs.set(doc.id, { ...doc });
    this.activeDocId = doc.id;
    this.notify();
  }

  public createNewDocument(title: string = 'Untitled.tikz'): DocumentRecord {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDoc: DocumentRecord = {
      id,
      title,
      content: `\\begin{tikzpicture}
	\\begin{pgfonlayer}{nodelayer}
		\\node [style=none] (0) at (0, 0) {};
	\\end{pgfonlayer}
	\\begin{pgfonlayer}{edgelayer}
	\\end{pgfonlayer}
\\end{tikzpicture}`,
      hash: 'new_doc',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      isDirty: true,
    };
    try {
      newDoc.ast = parseTikz(newDoc.content);
    } catch {
      // ignore
    }

    this.openDocs.set(id, newDoc);
    this.activeDocId = id;
    this.notify();
    return newDoc;
  }

  public closeDocument(id: string): boolean {
    if (this.openDocs.size <= 1) {
      // Keep at least one tab open
      return false;
    }

    this.openDocs.delete(id);
    if (this.activeDocId === id) {
      const remaining = Array.from(this.openDocs.keys());
      this.activeDocId = remaining[remaining.length - 1];
    }
    this.notify();
    return true;
  }

  public updateContent(id: string, content: string, ast?: GraphAST): void {
    const doc = this.openDocs.get(id);
    if (!doc) return;

    doc.content = content;
    if (ast) {
      doc.ast = ast;
    }
    doc.updatedAt = Date.now();
    doc.isDirty = true;
    this.notify();
  }

  public markClean(id: string): void {
    const doc = this.openDocs.get(id);
    if (!doc) return;
    doc.isDirty = false;
    this.notify();
  }

  public async saveActive(): Promise<DocumentRecord | null> {
    const doc = this.getActiveDocument();
    if (!doc) return null;

    const saved = await defaultDocumentStore.saveDocument({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      ast: doc.ast,
    });

    doc.hash = saved.hash;
    doc.version = saved.version;
    doc.isDirty = false;
    this.notify();
    return doc;
  }

  public subscribe(listener: WorkspaceListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): WorkspaceState {
    return {
      activeDocId: this.activeDocId,
      openDocs: this.getOpenDocuments(),
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }
}

export const defaultWorkspaceManager = new WorkspaceManager();
