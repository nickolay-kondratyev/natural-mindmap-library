import type { MindmapApi } from 'natural-mindmap/react';
import { PanelSection } from './PanelSection';

/** View buttons (spec I1, via the public `MindmapApi`), "Reset map" (D6) and how to edit on the canvas (D4). */
export function MapControls({ api, onResetMap }: { readonly api: () => MindmapApi | null; readonly onResetMap: () => void }) {
  return (
    <PanelSection title="Map">
      <ul className="hint-list">
        <li>Hover a node: <kbd>+</kbd> adds a child, <kbd>×</kbd> deletes it.</li>
        <li>Double-click a node to rename it.</li>
        <li>Drag a node onto another node to move it there; drop it on empty space to just reposition it.</li>
        <li>Drag the background to pan, scroll to zoom.</li>
      </ul>
      <div className="button-row">
        <button type="button" className="button" onClick={() => api()?.zoomOut()} aria-label="Zoom out">−</button>
        <button type="button" className="button" onClick={() => api()?.zoomIn()} aria-label="Zoom in">+</button>
        <button type="button" className="button" onClick={() => api()?.resetView()}>Fit to screen</button>
        <button type="button" className="button button--push-right" onClick={onResetMap} title="Back to the Shakespeare example; your edits and dragged positions are discarded.">
          Reset map
        </button>
      </div>
    </PanelSection>
  );
}
