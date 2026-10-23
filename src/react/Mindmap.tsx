import { useEffect, useRef, type CSSProperties } from 'react';
import {
  mountMindmap,
  type FontFetcher,
  type LabelFontStatus,
  type MindmapData,
  type MindmapExtensions,
  type MindmapHandle,
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
}

const FILL_PARENT: CSSProperties = { display: 'block', width: '100%', height: '100%' };

/**
 * Thin React binding (spec L1): mounts the core onto a canvas, forwards prop changes, and keeps the
 * canvas backing store in sync with its CSS size and device pixel ratio.
 */
export function Mindmap({ data, config, extensions, fontFetcher, onFontStatusChange, className, style }: MindmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<MindmapHandle | null>(null);
  // Latest callback without remounting the canvas when the host passes a new closure each render.
  const onFontStatusChangeRef = useRef(onFontStatusChange);
  onFontStatusChangeRef.current = onFontStatusChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const handle = mountMindmap(canvas, {
      data,
      config: config ?? {},
      extensions: extensions ?? {},
      ...(fontFetcher === undefined ? {} : { fontFetcher }),
      onFontStatusChange: (status) => onFontStatusChangeRef.current?.(status),
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
}
