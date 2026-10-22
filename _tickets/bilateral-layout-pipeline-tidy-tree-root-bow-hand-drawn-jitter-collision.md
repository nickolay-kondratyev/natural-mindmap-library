---
id: nid_djtlbgb2q5iipx2go9fy2eogc_e
title: "Bilateral layout pipeline (tidy tree, root bow, hand-drawn jitter, collision)"
status: open
deps: [nid_spbntjy1m5mjtuzwhraxzd8h1_e]
links: []
created_iso: 2026-10-22T23:56:09Z
status_updated_iso: 2026-10-22T23:56:09Z
type: task
parent: nid_hc65067veoxpca8wtir8bnj2e_e
priority: 2
assignee: CC_WITH-nickolaykondratyev
tags: [mindmap-v1]
---
## Goal
Produce the bilateral, hand-drawn-feeling auto layout as a pure, pluggable pipeline so the reference map spreads like §8 "Spread".

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
Architecture, module boundaries and the commands to build/test are in `docs/architecture.md` and `CLAUDE.md` (created by the scaffold ticket nid_spbntjy1m5mjtuzwhraxzd8h1_e); follow them and keep them current when you change a seam.

## Done criteria
- Default pipeline stages, each a separately unit-tested pure function: tidy tree per side with d3-hierarchy (R19, R20: no overlapping subtrees, vertically centered on root); root-branch outward bow with a pluggable curve function, golden-ratio-shaped default, whole subtree moves with its first-level node (R21); deterministic hand-drawn jitter/stagger (R22: same data => identical output); collision push-apart where the root never moves (R23).
- Hosts can reorder, remove or add stages (L5); layout is callable on its own (L7). Layout `type` discriminant handled exhaustively (L4).
- Spacing and collision use node sizes from the scaffold's node size resolver (R4); this ticket does not define sizes.
- Unit tests cover: side split honors node side field, top/bottom first-level nodes sit farther out than middle ones, determinism, no overlaps after collision, root fixed, user-supplied stage list honored.
- The collision stage is exported standalone and accepts a set of pinned node ids that never move (root always pinned), so nid_m9bylgyu4bb098rqygf91vtuo_e can reuse it for drag-time push-apart with the dragged subtree pinned (I2); unit-tested with a pinned non-root node.

## Context
- Seams and types from nid_spbntjy1m5mjtuzwhraxzd8h1_e: see `docs/architecture.md`.
- Reference data (§8) module from nid_spbntjy1m5mjtuzwhraxzd8h1_e.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.

## Non-goals
- Branch routing around nodes (R8) — owned by nid_u8rb9nyllrir2j6ditgfhu7uo_e.
- Animation.
