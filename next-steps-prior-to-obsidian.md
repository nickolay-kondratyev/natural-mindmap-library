# Next steps before the Obsidian integration

Status: proposal (2026-10-23). Decided so far: desktop first; the first launch is the heading map of one note,
with move. Open questions are under "Decisions needed" at the end.

## TL;DR

The v1 library draws a hand-sized map well. Three things block real Obsidian use:

1. **Speed.** Building the map is roughly O(n²) and runs on **every paint** (hover, busy animation, ...).
   It is already too slow for a note with ~100 headings, and unusable for a folder.
2. **No way to hide parts of the map.** There is no collapse/expand, so a vault cannot be shown at all.
3. **Missing host hooks.** No "node clicked" event (open the note / jump to the heading), no right-click
   menu hook, no per-node rules (a file cannot have children), and no way to restore saved positions.

Order: fix speed -> host hooks -> **first launch: heading map of the active note, with move** -> collapse ->
other heading edits -> folder/vault map. Collapse only blocks the folder map; for one note it is a nice-to-have.

## Measured: where the time goes

`buildScene` on a synthetic vault-like tree (fan-out 8, default config, Node/Vitest, this machine):

| Nodes | `buildScene` |
|---|---|
| 50 | 19 ms |
| 200 | 232 ms |
| 500 | 1,443 ms |
| 1,000 | 5,877 ms |
| 2,000 | 23,494 ms |

Per stage at 1,000 nodes: tidy-tree 2 ms, bow + jitter 0 ms, collision 29 ms, **branch routing 5,885 ms**.
The cost is almost all in `src/core/geometry/branchRouting.ts` (its own comment names the ceiling:
O(branches² x samples²) for limb separation). One frame is 16 ms, and `CanvasInteractions.sceneToPaint`
rebuilds the scene every paint.

Good news: tidy tree and collision are cheap enough up to ~1,000 nodes, and building the tree index from
the flat data is cheap. **Cost follows the number of visible nodes, not the size of the data**, so collapse
plus fast routing covers large vaults without lazy loading.

## Phase 0: library work (this repo)

### 0.1 Speed (blocking for both modes)

- **Cache the scene.** Rebuild only when data, config, extensions or position overrides change, not on hover,
  pan, zoom or the busy animation. Biggest win for the least work.
- **Make branch routing scale.** Before comparing samples, skip limb pairs whose bounding boxes do not
  overlap, and look up nearby nodes through a grid instead of checking every node. Target: 500 visible nodes in
  well under 50 ms. Keep the current look; the reference screenshot guards it.
- **Skip what is off screen.** Do not draw nodes, limbs and labels outside the viewport.
- **Show less detail when zoomed out.** Below a zoom threshold, skip branch text (glyph outlines are the
  expensive part to draw, and the text is too small to read anyway).
- Collision grid (the upgrade path named in `collisionStage.ts`): only once maps go past ~1,000 visible nodes.
- Add a benchmark script (`npm run bench`, not a test gate) so regressions show up.

### 0.2 Host hooks (blocking)

- `onNodeActivate(nodeId, modifiers)`: a click opens the note or jumps to the heading. Modifiers let the
  host do "open in new tab" (Cmd/Ctrl-click). Needs a click-vs-double-click rule (double-click is rename today).
- `onNodeContextMenu(nodeId, screenPoint)`: the host shows Obsidian's own menu (rename, delete, reveal in
  file explorer). This is also the natural home for delete now that the "x" is being removed
  (ticket `nid_gbj85a2pad7yofsjnf7ng26ff_e`).
- `onNodeHover(nodeId | null, screenPoint)`: lets the host show Obsidian's page preview. Nice to have.
- `revealNode(nodeId)` (expand ancestors, pan to it) and `setHighlighted(nodeId | null)`: follow the
  active file, or the heading under the editor cursor.
- **Per-node rules.** Today every node accepts children, can be renamed, and is a drop target. In folder mode a
  file cannot have children; in heading mode the root (the file) cannot be deleted from the map. Add optional
  per-node flags (e.g. `canAddChild`, `canRename`, `canDelete`, `canMove`, `acceptsDrop`) checked in
  `findEditProblem` and by the hover "+" and drop highlight. Data flags beat a callback: plain, testable, and
  hosts already build the data.

### 0.3 Collapse / expand (blocking for folders, useful for long notes)

