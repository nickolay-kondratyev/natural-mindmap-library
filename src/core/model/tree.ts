import type { MindmapNode, NodeId, Side } from './node';

/**
 * Indexed, read-only view over the flat host data: parent/children lookups, depth and resolved side.
 * Every stage that needs structure (layout, sizes, colors, rendering) reads this instead of re-walking the list.
 */
export interface MindmapTree {
  readonly root: MindmapNode;
  readonly nodes: readonly MindmapNode[];
  nodeById(id: NodeId): MindmapNode;
  childrenOf(id: NodeId): readonly MindmapNode[];
  parentOf(id: NodeId): MindmapNode | null;
  /** Root is depth 0, first-level nodes depth 1, ... */
  depthOf(id: NodeId): number;
  /** Side the node is drawn on; the root has no side. */
  sideOf(id: NodeId): Side | null;
  /** First-level ancestor (or the node itself when first-level); `null` for the root. */
  firstLevelAncestorOf(id: NodeId): MindmapNode | null;
  isAncestor(ancestorId: NodeId, descendantId: NodeId): boolean;
  /** Maximum depth over all nodes. */
  readonly maxDepth: number;
}

export class InvalidMindmapDataError extends Error {}

export function buildTree(nodes: readonly MindmapNode[]): MindmapTree {
  return new IndexedTree(nodes);
}

/** First-level nodes without an explicit side alternate right, left, right, ... in data order (see alternatingSide). */
const SIDE_ALTERNATION: readonly Side[] = ['right', 'left'];

class IndexedTree implements MindmapTree {
  readonly root: MindmapNode;
  readonly nodes: readonly MindmapNode[];
  readonly maxDepth: number;
  private readonly byId = new Map<NodeId, MindmapNode>();
  private readonly children = new Map<NodeId, MindmapNode[]>();
  private readonly depth = new Map<NodeId, number>();
  private readonly side = new Map<NodeId, Side>();

  constructor(nodes: readonly MindmapNode[]) {
    this.nodes = nodes;
    for (const node of nodes) {
      if (this.byId.has(node.id)) throw new InvalidMindmapDataError(`Duplicate node id [${node.id}]`);
      this.byId.set(node.id, node);
      this.children.set(node.id, []);
    }
    const roots = nodes.filter((n) => n.parentId === null);
    const root = roots[0];
    if (root === undefined || roots.length !== 1) {
      throw new InvalidMindmapDataError(`Expected exactly one root (parentId null), found ${roots.length}`);
    }
    this.root = root;
    for (const node of nodes) {
      if (node.parentId === null) continue;
      const siblings = this.children.get(node.parentId);
      if (siblings === undefined) throw new InvalidMindmapDataError(`Node [${node.id}] has unknown parentId [${node.parentId}]`);
      siblings.push(node);
    }
    this.maxDepth = this.indexDepthsAndSides();
  }

  nodeById(id: NodeId): MindmapNode {
    const node = this.byId.get(id);
    if (node === undefined) throw new InvalidMindmapDataError(`Unknown node id [${id}]`);
    return node;
  }

  childrenOf(id: NodeId): readonly MindmapNode[] {
    return this.children.get(id) ?? [];
  }

  parentOf(id: NodeId): MindmapNode | null {
    const parentId = this.nodeById(id).parentId;
    return parentId === null ? null : this.nodeById(parentId);
  }

  depthOf(id: NodeId): number {
    const depth = this.depth.get(id);
    if (depth === undefined) throw new InvalidMindmapDataError(`Node [${id}] is not reachable from the root`);
    return depth;
  }

  sideOf(id: NodeId): Side | null {
    return this.side.get(id) ?? null;
  }

  firstLevelAncestorOf(id: NodeId): MindmapNode | null {
    let current: MindmapNode | null = this.nodeById(id);
    while (current !== null && this.depthOf(current.id) > 1) current = this.parentOf(current.id);
    return current !== null && this.depthOf(current.id) === 1 ? current : null;
  }

  isAncestor(ancestorId: NodeId, descendantId: NodeId): boolean {
    let current = this.parentOf(descendantId);
    while (current !== null) {
      if (current.id === ancestorId) return true;
      current = this.parentOf(current.id);
    }
    return false;
  }

  /** Breadth-first walk from the root; also validates every node is reachable (no cycles / orphans). */
  private indexDepthsAndSides(): number {
    let maxDepth = 0;
    const queue: NodeId[] = [this.root.id];
    this.depth.set(this.root.id, 0);
    let visited = 0;
    while (queue.length > 0) {
      const id = queue.shift() as NodeId;
      visited += 1;
      const depth = this.depth.get(id) as number;
      maxDepth = Math.max(maxDepth, depth);
      let unsidedCount = 0;
      for (const child of this.childrenOf(id)) {
        this.depth.set(child.id, depth + 1);
        if (depth === 0) {
          this.side.set(child.id, child.side ?? alternatingSide(unsidedCount++));
        } else {
          this.side.set(child.id, this.side.get(id) as Side);
        }
        queue.push(child.id);
      }
    }
    if (visited !== this.nodes.length) throw new InvalidMindmapDataError('Some nodes are not reachable from the root');
    return maxDepth;
  }
}

/** Only first-level nodes without an explicit side take part in the alternation, so explicit sides never shift it. */
function alternatingSide(unsidedIndex: number): Side {
  return SIDE_ALTERNATION[unsidedIndex % SIDE_ALTERNATION.length] as Side;
}
