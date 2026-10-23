---
profile: standard
id: nid_idiv2268vh6mpy2gbnkrjlgw6_e
title: "Host hooks for navigation: node click event, highlight, center on node, move-only switch"
status: open
deps: [nid_gbj85a2pad7yofsjnf7ng26ff_e]
links: []
created_iso: 2026-10-23T20:13:10Z
status_updated_iso: 2026-10-23T20:13:10Z
type: task
priority: 2
assignee: CC_WITH-nickolaykondratyev
parent: nid_rk795rjqzzksdjrhm03dy6s7l_e
tags: [obsidian-heading-launch]
---


## Goal

Part of epic `nid_rk795rjqzzksdjrhm03dy6s7l_e` (library ready for the Obsidian heading map of one note). The plugin
(another repo) needs to: jump to a heading when its node is clicked, show which heading the editor cursor is in, and
offer move only (no add, rename or delete) for the first launch. Give hosts those hooks through the public API.

## Done criteria

- **Click:** a click on a node (press and release without a drag) reports the node id and the modifier keys
  (at least Ctrl/Cmd, Shift, Alt) to the host through a `MountOptions` callback and a `<Mindmap>` prop. Drags, pans,
  and clicks on hover buttons do not report it.
- **Follow the cursor:** the host can highlight one node (or none) and center the view on a node, through
  `MindmapHandle` and the `<Mindmap>` ref (`MindmapApi`). The highlight is visible in the default dark theme;
  centering moves the view (reported through `onViewChange` like other library view changes) and does nothing
  harmful for an unknown id.
- **Move-only maps:** config can turn off add, rename and delete. When they are off, the map shows no "+" (the "x" is
  already gone after `nid_gbj85a2pad7yofsjnf7ng26ff_e`; delete stays covered by the switch for future UI), and a double-click does not open the rename editor. Move (drag onto a node) still works through the confirm protocol.
- The new config options appear in the demo settings panel (it is generated from `DEFAULT_CONFIG`) and survive
  `restoreConfig`.
- With default config the look and behavior are unchanged: `e2e/reference-view.spec.ts` passes without
  re-baselining. `npm run typecheck`, `npm test` and `npm run e2e` pass.

## Context

- **Depends on `nid_gbj85a2pad7yofsjnf7ng26ff_e`** ("+" hides too early; remove the "x" for now), which will already
  be merged. Settle the click rule consistently with its hover-button changes: whatever that ticket did to keep the
  "+" reachable (hover area, hide delay) must not make a click near or on a button count as a node click, and the
  move-only switch must hide the "+" it kept.
- Click vs double-click rule (to settle here): double-click renames today. Options: (a) report every click at once,
  so a double-click is two clicks plus rename; (b) delay the click by the double-click interval while rename is on.
  Recommendation: (a), since jumping to the same heading twice is harmless and the heading map turns rename off
  anyway; record the choice in `docs/architecture.md`.
- Host API: `src/core/mount.ts` (`MountOptions`, `MindmapHandle`; `onNodeReposition` is the pattern to copy),
  `src/react/Mindmap.tsx` (props, `CallbackProp`, `MindmapApi`, `apiDelegatingTo`).
- Pointer decisions are pure and unit-tested: `src/core/interaction/pointerGesture.ts` (click vs pan vs drag past
  `DRAG_THRESHOLD_PX`), `src/core/interaction/hitTest.ts` (`pointerTargetAt`, `nodeHandles`). DOM wiring, hover
  buttons and double-click rename: `src/core/interaction/canvasInteractions.ts`. Overlay drawing (hover buttons,
  drop highlight): `src/core/render/interactionOverlay.ts`. Edit refusals: `src/core/edit/editValidation.ts`
  (`findEditProblem`).
- View: `src/core/view/viewController.ts` (`screen = viewportCenter + offset + zoom * scene`).
- Config: `src/core/config/config.ts` (`MindmapConfig`, `DEFAULT_CONFIG`; `interaction.confirmReparent` is an
  existing boolean in the same area). New numeric settings need a range in `demo/settings/settingSpecs.ts`
  `NUMBER_RANGES`, otherwise the build fails.
- The demo exposes `MindmapApi` as `window.mindmap` (`demo/testHooks.ts`); E2E helpers in `e2e/demoPage.ts`.
- Background: `next-steps-prior-to-obsidian.md` section "0.2 Host hooks".

## Constraints

- `src/core/**` never imports React (`src/core/noReactImports.test.ts`).
- Default config keeps today's behavior and look; every new option is opt-in.
- Config stays plain serializable data (`MindmapConfig`). Event callbacks go on `MountOptions` and `<Mindmap>`
  props, the same way `onNodeReposition` does.
- Tests: Vitest BDD unit tests (`describe` GIVEN, `it` WHEN/THEN, one behavior per test) for the click rule, the
  move-only handle/rename decisions and centering math. Playwright only for the key journey (e.g. click a node in
  the demo and the host sees it; move-only shows no "+"), no look assertions. E2E imports `test` from `e2e/fixtures.ts`.
- Update `docs/architecture.md` "Pointer interactions" for the new hooks.

## Non-goals

- Right-click hook, hover hook, per-node rules (`canAddChild`, `canRename`, ...): folder map, later. A global switch
  is enough for one note.
- Expanding ancestors in "center on node" (there is no collapse yet).
- Release notes and `spec.md` updates (done in the release ticket).
