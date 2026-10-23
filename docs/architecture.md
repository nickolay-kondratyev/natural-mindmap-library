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

`mountMindmap(canvas, options)` owns the state (data, config, extensions, viewport) and the scheduler;
every setter just requests a repaint (spec L8).

## Modules (`src/core/`)

| Dir | Owns | Key names |
|---|---|---|
| `model/` | Host data types, tree index, reference data | `MindmapNode`, `buildTree` -> `MindmapTree` (depth, side, ancestry), `REFERENCE_DATA` |
| `config/` | Plain-data config + defaults + deep merge | `MindmapConfig`, `DEFAULT_CONFIG`, `resolveConfig`, `ThemeConfig` |
| `size/` | Single source of node sizes (R4) | `resolveNodeSizes(tree, config.node)` -> `NodeSizeMap` |
| `layout/` | Layout `type` union + stage pipeline + bow curve | `LayoutConfig`, `LayoutStage`, `LayoutContext`, `runLayoutPipeline`, `defaultLayoutStages`, `BowCurve` |
| `geometry/` | Shared branch path representation | `BranchPath { length, sampleAt(arcLength) -> { point, tangent } }`, `Branch`, `StraightPath` |
| `shape/` | Node shape seam (R2) | `NodeShape { draw, contains, rimPoint }`, `ellipseShape` |
| `color/` | Color strategy seam (R10/R11) | `ColorStrategy.resolve(tree, theme) -> NodeColorMap`, `parentDerivedColorStrategy` |
| `render/` | Scene assembly, canvas drawing, frame coalescing | `buildScene`, `drawScene`, `RepaintScheduler` |
| `extensions.ts` | Bundle of code-level extension points | `MindmapExtensions`, `DEFAULT_EXTENSIONS` |
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
- **Bow curve** (R21): `BowCurve(normalizedVerticalDistance 0..1) -> normalizedHorizontalOffset 0..1`.
- **Branch path** (R5/R12): arc-length parametrised so branch rendering (tapered outline) and
  text-along-curve (glyph placement) agree. Branches run center to center (R9); use
  `nodeShape.rimPoint` to find where the limb meets the node rim.
- **Node shape** (R2): `draw` paints fill + outline; `contains` is for hit testing; `rimPoint` for geometry.
- **Color strategy** (R10/R11): returns fill + outline per node id; root colors come from `theme.color.root`.
- **Node sizes** (R4): always read from `Scene.sizes` / `resolveNodeSizes`; never compute sizes elsewhere.

## Placeholders owned by follow-up tickets

- `layout/placeholderBilateralStage.ts`: grid layout -> tidy tree, bow, jitter, collision stages.
- `render/scene.ts` `straightBranches`: straight segments -> curved tapered geometry.
- `render/canvasRenderer.ts`: stroked lines and `fillText` labels -> filled limbs and glyph outlines.
- `mount.ts`: no interaction/edit protocol/view model yet; those add fields to `MountOptions`/`MindmapHandle`.

## Testing

- Unit (Vitest, node env, BDD naming): every module above has a sibling `*.test.ts`. Canvas drawing
  itself is not unit-tested; scene assembly and scheduling are.
- E2E (Playwright, Chromium): `e2e/` runs against the built demo served by `vite preview`.
