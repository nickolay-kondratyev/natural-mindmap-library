import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, type CSSProperties } from 'react';
import {
  DEFAULT_EDIT_HANDLER,
  mountMindmap,
<<<<<<< HEAD
  type FontFetcher,
  type LabelFontStatus,
=======
  type EditHandler,
  type EditStatus,
>>>>>>> origin/main
  type MindmapData,
  type MindmapExtensions,
  type MindmapHandle,
  type MindmapView,
  type NodeRepositionEvent,
  type PartialMindmapConfig,
} from '../core/index';

export interface MindmapProps {
  readonly data: MindmapData;
  readonly config?: PartialMindmapConfig;
  readonly extensions?: Partial<MindmapExtensions>;
  /** Read once at mount (see `MountOptions.fontFetcher`). */
  readonly fontFetcher?: FontFetcher;
  /** Font loading status (spec L6), e.g. to show a loading state. */
  readonly onFontStatusChange?: (status: LabelFontStatus) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  /** Host side of the edit protocol (spec I5); defaults to the in-memory host that confirms immediately (I6). */
  readonly onEditRequest?: EditHandler;
  readonly onEditStatusChange?: (status: EditStatus) => void;
  /** User-driven pan/zoom; not fired for `ref.setView`. */
  readonly onViewChange?: (view: MindmapView) => void;
  readonly onNodeReposition?: (event: NodeRepositionEvent) => void;
}

/** Imperative API exposed through `ref`: zoom/reset buttons, reading/setting the view, sending edits. */
export type MindmapApi = Pick<
  MindmapHandle,
  'requestEdit' | 'getEditStatus' | 'clearEditRejection' | 'getView' | 'setView' | 'zoomIn' | 'zoomOut' | 'resetView'
>;

type CallbackProp = 'onEditRequest' | 'onEditStatusChange' | 'onViewChange' | 'onNodeReposition';
/** Every callback key present (possibly `undefined`), so the latest props can be copied in one assignment. */
type MindmapCallbacks = { readonly [K in CallbackProp]: MindmapProps[K] };

const FILL_PARENT: CSSProperties = { display: 'block', width: '100%', height: '100%' };

/**
 * Thin React binding (spec L1): mounts the core onto a canvas, forwards prop changes, and keeps the
 * canvas backing store in sync with its CSS size and device pixel ratio.
 */
<<<<<<< HEAD
export function Mindmap({ data, config, extensions, fontFetcher, onFontStatusChange, className, style }: MindmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<MindmapHandle | null>(null);
  // Latest callback without remounting the canvas when the host passes a new closure each render.
  const onFontStatusChangeRef = useRef(onFontStatusChange);
  onFontStatusChangeRef.current = onFontStatusChange;
=======
export const Mindmap = forwardRef<MindmapApi, MindmapProps>(function Mindmap(
  { data, config, extensions, className, style, onEditRequest, onEditStatusChange, onViewChange, onNodeReposition },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<MindmapHandle | null>(null);
  // The core is mounted once, so it reads callbacks through this ref to always call the latest props.
  const callbacks: MindmapCallbacks = { onEditRequest, onEditStatusChange, onViewChange, onNodeReposition };
  const callbacksRef = useRef(callbacks);
  useLayoutEffect(() => {
    callbacksRef.current = callbacks;
  });
  useImperativeHandle(ref, () => apiDelegatingTo(handleRef), []);
>>>>>>> origin/main

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const handle = mountMindmap(canvas, {
      data,
      config: config ?? {},
      extensions: extensions ?? {},
<<<<<<< HEAD
      ...(fontFetcher === undefined ? {} : { fontFetcher }),
      onFontStatusChange: (status) => onFontStatusChangeRef.current?.(status),
=======
      onEditRequest: (request, currentData) => (callbacksRef.current.onEditRequest ?? DEFAULT_EDIT_HANDLER)(request, currentData),
      onEditStatusChange: (status) => callbacksRef.current.onEditStatusChange?.(status),
      onViewChange: (view) => callbacksRef.current.onViewChange?.(view),
      onNodeReposition: (event) => callbacksRef.current.onNodeReposition?.(event),
>>>>>>> origin/main
    });
    handleRef.current = handle;
    const syncSize = () => handle.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio);
    syncSize();
    const observer = new ResizeObserver(syncSize);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      handle.destroy();
      handleRef.current = null;
    };
    // Mount once; prop updates are forwarded by the effects below so the canvas is not torn down per change.
  }, []);

  useEffect(() => {
    handleRef.current?.setData(data);
  }, [data]);
  useEffect(() => {
    handleRef.current?.setConfig(config);
  }, [config]);
  useEffect(() => {
    handleRef.current?.setExtensions(extensions);
  }, [extensions]);

  return <canvas ref={canvasRef} className={className} style={{ ...FILL_PARENT, ...style }} data-testid="mindmap-canvas" />;
});

/** Delegates at call time because the core handle only exists between mount and unmount. */
function apiDelegatingTo(handleRef: { readonly current: MindmapHandle | null }): MindmapApi {
  const handle = (): MindmapHandle => {
    if (handleRef.current === null) throw new Error('The mindmap is not mounted yet (or was unmounted).');
    return handleRef.current;
  };
  return {
    requestEdit: (request) => handle().requestEdit(request),
    getEditStatus: () => handle().getEditStatus(),
    clearEditRejection: () => handle().clearEditRejection(),
    getView: () => handle().getView(),
    setView: (view) => handle().setView(view),
    zoomIn: () => handle().zoomIn(),
    zoomOut: () => handle().zoomOut(),
    resetView: () => handle().resetView(),
  };
}