- The library hides the descendants of collapsed nodes **before layout**, so hidden nodes cost nothing.
- A collapsed node shows a small badge with the hidden count (e.g. `+12`); clicking it toggles.
- The collapsed set is view state, handled like the pan/zoom view: the library owns it, reports changes
  (`onCollapseChange`), and the host can hand back a saved set at mount and later.
- Config: `collapse.initialDepth` (e.g. show 2 levels of a folder, all levels of a note).
- **Wide folders** (300 files in one folder) make a column thousands of pixels tall even when expanded.
  Show the first K children plus one "+N more" node (`collapse.maxVisibleChildren`), and let clicking it show the rest.
  Do this second, after collapse, once we have seen real vaults.

### 0.4 Saved positions and collapsed state (needed before release)

Open ticket `nid_iexvo4oqwq038twvy9od9gm2b_e` (restore saved positions) was deferred until a real host
exists; that time is now. Proposal to keep the library simple:

- The library only knows `NodeId`. **The plugin owns identity**: file mode uses the path, heading mode uses
  `path#H1/H2/H3` plus an occurrence index for duplicate headings. When Obsidian reports a rename, the plugin
  remaps its saved entries. The "layered identity" (frontmatter `id` -> path -> name) from the ticket lives in
  the plugin, not here.
- Store positions as an **offset from the parent**, not as absolute map coordinates. Adding a heading
  shifts the whole auto layout, and absolute positions would then land in the wrong place.
- Same in/out shape for the collapsed set.

### 0.5 Real-world labels

- **Long labels.** Node text shrinks to fit (`layoutNodeLabel`), so a long file name becomes unreadably
  small. Add a minimum size, then cut with "…" (full text through the hover hook). Wrapping onto 2 lines
  can come later.
- **Missing glyphs.** Kalam has no emoji, CJK, Cyrillic, etc., and these are common in file names and
  headings. Support a fallback font list (glyph by glyph: first font that has the glyph wins). Without it,
  such labels show empty boxes.
- **Markdown in headings** (`[[links]]`, `**bold**`, `` `code` ``, tags): strip to plain text **in the plugin**.
  The library stays Markdown-free.

### 0.6 Fit for Obsidian (small items)

- **Light theme preset.** Spec R1 is dark-only, and white branch text on a light background is unreadable.
  Ship a light preset; the plugin picks one from Obsidian's mode and can map a few CSS variables.
- **Fonts offline.** Obsidian plugins should not fetch from a CDN (mobile, privacy, plugin review). The
  `fontFetcher` seam already allows it: the plugin bundles Kalam (48 KB) and returns the bytes.
- **Several maps at once.** Obsidian can show the map in several tabs. Check that two mounts share no
  state (module-level variables such as `dialogCount` in `reparentDialog.ts`), and add one E2E test that mounts two maps.
- **Touch.** Out of scope for now (decided: desktop first). Obsidian mobile has no wheel, so it would need pinch-to-zoom.
- **Dialogs and notices.** The library's own DOM dialog/notice work in Obsidian, but will not look native. Fine
  for now. Later we could let the host supply them (Obsidian `Modal` / `Notice`).
- **Settings screen.** Open decision `nid_kkm4447dku0vlz0ry1zwr2v8k_e`; option (b) (library exports the
  settings list, the plugin builds a native Obsidian settings tab) fits this plan.

### 0.7 Demo runner, so all of this is built and tested without Obsidian

- "Generate large map" (N nodes, fan-out, depth): for speed, collapse, and the "+N more" node.
- "Paste Markdown": turns headings into a map, so heading mode can be felt and tuned in the browser.
  Small throwaway parser in `demo/`; the plugin uses Obsidian's own heading list instead (duplication is fine,
  it is low-risk glue).

### 0.8 Packaging

- The plugin can use the **core only** (`mountMindmap` inside an Obsidian `ItemView`); no React needed there.
- esbuild in the plugin bundles our ESM `dist/` fine. Consume it as a git dependency on a tagged commit
  until the API settles; publish to npm later.
- Add a short CHANGELOG and start versioning (0.x) once the plugin depends on it.

## Phase 1: plugin, heading map of one note

Plugin-side (other repo), listed here so the library API is shaped for it.

**Mapping.** Root = the file name (or the single H1, if the note has exactly one). Each heading's parent is
the nearest heading above it with a lower level, so skipped levels (H1 -> H3) just attach to the H1. Text
before the first heading is ignored. Source: `metadataCache.getFileCache(file).headings` (level, text,
position), refreshed on the cache's `changed` event, debounced.

