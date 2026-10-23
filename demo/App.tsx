import { REFERENCE_DATA } from 'natural-mindmap';
import { Mindmap } from 'natural-mindmap/react';

/** Demo shell (spec §6a). Talks to the library only through its public entry points (D1). */
export function App() {
  return <Mindmap data={REFERENCE_DATA} />;
}
