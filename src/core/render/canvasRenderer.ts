import type { MindmapConfig } from '../config/config';
import type { MindmapExtensions } from '../extensions';
import type { LabelFonts } from '../text/labelFontLoader';
import { drawLabels } from './labelRenderer';
import type { Scene } from './scene';

/** Canvas size in CSS pixels plus the device pixel ratio the backing store was scaled by. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

const NODE_OUTLINE_WIDTH_PX = 2;
const PLACEHOLDER_BRANCH_WIDTH_PX = 6;

/**
 * Draws a scene: background, branches under nodes (spec R9), node shapes, then glyph-outline labels.
 * Branch strokes are a scaffold placeholder; the branch ticket replaces them with tapered filled limbs (R5).
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  config: MindmapConfig,
  extensions: MindmapExtensions,
  viewport: Viewport,
  fonts: LabelFonts,
): void {
  ctx.setTransform(viewport.devicePixelRatio, 0, 0, viewport.devicePixelRatio, 0, 0);
  ctx.fillStyle = config.theme.color.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  // Scene coordinates put the root at (0,0); center it in the viewport.
  ctx.translate(viewport.width / 2, viewport.height / 2);

  for (const branch of scene.branches) {
    const color = scene.colors.get(branch.childId);
    if (color === undefined) continue;
    const start = branch.path.sampleAt(0).point;
    const end = branch.path.sampleAt(branch.path.length).point;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = PLACEHOLDER_BRANCH_WIDTH_PX;
    ctx.strokeStyle = color.fill;
    ctx.stroke();
  }

  for (const node of scene.tree.nodes) {
    const center = scene.positions.get(node.id);
    const size = scene.sizes.get(node.id);
    const color = scene.colors.get(node.id);
    if (center === undefined || size === undefined || color === undefined) continue;
    extensions.nodeShape.draw(ctx, { center, size }, { ...color, outlineWidth: NODE_OUTLINE_WIDTH_PX });
  }

  drawLabels(ctx, scene, config, extensions, fonts);
}
