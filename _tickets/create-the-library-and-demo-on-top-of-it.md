---
id: nid_hc65067veoxpca8wtir8bnj2e_e
title: "create the library and demo on top of it"
status: open
deps: []
links: []
created_iso: 2026-10-22T23:42:07Z
status_updated_iso: 2026-10-22T23:42:07Z
type: task
priority: 3
assignee: nickolaykondratyev
tags: []
---

Your task is to create the library and the demo to use it on top of the library according to `spec.md`.

You are going to act as top level orchestrator.

You are not going to be doing the work yourself, but rather delegating, see `${MY_DEEP_MEM}/workers-orchestration-rules.md` for rules regarding how to approach sub-agents.

Aim for testing pyramid: if you can test with unite tests prefer unit tests, and have later E2E tests in playwright. (still use playwright when dealing with UI portions even if it is with throw away code).

Retest prior to merging and pushing. 

Use playwright where necessary (install it during setup so it's readily available). 

Use `ticket` CLI to keep track of follow ups and work left to do, but you can also modify `spec.md` as you go along to know what needs to be done and what is completed.

Use `change_log` CLI and git commits liberally.

Use git work trees when implementing (tickets should help when you are doing parallel work as well).

