/**
 * Layout algorithms are selected by `type` (spec L4). Adding a variant extends this union and the
 * exhaustive `switch` in `pipeline.ts` fails to compile until handled.
 *
 * NOTE for the second variant: `resolveConfig` deep-merges `layout` over the bilateral default, so a partial
 * `{ type: 'other' }` would inherit bilateral fields. Pick defaults per `type` in `resolveConfig` at that point.
 */
export interface BilateralLayoutConfig {
  readonly type: 'bilateral';
  /** Horizontal distance between a parent's and a child's center, in px. */
  readonly horizontalGap: number;
  /** Vertical distance between sibling centers, in px. */
  readonly verticalGap: number;
}

export type LayoutConfig = BilateralLayoutConfig;

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  type: 'bilateral',
  horizontalGap: 260,
  verticalGap: 90,
};
