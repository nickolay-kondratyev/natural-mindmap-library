# Architecture

One npm package, two entry points:

- `natural-mindmap` (`src/index.ts` -> `src/core/`): framework-free TypeScript. **Never imports React**
  (guarded by `src/core/noReactImports.test.ts`).
- `natural-mindmap/react` (`src/react/`): `<Mindmap>` component that mounts the core onto a canvas and
  syncs size / device pixel ratio with a `ResizeObserver`.

The demo (`demo/`) and E2E tests import only those two names (Vite/Vitest alias in `vite.shared.ts`),
so they prove the public API is sufficient (spec D1).

## Data flow (one paint)

```
host data (flat MindmapNode[])      PartialMindmapConfig        Partial<MindmapExtensions>
          |                                 |                              |
     buildTree()                      resolveConfig()              resolveExtensions()
          v                                 v                              v
   MindmapTree ---------------------> buildScene() <----------------------'
                 resolveNodeSizes() -> runLayoutPipeline(stages) -> colorStrategy.resolve() -> branches
                                            |
                                         Scene
                                            v
                                drawScene(ctx, scene, viewport)   <- RepaintScheduler (1 paint / frame)
```

`mountMindmap(canvas, options)` owns the state (edit session, config, extensions, viewport, view) and the
scheduler; every setter just requests a repaint (spec L8). The painted data is `EditSession.displayData`
(pending preview, else host-confirmed data) and `drawScene` applies the `ViewController` pan/zoom.

## Modules (`src/core/`)

| Dir | Owns | Key names |
|---|---|---|
| `model/` | Host data types, tree index, reference data | `MindmapNode`, `buildTree` -> `MindmapTree` (depth, side, ancestry), `REFERENCE_DATA` |
| `config/` | Plain-data config + defaults + deep merge | `MindmapConfig`, `DEFAULT_CONFIG`, `resolveConfig`, `ThemeConfig` |
| `size/` | Single source of node sizes (R4) | `resolveNodeSizes(tree, config.node)` -> `NodeSizeMap` |
| `layout/` | Layout `type` union + stage pipeline + bow curve + default stages | `LayoutConfig`, `LayoutStage`, `LayoutContext`, `runLayoutPipeline`, `defaultLayoutStages`, `layoutMindmap`, `BowCurve`, `tidyTreeStage`, `rootBowStage`, `handDrawnJitterStage`, `collisionStage` / `resolveCollisions` |
| `geometry/` | Branch path representation + limb geometry | `BranchPath { length, sampleAt(arcLength) -> { point, tangent } }`, `Branch { path, width }`, `CubicBezierPath`, `buildBranches` (curves + fork + routing), `taperedOutline` |
| `shape/` | Node shape seam (R2) | `NodeShape { draw, contains, rimPoint }`, `ellipseShape` |
| `color/` | Color strategy seam (R10/R11) | `ColorStrategy.resolve(tree, theme) -> NodeColorMap`, `parentDerivedColorStrategy` |
| `render/` | Scene assembly, canvas drawing, frame coalescing | `buildScene`, `drawScene`, `drawLabels`, `RepaintScheduler` |
| `text/` | Font loading + glyph-outline labels (R12-R18, L6) | `LabelFontLoader` / `FontStore` (`FontFetcher` seam), `LoadedFont.shape`, `rimToRimSpan`, `fitBranchText`, `layoutBranchLabel`, `layoutNodeLabel`, `paintLabel` |
| `extensions.ts` | Bundle of code-level extension points | `MindmapExtensions`, `DEFAULT_EXTENSIONS` |
| `edit/` | Request -> confirm protocol (I5), default host (I6) | `EditRequest`, `EditHandler`, `EditSession`, `findEditProblem`, `applyEdit`, `InMemoryHost` |
| `view/` | Library-local pan/zoom (I1) | `MindmapView`, `ViewController` |
| `interaction/` | Interaction event types (I2) | `NodeRepositionEvent` |
| `mount.ts` | Imperative entry point | `mountMindmap` -> `MindmapHandle` |

## Config vs extensions

- `MindmapConfig` is **plain serializable data** (theme colors, node sizing, branch width/taper, text
  fonts, layout numbers). All optional for hosts; `resolveConfig` deep-merges over `DEFAULT_CONFIG`
  (objects merge, arrays such as the palette are replaced). A settings panel can be generated from its shape.
- `MindmapExtensions` holds **functions/objects** composed in by the host: `layoutStages`
  (`null` = defaults for the configured layout type), `bowCurve`, `nodeShape`, `colorStrategy`.

## Seams and their contracts

- **Layout pipeline** (L5/L7): `LayoutStage.run(positions, context) -> positions` is pure; stages read
  `context.tree`, `context.sizes`, `context.config` (the `LayoutConfig` variant) and `context.bowCurve`.
  `defaultLayoutStages(config)` switches exhaustively on `config.type`; adding a layout `type` means
  extending the union in `layout/layoutConfig.ts` and the switch in `layout/pipeline.ts`.
  Scene coordinates: root at `(0, 0)`, +x right, +y down; the renderer centers the root in the viewport.
  Bilateral defaults, in order: `tidy-tree` (d3-hierarchy per side, size-aware edge gaps; creates positions),
  `root-bow` (shifts each first-level subtree outward by `bowCurve`), `hand-drawn-jitter` (offset hashed from
  the node id, so deterministic and stable under edits), `collision` (push-apart, root pinned).
  `layoutMindmap(data, { config, extensions })` is the standalone data-in -> positions-out entry (L7).
