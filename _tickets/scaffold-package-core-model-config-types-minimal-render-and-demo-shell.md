---
id: nid_spbntjy1m5mjtuzwhraxzd8h1_e
title: "Scaffold package, core model, config types, minimal render and demo shell"
status: open
deps: []
links: []
created_iso: 2026-10-22T23:56:09Z
status_updated_iso: 2026-10-22T23:56:09Z
type: task
parent: nid_hc65067veoxpca8wtir8bnj2e_e
priority: 1
assignee: CC_WITH-nickolaykondratyev
tags: [mindmap-v1]
profile: higher
---
## Goal
Lay the foundation every other v1 ticket builds on: one TypeScript package with a framework-free core, a thin React wrapper, and a demo app, plus the shared types and seams (data model, config, layout/render/shape/color/curve extension points) so the follow-up tickets can be implemented in parallel without stepping on each other.

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
This ticket creates `docs/architecture.md` (architecture, module boundaries, seams) and the build/test commands in `CLAUDE.md`; every follow-up ticket reads them first.

## Done criteria
- `npm install`, `npm run typecheck`, `npm test` (Vitest), `npm run build` (library build: core + React entry points with type declarations), `npm run dev` (demo) and `npm run e2e` (Playwright) all work from a clean clone; documented in `CLAUDE.md` (concise) and `README.md`.
- Playwright and its Chromium browser are installed as part of setup (e.g. a `postinstall` or documented `npm run setup`), so E2E runs without manual steps.
- Public data types for the controlled flat node list (L2: `id`, `parentId`, `text`, side, optional color index and size) and a typed, fully-optional config object with defaults (L3, L4 discriminated `type` for layout with exhaustive handling, nested theme such as `settings.theme.color.*` per R1, default background near-black navy). Config merging of partial user config over defaults is unit-tested.
- Extension seams exist as types/interfaces with one working default each, documented in `docs/architecture.md`: layout pipeline of stages (L5, L7: pure data in -> positioned data out), root-bow curve function, node shape (R2), color strategy (R10/R11 — must allow a future non-parent-derived strategy), and a branch path representation (point + tangent at arc-length/parameter) that both branch rendering and text-along-curve consume.
- Node size resolver (R4): default size shrinks with depth (root largest, leaves smallest), data `size` overrides it; unit-tested. It is the single source of node sizes for layout, collision, branch rims and text fitting, which are built in parallel.
- A mount entry point in core that draws onto a canvas with frame-coalesced repaint (L8, unit-tested scheduling) and a `<Mindmap>` React component (L1) that mounts it and handles resize.
- The §8 reference data lives in one module exported for the demo and tests.
- Demo app (`demo/`) shows the reference data via the public API only (D1): placeholder rendering is fine (e.g. plain ellipses at simple positions, straight lines) — the real look comes from later tickets.
- One Playwright smoke test: demo loads and the canvas renders non-empty.
- A test or lint rule fails if `src/core/**` imports React.

## Context
- Repo is empty apart from `spec.md`, `README.md`, `LICENSE.md`, `CLAUDE.md`, `.gitignore`.
- Follow-up tickets that consume the seams you define: layout nid_djtlbgb2q5iipx2go9fy2eogc_e, branches/shapes/colors nid_u8rb9nyllrir2j6ditgfhu7uo_e, fonts/text nid_q5cs3lr79q1xa2ebtbny5exc9_e, edit protocol + view controller nid_5suxnngcwzcabej2vgrnytvx4_e, pointer interactions nid_m9bylgyu4bb098rqygf91vtuo_e, demo runner nid_k9s0fwfj8y13qhmkr2c2um043_e, reference screenshot nid_qgu2pl5p1q0spnndfwu9xe590_e. Shape the module layout so these touch mostly separate files.
- Libraries per spec §4: opentype.js, d3-hierarchy, React, TypeScript strict, Vite, Vitest, Playwright. Use npm.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.
- Keep the seams minimal (KISS): define what the follow-up tickets need, not speculative extras.

## Non-goals
- Real layout algorithm, tapered branches, glyph text, interactions, settings panel — owned by the follow-up tickets.
- rough.js sketch mode (spec §7, later).
