---
closed_iso: 2026-10-23T16:55:07Z
id: nid_4wj5flmx2zkrfeoiscr3sssdf_e
title: "Should a pushed dragged node carry its children along?"
status: closed
deps: []
links: []
created_iso: 2026-10-23T16:40:21Z
status_updated_iso: 2026-10-23T16:55:07Z
type: task
priority: 2
assignee: CC_WITH-nickolaykondratyev
tags: []
---


## Background
Came up while fixing nid_5plujgmcff5uhtr5xx0xcu5dl_e (repel force too strong / Sonetos overlapping Tragedia). Now, when two nodes you dragged overlap, the one dropped earlier moves aside and the latest drop stays put.

## The gap
Only the pushed node itself moves; its children stay where they are, and nodes inside the same dragged subtree never push each other. In a rare setup (node `a` with child `a1` right above it, then a later drop `b` pushes `a` upward) `a` can end up on top of its own child `a1`. Found by the reviewer with a throwaway test; not seen in real use yet.

## Options
- (a) Leave it. Rare, needs a specific arrangement. Reopen if it shows up in practice.
- (b) Let nodes inside the same dragged subtree push each other apart. Small change, but it changes the existing test "GIVEN two nodes of one pinned group overlapping each other ... neither pinned node moves", so it needs your sign-off.
- (c) Move the whole earlier subtree as one block. Cleanest look, but needs group-level collision (more complex).

## Recommendation
(a) for now. If you want it fixed, (b) is the Pareto pick.

## Decision (2026-10-23, human)
(a) Leave it as is. A pushed dragged node moves alone; its children stay where they are. Reopen (consider option (b)) if the parent-over-own-child overlap shows up in real use.