- **Collision** (R23/I2): `resolveCollisions(positions, { tree, sizes, padding, pinnedIds })` is reusable outside
  the pipeline (drag-time push-apart pins the dragged subtree); the root is always pinned.
- **Bow curve** (R21): `BowCurve(normalizedVerticalDistance 0..1) -> normalizedHorizontalOffset 0..1`.
- **Branch path** (R5/R12): arc-length parametrised so branch rendering (tapered outline) and
  text-along-curve (glyph placement) agree. Branches run center to center (R9); use
  `nodeShape.rimPoint` to find where the limb meets the node rim.
- **Branch geometry** (R5-R9): `buildBranches({ tree, positions, sizes, config.branch })` is pure. Each limb is a
  cubic that leaves the parent horizontally through a fork point shared by all siblings (soft Y), settles
  horizontally into the child, then `branchRouting.ts` nudges its inner control points vertically away from
  unrelated node boxes and from overlapping limbs (simple separation, not physics). `Branch.width` is the
  start/end thickness (`rootWidth * widthPerLevel^(level-1)`, end = `taper` of start); `taperedOutline(branch,
  asymmetry)` turns it into the polygon the renderer fills, with a hash-of-child-id-seeded one-sided bulge (R7).
- **Node shape** (R2): `draw` paints fill + outline; `contains` is for hit testing; `rimPoint` for geometry.
- **Color strategy** (R10/R11): returns fill + outline per node id; root colors come from `theme.color.root`.
- **Node sizes** (R4): always read from `Scene.sizes` / `resolveNodeSizes`; never compute sizes elsewhere.
<<<<<<< HEAD
- **Fonts** (L5/L6): `MountOptions.fontFetcher(url) -> Promise<ArrayBuffer>` is the I/O seam (default `fetch`;
  hosts holding bytes return them). `FontStore` loads each URL once; `LabelFontLoader` follows
  `config.text.{node,branch}.url`, repaints on settle and reports `{ node, branch }` status via
  `onFontStatusChange` / `handle.fontStatus()`. A font that is loading or failed is `null` for the paint, so
  its text is skipped, never thrown.
- **Labels** (R12-R17): text is shaped once per font+string into em outlines + advances, then laid out by pure
  functions (`text/labelLayout.ts`) and inked from outlines (never `fillText`). Branch labels sit between the
  rims (`rimToRimSpan` bisects `nodeShape.contains` along the `BranchPath`), flip when the path heads left,
  and fit via the R15 cascade in `text/branchTextFit.ts`.

## Placeholders owned by follow-up tickets

- `layout/placeholderBilateralStage.ts`: grid layout -> tidy tree, bow, jitter, collision stages.
- `render/scene.ts` `straightBranches`: straight segments -> curved tapered geometry.
- `render/canvasRenderer.ts`: stroked lines -> filled limbs.
- `mount.ts`: no interaction/edit protocol/view model yet; those add fields to `MountOptions`/`MindmapHandle`.
=======
- **Edit protocol** (I5): `EditHandler(request, currentData) -> Promise<MindmapData>`. Resolve with the
  host's updated data (rendered as-is; the library never applies the change to confirmed data, L2); reject
  with an `Error` whose message is a plain-language reason. `EditSession.submit` refuses up front (no request
  sent) when `findEditProblem` objects (self/descendant drop, unknown node, delete root) or another edit is
  pending; view actions stay available. While pending, `preview` is derived from the current confirmed data
  (`add` uses `PENDING_NODE_ID`; `delete` keeps the subtree visible); `rejected` keeps the request for retry.
  No library-side timeout. `applyEdit` is the pure apply used by `InMemoryHost` and the preview.
- **View** (I1): `screen = viewportCenter + offset + zoom * scene` (CSS px). `ViewController` reports
  user-driven changes (pan, cursor-anchored zoom, API zoom/reset) via `onViewChange`; host `setView` is not echoed.

## Placeholders owned by follow-up tickets

- `render/canvasRenderer.ts`: `fillText` labels -> glyph outlines.
- `mount.ts`: no pointer/DOM wiring yet (pan drag, wheel, node drag/drop, "+" button, inline rename);
  the interaction ticket drives `ViewController` / `EditSession` from it, emits `onNodeReposition`, and
  shows `EditSession.preview` as pending (dimmed) plus the rejection reason.
>>>>>>> origin/main

## Testing

- Unit (Vitest, node env, BDD naming): every module above has a sibling `*.test.ts`. Canvas drawing
  itself is not unit-tested; scene assembly and scheduling are.
- E2E (Playwright, Chromium): `e2e/` runs against the built demo served by `vite preview`. Import `test`
  from `e2e/fixtures.ts`: it aborts non-localhost requests and serves `*.ttf` from the vendored font.
- Vendored Kalam (`assets/fonts/kalam/`, SIL OFL) is the same file as the default Fontsource URL; unit tests
  read it via `test-support/vendoredKalam.ts`, so no test hits the network.
