import { GOLDEN_RATIO } from '../math/goldenRatio';
import type { Point } from '../model/node';
import type { Branch } from './branchPath';

/** Closed polygon (scene coordinates) that the renderer fills to draw one limb (spec R5, R7). */
export type BranchOutline = readonly Point[];

/** Points per edge; limbs are smooth cubics, so this is dense enough that the polygon reads as a curve. */
const OUTLINE_SAMPLES = 32;
/**
 * Width profile exponent: `(1 - t)^phi` thins fast after leaving the parent and eases into the child, like a
 * brush stroke lifting off, instead of a mechanical linear wedge.
 */
const TAPER_EXPONENT = GOLDEN_RATIO;
/** Integer hash constants (FNV-1a 32-bit) for a cheap deterministic per-branch seed. */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Turns a branch into a filled, tapered outline. One edge bulges by `asymmetry` (a half-sine along the
 * limb) and which edge that is comes from a hash of the child id, so the look is hand-made yet identical
 * on every render (spec R7, R22, Q1).
 */
export function taperedOutline(branch: Branch, asymmetry: number): BranchOutline {
  const { path, width } = branch;
  const bulgeOnLeft = hashId(branch.childId) % 2 === 0;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= OUTLINE_SAMPLES; i += 1) {
    const t = i / OUTLINE_SAMPLES;
    const { point, tangent } = path.sampleAt(t * path.length);
    const normal = { x: -tangent.y, y: tangent.x };
    const halfWidth = widthAt(width.start, width.end, t) / 2;
    const bulge = halfWidth * asymmetry * Math.sin(Math.PI * t);
    const leftHalf = halfWidth + (bulgeOnLeft ? bulge : 0);
    const rightHalf = halfWidth + (bulgeOnLeft ? 0 : bulge);
    left.push({ x: point.x + normal.x * leftHalf, y: point.y + normal.y * leftHalf });
    right.push({ x: point.x - normal.x * rightHalf, y: point.y - normal.y * rightHalf });
  }
  return [...left, ...right.reverse()];
}

/** Eased taper from `start` at t = 0 to `end` at t = 1; strictly decreasing when `end < start`. */
export function widthAt(start: number, end: number, t: number): number {
  return end + (start - end) * (1 - t) ** TAPER_EXPONENT;
}

/** FNV-1a over the UTF-16 code units: tiny, dependency-free, stable across runs and platforms. */
function hashId(id: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}
