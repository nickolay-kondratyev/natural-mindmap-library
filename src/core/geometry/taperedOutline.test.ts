import { DEFAULT_CONFIG } from '../config/config';
import type { Point } from '../model/node';
import { StraightPath, type Branch } from './branchPath';
import { taperedOutline, widthAt, type BranchOutline } from './taperedOutline';

/** Straight horizontal limb: the normal is +y, so "left" edge points have y > 0 and "right" edge y < 0. */
const LENGTH = 200;
const branch: Branch = {
  parentId: 'p',
  childId: 'c',
  path: new StraightPath({ x: 0, y: 0 }, { x: LENGTH, y: 0 }),
  width: { start: 40, end: 6 },
};
const { asymmetry } = DEFAULT_CONFIG.branch;

/** Pairs the i-th left point with its mirrored right point and returns the local total width. */
function widthsAlong(outline: BranchOutline): number[] {
  const perEdge = outline.length / 2;
  const left = outline.slice(0, perEdge);
  const right = outline.slice(perEdge).reverse();
  return left.map((l, i) => Math.abs(l.y - (right[i] as Point).y));
}

describe('taperedOutline', () => {
  const outline = taperedOutline(branch, asymmetry);

  it('WHEN walking from parent to child THEN the limb never gets wider (monotonic taper)', () => {
    const widths = widthsAlong(outline);
    const growsSomewhere = widths.some((w, i) => i > 0 && w > (widths[i - 1] as number) + 1e-9);
    expect(growsSomewhere).toBe(false);
  });

  it('WHEN the limb starts THEN it is exactly the start width, and ends at the end width', () => {
    const widths = widthsAlong(outline);
    expect([widths[0], widths[widths.length - 1]]).toEqual([branch.width.start, branch.width.end]);
  });

  it('WHEN asymmetry is on THEN one edge bulges away from the centerline more than the other', () => {
    const perEdge = outline.length / 2;
    const middle = Math.floor(perEdge / 2);
    const leftOffset = Math.abs((outline[middle] as Point).y);
    const rightOffset = Math.abs((outline[outline.length - 1 - middle] as Point).y);
    expect(leftOffset).not.toBeCloseTo(rightOffset, 6);
  });

  it('WHEN asymmetry is zero THEN both edges mirror each other', () => {
    const symmetric = taperedOutline(branch, 0);
    const perEdge = symmetric.length / 2;
    const mirrored = symmetric
      .slice(0, perEdge)
      .every((l, i) => Math.abs(l.y + (symmetric[symmetric.length - 1 - i] as Point).y) < 1e-9);
    expect(mirrored).toBe(true);
  });

  it('WHEN built twice for the same branch THEN the outline is identical (deterministic)', () => {
    expect(taperedOutline(branch, asymmetry)).toEqual(outline);
  });

  it('WHEN two branches differ only by child id THEN the bulge side can differ but the widths cannot', () => {
    const sibling = taperedOutline({ ...branch, childId: 'd' }, asymmetry);
    expect(widthsAlong(sibling)).toEqual(widthsAlong(outline));
  });
});

describe('widthAt', () => {
  it('WHEN t goes from 0 to 1 THEN the width eases from start to end', () => {
    expect([widthAt(40, 6, 0), widthAt(40, 6, 1)]).toEqual([40, 6]);
  });
});
