import { resolveConfig, type MindmapConfig, type PartialMindmapConfig } from './config/config';
import type { EditHandler, EditRequest } from './edit/editRequest';
import { EditSession, type EditStatus, type EditSubmitResult } from './edit/editSession';
import { DEFAULT_EDIT_HANDLER } from './edit/inMemoryHost';
import { resolveExtensions, type MindmapExtensions } from './extensions';
import { CanvasInteractions } from './interaction/canvasInteractions';
import type { NodeRepositionEvent } from './interaction/repositionEvent';
import type { MindmapData, NodeId } from './model/node';
import { drawScene, type Viewport } from './render/canvasRenderer';
import { RepaintScheduler, windowFrameScheduler, type FrameScheduler } from './render/repaintScheduler';
import type { NodeBox } from './shape/nodeShape';
import { fetchFontBytes, type FontFetcher } from './text/fontStore';
import { LabelFontLoader, type LabelFontStatus } from './text/labelFontLoader';
import { contentBounds } from './view/fitView';
import { ViewController, type MindmapView } from './view/viewController';

export interface MountOptions {
  readonly data: MindmapData;
  readonly config?: PartialMindmapConfig;
  readonly extensions?: Partial<MindmapExtensions>;
  /** Injectable for tests; defaults to `requestAnimationFrame`. */
  readonly frames?: FrameScheduler;
  /** Font I/O seam (spec L5 Fonts); defaults to `fetch`. Return bytes you already hold to skip the network. */
  readonly fontFetcher?: FontFetcher;
  /** Font loading status (spec L6): called once at mount and on every change, e.g. to show a loading state. */
  readonly onFontStatusChange?: (status: LabelFontStatus) => void;
  /** Host side of the edit protocol (spec I5); defaults to the in-memory host that confirms immediately (I6). */
  readonly onEditRequest?: EditHandler;
  /** Pending / rejected / idle, so the host can show a busy state or the rejection reason. */
  readonly onEditStatusChange?: (status: EditStatus) => void;
  /** View changes made by the library (pan, zoom, API zoom/reset, the initial fit-to-content); not fired for `setView`. */
  readonly onViewChange?: (view: MindmapView) => void;
  /** Node drags (spec I2), once per drop; the position stays applied across later `setData` calls. */
  readonly onNodeReposition?: (event: NodeRepositionEvent) => void;
  /**
   * The user changed a setting from inside the map (e.g. "Don't ask again" in the reparent dialog). Gets the full
   * settings; store them (e.g. `SettingsPersistence.save`) and pass them back as `config`, since a later
   * `setConfig` replaces what the map applied itself.
   */
  readonly onConfigChange?: (config: MindmapConfig) => void;
}

/** Handle returned by `mountMindmap`; every setter coalesces into one repaint per frame (spec L8). */
export interface MindmapHandle {
  setData(data: MindmapData): void;
  setConfig(config: PartialMindmapConfig | undefined): void;
  setExtensions(extensions: Partial<MindmapExtensions> | undefined): void;
  /** Size in CSS pixels; the backing store is scaled by `devicePixelRatio`. */
  resize(width: number, height: number, devicePixelRatio: number): void;
  /** Font loading status (spec L6); the same value `onFontStatusChange` last reported. */
  fontStatus(): LabelFontStatus;
  /** Sends a structural edit through the host (spec I5); refused up front when invalid or another is pending. */
  requestEdit(request: EditRequest): EditSubmitResult;
  getEditStatus(): EditStatus;
  /** Dismisses a shown rejection reason. */
  clearEditRejection(): void;
  /** Last host-confirmed data; with the default in-memory host (spec I6) this is where confirmed edits end up. */
  getData(): MindmapData;
  /** Node box in canvas CSS px as last painted (`null` if not shown), e.g. to place host UI next to a node. */
  getNodeScreenBox(nodeId: NodeId): NodeBox | null;
  getView(): MindmapView;
  setView(view: MindmapView): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  destroy(): void;
}

export function mountMindmap(canvas: HTMLCanvasElement, options: MountOptions): MindmapHandle {
  return new CanvasMount(canvas, options);
}

