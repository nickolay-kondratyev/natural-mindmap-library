import type { Point } from '../model/node';
import type { LayoutContext, LayoutStage, NodePositions } from './layoutTypes';

/**
 * Scaffold placeholder: a plain bilateral grid (depth -> x, sibling order -> y), vertically centered on the
 * root. Replaced by the tidy-tree / bow / jitter / collision stages of the layout ticket; kept tiny on purpose.
 */
export const placeholderBilateralStage: LayoutStage = {
  name: 'placeholder-bilateral',
  run(_positions: NodePositions, context: LayoutContext): NodePositions {
    const { tree, config } = context;
    const positions = new Map<string, Point>();
    positions.set(tree.root.id, { x: 0, y: 0 });
    for (const side of ['left', 'right'] as const) {
      const direction = side === 'left' ? -1 : 1;
      const perDepthRow = new Map<number, number>();
      const nodesOnSide = tree.nodes.filter((n) => tree.sideOf(n.id) === side);
      for (const node of nodesOnSide) {
        const depth = tree.depthOf(node.id);
        const row = perDepthRow.get(depth) ?? 0;
        perDepthRow.set(depth, row + 1);
        positions.set(node.id, { x: direction * depth * config.horizontalGap, y: row * config.verticalGap });
      }
      centerColumnsOnRoot(positions, nodesOnSide.map((n) => n.id), tree, config.verticalGap);
    }
    return positions;
  },
};

function centerColumnsOnRoot(
  positions: Map<string, Point>,
  ids: readonly string[],
  tree: LayoutContext['tree'],
  verticalGap: number,
): void {
  const countPerDepth = new Map<number, number>();
  for (const id of ids) countPerDepth.set(tree.depthOf(id), (countPerDepth.get(tree.depthOf(id)) ?? 0) + 1);
  for (const id of ids) {
    const count = countPerDepth.get(tree.depthOf(id)) ?? 1;
    const current = positions.get(id) as Point;
    positions.set(id, { x: current.x, y: current.y - ((count - 1) * verticalGap) / 2 });
  }
}
