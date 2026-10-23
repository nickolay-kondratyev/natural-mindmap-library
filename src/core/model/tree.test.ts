import { buildTree, InvalidMindmapDataError } from './tree';
import type { MindmapData } from './node';

describe('buildTree', () => {
  // GIVEN a small bilateral map
  const data: MindmapData = [
    { id: 'root', parentId: null, text: 'R' },
    { id: 'a', parentId: 'root', text: 'A', side: 'left' },
    { id: 'a1', parentId: 'a', text: 'A1' },
    { id: 'b', parentId: 'root', text: 'B' },
    { id: 'c', parentId: 'root', text: 'C' },
  ];
  const tree = buildTree(data);

  it('WHEN asking depth THEN root is 0 and grandchildren are 2', () => {
    expect([tree.depthOf('root'), tree.depthOf('a1')]).toEqual([0, 2]);
  });

  it('WHEN a deeper node has no side THEN it inherits its first-level ancestor side', () => {
    expect(tree.sideOf('a1')).toBe('left');
  });

  it('WHEN first-level nodes have no side THEN they alternate right/left in data order', () => {
    expect([tree.sideOf('b'), tree.sideOf('c')]).toEqual(['right', 'left']);
  });

  it('WHEN asking the root side THEN it is null', () => {
    expect(tree.sideOf('root')).toBeNull();
  });

  it('WHEN asking the first-level ancestor of a grandchild THEN it is the first-level node', () => {
    expect(tree.firstLevelAncestorOf('a1')?.id).toBe('a');
  });

  it('WHEN checking ancestry THEN root is an ancestor of a1 but a1 is not an ancestor of root', () => {
    expect([tree.isAncestor('root', 'a1'), tree.isAncestor('a1', 'root')]).toEqual([true, false]);
  });

  it('WHEN data has two roots THEN building fails plainly', () => {
    expect(() => buildTree([...data, { id: 'r2', parentId: null, text: 'X' }])).toThrow(InvalidMindmapDataError);
  });

  it('WHEN a node points at an unknown parent THEN building fails plainly', () => {
    expect(() => buildTree([...data, { id: 'z', parentId: 'nope', text: 'Z' }])).toThrow(InvalidMindmapDataError);
  });
});
