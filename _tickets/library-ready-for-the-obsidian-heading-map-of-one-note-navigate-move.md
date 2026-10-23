---
id: nid_rk795rjqzzksdjrhm03dy6s7l_e
title: "Library ready for the Obsidian heading map of one note (navigate + move)"
status: open
deps: [nid_gbj85a2pad7yofsjnf7ng26ff_e, nid_t5ydqj1ar6fdjksdps0sk2e0g_e, nid_idiv2268vh6mpy2gbnkrjlgw6_e, nid_z8ks1fhjsspq9jgdh0mxtv4sm_e, nid_bjzc14tu7h3d3fjknqyfk17r5_e]
links: [nid_gbj85a2pad7yofsjnf7ng26ff_e]
created_iso: 2026-10-23T20:02:16Z
status_updated_iso: 2026-10-23T20:02:16Z
type: epic
priority: 2
assignee: CC_WITH-nickolaykondratyev
tags: [obsidian-heading-launch]
---

## Goal

The first Obsidian launch (decided by the human, 2026-10-23) is a **heading map of one note**, desktop only. The plugin
lives in another repo. Its root is the note, each heading is a node, clicking a node jumps to that heading, the map
follows the editor cursor, and dragging a node onto another heading moves that section in the Markdown. This epic is
the library work that launch needs, so the plugin can be built on the public API alone.

