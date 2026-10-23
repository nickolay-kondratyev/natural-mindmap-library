import { StraightPath } from '../geometry/branchPath';
import type { BranchTextFitConfig } from '../config/config';
import { GlyphRun } from './glyphRun';
import { layoutBranchLabel, layoutNodeLabel } from './labelLayout';

const LIMITS: BranchTextFitConfig = { paddingPx: 4, minPaddingPx: 0, minLetterSpacingEm: 0, minFontScale: 1 };
const STYLE = { sizePx: 10, letterSpacingEm: 0 };
// Four 1em glyphs -> 40px at 10px.
const RUN = new GlyphRun([1, 1, 1, 1], 1);

describe('layoutBranchLabel', () => {
  describe('GIVEN a right-side branch with a rim-to-rim span of [50, 150]', () => {
    const path = new StraightPath({ x: 0, y: 0 }, { x: 200, y: 0 });
    const layout = layoutBranchLabel(path, { start: 50, end: 150 }, RUN, STYLE, LIMITS);

    it('WHEN laid out THEN the label is centered between the rims', () => {
      expect(layout.glyphs.map((g) => g.center.x)).toEqual([85, 95, 105, 115]);
    });
  });

  describe('GIVEN a left-side branch running from x=0 to x=-200 with a span of [50, 150]', () => {
    const path = new StraightPath({ x: 0, y: 0 }, { x: -200, y: 0 });
    const layout = layoutBranchLabel(path, { start: 50, end: 150 }, RUN, STYLE, LIMITS);

    it('WHEN laid out THEN glyphs run left to right on screen', () => {
      expect(layout.glyphs.map((g) => g.center.x)).toEqual([-115, -105, -95, -85]);
    });

    it('WHEN laid out THEN glyphs are upright', () => {
      const angle = layout.glyphs[0]?.angle ?? Number.NaN;
      expect(Math.cos(angle)).toBeCloseTo(1);
    });
  });

  describe('GIVEN a span too short for all glyphs at the smallest font', () => {
    const path = new StraightPath({ x: 0, y: 0 }, { x: 200, y: 0 });
    const layout = layoutBranchLabel(path, { start: 50, end: 75 }, RUN, STYLE, LIMITS);

    it('WHEN laid out THEN overflowing glyphs are dropped', () => {
      expect(layout.glyphs.length).toBe(2);
    });

    it('WHEN laid out THEN the last kept glyph ends before the span end', () => {
      const lastCenter = layout.glyphs[layout.glyphs.length - 1]?.center.x ?? Number.POSITIVE_INFINITY;
      expect(lastCenter + RUN.glyphWidthPx(1, layout.sizePx) / 2).toBeLessThanOrEqual(75);
    });
  });
});

describe('layoutNodeLabel', () => {
  // GIVEN a node centered at (100, 50)
  const center = { x: 100, y: 50 };

  it('WHEN the label fits THEN it is centered on the node', () => {
    const layout = layoutNodeLabel(center, 100, RUN, STYLE);
    expect(layout.glyphs.map((g) => g.center)).toEqual([
      { x: 85, y: 50 },
      { x: 95, y: 50 },
      { x: 105, y: 50 },
      { x: 115, y: 50 },
    ]);
  });

  it('WHEN the label fits THEN the font size is kept', () => {
    expect(layoutNodeLabel(center, 100, RUN, STYLE).sizePx).toBe(10);
  });

  it('WHEN the label is wider than allowed THEN the font shrinks to fit', () => {
    expect(layoutNodeLabel(center, 20, RUN, STYLE).sizePx).toBe(5);
  });
});
