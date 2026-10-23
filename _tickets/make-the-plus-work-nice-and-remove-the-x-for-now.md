---
profile: standard
id: nid_gbj85a2pad7yofsjnf7ng26ff_e
title: "Make the plus work nice and remove the X for now."
status: open
deps: []
parent: nid_rk795rjqzzksdjrhm03dy6s7l_e
links: [nid_rk795rjqzzksdjrhm03dy6s7l_e]
created_iso: 2026-10-23T17:42:09Z
status_updated_iso: 2026-10-23T17:42:09Z
type: task
priority: 2
assignee: nickolaykondratyev
tags: [obsidian-heading-launch]
---

Right now I cannot get to the '+' as it hides before i can get to it. 

And for now lets remove the 'X' from UI.

## Goal

Part of epic `nid_rk795rjqzzksdjrhm03dy6s7l_e` (library ready for the Obsidian heading map of one note). The two
lines above are the human's request, verbatim. The hover "+" (add child) must be easy to reach with the mouse, and
the "x" (delete) button goes away from the map for now (delete in a note is destructive; the plugin may offer it
later through its own menu).

## Done criteria

- Moving the pointer from a node straight to its "+" keeps the "+" visible, and clicking it starts adding a child.
  A Vitest unit test covers the hover-keeping rule; a Playwright journey (in `e2e/interactions.spec.ts`) hovers a
  node, moves to its "+", clicks it, and sees a new child appear (assert via data / `window.mindmap`, not pixels).
- Moving the pointer away from both the node and its "+" still hides the "+".
- No "x" is drawn or hit-testable on any node. The `delete` edit request type stays in the protocol (hosts and
  tests still compile), it is just no longer offered by the UI.
- `spec.md` I4 and `docs/architecture.md` ("Pointer interactions" bullet) no longer promise a hover delete button.
- With default config the look is unchanged: `e2e/reference-view.spec.ts` passes without re-baselining (the
  screenshot shows no hover state). `npm run typecheck`, `npm test` and `npm run e2e` pass.

## Context

- Why the "+" hides: `src/core/interaction/hitTest.ts` places the "+" outside the node box
  (`HANDLE_GAP` + `HANDLE_RADIUS`), and `pointerTargetAt` only hits the handle while the node is still hovered.
  `CanvasInteractions.updateHover` in `src/core/interaction/canvasInteractions.ts` clears the hover as soon as the
  pointer is over the gap (neither node nor handle). Fix the root cause (e.g. treat the node box plus the path to
  its handles as one hover area); a hide delay is an alternative. Implementer's choice; no timers in unit tests
  without fake timers.
- "x": `deleteHandle` / `nodeHandles` in `hitTest.ts`, drawing in `src/core/render/interactionOverlay.ts`.
- Existing unit tests for the delete button (`src/core/interaction/hitTest.test.ts` "offers no delete button",
  "delete button sits above it") are removed or inverted as part of this request; that is the human's ask, not a
  weakened test.
- Ticket `nid_idiv2268vh6mpy2gbnkrjlgw6_e` (host hooks) builds on this one: it adds a node-click event and a
  switch that hides the "+". Keep the hover area well defined so a click on or next to the "+" can be told apart
  from a node click.

## Constraints

- `src/core/**` never imports React (`src/core/noReactImports.test.ts`).
- Tests: Vitest BDD (`describe` GIVEN, `it` WHEN/THEN), one behavior per test. E2E imports `test` from
  `e2e/fixtures.ts`; no look assertions.

## Non-goals

- A replacement delete UI (keyboard, context menu): later, through the host.
- Removing `delete` from the edit protocol.
- Restyling the "+".
