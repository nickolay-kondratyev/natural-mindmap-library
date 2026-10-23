import type { BranchConfig, MindmapConfig } from '../config/config';
import { applyEdit } from '../edit/applyEdit';
import type { AddEditRequest, EditRequest } from '../edit/editRequest';
import { EDIT_BLOCKED_REASON, PENDING_NODE_ID, type EditSession, type EditStatus } from '../edit/editSession';
import { findEditProblem } from '../edit/editValidation';
import type { MindmapExtensions } from '../extensions';
import { buildBranches } from '../geometry/branchGeometry';
import { subtreeIds } from '../layout/layoutLookups';
import { moveSubtree, withNodeDropped, withoutSubtree, type PositionOverrides } from '../layout/positionOverrides';
import type { MindmapData, NodeId, Point, Side } from '../model/node';
import { buildTree, type MindmapTree } from '../model/tree';
import type { Viewport } from '../render/canvasRenderer';
import { drawInteractionOverlay } from '../render/interactionOverlay';
import { nodeLabelInk } from '../render/labelRenderer';
import { buildScene, type Scene } from '../render/scene';
import type { NodeBox } from '../shape/nodeShape';
import { CssFontFaces } from '../text/cssFontFaces';
import type { LabelFonts } from '../text/labelFontLoader';
import type { ViewController } from '../view/viewController';
import { nodeAt, nodeBoxOf, nodeHandles, pointerTargetAt, sameHandle, type NodeHandle, type PointerTarget } from './hitTest';
import { InlineLabelEditor, type LabelEditorPlacement } from './inlineLabelEditor';
import { NoticeBanner } from './noticeBanner';
import { PointerGesture, type PressTarget } from './pointerGesture';
import type { NodeRepositionEvent } from './repositionEvent';

/** Id of the local, not-yet-sent child shown while its label is typed (the host picks the real id). */
export const DRAFT_NODE_ID: NodeId = 'natural-mindmap:draft-node';

/** What the interactions need from the mount; getters because config/extensions/fonts change over time. */
export interface InteractionHost {
  readonly canvas: HTMLCanvasElement;
  readonly edits: EditSession;
  readonly view: ViewController;
  config(): MindmapConfig;
  extensions(): MindmapExtensions;
  fonts(): LabelFonts;
  requestRepaint(): void;
  onNodeReposition(event: NodeRepositionEvent): void;
}

/** A node drag in progress (spec I2/I3). */
interface NodeDrag {
  readonly nodeId: NodeId;
  /** Scene at drag start; the drag preview moves the subtree within it. */
  readonly base: Scene;
  /** `base.tree` with the dragged subtree painted last, i.e. on top. */
  readonly paintTree: MindmapTree;
  /** The dragged subtree plus transient nodes: never drop targets. */
  readonly excludedIds: ReadonlySet<NodeId>;
  /** Scene-unit offset of the dragged subtree. */
  readonly offset: Point;
  readonly dropTargetId: NodeId | null;
}

const PRIMARY_BUTTON = 0;
const CANVAS_PRESS: PressTarget = { kind: 'canvas' };
/** Share of the node width the inline editor uses; matches the room node labels get inside the shape. */
const EDITOR_WIDTH_FRACTION = 0.8;
const CURSOR = { idle: '', grab: 'grab', grabbing: 'grabbing', button: 'pointer', busy: 'progress' } as const;

/**
 * Canvas pointer interactions (spec I1-I5): pan/zoom, drag to reposition (push-apart on drop) or to reparent
 * (drop onto a node), hover "+" / "x" buttons, double-click inline rename, plus the pending / rejected feedback.
 * Structural edits only ever go through `EditSession` (the host confirms); repositions are library-local
 * overrides reported via `onNodeReposition`.
 *
 * WHY-NOT live push-apart while dragging: the drop target would always be pushed out from under the pointer,
 * making reparenting impossible. Other nodes stay put during the drag and yield once it is dropped.
 */
