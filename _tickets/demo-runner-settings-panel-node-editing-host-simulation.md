---
id: nid_k9s0fwfj8y13qhmkr2c2um043_e
title: "Demo runner: settings panel, node editing, host simulation"
status: open
deps: [nid_m9bylgyu4bb098rqygf91vtuo_e]
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
Ship the demo runner (spec §6a) that proves the public API is enough for a real host and lets a human tune every setting live.

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
Architecture, module boundaries and the commands to build/test are in `docs/architecture.md` and `CLAUDE.md` (created by the scaffold ticket nid_spbntjy1m5mjtuzwhraxzd8h1_e); follow them and keep them current when you change a seam.

## Done criteria
- Uses the library only through its public API (D1); starts on §8 reference data with default settings (D2).
- Settings panel with live controls for every exposed config setting (theme colors, branch width/tapering, layout, text styling, fonts) plus reset to defaults (D3). Prefer driving the controls from the config shape/defaults so newly added settings are hard to forget.
- Node editing add/remove/rename/move through the protocol with the in-memory host (D4); host simulation toggle for delay and reject (D5); reset map to reference data (D6).
- Playwright key journeys only: change a setting re-renders, reset-to-defaults, host reject toggle produces a visible rejection. Settings-model logic unit-tested where it is logic.

## Context
- Demo shell lives in `demo/` from nid_spbntjy1m5mjtuzwhraxzd8h1_e; interactions from nid_m9bylgyu4bb098rqygf91vtuo_e; in-memory host from nid_5suxnngcwzcabej2vgrnytvx4_e.
- Load the `my-frontend-design` skill before UI work.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.

## Non-goals
- Persisting settings, multiple themes beyond the configurable dark one.
