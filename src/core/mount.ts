import { resolveConfig, type MindmapConfig, type PartialMindmapConfig } from './config/config';
import { resolveExtensions, type MindmapExtensions } from './extensions';
import type { MindmapData } from './model/node';
import { drawScene, type Viewport } from './render/canvasRenderer';
import { RepaintScheduler, windowFrameScheduler, type FrameScheduler } from './render/repaintScheduler';
import { buildScene } from './render/scene';

export interface MountOptions {
  readonly data: MindmapData;
  readonly config?: PartialMindmapConfig;
  readonly extensions?: Partial<MindmapExtensions>;
  /** Injectable for tests; defaults to `requestAnimationFrame`. */
  readonly frames?: FrameScheduler;
}

/** Handle returned by `mountMindmap`; every setter coalesces into one repaint per frame (spec L8). */
export interface MindmapHandle {
  setData(data: MindmapData): void;
  setConfig(config: PartialMindmapConfig | undefined): void;
  setExtensions(extensions: Partial<MindmapExtensions> | undefined): void;
  /** Size in CSS pixels; the backing store is scaled by `devicePixelRatio`. */
  resize(width: number, height: number, devicePixelRatio: number): void;
  destroy(): void;
}

export function mountMindmap(canvas: HTMLCanvasElement, options: MountOptions): MindmapHandle {
  return new CanvasMount(canvas, options);
}

class CanvasMount implements MindmapHandle {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scheduler: RepaintScheduler;
  private data: MindmapData;
  private config: MindmapConfig;
  private extensions: MindmapExtensions;
  private viewport: Viewport;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: MountOptions,
  ) {
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Canvas 2D context is not available');
    this.ctx = ctx;
    this.data = options.data;
    this.config = resolveConfig(options.config);
    this.extensions = resolveExtensions(options.extensions);
    this.scheduler = new RepaintScheduler(() => this.paint(), options.frames ?? windowFrameScheduler);
    // Size the backing store from the canvas's CSS box right away so the first paint is correct even for
    // hosts that never call `resize` (the React wrapper does, via ResizeObserver).
    this.viewport = { width: canvas.clientWidth, height: canvas.clientHeight, devicePixelRatio: window.devicePixelRatio };
    this.applyViewport();
  }

  setData(data: MindmapData): void {
    this.data = data;
    this.scheduler.request();
  }

  setConfig(config: PartialMindmapConfig | undefined): void {
    this.config = resolveConfig(config);
    this.scheduler.request();
  }

  setExtensions(extensions: Partial<MindmapExtensions> | undefined): void {
    this.extensions = resolveExtensions(extensions);
    this.scheduler.request();
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    this.viewport = { width, height, devicePixelRatio };
    this.applyViewport();
  }

  destroy(): void {
    this.scheduler.cancel();
  }

  /** Sizes the backing store to the viewport (which clears the canvas) and schedules a repaint. */
  private applyViewport(): void {
    this.canvas.width = Math.round(this.viewport.width * this.viewport.devicePixelRatio);
    this.canvas.height = Math.round(this.viewport.height * this.viewport.devicePixelRatio);
    this.scheduler.request();
  }

  private paint(): void {
    const scene = buildScene(this.data, this.config, this.extensions);
    drawScene(this.ctx, scene, this.config, this.extensions, this.viewport);
  }
}
