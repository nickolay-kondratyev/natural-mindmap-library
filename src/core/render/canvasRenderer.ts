import type { MindmapConfig } from '../config/config';
import type { MindmapExtensions } from '../extensions';
<<<<<<< HEAD
import type { LabelFonts } from '../text/labelFontLoader';
import { drawLabels } from './labelRenderer';
=======
import { taperedOutline, type BranchOutline } from '../geometry/taperedOutline';
import type { Point } from '../model/node';
>>>>>>> origin/main
import type { Scene } from './scene';
import type { MindmapView } from '../view/viewController';

/** Canvas size in CSS pixels plus the device pixel ratio the backing store was scaled by. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

const NODE_OUTLINE_WIDTH_PX = 2;
<<<<<<< HEAD
const PLACEHOLDER_BRANCH_WIDTH_PX = 6;

/**
 * Draws a scene: background, branches under nodes (spec R9), node shapes, then glyph-outline labels.
 * Branch strokes are a scaffold placeholder; the branch ticket replaces them with tapered filled limbs (R5).
=======
const PLACEHOLDER_FONT_FAMILY = 'sans-serif';

/**
 * Draws a scene: background, filled tapered limbs under nodes (spec R5, R9), node shapes, labels.
 * `fillText` labels are a scaffold placeholder; the font ticket replaces them with glyph outlines (R17).
>>>>>>> origin/main
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  config: MindmapConfig,
  extensions: MindmapExtensions,
  viewport: Viewport,
<<<<<<< HEAD
  fonts: LabelFonts,
=======
  view: MindmapView,
>>>>>>> origin/main
): void {
  ctx.setTransform(viewport.devicePixelRatio, 0, 0, viewport.devicePixelRatio, 0, 0);
  ctx.fillStyle = config.theme.color.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  // Scene coordinates put the root at (0,0); center it in the viewport.
  ctx.translate(viewport.width / 2, viewport.height / 2);
  // Pan/zoom (spec I1): same mapping as ViewController.sceneToScreen.
  ctx.translate(view.offset.x, view.offset.y);
  ctx.scale(view.zoom, view.zoom);

  for (const branch of scene.branches) {
    const color = scene.colors.get(branch.childId);
    if (color === undefined) continue;
    fillOutline(ctx, taperedOutline(branch, config.branch.asymmetry), color.fill);
  }

  for (const node of scene.tree.nodes) {
    const center = scene.positions.get(node.id);
    const size = scene.sizes.get(node.id);
    const color = scene.colors.get(node.id);
    if (center === undefined || size === undefined || color === undefined) continue;
    extensions.nodeShape.draw(ctx, { center, size }, { ...color, outlineWidth: NODE_OUTLINE_WIDTH_PX });
  }

<<<<<<< HEAD
  drawLabels(ctx, scene, config, extensions, fonts);
=======
function fillOutline(ctx: CanvasRenderingContext2D, outline: BranchOutline, fill: string): void {
  const first = outline[0];
  if (first === undefined) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const point of outline.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawPlaceholderLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  center: Point,
  isRoot: boolean,
  config: MindmapConfig,
): void {
  const weight = isRoot ? 'bold' : 'normal';
  ctx.font = `${weight} ${config.text.node.sizePx}px ${PLACEHOLDER_FONT_FAMILY}`;
  ctx.fillStyle = isRoot ? config.theme.color.root.text : config.theme.color.nodeText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, center.x, center.y);
>>>>>>> origin/main
}
