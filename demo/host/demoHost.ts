import { useCallback, useRef, useState } from 'react';
import { InMemoryHost, REFERENCE_DATA, type EditHandler, type EditStatus, type HostSimulation, type MindmapData } from 'natural-mindmap';

export const DEMO_REJECTION_REASON = 'The demo host is set to reject every change.';

/** What the runner's "Host simulation" controls set (spec D5), in the user's terms. */
export interface HostSimulationSettings {
  readonly delayMs: number;
  readonly rejectEdits: boolean;
}

export const DEFAULT_HOST_SIMULATION_SETTINGS: HostSimulationSettings = { delayMs: 0, rejectEdits: false };

const IDLE: EditStatus = { kind: 'idle' };

export function toHostSimulation(settings: HostSimulationSettings): HostSimulation {
  return { delayMs: settings.delayMs, rejectReason: settings.rejectEdits ? DEMO_REJECTION_REASON : null };
}

const MS_PER_SECOND = 1000;

/** Slider readout: "Instant" or seconds, e.g. "1.5 s". */
export function describeDelay(delayMs: number): string {
  return delayMs === 0 ? 'Instant' : `${delayMs / MS_PER_SECOND} s`;
}

export interface DemoHost {
  /** Host-owned data (spec L2); the map renders exactly this. */
  readonly data: MindmapData;
  /** Changes on "Reset map" so the map remounts: clears dragged positions, the view and any shown rejection. */
  readonly mapKey: number;
  readonly editStatus: EditStatus;
  readonly simulation: HostSimulationSettings;
  setSimulation(settings: HostSimulationSettings): void;
  readonly onEditRequest: EditHandler;
  onEditStatusChange(status: EditStatus): void;
  resetMap(): void;
}

/**
 * The runner as a real host would be (spec D1/D4): it owns the data in React state and answers edit requests
 * with the library's in-memory host (I6), whose delay/reject simulation the panel controls (D5).
 */
export function useDemoHost(): DemoHost {
  const [host] = useState(() => new InMemoryHost());
  const [data, setData] = useState<MindmapData>(REFERENCE_DATA);
  const [mapKey, setMapKey] = useState(0);
  const [editStatus, setEditStatus] = useState<EditStatus>(IDLE);
  const [simulation, setSimulationState] = useState(DEFAULT_HOST_SIMULATION_SETTINGS);
  // Bumped by "Reset map": an answer to a request sent before the reset must not overwrite the reference data.
  const generationRef = useRef(0);

  const onEditRequest = useCallback<EditHandler>(
    async (request, currentData) => {
      const generation = generationRef.current;
      const next = await host.handle(request, currentData);
      if (generation === generationRef.current) setData(next);
      return next;
    },
    [host],
  );

  const setSimulation = useCallback(
    (settings: HostSimulationSettings) => {
      host.setSimulation(toHostSimulation(settings));
      setSimulationState(settings);
    },
    [host],
  );

  const resetMap = useCallback(() => {
    generationRef.current += 1;
    setData(REFERENCE_DATA);
    setEditStatus(IDLE);
    setMapKey((key) => key + 1);
  }, []);

  return { data, mapKey, editStatus, simulation, setSimulation, onEditRequest, onEditStatusChange: setEditStatus, resetMap };
}
