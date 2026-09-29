/** @layer L4 interface/membrane */
import type { Position, Direction, DirectionResult, PolyInterfaceRegistry } from '../poly';
import type { InteractionNode } from './types';

interface InternalNode {
  id: string; position: Position; arrivedBy: string | null;
  result?: DirectionResult; at: number; parentId: string | null;
  children: InternalNode[]; snapshotDirections?: readonly Direction[];
}

export class InteractionTree {
  private rootNode: InternalNode;
  private currentCursorId: string;
  private seq = 0;
  private nodeMap = new Map<string, InternalNode>();

  constructor(initialPosition: Position, private polyRegistry?: PolyInterfaceRegistry) {
    this.rootNode = {
      id: 'node_root', position: initialPosition, arrivedBy: null,
      at: 0, parentId: null, children: [],
      snapshotDirections: polyRegistry ? polyRegistry.resolveDirections(initialPosition) : []
    };
    this.currentCursorId = this.rootNode.id;
    this.nodeMap.set(this.rootNode.id, this.rootNode);
  }

  public root(): InteractionNode { return this.toPublicNode(this.rootNode); }
  public activeId(): string { return this.currentCursorId; }
  public get cursorId(): string { return this.currentCursorId; }
  public node(nodeId: string): InteractionNode | undefined {
    const n = this.nodeMap.get(nodeId);
    return n ? this.toPublicNode(n) : undefined;
  }

  public async step(dir: Direction, nextPos: Position): Promise<InteractionNode> {
    const res = await dir.execute(this.nodeMap.get(this.currentCursorId)?.position ?? this.rootNode.position);
    return this.record(nextPos, dir.id, res);
  }

  public record(pos: Position, dirId: string, result: DirectionResult): InteractionNode {
    const parent = this.nodeMap.get(this.currentCursorId) ?? this.rootNode;
    this.seq += 1;
    const n: InternalNode = {
      id: `node_${this.seq}`, position: pos, arrivedBy: dirId, result,
      at: this.seq, parentId: parent.id, children: [],
      snapshotDirections: this.polyRegistry ? this.polyRegistry.resolveDirections(pos) : []
    };
    parent.children.push(n);
    this.nodeMap.set(n.id, n);
    this.currentCursorId = n.id;
    return this.toPublicNode(n);
  }

  public path(): readonly InteractionNode[] { return this.pathTo(this.currentCursorId); }

  public pathTo(nodeId: string): readonly InteractionNode[] {
    const res: InteractionNode[] = [];
    let curr = this.nodeMap.get(nodeId);
    while (curr) {
      res.unshift(this.toPublicNode(curr));
      curr = curr.parentId ? this.nodeMap.get(curr.parentId) : undefined;
    }
    return res;
  }

  public rewind(nodeId: string): void { if (this.nodeMap.has(nodeId)) this.currentCursorId = nodeId; }
  public branch(nodeId?: string): InteractionNode {
    if (nodeId && this.nodeMap.has(nodeId)) this.currentCursorId = nodeId;
    return this.toPublicNode(this.nodeMap.get(this.currentCursorId)!);
  }
  public branchFrom(nodeId: string): void { this.branch(nodeId); }

  public foldHistoryLineage(handle: string, entries: readonly { hash: string; changedAt: string; message?: string }[], parentId?: string): void {
    const parent = (parentId ? this.nodeMap.get(parentId) : undefined) ?? this.nodeMap.get(this.currentCursorId) ?? this.rootNode;
    for (const e of entries) {
      this.seq += 1;
      const n: InternalNode = {
        id: `node_lineage_${this.seq}`,
        position: { id: `pos:lineage:${handle}:${e.hash.slice(0, 8)}`, handle, hash: e.hash, mimeType: parent.position.mimeType, surface: parent.position.surface },
        arrivedBy: 'history.traverse', result: { success: true, producedHash: e.hash },
        at: this.seq, parentId: parent.id, children: []
      };
      parent.children.push(n);
      this.nodeMap.set(n.id, n);
    }
  }
  public attachLineage(handle: string, entries: readonly { hash: string; changedAt: string }[]): void { this.foldHistoryLineage(handle, entries); }

  public alternatives(nodeId: string): readonly Direction[] {
    const n = this.nodeMap.get(nodeId);
    if (!n) return [];
    if (n.snapshotDirections?.length) return n.snapshotDirections;
    return this.polyRegistry ? this.polyRegistry.resolveDirections(n.position) : [];
  }

  public toJSON(): unknown {
    const s = (n: InternalNode): any => ({
      id: n.id, position: n.position, arrivedBy: n.arrivedBy, result: n.result,
      at: n.at, parentId: n.parentId, snapshotDirections: n.snapshotDirections, children: n.children.map(s)
    });
    return { root: s(this.rootNode), cursorId: this.currentCursorId, seq: this.seq };
  }
  public serialize(): string { return JSON.stringify(this.toJSON()); }
  public static deserialize(raw: string | any, reg?: PolyInterfaceRegistry): InteractionTree {
    return InteractionTree.fromJSON(typeof raw === 'string' ? JSON.parse(raw) : raw, reg);
  }

  public prune(max = 100): number {
    if (this.nodeMap.size <= max) return 0;
    const active = new Set(this.path().map(n => n.id));
    let dropped = 0, changed = true;
    while (this.nodeMap.size > max && changed) {
      changed = false;
      for (const [id, n] of Array.from(this.nodeMap.entries())) {
        if (this.nodeMap.size <= max) break;
        if (!active.has(id) && n.id !== this.rootNode.id && n.children.length === 0) {
          if (n.parentId) {
            const p = this.nodeMap.get(n.parentId);
            if (p) p.children = p.children.filter(c => c.id !== id);
          }
          this.nodeMap.delete(id); dropped++; changed = true;
        }
      }
    }
    return dropped;
  }

  public static fromJSON(data: any, reg?: PolyInterfaceRegistry): InteractionTree {
    if (!data?.root) throw new Error('Invalid InteractionTree JSON');
    const tree = Object.create(InteractionTree.prototype) as InteractionTree;
    (tree as any).polyRegistry = reg;
    (tree as any).nodeMap = new Map<string, InternalNode>();
    (tree as any).seq = data.seq ?? 0;
    const d = (raw: any): InternalNode => {
      const n: InternalNode = {
        id: raw.id, position: raw.position, arrivedBy: raw.arrivedBy ?? null,
        result: raw.result, at: raw.at, parentId: raw.parentId ?? null,
        snapshotDirections: raw.snapshotDirections, children: []
      };
      (tree as any).nodeMap.set(n.id, n);
      n.children = (raw.children || []).map(d);
      return n;
    };
    (tree as any).rootNode = d(data.root);
    (tree as any).currentCursorId = data.cursorId ?? (tree as any).rootNode.id;
    return tree;
  }

  private toPublicNode(n: InternalNode): InteractionNode {
    return {
      id: n.id, position: n.position, arrivedBy: n.arrivedBy ?? null,
      result: n.result, at: n.at, children: n.children.map(c => this.toPublicNode(c))
    };
  }
}
