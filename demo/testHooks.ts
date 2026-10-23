import { DEFAULT_EDIT_HANDLER, InMemoryHost, type EditHandler } from 'natural-mindmap';
import type { MindmapApi } from 'natural-mindmap/react';

/** `?rejectEdits` makes the in-memory host reject every edit, so E2E tests can see a rejection (spec I5.4). */
export const REJECT_EDITS_PARAM = 'rejectEdits';
export const DEMO_REJECTION_REASON = 'The demo host is set to reject every change.';

export function hostFromUrl(): EditHandler {
  if (!new URLSearchParams(window.location.search).has(REJECT_EDITS_PARAM)) return DEFAULT_EDIT_HANDLER;
  return new InMemoryHost({ delayMs: 0, rejectReason: DEMO_REJECTION_REASON }).handle;
}

/** E2E tests find nodes through `window.mindmap.getNodeScreenBox`, since canvas content has no DOM. */
export function exposeMindmapApi(api: MindmapApi | null): void {
  (window as Window & { mindmap?: MindmapApi | null }).mindmap = api;
}