export class CanvasInteractions {
  private readonly gesture = new PointerGesture();
  private overrides: PositionOverrides = new Map();
  private readonly editor: InlineLabelEditor;
  private readonly notice: NoticeBanner;
  private readonly cssFonts: CssFontFaces;
  private readonly removeListeners: (() => void)[] = [];
  /** Last painted scene: what the user sees, so it is what pointer events hit-test against. */
  private painted: Scene | null = null;
  private hoveredNodeId: NodeId | null = null;
  private hoveredHandle: NodeHandle | null = null;
  private drag: NodeDrag | null = null;
  /** A child being typed before it is sent (spec I4); shown as a node so the editor sits where it will appear. */
  private draft: AddEditRequest | null = null;
  /** Node the inline editor sits on (`DRAFT_NODE_ID` while adding). */
  private editorNodeId: NodeId | null = null;
  /** Last request sent from the inline editor, so a rejection can reopen it with the typed label (spec I5.4). */
  private editorRequest: EditRequest | null = null;
  private previousStatus: EditStatus;

  constructor(private readonly host: InteractionHost) {
    const { canvas } = host;
    this.editor = new InlineLabelEditor(canvas);
    this.notice = new NoticeBanner(canvas, () => host.edits.clearRejection());
    this.cssFonts = new CssFontFaces(canvas.ownerDocument);
    this.previousStatus = host.edits.status;
    this.listen('pointerdown', (event) => this.onPointerDown(event));
    this.listen('pointermove', (event) => this.onPointerMove(event));
    this.listen('pointerup', (event) => this.onPointerUp(event));
    this.listen('pointercancel', () => this.cancelGesture());
    this.listen('lostpointercapture', () => this.cancelGesture());
    this.listen('pointerleave', () => this.setHover(null, null));
    this.listen('dblclick', (event) => this.onDoubleClick(event));
    // Not passive: the page must not scroll while the wheel zooms the map.
    this.listen('wheel', (event) => this.onWheel(event), { passive: false });
  }

  /**
   * The scene to paint now. Ceiling: rebuilt from scratch each paint (also every frame of the busy animation);
   * fine for hand-sized maps, cache by input identity if large maps stutter.
   */
  sceneToPaint(): Scene {
    const config = this.host.config();
    this.painted =
      this.drag === null
        ? buildScene(this.displayData(), config, this.host.extensions(), this.effectiveOverrides())
        : draggedScene(this.drag, config.branch);
    return this.painted;
  }

  /** Paints hover buttons, drop highlight and pending state over `scene`, and keeps DOM overlays in place. */
  paintOverlay(ctx: CanvasRenderingContext2D, scene: Scene, viewport: Viewport): void {
    const pendingNodeId = this.host.edits.preview?.nodeId ?? null;
    drawInteractionOverlay(ctx, scene, this.host.config(), this.host.extensions(), viewport, this.host.view.view, {
      handles: this.visibleHandles(scene),
      hoveredHandle: this.hoveredHandle,
      dropTargetId: this.drag?.dropTargetId ?? null,
      pendingNodeId,
      timeMs: performance.now(),
    });
    this.editor.place(this.editorNodeId === null ? null : this.editorPlacement(scene, this.editorNodeId));
    this.notice.place();
    // Keeps the busy ring moving until the host answers.
    if (pendingNodeId !== null) this.host.requestRepaint();
  }

  onEditStatusChange(status: EditStatus): void {
    const previous = this.previousStatus;
    this.previousStatus = status;
    if (status.kind === 'rejected') {
      this.notice.show(status.reason);
      if (status.request === this.editorRequest) this.reopenForRetry(status.request);
    } else {
      this.notice.hide();
    }
    if (status.kind === 'idle') this.editorRequest = null;
    // A confirmed reparent lands at its new parent's layout spot, not at a position dragged under the old parent.
    if (previous.kind === 'pending' && previous.request.type === 'move' && status.kind === 'idle') {
      this.overrides = withoutSubtree(this.overrides, buildTree(this.host.edits.confirmedData), previous.request.nodeId);
    }
    this.updateCursor();
  }

  /** Node box in canvas CSS px as last painted, e.g. for hosts placing their own DOM next to a node. */
  nodeScreenBox(nodeId: NodeId): NodeBox | null {
    const box = this.painted === null ? null : nodeBoxOf(this.painted, nodeId);
    if (box === null) return null;
    const { view } = this.host;
    const { zoom } = view.view;
    return { center: view.sceneToScreen(box.center), size: { width: box.size.width * zoom, height: box.size.height * zoom } };
  }

  dispose(): void {
    for (const remove of this.removeListeners) remove();
    this.editor.dispose();
    this.notice.dispose();
    this.cssFonts.dispose();
  }