class CanvasMount implements MindmapHandle {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scheduler: RepaintScheduler;
  private readonly fonts: LabelFontLoader;
  private readonly edits: EditSession;
  private readonly view: ViewController;
  private readonly interactions: CanvasInteractions;
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
    this.edits = new EditSession(options.data, options.onEditRequest ?? DEFAULT_EDIT_HANDLER, (status) => {
      this.interactions.onEditStatusChange(status);
      this.scheduler.request();
      options.onEditStatusChange?.(status);
    });
    this.view = new ViewController((view) => {
      this.scheduler.request();
      options.onViewChange?.(view);
    });
    this.config = resolveConfig(options.config);
    this.extensions = resolveExtensions(options.extensions);
    this.scheduler = new RepaintScheduler(() => this.paint(), options.frames ?? windowFrameScheduler);
    this.fonts = new LabelFontLoader(options.fontFetcher ?? fetchFontBytes, {
      onFontsChanged: () => this.scheduler.request(),
      onStatusChange: (status) => options.onFontStatusChange?.(status),
    });
    this.fonts.use(this.config.text);
    this.interactions = new CanvasInteractions({
      canvas,
      edits: this.edits,
      view: this.view,
      config: () => this.config,
      extensions: () => this.extensions,
      fonts: () => this.fonts.fonts(),
      requestRepaint: () => this.scheduler.request(),
      onNodeReposition: (event) => options.onNodeReposition?.(event),
      changeConfig: (config) => {
        this.config = config;
        this.scheduler.request();
        options.onConfigChange?.(config);
      },
    });
    // Size the backing store from the canvas's CSS box right away so the first paint is correct even for
    // hosts that never call `resize` (the React wrapper does, via ResizeObserver).
    this.viewport = { width: canvas.clientWidth, height: canvas.clientHeight, devicePixelRatio: window.devicePixelRatio };
    this.applyViewport();
  }

  setData(data: MindmapData): void {
    this.edits.setHostData(data);
    this.scheduler.request();
  }

  setConfig(config: PartialMindmapConfig | undefined): void {
    this.config = resolveConfig(config);
    this.fonts.use(this.config.text);
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

  fontStatus(): LabelFontStatus {
    return this.fonts.status();
  }

  requestEdit(request: EditRequest): EditSubmitResult {
    return this.edits.submit(request);
  }

  getEditStatus(): EditStatus {
    return this.edits.status;
  }

  clearEditRejection(): void {
    this.edits.clearRejection();
  }

  getData(): MindmapData {
    return this.edits.confirmedData;
  }

  getNodeScreenBox(nodeId: NodeId): NodeBox | null {
    return this.interactions.nodeScreenBox(nodeId);
  }

  getView(): MindmapView {
    return this.view.view;
  }

  setView(view: MindmapView): void {
    this.view.setView(view);
    this.scheduler.request();
  }

  zoomIn(): void {
    this.view.zoomIn();
  }

  zoomOut(): void {
    this.view.zoomOut();
  }

  resetView(): void {
    this.view.reset();
  }

  destroy(): void {
    this.interactions.dispose();
    this.edits.dispose();
    this.fonts.dispose();
    this.scheduler.cancel();
  }

  /** Sizes the backing store to the viewport (which clears the canvas) and schedules a repaint. */
  private applyViewport(): void {
    this.view.setViewportSize(this.viewport.width, this.viewport.height);
    this.canvas.width = Math.round(this.viewport.width * this.viewport.devicePixelRatio);
    this.canvas.height = Math.round(this.viewport.height * this.viewport.devicePixelRatio);
    this.scheduler.request();
  }

  private paint(): void {
    const scene = this.interactions.sceneToPaint();
    // Feeds the fit target before drawing, so the initial fit (which reports a view change and thereby
    // requests one more, identical frame) is already applied to this paint.
    this.view.setContentBounds(contentBounds(scene.positions, scene.sizes));
    drawScene(this.ctx, scene, this.config, this.extensions, this.viewport, this.view.view, this.fonts.fonts());
    this.interactions.paintOverlay(this.ctx, scene, this.viewport);
  }
}
