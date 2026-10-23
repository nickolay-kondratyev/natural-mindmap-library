import { buildTree } from '../model/tree';
import { REFERENCE_DATA } from '../model/referenceData';
import { resolveNodeSizes } from '../size/nodeSizeResolver';
import { DEFAULT_CONFIG } from '../config/config';
import { goldenRatioBowCurve } from './bowCurve';
import { defaultLayoutStages, runLayoutPipeline } from './pipeline';
import type { LayoutContext, LayoutStage } from './layoutTypes';

describe('runLayoutPipeline', () => {
  // GIVEN the reference data and default context
  const tree = buildTree(REFERENCE_DATA);
  const context: LayoutContext = {
    tree,
    sizes: resolveNodeSizes(tree, DEFAULT_CONFIG.node),
    config: DEFAULT_CONFIG.layout,
    bowCurve: goldenRatioBowCurve,
  };

  it('WHEN running the default stages THEN every node gets a position', () => {
    const positions = runLayoutPipeline(context, defaultLayoutStages(context.config));
    expect([...positions.keys()].sort()).toEqual(REFERENCE_DATA.map((n) => n.id).sort());
  });

  it('WHEN running the default stages THEN left-side nodes are left of the root and right-side nodes right of it', () => {
    const positions = runLayoutPipeline(context, defaultLayoutStages(context.config));
    const signs = REFERENCE_DATA.filter((n) => n.parentId !== null).map((n) => ({
      side: tree.sideOf(n.id),
      sign: Math.sign(positions.get(n.id)?.x ?? 0),
    }));
    expect(signs.every((s) => (s.side === 'left' ? s.sign === -1 : s.sign === 1))).toBe(true);
  });

  it('WHEN the host supplies its own stage list THEN exactly those stages run in order', () => {
    const calls: string[] = [];
    const stage = (name: string): LayoutStage => ({
      name,
      run: (positions) => {
        calls.push(name);
        return positions;
      },
    });
    runLayoutPipeline(context, [stage('one'), stage('two')]);
    expect(calls).toEqual(['one', 'two']);
  });
});
