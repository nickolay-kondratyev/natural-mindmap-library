---
id: nid_qgu2pl5p1q0spnndfwu9xe590_e
title: "Reference view acceptance screenshot and visual tuning"
status: open
deps: [nid_djtlbgb2q5iipx2go9fy2eogc_e, nid_u8rb9nyllrir2j6ditgfhu7uo_e, nid_q5cs3lr79q1xa2ebtbny5exc9_e]
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
v1 acceptance: the zero-config library renders the §8 Shakespeare reference view matching the "Expected look", verified by a Playwright screenshot (Q3).

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
Architecture, module boundaries and the commands to build/test are in `docs/architecture.md` and `CLAUDE.md` (created by the scaffold ticket nid_spbntjy1m5mjtuzwhraxzd8h1_e); follow them and keep them current when you change a seam.

## Done criteria
- Tune defaults (layout, taper, palette, text size, root styling) until the demo's reference view matches every bullet of spec §8 "Expected look"; record the judgement calls in `_agent_decisions/needs_review/` with the screenshot path under `.out/` (git-ignored).
- One Playwright screenshot test of the reference view, rendered on a dedicated canvas-only demo route/page with zero config (not the full runner UI, so the settings panel added by nid_k9s0fwfj8y13qhmkr2c2um043_e cannot break the baseline), with fonts served from the vendored TTF (route interception, no network), deterministic across runs (Q1). Baseline committed under the Playwright snapshot dir.
- Rendering is deterministic: rendering twice produces identical pixels.

## Context
- Depends on layout (nid_djtlbgb2q5iipx2go9fy2eogc_e), branches/colors (nid_u8rb9nyllrir2j6ditgfhu7uo_e), text (nid_q5cs3lr79q1xa2ebtbny5exc9_e); see `docs/architecture.md`.
- Load the `my-frontend-design` skill before visual tuning.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.
- Tuning must stay within the existing config defaults/seams; no hard-coded special cases for the reference data.

## Non-goals
- Light theme, sketch mode.
