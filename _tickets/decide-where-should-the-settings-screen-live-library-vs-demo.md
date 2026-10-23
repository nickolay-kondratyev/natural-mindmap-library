---
id: nid_kkm4447dku0vlz0ry1zwr2v8k_e
title: "Decide: where should the settings screen live (library vs demo)?"
status: open
deps: []
links: [nid_jwzqlvies2bizylbq7bhpieh4_e]
created_iso: 2026-10-23T16:55:34Z
status_updated_iso: 2026-10-23T16:55:34Z
type: task
priority: 3
assignee: nickolaykondratyev
tags: [decide, need-human]
---

## What needs deciding

Ticket nid_jwzqlvies2bizylbq7bhpieh4_e (settings storage) added a way for a host app (e.g. an Obsidian plugin) to save and load settings: the host implements `SettingsStorage { load(); save(settings) }` from `src/core/config/settingsPersistence.ts`.

The settings **screen** itself (the panel with sliders/pickers) still lives only in the demo app (`demo/`: `settingsModel.ts`, `settingSpecs.ts`, `configPath.ts` + a React panel). That ticket said "this library should own the settings in its UI". Moving the screen was too big to fold into the storage ticket, so it needs your call.

## Options

- **(a) Move everything into the library.** The plain-TypeScript settings list goes to core (`src/core/settings/`), the React panel goes to `natural-mindmap/react` and takes a `SettingsStorage`. Every host shows the exact same panel. Cost: we must decide how the library ships its CSS, and the public API grows.
- **(b) Move only the settings list (no screen).** The library exports the list of sections/fields (name, type, range, default). Obsidian builds its settings tab from that list using Obsidian's own `Setting` controls; the demo keeps its React panel. Looks native in Obsidian, no CSS/React shipped into Obsidian's settings tab.
- **(c) Leave as is.** Each host writes its own settings screen by hand.

## Recommendation

**(b)**: native-looking Obsidian settings, smallest change, the library still owns *which* settings exist and their rules. Pick (a) only if the panel must look identical everywhere.

Reply with a/b/c (or other); a follow-up implementation ticket will be created from your answer.

