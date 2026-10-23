---
id: nid_m9bylgyu4bb098rqygf91vtuo_e
title: "Canvas pointer interactions: reposition, reparent, add, rename, delete"
status: in_progress
deps: [nid_djtlbgb2q5iipx2go9fy2eogc_e, nid_u8rb9nyllrir2j6ditgfhu7uo_e, nid_q5cs3lr79q1xa2ebtbny5exc9_e, nid_5suxnngcwzcabej2vgrnytvx4_e]
links: []
created_iso: 2026-10-22T23:56:09Z
status_updated_iso: 2026-10-23T00:35:28Z
type: task
parent: nid_hc65067veoxpca8wtir8bnj2e_e
priority: 2
assignee: CC_WITH-nickolaykondratyev
tags: [mindmap-v1]
pwd: /home/nickolaykondratyev/git_repos/nickolay-kondratyev_natural-mindmap-library/.worktree/t-m9bylgyu
---
## Goal
Make the map directly manipulable on the canvas, driving the core protocol and view model from nid_5suxnngcwzcabej2vgrnytvx4_e: pan/zoom, drag-reposition with push-apart, drag-drop reparent, add child, inline rename, delete (I1–I4).

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
Architecture, module boundaries and the commands to build/test are in `docs/architecture.md` and `CLAUDE.md` (created by the scaffold ticket nid_spbntjy1m5mjtuzwhraxzd8h1_e); follow them and keep them current when you change a seam.

## Done criteria
- Pan by dragging empty canvas; wheel zoom anchored at cursor (I1), driving the view model from nid_5suxnngcwzcabej2vgrnytvx4_e.
- Drag a node: moves its whole subtree, nearby nodes pushed apart via the collision stage from nid_djtlbgb2q5iipx2go9fy2eogc_e, branches re-route (R8, R23, I2); a small movement threshold keeps clicks/double-clicks from becoming drags; reposition reported as event. Repositioned nodes keep their position across later data updates (library-local per-node override keyed by id; persisting is the host's choice via the event).
- Drop onto another node reparents through the protocol; drop target highlighted while hovered; self/descendant refused (I3).
- Hover "+" button on the node's outer side adds a child; double-click edits the label inline in the real font; delete action — all through the protocol (I4).
- Pending state visible (dimmed node at target + busy indicator), rejection reason shown in plain language, typed label kept for retry (I5).
- Hit testing (point -> node, point -> "+" button) and drag-threshold logic are pure and unit-tested; Playwright covers the key journeys only: add child, rename, reparent by drag-drop, rejected edit shows reason.

## Context
- Builds on layout (nid_djtlbgb2q5iipx2go9fy2eogc_e), rendering (nid_u8rb9nyllrir2j6ditgfhu7uo_e), text/fonts (nid_q5cs3lr79q1xa2ebtbny5exc9_e), protocol + view model (nid_5suxnngcwzcabej2vgrnytvx4_e); see `docs/architecture.md`.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.

## Non-goals
- Keyboard shortcuts, multi-select, touch gestures.
