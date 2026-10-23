---
id: nid_q5cs3lr79q1xa2ebtbny5exc9_e
title: "Font loading and glyph-outline text, including text along branches"
status: in_progress
deps: [nid_spbntjy1m5mjtuzwhraxzd8h1_e]
links: []
created_iso: 2026-10-22T23:56:09Z
status_updated_iso: 2026-10-23T00:16:45Z
type: task
parent: nid_hc65067veoxpca8wtir8bnj2e_e
priority: 2
assignee: CC_WITH-nickolaykondratyev
tags: [mindmap-v1]
pwd: /home/nickolaykondratyev/git_repos/nickolay-kondratyev_natural-mindmap-library/.worktree/t-q5cs3lr7
---
## Goal
Render all text from real font glyph outlines, including the signature feature: each non-root label bent glyph-by-glyph along its incoming branch (R12–R18), with async font loading that never crashes rendering (L6).

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
Architecture, module boundaries and the commands to build/test are in `docs/architecture.md` and `CLAUDE.md` (created by the scaffold ticket nid_spbntjy1m5mjtuzwhraxzd8h1_e); follow them and keep them current when you change a seam.

## Done criteria
- Font loading via opentype.js from host-supplied URL or bytes (L5 Fonts); observable status loading / loaded / error (L6); failure does not crash rendering (text simply not drawn, status `error`). Default font Kalam (R18) from a public CDN (Fontsource); branch and node fonts configurable independently; changing font config at runtime loads the new font and repaints (needed by the demo settings panel, D3).
- Node labels: straight, centered in the node, from glyph outlines (R2, R17); root label bold (R3).
- Branch labels along the branch path from nid_spbntjy1m5mjtuzwhraxzd8h1_e/nid_u8rb9nyllrir2j6ditgfhu7uo_e: glyphs placed and rotated along the curve (R12); flipped on left-side branches so they read left->right upright (R13); vertically centered on the curve between the two node rims, using sizes from the scaffold's node size resolver (R14); fitting cascade: tighter letter spacing, then less padding, then smaller font, then drop overflowing glyphs, never past the curve end (R15); white with optional outline, not drawn before font loaded (R16). Letter spacing, stretch, slant, bold, outline exposed in config (R17).
- Pure, unit-tested: glyph placement along a synthetic curve, left-side flip, centering between rims, each step of the fitting cascade, glyph dropping, font status transitions including error.
- Unit tests never hit the network: vendor the Kalam TTF (SIL OFL — include its license file) for tests and for E2E route interception.

## Context
- Seams from nid_spbntjy1m5mjtuzwhraxzd8h1_e: see `docs/architecture.md`. Branch geometry is built in parallel by nid_u8rb9nyllrir2j6ditgfhu7uo_e; code against the shared branch path representation and use a synthetic curve in tests.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.
- No `ctx.fillText` for labels (R17).

## Non-goals
- Inline label editing — nid_m9bylgyu4bb098rqygf91vtuo_e.
