import type { MindmapConfig } from '../config/config';
import type { MindmapExtensions } from '../extensions';
import type { Point } from '../model/node';
import type { Scene } from './scene';

/** Canvas size in CSS pixels plus the device pixel ratio the backing store was scaled by. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
}

const NODE_OUTLINE_WIDTH_PX = 2;
const PLACEHOLDER_BRANCH_WIDTH_PX = 6;
const PLACEHOLDER_FONT_FAMILY = 'sans-serif';

/**
 * Draws a scene: background, branches under nodes (spec R9), node shapes, labels.
 * Branch strokes and `fillText` labels are scaffold placeholders; the branch and font tickets replace them
 * with tapered filled limbs and glyph outlines (R5, R17).
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  config: MindmapConfig,
  extensions: MindmapExtensions,
  viewport: Viewport,
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
    drawPlaceholderLabel(ctx, node.text, center, node.parentId === null, config);
  }
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
}