  // ---- pointer events ----

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== PRIMARY_BUTTON || this.painted === null) return;
    const screen = this.canvasPoint(event);
    this.gesture.press(screen, this.pressTargetAt(this.painted, screen));
    this.host.canvas.setPointerCapture(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    const screen = this.canvasPoint(event);
    const step = this.gesture.move(screen);
    switch (step.kind) {
      case 'none':
        this.updateHover(screen);
        return;
      case 'pan':
        this.host.canvas.style.cursor = CURSOR.grabbing;
        this.host.view.panBy(step.delta);
        return;
      case 'drag':
        this.updateDrag(step.nodeId, step.offset, screen);
        return;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    const screen = this.canvasPoint(event);
    // No explicit releasePointerCapture: the browser releases it right after pointerup, and an explicit release
    // here would fire lostpointercapture (which cancels the gesture) around the drop being handled.
    const end = this.gesture.release(screen);
    switch (end.kind) {
      case 'none':
        break;
      case 'click':
        this.onClick(end.target);
        break;
      case 'drag-end':
        this.finishDrag(end.offset);
        break;
    }
    this.updateHover(screen);
  }

  private onDoubleClick(event: MouseEvent): void {
    if (this.painted === null) return;
    const nodeId = nodeAt(this.painted, this.host.view.screenToScene(this.canvasPoint(event)), this.host.extensions().nodeShape);
    if (nodeId !== null && !isTransient(nodeId)) this.openRename(nodeId);
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.host.view.zoomByWheel(this.canvasPoint(event), event.deltaY);
  }

  private cancelGesture(): void {
    this.gesture.cancel();
    if (this.drag === null) return;
    this.drag = null;
    this.host.requestRepaint();
  }

  private onClick(target: PressTarget): void {
    if (target.kind !== 'handle') return;
    const { handle } = target;
    if (handle.kind === 'add-child') this.openAddDraft(handle.nodeId, handle.side, '');
    else this.submit({ type: 'delete', nodeId: handle.nodeId });
  }

  // ---- drag ----

  private updateDrag(nodeId: NodeId, screenOffset: Point, screen: Point): void {
    const drag = this.drag ?? this.startDrag(nodeId);
    if (drag === null) return;
    const scenePoint = this.host.view.screenToScene(screen);
    this.drag = {
      ...drag,
      offset: this.toSceneOffset(screenOffset),
      dropTargetId: nodeAt(drag.base, scenePoint, this.host.extensions().nodeShape, drag.excludedIds),
    };
    this.host.canvas.style.cursor = CURSOR.grabbing;
    this.host.requestRepaint();
  }

  private startDrag(nodeId: NodeId): NodeDrag | null {
    const base = this.painted;
    if (base === null) return null;
    this.setHover(null, null);
    const movedIds = new Set(subtreeIds(base.tree, nodeId));
    const excludedIds = new Set([...movedIds, PENDING_NODE_ID, DRAFT_NODE_ID]);
    const paintTree = treeWithSubtreeOnTop(base.tree, movedIds);
    return { nodeId, base, paintTree, excludedIds, offset: { x: 0, y: 0 }, dropTargetId: null };
  }

  /** Drop onto a node reparents through the host (spec I3); anywhere else is a reposition (spec I2). */
  private finishDrag(screenOffset: Point): void {
    const drag = this.drag;
    this.drag = null;
    if (drag === null) return;
    this.host.requestRepaint();
    if (drag.dropTargetId !== null) {
      this.submit({ type: 'move', nodeId: drag.nodeId, newParentId: drag.dropTargetId });
      return;
    }
    const start = drag.base.positions.get(drag.nodeId);
    if (start === undefined) return;
    const offset = this.toSceneOffset(screenOffset);
    const position = { x: start.x + offset.x, y: start.y + offset.y };
    this.overrides = withNodeDropped(this.overrides, drag.base.tree, { nodeId: drag.nodeId, from: start, to: position });
    this.host.onNodeReposition({ nodeId: drag.nodeId, position });
  }

  // ---- inline editing ----

  private openRename(nodeId: NodeId, typed?: string): void {
    if (this.refusedWhilePending()) return;
    const node = this.host.edits.confirmedData.find((candidate) => candidate.id === nodeId);
    if (node === undefined) return;
    this.openEditor(nodeId, typed ?? node.text, (text) => {
      if (text !== '' && text !== node.text) this.submitFromEditor({ type: 'rename', nodeId, text });
    });
  }

  /** `side` only matters for children of the root (spec R19). */
  private openAddDraft(parentId: NodeId, side: Side | undefined, typed: string): void {
    if (this.refusedWhilePending()) return;
    const parent = this.host.edits.confirmedData.find((candidate) => candidate.id === parentId);
    if (parent === undefined) return;
    const plain: AddEditRequest = { type: 'add', parentId, text: '' };
    const draft = parent.parentId === null && side !== undefined ? { ...plain, side } : plain;
    this.openEditor(DRAFT_NODE_ID, typed, (text) => {
      if (text !== '') this.submitFromEditor({ ...draft, text });
    });
    // After `openEditor`, which clears any previous draft.
    this.draft = draft;
  }

  /** `commit` gets the trimmed label after the editor has closed. */
  private openEditor(nodeId: NodeId, text: string, commit: (text: string) => void): void {
    this.closeEditor();
    this.editorNodeId = nodeId;
    this.editor.open({
      text,
      onCommit: (typed) => {
        this.closeEditor();
        commit(typed.trim());
      },
      onCancel: () => this.closeEditor(),
    });
    this.host.requestRepaint();
  }

  private closeEditor(): void {
    this.editor.close();
    this.editorNodeId = null;
    this.draft = null;
    this.host.requestRepaint();
  }

  private reopenForRetry(request: EditRequest): void {
    if (request.type === 'rename') this.openRename(request.nodeId, request.text);
    else if (request.type === 'add') this.openAddDraft(request.parentId, request.side, request.text);
  }

  private editorPlacement(scene: Scene, nodeId: NodeId): LabelEditorPlacement | null {
    const box = nodeBoxOf(scene, nodeId);
    if (box === null) return null;
    const config = this.host.config();
    const { zoom } = this.host.view.view;
    const style = config.text.node;
    const isRoot = scene.tree.nodeById(nodeId).parentId === null;
    return {
      center: this.host.view.sceneToScreen(box.center),
      width: box.size.width * EDITOR_WIDTH_FRACTION * zoom,
      fontSizePx: style.sizePx * zoom,
      fontFamily: this.cssFonts.familyFor(this.host.fonts().node),
      bold: nodeLabelInk(config, isRoot).bold,
      letterSpacingEm: style.letterSpacingEm,
      color: nodeLabelInk(config, isRoot).fill,
      background: scene.colors.get(nodeId)?.fill ?? config.theme.color.background,
    };
  }

  // ---- edits ----

  private submitFromEditor(request: EditRequest): void {
    this.editorRequest = request;
    this.submit(request);
  }

  /** Refusals (invalid, or another edit still pending) are shown, since nothing was sent (spec I3, I5.2). */
  private submit(request: EditRequest): void {
    const result = this.host.edits.submit(request);
    if (result.kind === 'refused') this.notice.show(result.reason);
  }

  /** Editors are not even opened while an edit is pending (spec I5.2), so no typing is lost to a refusal. */
  private refusedWhilePending(): boolean {
    if (this.host.edits.status.kind !== 'pending') return false;
    this.notice.show(EDIT_BLOCKED_REASON);
    return true;
  }

  /** Pending preview, else the draft child (if its parent still exists), else the confirmed data. */
  private displayData(): MindmapData {
    const { edits } = this.host;
    const draft = this.draft;
    if (draft === null || edits.status.kind === 'pending' || findEditProblem(edits.confirmedData, draft) !== null) {
      return edits.displayData;
    }
    return applyEdit(edits.confirmedData, draft, DRAFT_NODE_ID);
  }

  /** While a reparent is pending, the moved subtree previews at its new parent's layout spot (see onEditStatusChange). */
  private effectiveOverrides(): PositionOverrides {
    const { status, confirmedData } = this.host.edits;
    if (status.kind !== 'pending' || status.request.type !== 'move') return this.overrides;
    return withoutSubtree(this.overrides, buildTree(confirmedData), status.request.nodeId);
  }

  // ---- hover and cursor ----

  private updateHover(screen: Point): void {
    if (this.painted === null || this.drag !== null) return;
    const target = this.targetAt(this.painted, screen);
    const nodeId = target.kind === 'node' ? target.nodeId : target.kind === 'handle' ? target.handle.nodeId : null;
    this.setHover(nodeId !== null && !isTransient(nodeId) ? nodeId : null, target.kind === 'handle' ? target.handle : null);
    this.updateCursor(target);
  }

  private setHover(nodeId: NodeId | null, handle: NodeHandle | null): void {
    if (nodeId === this.hoveredNodeId && sameHandle(handle, this.hoveredHandle)) return;
    this.hoveredNodeId = nodeId;
    this.hoveredHandle = handle;
    this.host.requestRepaint();
  }

  private updateCursor(target: PointerTarget | null = null): void {
    this.host.canvas.style.cursor = this.cursorFor(target);
  }

  private cursorFor(target: PointerTarget | null): string {
    if (this.drag !== null) return CURSOR.grabbing;
    if (this.host.edits.status.kind === 'pending') return CURSOR.busy;
    if (target?.kind === 'handle') return CURSOR.button;
    if (target?.kind === 'node' && this.painted !== null && this.isMovable(this.painted, target.nodeId)) return CURSOR.grab;
    return CURSOR.idle;
  }

  /** Buttons hide while dragging and while an edit is pending (further edits are blocked, spec I5.2). */
  private visibleHandles(scene: Scene): readonly NodeHandle[] {
    if (this.hoveredNodeId === null || this.drag !== null || this.host.edits.status.kind === 'pending') return [];
    return nodeHandles(scene, this.hoveredNodeId);
  }

  // ---- helpers ----

  private targetAt(scene: Scene, screen: Point): PointerTarget {
    const activeNodeId = this.visibleHandles(scene).length > 0 ? this.hoveredNodeId : null;
    return pointerTargetAt(scene, this.host.view.screenToScene(screen), this.host.extensions().nodeShape, activeNodeId);
  }

  private pressTargetAt(scene: Scene, screen: Point): PressTarget {
    const target = this.targetAt(scene, screen);
    switch (target.kind) {
      case 'handle':
        return target;
      case 'node':
        // The root never moves (spec R23), so dragging it pans like empty canvas.
        return this.isMovable(scene, target.nodeId) ? target : CANVAS_PRESS;
      case 'empty':
        return CANVAS_PRESS;
    }
  }

  private isMovable(scene: Scene, nodeId: NodeId): boolean {
    return nodeId !== scene.tree.root.id && !isTransient(nodeId);
  }

  private toSceneOffset(screenOffset: Point): Point {
    const { zoom } = this.host.view.view;
    return { x: screenOffset.x / zoom, y: screenOffset.y / zoom };
  }

  /** CSS px relative to the canvas, the space `ViewController` works in. */
  private canvasPoint(event: MouseEvent): Point {
    const rect = this.host.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private listen<K extends keyof HTMLElementEventMap>(
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void {
    const { canvas } = this.host;
    canvas.addEventListener(type, handler, options);
    this.removeListeners.push(() => canvas.removeEventListener(type, handler, options));
  }
}

/** Preview and draft nodes are not real yet: they cannot be dragged, edited or dropped onto. */
function isTransient(nodeId: NodeId): boolean {
  return nodeId === PENDING_NODE_ID || nodeId === DRAFT_NODE_ID;
}

/** Drag preview: the subtree follows the pointer and branches re-route (spec R8); other nodes stay put. */
function draggedScene(drag: NodeDrag, branchConfig: BranchConfig): Scene {
  const { base, paintTree: tree } = drag;
  const positions = moveSubtree(base.positions, tree, drag.nodeId, drag.offset);
  return { ...base, tree, positions, branches: buildBranches({ tree, positions, sizes: base.sizes, config: branchConfig }) };
}

/**
 * Same tree, but nodes in `movedIds` come last so they paint over the nodes they are dragged across. First-level
 * sides are pinned first, because unsided first-level nodes take their side from data order.
 */
function treeWithSubtreeOnTop(tree: MindmapTree, movedIds: ReadonlySet<NodeId>): MindmapTree {
  const sided = tree.nodes.map((node) => {
    const side = tree.sideOf(node.id);
    return tree.depthOf(node.id) === 1 && side !== null ? { ...node, side } : node;
  });
  return buildTree([...sided.filter((node) => !movedIds.has(node.id)), ...sided.filter((node) => movedIds.has(node.id))]);
}