**First launch (decided): navigate + move.** Click jumps to the heading, the map follows the active note, the
heading under the cursor is highlighted, and dragging a node onto another heading moves that section in the
Markdown.

**Move, in the note.** Goes through the existing request -> confirm protocol (the library already sends `move`
and shows it as pending until the plugin confirms):
- **Section** = the heading line down to the next heading of the same or a higher level (or the end of the note).
  It carries its body and sub-headings.
- **Where it lands:** at the end of the new parent's section, as its last child.
- **Levels shift** by `(new parent level + 1) - moved heading level`, for every heading in the section. Dropping
  onto the root (the file) makes it a top-level heading, at the note's top level (the smallest level used in
  the note, not always H1).
- **Refuse, with a plain reason**, when a heading would go past H6 ("Too deep: Markdown headings stop at level 6").
  This needs no library change, since a rejected request shows its reason already.
- **Find headings through Obsidian's heading list, not a regex**, so `#` lines inside code blocks are never
  treated as headings.
- **The note may have changed since the map was drawn** (the heading list can lag behind typing). Before
  applying, check that the heading line at the cached position still has the expected text; if not, refuse
  ("The note changed, try again").
- **One undoable change:** one editor transaction when the note is open (one Ctrl-Z undoes the whole move),
  otherwise `vault.process`. Heading text does not change, so `[[note#heading]]` links keep working.
- Dropping onto the current parent changes nothing; the plugin confirms with unchanged data.
- **Not included: reordering siblings** (moving a heading up or down under the same parent). The library's
  `move` has no position yet. Users will likely want this soon after move ships (see decision 9).

**Other edits come after the first launch**, one at a time:

| Map edit | In the note |
|---|---|
| rename | rewrite the heading line. A plain text rewrite leaves `[[note#old heading]]` links broken; check whether Obsidian's own heading rename can be reused |
| add child | insert `#` x (level+1) heading at the end of the parent's section |
| delete | remove the section. Destructive with no trash, so do it through an editor transaction (Ctrl-Z works) or keep it off |

Until each one ships, the plugin turns it off with the per-node rules (0.2), so the "+" and rename are not offered.

**Things to settle for heading mode:**
- **Order matters.** In a note, sibling order is document order. Today first-level nodes alternate
  right/left/right in data order (`tree.ts`), which makes the document read zigzag. A "clockwise" option
  (first half right, top to bottom; second half left, bottom to top) reads in document order.
- **Live typing.** Every heading change re-runs auto layout, so nodes can jump while the user types. A debounce
  helps. Animating nodes to their new spots (phase 2) keeps the user oriented.

## Phase 2: plugin, folder / vault map

- **Never show the whole vault by default.** The root is a chosen folder (or the active file's folder),
  with "go up a level" and "open this folder as the root" (the plugin just passes a smaller data set; the
  library needs nothing new).
- Start collapsed below `initialDepth`; remember expanded folders per path.
- Sorting (folders first, then by name or modified date) and exclude patterns (attachments, templates,
  `.obsidian`) are plugin settings, applied before the data reaches the library.
- `revealNode` for "show the active file in the map".
- Edits map cleanly onto Obsidian's file API, which also updates links: rename = `fileManager.renameFile`,
  move = rename into the new folder, add = create a note (child of a folder only, enforced by the per-node rules),
  delete = `trashFile` (undo is the trash, as spec I4 intended).
- Later, if needed: "+N more" paging for huge folders, layout animation, and a combined view (folders ->
  files -> headings) using the same collapse.

## Decisions needed (with my recommendation)

1. ~~Read-only heading map first?~~ **Decided:** the first launch is the heading map with move.
2. **Click behavior.** Recommend: click = open/jump, double-click = rename, right-click = Obsidian menu.
3. ~~Mobile / touch in the first release?~~ **Decided:** desktop first. Pinch-zoom comes later.
4. **Saved positions relative to the parent (not absolute)?** Recommend yes.
5. **Light theme preset in phase 0?** Recommend yes (many Obsidian users run light mode).
6. **How the plugin gets the library.** Recommend a git dependency on tags for now, npm later.
7. **Settings screen** (`nid_kkm4447dku0vlz0ry1zwr2v8k_e`): recommend (b).
8. **First-level side order for headings:** recommend adding the "clockwise" option and using it in heading mode.
9. **Reorder siblings in the first launch?** Recommend no: ship move (change parent) first, then add reorder
   as the next step (an optional position on `move`, plus dropping between two siblings).
