import type { MindmapConfig } from '../config/config';
import type { MindmapExtensions } from '../extensions';
import { layoutStagesFor } from '../extensions';
import type { NodeColorMap } from '../color/colorStrategy';
import type { Branch } from '../geometry/branchPath';
import { buildBranches } from '../geometry/branchGeometry';
import { runLayoutPipeline } from '../layout/pipeline';
import type { NodePositions } from '../layout/layoutTypes';
import type { MindmapData } from '../model/node';
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
  const branches = buildBranches({ tree, positions, sizes, config: config.branch });
  return { tree, sizes, positions, colors, branches };
}
