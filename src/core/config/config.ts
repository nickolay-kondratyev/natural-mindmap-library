import { DEFAULT_THEME, type ThemeConfig } from './theme';
import type { NodeSize } from '../model/node';
import { DEFAULT_LAYOUT_CONFIG, type LayoutConfig } from '../layout/layoutConfig';
import { GOLDEN_RATIO } from '../math/goldenRatio';

/** Depth-based node sizing (spec R4): `rootSize * depthScale^depth`, never below `minScale * rootSize`. */
export interface NodeSizeConfig {
  readonly rootSize: NodeSize;
  readonly depthScale: number;
  readonly minScale: number;
}

/** Branch thickness knobs (spec R5); consumed by the branch renderer. */
export interface BranchConfig {
  /** Width where a root branch leaves the root, in px. */
  readonly rootWidth: number;
  /** Multiplier applied per tree level to the starting width. */
  readonly widthPerLevel: number;
  /** End width as a fraction of the start width (0 = needle point). */
  readonly taper: number;
}

export interface FontConfig {
  /** TTF URL the host supplies; parsed with opentype.js by the text module. */
  readonly url: string;
  readonly sizePx: number;
}

export interface TextConfig {
  readonly node: FontConfig;
  readonly branch: FontConfig;
}

/**
 * Every visual parameter of the library. All fields are plain, serializable data so a settings panel can
 * be generated from the shape. Code-level extension points (stages, shapes, strategies) live in
 * `MindmapExtensions`, not here.
 */
export interface MindmapConfig {
  readonly theme: ThemeConfig;
  readonly node: NodeSizeConfig;
  readonly branch: BranchConfig;
  readonly text: TextConfig;
  readonly layout: LayoutConfig;
}

/** Recursive partial for plain-data config objects; arrays are treated as leaves (replaced, not merged). */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { readonly [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type PartialMindmapConfig = DeepPartial<MindmapConfig>;

const KALAM_TTF_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/kalam@latest/latin-400-normal.ttf';

export const DEFAULT_CONFIG: MindmapConfig = {
  theme: DEFAULT_THEME,
  node: {
    rootSize: { width: 180, height: 64 },
    depthScale: 1 / GOLDEN_RATIO ** 0.5,
    minScale: 0.45,
  },
  branch: {
    rootWidth: 40,
    widthPerLevel: 1 / GOLDEN_RATIO,
    taper: 0.15,
  },
  text: {
    node: { url: KALAM_TTF_URL, sizePx: 18 },
    branch: { url: KALAM_TTF_URL, sizePx: 18 },
  },
  layout: DEFAULT_LAYOUT_CONFIG,
};

/** Merges a partial user config over the defaults (deep for objects, replace for arrays and primitives). */
export function resolveConfig(partial: PartialMindmapConfig | undefined): MindmapConfig {
  return partial === undefined ? DEFAULT_CONFIG : deepMerge<MindmapConfig>(DEFAULT_CONFIG, partial);
}

function deepMerge<T>(base: T, override: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    result[key] = deepMerge((base as Record<string, unknown>)[key], value as never);
  }
  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
