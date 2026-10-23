---
closed_iso: 2026-10-23T20:38:42Z
profile: higher
id: nid_z8ks1fhjsspq9jgdh0mxtv4sm_e
title: "Heading-friendly layout and labels: clockwise side order, minimum label size with ellipsis, emoji and non-Latin fallback"
status: closed
deps: []
links: []
created_iso: 2026-10-23T20:13:10Z
status_updated_iso: 2026-10-23T20:38:42Z
type: task
priority: 2
assignee: CC_WITH-nickolaykondratyev
parent: nid_rk795rjqzzksdjrhm03dy6s7l_e
tags: [obsidian-heading-launch]
---


## Goal

Part of epic `nid_rk795rjqzzksdjrhm03dy6s7l_e` (library ready for the Obsidian heading map of one note). Headings
have an order, are often long, and may contain emoji or non-Latin text that the handwritten label font (Kalam) lacks.
Make the map read in document order, keep long labels readable, and never show empty boxes for missing glyphs.

## Done criteria

- **Document-order layout:** a config option puts first-level nodes clockwise: the first half on the right, top to
  bottom, then the second half on the left, bottom to top, in data order. Explicit `side` values still win. The
  default stays today's alternating order. With an odd count the right side gets the extra node (as alternating
  does today); the halves are taken over the first-level nodes without an explicit `side`.
- **Long labels:** a node label never shrinks below a configurable minimum size; text that still does not fit ends
  with "…".
- **Emoji and non-Latin text** (decided by the human, 2026-10-23): when the label font lacks a glyph for some
  character of a label, that label is **not drawn on its branch**, and its **node label still shows every
  character**, using fallback fonts (the minimum size and "…" rule still apply). Labels the font fully covers render
  exactly as today.
- The new config options appear in the demo settings panel and survive `restoreConfig`.
- `spec.md` R17 notes the fallback exception (see Constraints). This ticket owns that spec note; the release
  ticket `nid_bjzc14tu7h3d3fjknqyfk17r5_e` only checks it.
- With default config the look is unchanged: `e2e/reference-view.spec.ts` passes without re-baselining.
  `npm run typecheck`, `npm test` and `npm run e2e` pass.

## Context

- First-level sides alternate right/left in data order: `src/core/model/tree.ts` (`alternatingSide`, `sideOf`).
  The layout reads sides from the tree; `src/core/layout/tidyTreeStage.ts` lays out each side.
- Pitfalls for clockwise: `buildTree(nodes)` takes no config today, so the option has to reach side assignment
  somehow (implementer's choice). `tidyTreeStage.ts` stacks a side's first-level nodes top to bottom in data
  order, so "left, bottom to top" means the left side's vertical order is reversed.
- Node labels shrink without limit: `src/core/text/labelLayout.ts` (`layoutNodeLabel`). Branch labels fit via the
  R15 cascade in `src/core/text/branchTextFit.ts`. Drawing: `src/core/render/labelRenderer.ts` (`drawLabels`,
  `nodeLabelInk`), `src/core/text/labelPainter.ts`.
- Fonts: `src/core/text/loadedFont.ts` (`LoadedFont.shape`, opentype.js), `src/core/text/cssFontFaces.ts` (registers
  the same font bytes as a CSS `FontFace`, used today by the inline rename editor).
- Node and branch fonts are configured separately (`config.text.node` / `config.text.branch`); check each label
  against the font that would draw it.
- Config: `src/core/config/config.ts` (`MindmapConfig`, `DEFAULT_CONFIG`). New numeric settings need a range in
  `demo/settings/settingSpecs.ts` `NUMBER_RANGES`, otherwise the build fails. `src/core/config/restoreConfig.ts`
  restores stored settings over defaults.
- Unit tests load the vendored Kalam via `test-support/vendoredKalam.ts`.
- Background: `next-steps-prior-to-obsidian.md` sections "0.5 Real-world labels" and "Phase 1" ("Order matters").

## Constraints

- `src/core/**` never imports React (`src/core/noReactImports.test.ts`).
- Default config keeps today's look; every new option is opt-in, so the reference screenshot does not change. Do not
  re-baseline it. (The emoji rule is not an option, but the reference data is fully covered by Kalam, so it does not
  change the screenshot.)
- Config stays plain serializable data (`MindmapConfig`).
- Fallback on nodes (approach approved by the human, 2026-10-23): draw such node labels with the canvas's own text
  drawing (`fillText`) and a CSS font list that starts with the label font, which `src/core/text/cssFontFaces.ts`
  already registers from the same bytes. The browser then uses the label font for the glyphs it has and system fonts
  (color emoji, CJK, Cyrillic) for the rest. This is a deliberate exception to spec R17 (outline-only text), only for
  labels the font cannot cover; note it in `spec.md` R17. Why not bundle fallback fonts: Noto CJK alone is many MB,
  and opentype.js cannot draw color emoji. Obsidian desktop is Chromium, so system fallback is reliable there.
- "Missing glyph" means the font maps the character to glyph 0 (`.notdef`) in `src/core/text/loadedFont.ts`.
  Joiners and variation selectors inside emoji sequences (U+200D, U+FE0F) and whitespace must not count as missing
  by themselves. Iterate by code point, not UTF-16 unit, so surrogate pairs are not split.
- Tests: Vitest BDD (`describe` GIVEN, `it` WHEN/THEN, one behavior per test) for the clockwise side rule (odd and
  even counts, explicit `side` mixed in), min size + "…" layout, and missing-glyph detection (Latin, emoji with
  ZWJ/FE0F, CJK, Cyrillic, whitespace). Playwright only if a key journey needs it; no look assertions.
- Update `docs/architecture.md` ("Labels" bullet under "Seams and their contracts") for the fallback path and the
  new options. Other `spec.md` updates (clockwise, minimum label size) are done in the release ticket.

## Non-goals

- Bundling fallback fonts, glyph-by-glyph fallback along branches, color emoji on branches.
- Wrapping node labels onto two lines.
- Showing the full text of a cut label on hover (needs the hover hook; later).
- Stripping Markdown from headings (the plugin does that).
