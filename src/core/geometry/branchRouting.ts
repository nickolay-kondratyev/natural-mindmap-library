import type { NodeId, NodeSize, Point } from '../model/node';
import type { BranchWidth } from './branchPath';
import { pointOnCubic, type CubicControlPoints } from './cubicBezierPath';
import type { BranchGeometryInput } from './branchGeometry';

/** A branch while its control points are still being adjusted; becomes a `Branch` once routed. */
export interface RoutableBranch {
  readonly parentId: NodeId;
  readonly childId: NodeId;
  readonly controls: CubicControlPoints;
  readonly width: BranchWidth;
}

interface Box {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Points per curve used for overlap checks. Enough to catch a node-sized box; cheap enough for every paint. */
const ROUTING_SAMPLES = 24;
/**
 * Only the interior of a curve is routed, both around nodes and away from other limbs. Near the endpoints moving
 * the inner control points barely moves the curve (Bernstein weight 3t(1-t) -> 0), so clearing an obstacle there
 * takes a huge bulge that bounces the whole limb; if the endpoint itself is within clearance it cannot clear at
 * all and every pass adds another nudge. Clearance next to the nodes is the collision layout's job (R23), and
 * siblings and parent/child chains legitimately touch there anyway.
 */
const ROUTING_INTERIOR_FROM = 0.15;
const ROUTING_INTERIOR_TO = 0.85;
/** Extra air between a limb's edge and an unrelated node or another limb, in px. */
const CLEARANCE_PX = 6;
/**
 * Moving both inner control points vertically by `d` moves the curve's middle by about 0.75 d (cubic
 * Bernstein weights at t = 0.5), so a gain above 1/0.75 clears an overlap in few passes.
 */
const NUDGE_GAIN = 1.5;
/**
 * Ceiling on the iteration: good enough for a node-sized obstacle or an overlap after a drag; a maze of
 * obstacles is deliberately not solved (spec R8 asks for simple separation, not a physics simulation).
 */
const MAX_ROUTING_PASSES = 6;
/** Direction a curve escapes when the obstacle is exactly centred on it; any fixed choice keeps it deterministic. */
const DEFAULT_ESCAPE_DIRECTION = -1;

/**
 * Routes limbs around unrelated nodes (spec R8) and keeps overlapping limbs apart (R8 sub-bullet) by nudging
 * the two inner control points vertically. Deterministic and purely geometric.
 *
 * Ceiling: O(branches * nodes) for avoidance and O(branches^2 * samples^2) for separation; fine for maps of a
 * few hundred nodes. Upgrade path: a spatial grid over node boxes and branch bounding boxes.
 */
export function routeBranches(branches: readonly RoutableBranch[], input: BranchGeometryInput): RoutableBranch[] {
  const routed = branches.map((branch) => avoidUnrelatedNodes(branch, input));
  return separateOverlappingBranches(routed);
}

function avoidUnrelatedNodes(branch: RoutableBranch, input: BranchGeometryInput): RoutableBranch {
  const obstacles = unrelatedNodeBoxes(branch, input);
  let current = branch;
  for (let pass = 0; pass < MAX_ROUTING_PASSES; pass += 1) {
    const escape = deepestPenetration(current, obstacles);
    if (escape === null) return current;
    current = nudgeVertically(current, escape.direction * escape.depth * NUDGE_GAIN);
  }
  return current;
}

/** Boxes of nodes that are neither end of the branch and do not already cover an endpoint (that is layout's job). */
function unrelatedNodeBoxes(branch: RoutableBranch, input: BranchGeometryInput): Box[] {
  const boxes: Box[] = [];
  for (const node of input.tree.nodes) {
    if (node.id === branch.parentId || node.id === branch.childId) continue;
    const center = input.positions.get(node.id);
    const size = input.sizes.get(node.id);
    if (center === undefined || size === undefined) continue;
    const box = boxAround(center, size, 0);
    if (contains(box, branch.controls.start) || contains(box, branch.controls.end)) continue;
    boxes.push(box);
  }
  return boxes;
}

interface Escape {
  readonly direction: number;
  readonly depth: number;
}

/**
 * The worst (deepest) intrusion of the branch's interior edge into any obstacle, with the shorter vertical way out.
 * WHY-NOT resample the interior like `interiorOverlap`: the whole-curve grid with the ends skipped keeps routed
 * shapes (and the reference view) stable for limbs whose ends were never in the way.
 */
function deepestPenetration(branch: RoutableBranch, obstacles: readonly Box[]): Escape | null {
  let worst: Escape | null = null;
  for (let i = 0; i <= ROUTING_SAMPLES; i += 1) {
    const t = i / ROUTING_SAMPLES;
    if (t < ROUTING_INTERIOR_FROM || t > ROUTING_INTERIOR_TO) continue;
    const point = pointOnCubic(branch.controls, t);
    const margin = halfWidthAt(branch.width, t) + CLEARANCE_PX;
    for (const obstacle of obstacles) {
      const inflated = inflate(obstacle, margin);
      if (!contains(inflated, point)) continue;
      const centerY = (inflated.minY + inflated.maxY) / 2;
      const direction = Math.sign(point.y - centerY) || DEFAULT_ESCAPE_DIRECTION;
      const depth = direction < 0 ? point.y - inflated.minY : inflated.maxY - point.y;
      if (worst === null || depth > worst.depth) worst = { direction, depth };
    }
  }
  return worst;
}

function separateOverlappingBranches(branches: readonly RoutableBranch[]): RoutableBranch[] {
  const result = [...branches];
  for (let pass = 0; pass < MAX_ROUTING_PASSES; pass += 1) {
    let moved = false;
    for (let i = 0; i < result.length; i += 1) {
      for (let j = i + 1; j < result.length; j += 1) {
        const a = result[i] as RoutableBranch;
        const b = result[j] as RoutableBranch;
        if (!mayOverlap(a, b)) continue;
        const overlap = interiorOverlap(a, b);
        if (overlap === null) continue;
        const shift = (overlap.deficit / 2) * NUDGE_GAIN;
        result[i] = nudgeVertically(a, overlap.directionForA * shift);
        result[j] = nudgeVertically(b, -overlap.directionForA * shift);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return result;
}

/** Siblings fork from one trunk and a parent's limb meets its child's limbs at the node: those touch by design. */
function mayOverlap(a: RoutableBranch, b: RoutableBranch): boolean {
  return a.parentId !== b.parentId && a.childId !== b.parentId && b.childId !== a.parentId;
}

interface Overlap {
  /** How much closer the two edges are than they should be, in px. */
  readonly deficit: number;
  readonly directionForA: number;
}

function interiorOverlap(a: RoutableBranch, b: RoutableBranch): Overlap | null {
  let worst: Overlap | null = null;
  for (let i = 0; i <= ROUTING_SAMPLES; i += 1) {
    const ta = ROUTING_INTERIOR_FROM + (i / ROUTING_SAMPLES) * (ROUTING_INTERIOR_TO - ROUTING_INTERIOR_FROM);
    const pa = pointOnCubic(a.controls, ta);
    for (let j = 0; j <= ROUTING_SAMPLES; j += 1) {
      const tb = ROUTING_INTERIOR_FROM + (j / ROUTING_SAMPLES) * (ROUTING_INTERIOR_TO - ROUTING_INTERIOR_FROM);
      const pb = pointOnCubic(b.controls, tb);
      const required = halfWidthAt(a.width, ta) + halfWidthAt(b.width, tb) + CLEARANCE_PX;
      const deficit = required - Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (deficit <= 0 || (worst !== null && deficit <= worst.deficit)) continue;
      worst = { deficit, directionForA: Math.sign(pa.y - pb.y) || DEFAULT_ESCAPE_DIRECTION };
    }
  }
  return worst;
}

/** Linear width profile is enough for clearance checks; the drawn outline uses the eased profile. */
function halfWidthAt(width: BranchWidth, t: number): number {
  return (width.start + (width.end - width.start) * t) / 2;
}

function nudgeVertically(branch: RoutableBranch, dy: number): RoutableBranch {
  const { controls } = branch;
  return {
    ...branch,
    controls: {
      ...controls,
      control1: { x: controls.control1.x, y: controls.control1.y + dy },
      control2: { x: controls.control2.x, y: controls.control2.y + dy },
    },
  };
}

function boxAround(center: Point, size: NodeSize, margin: number): Box {
  return {
    minX: center.x - size.width / 2 - margin,
    maxX: center.x + size.width / 2 + margin,
    minY: center.y - size.height / 2 - margin,
    maxY: center.y + size.height / 2 + margin,
  };
}

function inflate(box: Box, margin: number): Box {
  return { minX: box.minX - margin, maxX: box.maxX + margin, minY: box.minY - margin, maxY: box.maxY + margin };
}

function contains(box: Box, point: Point): boolean {
  return point.x >= box.minX && point.x <= box.maxX && point.y >= box.minY && point.y <= box.maxY;
}
