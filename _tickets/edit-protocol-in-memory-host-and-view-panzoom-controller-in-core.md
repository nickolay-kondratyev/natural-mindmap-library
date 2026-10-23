---
id: nid_5suxnngcwzcabej2vgrnytvx4_e
title: "Edit protocol, in-memory host and view (pan/zoom) controller in core"
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
pwd: /home/nickolaykondratyev/git_repos/nickolay-kondratyev_natural-mindmap-library/.worktree/t-5suxnngc
---
## Goal
The core interaction contract that lets hosts like Obsidian back nodes with real files: structural edits go through a typed request -> confirm protocol, plus a library-local view (pan/zoom) model — all in core, unit-tested without rendering (I1, I5, I6, Q4).

All requirement ids (R*, L*, Q*, I*, D*) refer to `spec.md` at the repo root; read the referenced sections in full.
Architecture, module boundaries and the commands to build/test are in `docs/architecture.md` and `CLAUDE.md` (created by the scaffold ticket nid_spbntjy1m5mjtuzwhraxzd8h1_e); follow them and keep them current when you change a seam.

## Done criteria
- Typed edit requests `move` (reparent), `add`, `rename`, `delete` sent to a host handler returning a Promise (I5.1).
- Edit session state: while pending, the intended result is exposed as a pending preview and all further edits are blocked, view actions still allowed (I5.2); resolved -> library renders the host's updated data and never applies the structural change itself (I5.3, L2); rejected -> preview dropped, prior state restored, host reason exposed in plain language, typed input (e.g. new label) kept for retry (I5.4).
- Move validation: dropping onto self or own descendant refused before any request is sent (I3).
- Default in-memory host that confirms immediately (I6), and supports configurable delay and rejection so the demo can simulate them (D5).
- View model: pan, cursor-anchored wheel zoom (point under cursor stays put), zoom in/out/reset API, host can read/set the view (I1). Reposition events for node drags are reported as events, no confirmation (I2) — define the event type here.
- Unit tests (Q4): pending blocks edits, confirm renders host data, reject restores prior state and keeps typed input, self/descendant drop refused, zoom anchor invariant, in-memory host delay/reject.
- Wired into the mount entry point and `<Mindmap>` props/callbacks (host handler, view get/set, events).

## Context
- Seams from nid_spbntjy1m5mjtuzwhraxzd8h1_e: see `docs/architecture.md`. Pointer/DOM wiring (drag, drop highlight, + button, inline rename) is nid_m9bylgyu4bb098rqygf91vtuo_e; this ticket supplies the state and API it drives.

## Constraints
- Testing pyramid: logic is unit-tested (Vitest, BDD GIVEN/WHEN/THEN, one behavior per test). Playwright E2E only for key UI journeys, no CSS/look assertions except the single reference screenshot owned by nid_qgu2pl5p1q0spnndfwu9xe590_e.
- `src/core/**` never imports React.
- No library-side timeout for pending requests (I5).

## Non-goals
- Undo for delete (host's job, I4).
