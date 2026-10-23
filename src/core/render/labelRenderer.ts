import type { FontConfig, MindmapConfig } from '../config/config';
import type { MindmapExtensions } from '../extensions';
import type { Branch } from '../geometry/branchPath';
import type { NodeId } from '../model/node';
import type { NodeBox } from '../shape/nodeShape';
import { GlyphRun } from '../text/glyphRun';
import { layoutBranchLabel, layoutNodeLabel } from '../text/labelLayout';
import { paintLabel, type LabelInk } from '../text/labelPainter';
import type { LabelFonts } from '../text/labelFontLoader';
import type { LoadedFont } from '../text/loadedFont';
import { rimToRimSpan } from '../text/rimSpan';
import type { Scene } from './scene';

/** Share of the node width a straight label may use, keeping glyphs clear of the curved rim. */
const NODE_LABEL_WIDTH_FRACTION = 0.8;

/** Draws node labels (spec R2, R3) and the same labels along their incoming branches (spec R12-R16). */
export function drawLabels(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  config: MindmapConfig,
  extensions: MindmapExtensions,
  fonts: LabelFonts,
): void {
  if (fonts.branch !== null) {
    for (const branch of scene.branches) drawBranchLabel(ctx, scene, config, extensions, fonts.branch, branch);
  }
  if (fonts.node !== null) {
    for (const node of scene.tree.nodes) {
      const box = boxOf(scene, node.id);
      if (box === null) continue;
      drawNodeLabel(ctx, config, fonts.node, node.text, box, node.parentId === null);
    }
  }
}

function drawNodeLabel(
  ctx: CanvasRenderingContext2D,
  config: MindmapConfig,
  font: LoadedFont,
  text: string,
  box: NodeBox,
  isRoot: boolean,
): void {
  const style = config.text.node;
  const shaped = font.shape(text);
  const run = new GlyphRun(shaped.advancesEm, style.stretch);
  const layout = layoutNodeLabel(box.center, box.size.width * NODE_LABEL_WIDTH_FRACTION, run, style);
  paintLabel(ctx, font, shaped, run, layout, nodeLabelInk(config, isRoot));
}

/** The root label uses the root text color and is always bold (spec R3). */
export function nodeLabelInk(config: MindmapConfig, isRoot: boolean): LabelInk {
  const style = config.text.node;
  if (!isRoot) return inkOf(style, config.theme.color.nodeText, config);
  return { ...inkOf(style, config.theme.color.root.text, config), bold: true };
}

function drawBranchLabel(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  config: MindmapConfig,
  extensions: MindmapExtensions,
  font: LoadedFont,
  branch: Branch,
): void {
  const parent = boxOf(scene, branch.parentId);
  const child = boxOf(scene, branch.childId);
  if (parent === null || child === null) return;
  const style = config.text.branch;
  const shaped = font.shape(scene.tree.nodeById(branch.childId).text);
  const run = new GlyphRun(shaped.advancesEm, style.stretch);
  const span = rimToRimSpan(branch.path, parent, child, extensions.nodeShape);
  const layout = layoutBranchLabel(branch.path, span, run, style, config.text.branchFit);
  paintLabel(ctx, font, shaped, run, layout, inkOf(style, config.theme.color.branchText, config));
}

function inkOf(style: FontConfig, fill: string, config: MindmapConfig): LabelInk {
  return {
    fill,
    outline: config.theme.color.textOutline,
    outlineWidthPx: style.outlineWidthPx,
    bold: style.bold,
    stretch: style.stretch,
    slant: style.slant,
  };
}

function boxOf(scene: Scene, id: NodeId): NodeBox | null {
  const center = scene.positions.get(id);
  const size = scene.sizes.get(id);
  return center === undefined || size === undefined ? null : { center, size };
}
