---
id: nid_jwzqlvies2bizylbq7bhpieh4_e
title: "settings storage plaggability"
status: open
deps: []
links: []
created_iso: 2026-10-23T16:47:06Z
status_updated_iso: 2026-10-23T16:47:06Z
type: task
priority: 3
assignee: nickolaykondratyev
tags: []
---

I am thinking that this library should retain ability to store the settings between the sessions for different use cases.

Hence, I am thinking it would be something like an interface that is injected that can be implemented by different consumers of this library to store the settings.

The main one to think about that would implement it in the future are Obsidian settings. I am thinking this library should own the settings in its UI so the main usage is that we are able to store the settings in some external implementor of the interface and load it up again. lets make sure our claude.md reflects this setting storage addition as well. 