The plugin does the Markdown work itself (it maps the library's existing `move` request onto a section cut/paste). The
library stays Markdown-free.

This epic is the plan; it is split into the child tickets listed under "Children".

## Done criteria

- **Speed:** hover, pan, zoom and the busy animation do not rebuild the scene; a unit test proves the rebuild happens
  only when data, config, extensions or position overrides change. A benchmark script (`npm run bench`, not a test gate)
  reports `buildScene` times, and 500 nodes take under 50 ms on the dev machine (today: 200 nodes = 232 ms,
  1,000 = 5.9 s).
- **Click:** a click on a node (press and release without a drag) reports the node id and modifier keys to the host
  through `MountOptions` and a `<Mindmap>` prop. Drags, pans, and clicks on hover buttons do not report it.
- **Follow the cursor:** the host can highlight one node (or none) and center the view on a node, through
  `MindmapHandle` and the `<Mindmap>` ref.
- **Move-only maps:** config can turn off add, rename and delete. When they are off, the map shows no "+" or "x", and a
  double-click does not open the rename editor. Move (drag onto a node) still works through the confirm protocol.
- **Document-order layout:** a config option puts first-level nodes clockwise: the first half on the right, top to
  bottom, then the second half on the left, bottom to top, in data order. Explicit `side` values still win.
- **Long labels:** a node label never shrinks below a configurable minimum size; text that still does not fit ends with "…".
- **Emoji and non-Latin text** (decided by the human, 2026-10-23, since headings may contain both): when the label font
  lacks a glyph for some character of a label, that label is **not drawn on its branch**, and its **node label still
  shows every character**, using fallback fonts. Labels the font fully covers render exactly as today.
- **Demo:** the runner can take pasted Markdown and show its headings as the map (parser in `demo/` only), so the
  heading map can be tuned without Obsidian.
- **Release:** `docs/architecture.md` and `spec.md` describe the new API and options, and a git tag (e.g. `v0.2.0`)
  marks a version the plugin can depend on.
- With default config the look is unchanged: `e2e/reference-view.spec.ts` passes without re-baselining.
  `npm run typecheck`, `npm test` and `npm run e2e` pass.

## Context

- Full rationale, measurements and the folder-map items that are out of scope: `next-steps-prior-to-obsidian.md`
  (sections "Library work for the first launch" and "Phase 1").
- Scene rebuilt every paint: `src/core/interaction/canvasInteractions.ts` `sceneToPaint` (its comment names the ceiling).
- The cost is almost all branch routing: `src/core/geometry/branchRouting.ts` (O(branches² x samples²) separation). At
  1,000 nodes, routing takes 5,885 ms, collision 29 ms and tidy-tree 2 ms.
- Host API: `src/core/mount.ts` (`MountOptions`, `MindmapHandle`), `src/react/Mindmap.tsx` (props, `MindmapApi` ref).
- Hover buttons and double-click rename: `src/core/interaction/canvasInteractions.ts`, `src/core/interaction/hitTest.ts`.
- First-level sides alternate right/left in data order: `src/core/model/tree.ts` (`alternatingSide`).
- Node labels shrink without limit: `src/core/text/labelLayout.ts` (`layoutNodeLabel`).
- The demo settings panel is generated from `DEFAULT_CONFIG` (`demo/settings/settingsModel.ts`). New numeric settings
  need a range in `demo/settings/settingSpecs.ts` `NUMBER_RANGES`, otherwise the build fails.
- Child ticket `nid_gbj85a2pad7yofsjnf7ng26ff_e` ("+" hides too early; remove the "x" for now) is part of this epic. It touches the
  same hover buttons; keep the two consistent.

## Constraints

- `src/core/**` never imports React (`src/core/noReactImports.test.ts`).
- Default config keeps today's behavior and look. Every new option is opt-in, so the reference screenshot does not change.
- Config stays plain serializable data (`MindmapConfig`). Event callbacks go on `MountOptions` and `<Mindmap>` props,
  the same way `onNodeReposition` does.
- No Markdown knowledge in `src/`: the heading parser exists only in `demo/`. The plugin uses Obsidian's own heading list.
- Fallback on nodes (approach approved by the human, 2026-10-23): draw such node labels with the canvas's own text
  drawing (`fillText`) and a CSS font list that starts with the label font, which `src/core/text/cssFontFaces.ts`
  already registers from the same bytes. The browser then uses the label font for the glyphs it has and system fonts
  (color emoji, CJK, Cyrillic) for the rest. This is a deliberate exception to spec R17 (outline-only text), only for
  labels the font cannot cover; note it in `spec.md` R17. Why not bundle fallback fonts: Noto CJK alone is many MB,
  and opentype.js cannot draw color emoji. Obsidian desktop is Chromium, so system fallback is reliable there.
- "Missing glyph" means the font maps the character to glyph 0 (`.notdef`) in `src/core/text/loadedFont.ts`. Joiners
  and variation selectors inside emoji sequences (U+200D, U+FE0F) and whitespace must not count as missing by themselves.

## Planned split (child tickets, one session each)

1. **Speed:** scene cache, faster branch routing, `npm run bench`.
2. **Host hooks for navigation:** click event, highlight, center on node, the switch that turns off add, rename and
   delete. Settle the click rule with ticket `nid_gbj85a2pad7yofsjnf7ng26ff_e` in mind.
3. **Heading-friendly layout and labels:** clockwise side order, minimum label size plus "…", emoji / non-Latin
   handling (hide on the branch, fallback fonts on the node).
4. **Demo "Paste Markdown" + release:** demo mode, docs, git tag. Depends on 1-3.

0. **Existing ticket `nid_gbj85a2pad7yofsjnf7ng26ff_e`:** make the "+" reachable and remove the "x" for now. Do it
   before or together with 2, since both change the hover buttons.

0, 1 and 3 are independent and can run in parallel; 2 builds on 0.

## Non-goals

- Collapse / expand, drawing only what is on screen, less detail when zoomed out: folder map, later.
- Right-click hook, per-node rules (e.g. a file cannot have children): folder map, later. A global switch is enough
  for one note.
- Saved positions: ticket `nid_iexvo4oqwq038twvy9od9gm2b_e`, deferred by the human.
- Reordering siblings (a position on `move`): next step after the launch (decision 9).
- Touch / pinch-zoom (desktop first), light theme, the settings screen (ticket `nid_kkm4447dku0vlz0ry1zwr2v8k_e`).
- The Obsidian plugin itself and its Markdown move logic; npm publishing.
