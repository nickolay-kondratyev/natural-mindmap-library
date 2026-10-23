---
profile: standard
id: nid_bjzc14tu7h3d3fjknqyfk17r5_e
title: "Demo Paste Markdown mode and v0.2.0 release (docs, spec, git tag)"
status: open
deps: [nid_gbj85a2pad7yofsjnf7ng26ff_e, nid_t5ydqj1ar6fdjksdps0sk2e0g_e, nid_idiv2268vh6mpy2gbnkrjlgw6_e, nid_z8ks1fhjsspq9jgdh0mxtv4sm_e]
links: []
created_iso: 2026-10-23T20:13:10Z
status_updated_iso: 2026-10-23T20:13:10Z
type: task
priority: 2
assignee: CC_WITH-nickolaykondratyev
parent: nid_rk795rjqzzksdjrhm03dy6s7l_e
tags: [obsidian-heading-launch]
---


## Goal

Part of epic `nid_rk795rjqzzksdjrhm03dy6s7l_e` (library ready for the Obsidian heading map of one note). Let the
heading map be tried and tuned in the browser without Obsidian, then cut a version the plugin repo can depend on.
This is the closing ticket: it runs after the "+" fix, speed, host hooks and the layout/label work have merged.

## Done criteria

- **Demo:** the runner can take pasted Markdown and show its headings as the map (parser in `demo/` only). Mapping,
  as the plugin will do it: root = a fixed note title (the demo has no file name; e.g. "Pasted note"), or the single
  H1 if the text has exactly one; each heading's
  parent is the nearest heading above it with a lower level (skipped levels attach to that heading); text before the
  first heading is ignored; `#` lines inside fenced code blocks are not headings. Going back to the reference map
  stays possible ("Reset map").
- **Release:** `docs/architecture.md` and `spec.md` describe the new API and options from the sibling tickets (click
  callback, highlight, center on node, move-only switch, clockwise order, minimum label size, emoji / non-Latin
  fallback). The R17 exception and the `docs/architecture.md` sections for each feature are written by the sibling
  tickets; this ticket fills the remaining `spec.md` gaps and checks the whole is consistent. `package.json` version and a short `CHANGELOG.md` match the tag, and a **local**
  annotated git tag (e.g. `v0.2.0`) marks the commit the plugin can depend on. The tag is **not pushed**: pushing
  it (and the branch) is left to the human. The done note names the tagged commit.
- With default config the look is unchanged: `e2e/reference-view.spec.ts` passes without re-baselining.
  `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` pass on the tagged commit.

## Context

- Demo runner: `demo/App.tsx`, `demo/MapControls.tsx`, host state in `demo/host/demoHost.ts` (`useDemoHost`, owns
  the data like a real host; "Reset map" restores `REFERENCE_DATA` and remounts via `key`). Settings panel is
  generated from `DEFAULT_CONFIG` (`demo/settings/settingsModel.ts`). Docs: `docs/architecture.md` "Demo runner".
- The demo and E2E import only `natural-mindmap` and `natural-mindmap/react` (public API, spec D1).
- Heading mapping rules come from `next-steps-prior-to-obsidian.md` section "Phase 1"; the plugin uses Obsidian's own
  heading list, so the demo parser is throwaway glue (duplication is fine).
- Packaging notes: `next-steps-prior-to-obsidian.md` section "0.8 Packaging" (git dependency on a tagged commit, no npm
  publish yet). Current version in `package.json` is `0.1.0`; no git tags exist yet.

## Constraints

- No Markdown knowledge in `src/`: the heading parser lives only in `demo/`.
- `src/core/**` never imports React. Default config look unchanged.
- Tests: Vitest BDD unit tests for the parser (`describe` GIVEN, `it` WHEN/THEN, one behavior per test: nesting,
  skipped levels, single H1 as root, text before the first heading, code fences). One Playwright journey: paste
  Markdown, the map shows its headings (assert via `window.mindmap` / data, not pixels). E2E imports `test` from
  `e2e/fixtures.ts`.
- Create the tag locally only; never `git push` the tag. If the work lands through a merge, tag the commit that
  ends up on the target branch, so the tag is not left on an unmerged branch commit.

## Non-goals

- "Generate large map" demo mode, folder mode, npm publishing.
- Moving sections in the pasted Markdown (the plugin does Markdown edits).
