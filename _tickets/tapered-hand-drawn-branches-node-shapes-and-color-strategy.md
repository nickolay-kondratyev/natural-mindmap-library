---
id: nid_u8rb9nyllrir2j6ditgfhu7uo_e
title: "Tapered hand-drawn branches, node shapes and color strategy"
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
profile: higher
---
## Goal
Make the map look hand-drawn: filled, curved, tapered, slightly asymmetric limbs that fork as soft Y's, colored per first-level subtree, with node shapes drawn on top — the core visual identity in spec §2 and §8 "Proportions", "Forks", "Colors", "Root".

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
Architecture, module boundaries and the commands to build/test are in `docs/architecture.md` and `CLAUDE.md` (created by the scaffold ticket nid_spbntjy1m5mjtuzwhraxzd8h1_e); follow them and keep them current when you change a seam.

## Done criteria
- Branch geometry (pure, unit-tested): smooth curve per parent->child link, center to center (R9); root branches leave nearly horizontally (R6); filled outline that tapers from parent to child and thins per tree level (R5) with taper/width exposed in config; slightly asymmetric edges, deterministic (R7, Q1); children fork as a soft Y close to the parent (§8 Forks); branches route around unrelated nodes (R8); where two branches would overlap (e.g. after a drag) they are kept apart by a simple separation, not a physics simulation (R8 sub-bullet).
- Branch geometry exposes the shared branch path representation from nid_spbntjy1m5mjtuzwhraxzd8h1_e so text-along-curve (nid_q5cs3lr79q1xa2ebtbny5exc9_e) can consume it.
- Node shapes: ellipse default via the shape seam, root distinct (R2, R3: dark slate fill, lighter outline), drawn at the size from the scaffold's node size resolver (R3 larger root, R4).
- Color strategy: default derives first-level palette color and inherits to descendants (R10); palette ordered for neighbour contrast with fill + darker outline per color, warm soft hues per §8 (R11); node color index from data honored. Theme colors come from config.
- Unit tests for geometry (taper monotonic, width per level, asymmetry deterministic, Y-fork proximity, route avoids an unrelated node's box, two overlapping branches get separated) and color resolution.
- Canvas renderer draws branches under nodes; demo shows it.

## Context
- Seams and types from nid_spbntjy1m5mjtuzwhraxzd8h1_e: see `docs/architecture.md`. Layout positions come from the layout pipeline (nid_djtlbgb2q5iipx2go9fy2eogc_e, in parallel); use the placeholder layout until it lands.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.
- No visual screenshot assertions here; final visual tuning against §8 is nid_qgu2pl5p1q0spnndfwu9xe590_e.

## Non-goals
- Text on branches and inside nodes — nid_q5cs3lr79q1xa2ebtbny5exc9_e.
- rough.js sketch mode.
