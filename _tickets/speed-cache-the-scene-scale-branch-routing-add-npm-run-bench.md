---
profile: higher
id: nid_t5ydqj1ar6fdjksdps0sk2e0g_e
title: "Speed: cache the scene, scale branch routing, add npm run bench"
status: in_progress
pwd: /home/nickolaykondratyev/git_repos/nickolay-kondratyev_natural-mindmap-library/.worktree/t-t5ydqj1a
deps: []
links: []
created_iso: 2026-10-23T20:13:10Z
status_updated_iso: 2026-10-23T20:18:19Z
type: task
priority: 2
assignee: CC_WITH-nickolaykondratyev
parent: nid_rk795rjqzzksdjrhm03dy6s7l_e
tags: [obsidian-heading-launch]
---


## Goal

Part of epic `nid_rk795rjqzzksdjrhm03dy6s7l_e` (library ready for the Obsidian heading map of one note). Today the
scene is rebuilt on every paint (hover, pan, zoom, every frame of the busy animation), and building it is roughly
O(n^2): ~50 headings already cost ~20 ms per paint, so hover and pan stutter, and long notes (100+ headings) are
unusable. Make the map fast enough for long notes without changing how it looks.

## Done criteria

- Hover, pan, zoom and the busy animation do not rebuild the scene. A Vitest unit test proves the rebuild happens
  only when data, config, extensions or position overrides change.
- `npm run bench` (a benchmark script, not a test gate and not part of `npm test`) reports `buildScene` times for
  synthetic trees of several sizes (include 200, 500 and 1,000 nodes).
- 500 nodes take under 50 ms in `buildScene` on the dev machine (baseline today: 200 nodes = 232 ms,
  500 = 1,443 ms, 1,000 = 5,877 ms).
- With default config the look is unchanged: `e2e/reference-view.spec.ts` passes without re-baselining.
- `npm run typecheck`, `npm test` and `npm run e2e` pass.

## Context

- Scene rebuilt every paint: `src/core/interaction/canvasInteractions.ts` `CanvasInteractions.sceneToPaint` (its
  comment names the ceiling). It picks between `buildScene(local.displayData(), config, extensions,
  local.effectiveOverrides())` and the live drag preview (`draggedScene`). `buildScene` is in `src/core/render/scene.ts`.
- Measured per stage at 1,000 nodes: tidy-tree 2 ms, bow + jitter 0 ms, collision 29 ms, **branch routing 5,885 ms**.
  The cost is in `src/core/geometry/branchRouting.ts` (O(branches^2 x samples^2) limb separation, plus every limb
  checked against every node box). Ideas from `next-steps-prior-to-obsidian.md` section "0.1 Speed": skip limb pairs
  whose bounding boxes do not overlap before comparing samples, and find nearby nodes through a grid instead of
  scanning every node. These are suggestions; any approach that keeps the look is fine.
- Measurements came from a synthetic vault-like tree (fan-out 8, default config); see
  `next-steps-prior-to-obsidian.md` section "Measured: where the time goes". `buildScene` takes no font, so the
  bench can run in Node.
- Unit tests read fonts from `test-support/`; tests never hit the network.

## Constraints

- `src/core/**` never imports React (`src/core/noReactImports.test.ts`).
- Default config keeps today's look: the reference screenshot must pass as is. Do not re-baseline it. Routing
  output for the reference data should stay the same (or visually indistinguishable within the screenshot
  tolerance).
- Cache by input identity (the inputs `sceneToPaint` already passes), so hosts and the demo need no API change.
  Every visible change of displayed data (pending preview, draft child, confirmed data, overrides) must still repaint
  correctly.
- Tests: Vitest BDD (`describe` GIVEN, `it` WHEN/THEN), one behavior per test, for the cache rule and any new
  routing helpers. No new E2E needed; no look assertions beyond the existing reference screenshot.
- Update the ceiling comments (`sceneToPaint`, `branchRouting.ts`) and `docs/architecture.md` if what they say
  changes.

## Non-goals

- Drawing only what is on screen, less detail when zoomed out, collision grid (`collisionStage.ts` upgrade path):
  folder map, later.
- Collapse / expand.
- Making the bench a CI gate.
