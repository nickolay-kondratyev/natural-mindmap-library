---
id: nid_iexvo4oqwq038twvy9od9gm2b_e
title: "Let hosts restore saved node positions"
status: open
deps: []
links: []
created_iso: 2026-10-23T01:11:55Z
status_updated_iso: 2026-10-23T01:11:55Z
type: task
priority: 3
assignee: CC_WITH-nickolaykondratyev
tags: [mindmap-v1, decide]
---

## Goal
Hosts like Obsidian need dragged node positions to survive a reload. Today the library reports repositions via the position-change event (spec I2) but offers no way to hand saved positions back, so every reload snaps nodes back to auto layout.

## Decision needed
Is this worth doing before a real host (e.g. Obsidian plugin) exists? Options: (a) add it now; (b) wait until a host needs it. Recommendation: (b) — the demo has no persistence, so nothing exercises it yet (Pareto). See `_agent_decisions/needs_review/2026-10-22-v1-ticket-plan-decisions.md` item 2.

## Done criteria
- Hosts can pass saved positions (by node id) at mount and update them later via the public API and `<Mindmap>` props; layout honors them as overrides; positions for unknown ids are ignored.
- Unit tests cover override application and unknown ids.

## Context
- Position overrides already exist internally: `src/core/layout/positionOverrides.ts`; reposition event type in `src/core/interaction/`; mount in `src/core/mount.ts`; React wrapper `src/react/Mindmap.tsx`.

## Non-goals
- Library-side persistence or storage.
