import { DEFAULT_CONFIG } from '../config/config';
import type { MindmapData, NodeId, Point } from '../model/node';
import { buildTree } from '../model/tree';
import { resolveNodeSizes } from '../size/nodeSizeResolver';
import type { NodePositions } from './layoutTypes';
import { applyPositionOverrides, moveSubtree, NO_POSITION_OVERRIDES, type PositionOverrides } from './positionOverrides';

const PADDING = 8;

// GIVEN a root with a parent `a` (child `a1`) on the right and a separate node `b` below `a`
const data: MindmapData = [
  { id: 'root', parentId: null, text: 'ROOT' },
  { id: 'a', parentId: 'root', text: 'A', side: 'right' },
  { id: 'a1', parentId: 'a', text: 'A1' },
  { id: 'b', parentId: 'root', text: 'B', side: 'right' },
];
const tree = buildTree(data);
const sizes = resolveNodeSizes(tree, DEFAULT_CONFIG.node);
const positions: NodePositions = new Map<NodeId, Point>([
  ['root', { x: 0, y: 0 }],
  ['a', { x: 300, y: -100 }],
  ['a1', { x: 500, y: -100 }],
  ['b', { x: 300, y: 200 }],
]);

function apply(overrides: PositionOverrides): NodePositions {
  return applyPositionOverrides(positions, { tree, sizes, padding: PADDING, overrides });
}

function boxesOverlap(result: NodePositions, idA: NodeId, idB: NodeId): boolean {
  const pa = result.get(idA)!;
  const pb = result.get(idB)!;
  const sa = sizes.get(idA)!;
  const sb = sizes.get(idB)!;
  return Math.abs(pa.x - pb.x) < (sa.width + sb.width) / 2 && Math.abs(pa.y - pb.y) < (sa.height + sb.height) / 2;
}

describe('moveSubtree', () => {
  it('WHEN moving a parent THEN its child moves by the same delta', () => {
    expect(moveSubtree(positions, tree, 'a', { x: 10, y: 20 }).get('a1')).toEqual({ x: 510, y: -80 });
  });

  it('WHEN moving a parent THEN unrelated nodes stay put', () => {
    expect(moveSubtree(positions, tree, 'a', { x: 10, y: 20 }).get('b')).toEqual({ x: 300, y: 200 });
  });
});

describe('applyPositionOverrides', () => {
  it('GIVEN no overrides WHEN applied THEN the layout positions are returned untouched', () => {
    expect(apply(NO_POSITION_OVERRIDES)).toBe(positions);
  });

  it('GIVEN an override for a parent WHEN applied THEN the parent sits exactly at it', () => {
    expect(apply(new Map([['a', { x: 320, y: -60 }]])).get('a')).toEqual({ x: 320, y: -60 });
  });

  it('GIVEN an override for a parent WHEN applied THEN its child keeps its offset to the parent', () => {
    expect(apply(new Map([['a', { x: 320, y: -60 }]])).get('a1')).toEqual({ x: 520, y: -60 });
  });

  it('GIVEN overrides for a parent and its child WHEN applied THEN the child ends at its own override', () => {
    const result = apply(
      new Map([
        ['a', { x: 320, y: -60 }],
        ['a1', { x: 450, y: 0 }],
      ]),
    );
    expect(result.get('a1')).toEqual({ x: 450, y: 0 });
  });

  it('GIVEN an override for a node that no longer exists WHEN applied THEN it is ignored', () => {
    expect(apply(new Map([['gone', { x: 1, y: 1 }]]))).toBe(positions);
  });

  it('GIVEN an override that drops a node onto another WHEN applied THEN the other node is pushed clear', () => {
    const result = apply(new Map([['a', { x: 300, y: 195 }]]));
    expect(boxesOverlap(result, 'a', 'b')).toBe(false);
  });

  it('GIVEN an override that drops a node onto another WHEN applied THEN the overridden node does not yield', () => {
    expect(apply(new Map([['a', { x: 300, y: 195 }]])).get('a')).toEqual({ x: 300, y: 195 });
  });
});
