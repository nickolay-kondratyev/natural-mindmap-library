import type { MindmapConfig } from '../config/config';
import type { MindmapExtensions } from '../extensions';
import { layoutStagesFor } from '../extensions';
import type { NodeColorMap } from '../color/colorStrategy';
import { StraightPath, type Branch } from '../geometry/branchPath';
import { runLayoutPipeline } from '../layout/pipeline';
import type { NodePositions } from '../layout/layoutTypes';
import type { MindmapData, Point } from '../model/node';
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
  return tree.nodes
    .filter((node) => node.parentId !== null)
    .map((node) => ({
      parentId: node.parentId as string,
      childId: node.id,
      path: new StraightPath(positions.get(node.parentId as string) as Point, positions.get(node.id) as Point),
    }));
}
