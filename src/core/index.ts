// Public framework-free API. Everything a host (or the React wrapper) needs; nothing else is public.
export type { MindmapData, MindmapNode, NodeId, NodeSize, Point, Side } from './model/node';
export { buildTree, InvalidMindmapDataError, type MindmapTree } from './model/tree';
export { REFERENCE_DATA } from './model/referenceData';

export {
  DEFAULT_CONFIG,
  resolveConfig,
  type BranchConfig,
  type DeepPartial,
  type FontConfig,
  type MindmapConfig,
  type NodeSizeConfig,
  type PartialMindmapConfig,
  type TextConfig,
} from './config/config';
export { DEFAULT_THEME, type PaletteColor, type RootColor, type ThemeColorConfig, type ThemeConfig } from './config/theme';

export { DEFAULT_EXTENSIONS, resolveExtensions, type MindmapExtensions } from './extensions';

export { DEFAULT_LAYOUT_CONFIG, type BilateralLayoutConfig, type LayoutConfig } from './layout/layoutConfig';
export type { LayoutContext, LayoutStage, NodePositions } from './layout/layoutTypes';
export { goldenRatioBowCurve, type BowCurve } from './layout/bowCurve';
export { defaultLayoutStages, runLayoutPipeline } from './layout/pipeline';
export { placeholderBilateralStage } from './layout/placeholderBilateralStage';

export { resolveNodeSizes, defaultSizeAtDepth, type NodeSizeMap } from './size/nodeSizeResolver';
export { StraightPath, type Branch, type BranchPath, type PathSample } from './geometry/branchPath';
export { ellipseShape, type NodeBox, type NodeFillStyle, type NodeShape } from './shape/nodeShape';
export { parentDerivedColorStrategy, type ColorStrategy, type NodeColor, type NodeColorMap } from './color/colorStrategy';

export { buildScene, type Scene } from './render/scene';
export { drawScene, type Viewport } from './render/canvasRenderer';
export { RepaintScheduler, windowFrameScheduler, type FrameScheduler } from './render/repaintScheduler';
export { mountMindmap, type MindmapHandle, type MountOptions } from './mount';
