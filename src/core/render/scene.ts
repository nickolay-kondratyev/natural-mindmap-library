import type { MindmapConfig } from '../config/config';
import type { MindmapExtensions } from '../extensions';
import { layoutStagesFor } from '../extensions';
import type { NodeColorMap } from '../color/colorStrategy';
import { StraightPath, type Branch } from '../geometry/branchPath';
import { runLayoutPipeline } from '../layout/pipeline';
import type { NodePositions } from '../layout/layoutTypes';
import type { MindmapData, NodeId, Point } from '../model/node';
import { buildTree, type MindmapTree } from '../model/tree';
import { resolveNodeSizes, type NodeSizeMap } from '../size/nodeSizeResolver';

/** Everything the renderer needs, fully resolved from host data + config + extensions. */
export interface Scene {
  readonly tree: MindmapTree;
  readonly sizes: NodeSizeMap;
  readonly positions: NodePositions;
  readonly colors: NodeColorMap;
  readonly branches: readonly Branch[];
}

export function buildScene(data: MindmapData, config: MindmapConfig, extensions: MindmapExtensions): Scene {
  const tree = buildTree(data);
  const sizes = resolveNodeSizes(tree, config.node);
  const positions = runLayoutPipeline(
    { tree, sizes, config: config.layout, bowCurve: extensions.bowCurve },
    layoutStagesFor(extensions, config.layout),
  );
  const colors = extensions.colorStrategy.resolve(tree, config.theme);
  return { tree, sizes, positions, colors, branches: straightBranches(tree, positions) };
}

/** Scaffold placeholder: center-to-center straight segments; the branch ticket swaps in curved geometry. */
function straightBranches(tree: MindmapTree, positions: NodePositions): Branch[] {
  const branches: Branch[] = [];
  for (const node of tree.nodes) {
    if (node.parentId === null) continue;
    branches.push({
      parentId: node.parentId,
      childId: node.id,
      path: new StraightPath(positionOf(positions, node.parentId), positionOf(positions, node.id)),
    });
  }
  return branches;
}

/** Fails plainly when a (host-supplied) layout stage left a node unpositioned instead of producing NaN geometry. */
function positionOf(positions: NodePositions, id: NodeId): Point {
  const position = positions.get(id);
  if (position === undefined) throw new Error(`Layout pipeline produced no position for node [${id}]`);
  return position;
}
