import { useState } from 'react';
import { REFERENCE_DATA, type LabelFontStatus } from 'natural-mindmap';
import { Mindmap } from 'natural-mindmap/react';
import { FontStatusBadge } from './FontStatusBadge';
import { exposeMindmapApi, hostFromUrl } from './testHooks';

/** Demo shell (spec §6a). Talks to the library only through its public entry points (D1). */
export function App() {
  const [fontStatus, setFontStatus] = useState<LabelFontStatus | null>(null);
  const [onEditRequest] = useState(hostFromUrl);
  return (
    <>
      <Mindmap ref={exposeMindmapApi} data={REFERENCE_DATA} onFontStatusChange={setFontStatus} onEditRequest={onEditRequest} />
      <FontStatusBadge status={fontStatus} />
    </>
  );
}
