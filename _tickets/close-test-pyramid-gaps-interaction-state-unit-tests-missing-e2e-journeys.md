---
closed_iso: 2026-10-23T15:58:15Z
id: nid_cjz7xxy79aoipjhrrsputlnp2_e
title: "Close test-pyramid gaps: interaction state unit tests + missing E2E journeys"
status: closed
deps: []
links: []
created_iso: 2026-10-23T15:50:12Z
status_updated_iso: 2026-10-23T15:58:15Z
type: task
priority: 1
assignee: CC_WITH-nickolaykondratyev
tags: [test-coverage]
---

Coverage review (2026-10-23) found the test pyramid healthy except for its middle and a few key journeys.

1. Refactor: move the stateful decisions out of `src/core/interaction/canvasInteractions.ts` (DOM wiring, ~2% unit coverage) into a pure, DOM-free unit next to `pointerGesture.ts`/`hitTest.ts`, then BDD unit-test it: display data choice (draft vs pending preview vs confirmed), effective overrides while a move is pending, clearing a moved subtree's overrides after a confirmed move, drop-on-empty -> override + reposition event, rejected add/rename reopened for retry, editors refused while pending.
2. E2E (Playwright): drag a node to empty space (I2: subtree moves, host data unchanged), delete via hover "x" (D4), pan by dragging empty canvas + wheel zoom (I1).
3. Add `@vitest/coverage-v8` dev dependency and `npm run coverage` script (no threshold gate).
4. Fix stale claims in `docs/architecture.md` Testing / Pointer interactions sections.

## Acceptance Criteria

- Refactor commit separate from test commits; no behavior change.
- npm run typecheck, npm test, npm run e2e all pass.
- New unit tests follow BDD one-behavior-per-test convention.

