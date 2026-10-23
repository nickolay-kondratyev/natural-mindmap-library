import type { NodePositions } from '../layout/layoutTypes';
import type { NodeId, Point, Side } from '../model/node';
import type { MindmapTree } from '../model/tree';
import type { NodeBox, NodeShape } from '../shape/nodeShape';
import type { NodeSizeMap } from '../size/nodeSizeResolver';

/** The part of a `Scene` hit testing reads (scene coordinates). */
export interface HitScene {
  readonly tree: MindmapTree;
  readonly positions: NodePositions;
  readonly sizes: NodeSizeMap;
}

/** Radius of the round hover buttons around a node, in scene px. */
export const HANDLE_RADIUS = 10;
/** Clear space between a node's bounding box and its hover buttons, in scene px. */
export const HANDLE_GAP = 6;

/** Hover buttons of a node (spec I4): "+" on the outer side adds a child, "x" above it deletes the node. */
export type NodeHandle =
  | { readonly kind: 'add-child'; readonly nodeId: NodeId; readonly center: Point; readonly side: Side }
  | { readonly kind: 'delete'; readonly nodeId: NodeId; readonly center: Point };

export type PointerTarget =
  | { readonly kind: 'empty' }
  | { readonly kind: 'node'; readonly nodeId: NodeId }
  | { readonly kind: 'handle'; readonly handle: NodeHandle };

const EMPTY_TARGET: PointerTarget = { kind: 'empty' };
const NO_IDS: ReadonlySet<NodeId> = new Set();
/** Unit x direction of each side's "outer" edge. */
const OUTWARD_X: Readonly<Record<Side, number>> = { left: -1, right: 1 };

export function nodeBoxOf(scene: HitScene, nodeId: NodeId): NodeBox | null {
  const center = scene.positions.get(nodeId);
  const size = scene.sizes.get(nodeId);
  return center === undefined || size === undefined ? null : { center, size };
}

/**
 * Buttons shown while `nodeId` is hovered. The root has a "+" on both sides (its children pick a side) and no
 * delete (the central topic cannot be deleted).
 */
export function nodeHandles(scene: HitScene, nodeId: NodeId): readonly NodeHandle[] {
  const box = nodeBoxOf(scene, nodeId);
  if (box === null) return [];
  const side = scene.tree.sideOf(nodeId);
  if (side === null) return [addChildHandle(box, nodeId, 'left'), addChildHandle(box, nodeId, 'right')];
  return [addChildHandle(box, nodeId, side), deleteHandle(box, nodeId)];
}

/** Topmost node whose shape contains `point`, skipping `excludedIds` (e.g. the subtree being dragged). */
export function nodeAt(scene: HitScene, point: Point, shape: NodeShape, excludedIds: ReadonlySet<NodeId> = NO_IDS): NodeId | null {
  // Nodes are painted in data order, so the last one is on top.
  for (let i = scene.tree.nodes.length - 1; i >= 0; i -= 1) {
    const id = (scene.tree.nodes[i] as { readonly id: NodeId }).id;
    if (excludedIds.has(id)) continue;
    const box = nodeBoxOf(scene, id);
    if (box !== null && shape.contains(box, point)) return id;
  }
  return null;
}

export function handleAt(handles: readonly NodeHandle[], point: Point): NodeHandle | null {
  return handles.find((handle) => Math.hypot(point.x - handle.center.x, point.y - handle.center.y) <= HANDLE_RADIUS) ?? null;
}

/**
 * What is under `point`: the buttons of the currently hovered node (`activeNodeId`) win, since they sit just
 * outside it and may overlap a neighbour; then nodes; else empty canvas.
 */
export function pointerTargetAt(scene: HitScene, point: Point, shape: NodeShape, activeNodeId: NodeId | null): PointerTarget {
  if (activeNodeId !== null) {
    const handle = handleAt(nodeHandles(scene, activeNodeId), point);
    if (handle !== null) return { kind: 'handle', handle };
  }
  const nodeId = nodeAt(scene, point, shape);
  return nodeId === null ? EMPTY_TARGET : { kind: 'node', nodeId };
}

function addChildHandle(box: NodeBox, nodeId: NodeId, side: Side): NodeHandle {
  const reach = box.size.width / 2 + HANDLE_GAP + HANDLE_RADIUS;
  return { kind: 'add-child', nodeId, side, center: { x: box.center.x + OUTWARD_X[side] * reach, y: box.center.y } };
}

function deleteHandle(box: NodeBox, nodeId: NodeId): NodeHandle {
  const reach = box.size.height / 2 + HANDLE_GAP + HANDLE_RADIUS;
  return { kind: 'delete', nodeId, center: { x: box.center.x, y: box.center.y - reach } };
}
