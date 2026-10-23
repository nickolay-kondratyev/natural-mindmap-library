import { useCallback, useRef, useState } from 'react';
import { DEFAULT_CONFIG, type LabelFontStatus, type MindmapConfig } from 'natural-mindmap';
import { Mindmap, type MindmapApi } from 'natural-mindmap/react';
import { FontStatusBadge } from './FontStatusBadge';
import { HostSimulationControls } from './host/HostSimulationControls';
import { useDemoHost } from './host/demoHost';
import { MapControls } from './MapControls';
import { SettingsPanel } from './settings/SettingsPanel';
import { exposeMindmapApi } from './testHooks';

/** Demo runner (spec §6a). Talks to the library only through its public entry points (D1). */
export function App() {
  const host = useDemoHost();
  const [config, setConfig] = useState<MindmapConfig>(DEFAULT_CONFIG);
  const [fontStatus, setFontStatus] = useState<LabelFontStatus | null>(null);
  const apiRef = useRef<MindmapApi | null>(null);
  const attachApi = useCallback((api: MindmapApi | null) => {
    apiRef.current = api;
    exposeMindmapApi(api);
  }, []);

  return (
    <div className="runner">
      <main className="runner__canvas">
        <Mindmap
          key={host.mapKey}
          ref={attachApi}
          data={host.data}
          config={config}
          onFontStatusChange={setFontStatus}
          onEditRequest={host.onEditRequest}
          onEditStatusChange={host.onEditStatusChange}
        />
        <FontStatusBadge status={fontStatus} />
      </main>
      <aside className="runner__panel" aria-label="Demo controls">
        <header className="runner__header">
          <h1>Natural Mindmap</h1>
          <p>Demo runner</p>
        </header>
        <MapControls api={() => apiRef.current} onResetMap={host.resetMap} />
        <HostSimulationControls settings={host.simulation} onChange={host.setSimulation} editStatus={host.editStatus} />
        <SettingsPanel config={config} onChange={setConfig} />
      </aside>
    </div>
  );
}
