import type { NodeId, Point } from '../model/node';
import type { MindmapTree } from '../model/tree';
import type { NodeSizeMap } from '../size/nodeSizeResolver';
import { resolveCollisions } from './collisionStage';
import { subtreeIds } from './layoutLookups';
import type { NodePositions } from './layoutTypes';

/**
 * User-chosen node centres (spec I2), keyed by node id, in scene coordinates. Library-local layout state: they
 * survive data updates (ids that no longer exist are ignored) and are reported to the host as events, never
 * written into host data.
 */
export type PositionOverrides = ReadonlyMap<NodeId, Point>;

export const NO_POSITION_OVERRIDES: PositionOverrides = new Map();

export interface PositionOverrideInput {
  readonly tree: MindmapTree;
  readonly sizes: NodeSizeMap;
  /** Clearance for the push-apart, usually `layout.collisionPadding`. */
  readonly padding: number;
  readonly overrides: PositionOverrides;
}

/** Shifts `nodeId` and its whole subtree by `delta`. Pure: returns a new map. */
export function moveSubtree(positions: NodePositions, tree: MindmapTree, nodeId: NodeId, delta: Point): NodePositions {
  const result = new Map(positions);
  for (const id of subtreeIds(tree, nodeId)) {
    const position = result.get(id);
    if (position !== undefined) result.set(id, { x: position.x + delta.x, y: position.y + delta.y });
  }
  return result;
}

/** A node drag that ended away from any drop target (spec I2), in scene coordinates. */
export interface NodeDrop {
  readonly nodeId: NodeId;
  /** The node's centre when the drag started. */
  readonly from: Point;
  readonly to: Point;
}

/**
 * Overrides after `drop`: the dragged node gets its new centre, and descendants with an override of their own
 * move by the same delta, since the whole subtree travels with the dragged node (else they would snap back).
 */
export function withNodeDropped(overrides: PositionOverrides, tree: MindmapTree, drop: NodeDrop): PositionOverrides {
  const delta = { x: drop.to.x - drop.from.x, y: drop.to.y - drop.from.y };
  const result = new Map(overrides);
  for (const id of subtreeIds(tree, drop.nodeId)) {
    const position = result.get(id);
    if (position !== undefined) result.set(id, { x: position.x + delta.x, y: position.y + delta.y });
  }
  result.set(drop.nodeId, drop.to);
  return result;
}

/** Overrides minus those of `nodeId`'s subtree, so it lands at its layout spot (e.g. after a reparent). */
export function withoutSubtree(overrides: PositionOverrides, tree: MindmapTree, nodeId: NodeId): PositionOverrides {
  const dropped = new Set(subtreeIds(tree, nodeId));
  return new Map([...overrides].filter(([id]) => !dropped.has(id)));
}

/**
 * Places every overridden node at its chosen centre, carrying its subtree along (spec I2), then pushes the other
 * nodes apart (R23) with the overridden subtrees pinned so they stay exactly where the user put them. Parents are
 * placed before children, so a child with its own override still ends up at it.
 *
 * Without overrides the input is returned as-is (no extra collision pass), so untouched maps render exactly as
 * the layout pipeline produced them.
 */
export function applyPositionOverrides(positions: NodePositions, input: PositionOverrideInput): NodePositions {
  const { tree, overrides } = input;
  const known = tree.nodes.filter((node) => overrides.has(node.id) && positions.has(node.id) && node.parentId !== null);
  if (known.length === 0) return positions;

  let result = positions;
  const pinnedIds = new Set<NodeId>();
  for (const node of [...known].sort((a, b) => tree.depthOf(a.id) - tree.depthOf(b.id))) {
    const target = overrides.get(node.id) as Point;
    const current = result.get(node.id) as Point;
    result = moveSubtree(result, tree, node.id, { x: target.x - current.x, y: target.y - current.y });
    for (const id of subtreeIds(tree, node.id)) pinnedIds.add(id);
  }
  return resolveCollisions(result, { tree, sizes: input.sizes, padding: input.padding, pinnedIds });
}
