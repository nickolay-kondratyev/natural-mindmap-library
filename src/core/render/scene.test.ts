import { DEFAULT_CONFIG } from '../config/config';
import { DEFAULT_EXTENSIONS } from '../extensions';
import { REFERENCE_DATA } from '../model/referenceData';
import { buildScene } from './scene';

describe('buildScene', () => {
  // GIVEN the reference data with defaults
  const scene = buildScene(REFERENCE_DATA, DEFAULT_CONFIG, DEFAULT_EXTENSIONS);

  it('WHEN built THEN there is one branch per non-root node', () => {
    expect(scene.branches.length).toBe(REFERENCE_DATA.length - 1);
  });

  it('WHEN built THEN every branch starts at its parent center and ends at its child center', () => {
    const consistent = scene.branches.every((b) => {
      const start = b.path.sampleAt(0).point;
      const end = b.path.sampleAt(b.path.length).point;
      return (
        JSON.stringify(start) === JSON.stringify(scene.positions.get(b.parentId)) &&
        JSON.stringify(end) === JSON.stringify(scene.positions.get(b.childId))
      );
    });
    expect(consistent).toBe(true);
  });

  it('WHEN a host stage leaves a node unpositioned THEN building fails plainly naming the node', () => {
    const emptyStage = { name: 'empty', run: () => new Map() };
    expect(() => buildScene(REFERENCE_DATA, DEFAULT_CONFIG, { ...DEFAULT_EXTENSIONS, layoutStages: [emptyStage] })).toThrow(
      'no position for node [root]',
    );
  });
});

describe('GIVEN a position override for a first-level node', () => {
  const dragged = { x: 500, y: 300 };
  const scene = buildScene(REFERENCE_DATA, DEFAULT_CONFIG, DEFAULT_EXTENSIONS, new Map([['vida', dragged]]));

  it('WHEN built THEN its incoming branch re-routes to end at the new position', () => {
    const branch = scene.branches.find((b) => b.childId === 'vida');
    expect(branch?.path.sampleAt(branch.path.length).point).toEqual(dragged);
  });
});
