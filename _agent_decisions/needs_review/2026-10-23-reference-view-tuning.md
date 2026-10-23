# Reference view tuning (ticket nid_qgu2pl5p1q0spnndfwu9xe590_e)

Screenshots (git-ignored, lane worktree `.worktree/t-qgu2pl5p/.out/`):
- before (main defaults, 1400x900): `.out/merge-batch-5.png` at the repo root; outer leaves cut off.
- after fit-to-content only: `.out/before-fit-only.png`
- after tuning: `.out/iter2-fork-from-edge.png` = committed baseline `e2e/reference-view.spec.ts-snapshots/reference-view-chromium-linux.png`,
  also copied to `<repo>/.out/reference-view-after.png`.

## Judgement calls

1. **Fit-to-content never enlarges past zoom 1** (`FIT_MAX_ZOOM`). A tiny map blown up to fill a wide canvas
   looks wrong; shrinking large maps so they are visible is the goal. Alternative: fit both ways. Recommendation: keep.
2. **Fit only once (first sized paint) and on `resetView()`**; data changes and resizes leave the view alone so
   an edit never yanks the map around under the user. Alternative: re-fit on resize while the user has not
   touched the view. Recommendation: keep; revisit if hosts ask.
3. **Fit margin is a constant (48 px), not config.** Not a "look" parameter of the map itself; keeps the config
   surface small. Alternative: `config.view.fitMarginPx`. Recommendation: keep until a host needs it.
4. **`branch.rootWidth` 40 -> 60** so a root limb is about as thick as a first-level node is tall (50 px) where
   it leaves the root rim (measured ~30 px before, ~45 px after; the eased taper thins it before the rim).
5. **`layout.horizontalGap` 140 -> 120**: the map was 1490 px wide and very flat, so fit shrank everything to
   0.87; 120 keeps every branch label at its full 18 px (longest first-level span still ~180 px) and lands
   closer to zoom 1.
6. **Fork distance measured from the parent's edge, not its center** (`branchGeometry.ts`). Before, the shared
   first control point of sibling curves sat on the parent rim for leaves, so Hamlet/Othello read as two
   separate lines (spec §8 "Forks"). Now every parent shows a short shared trunk before the Y. Side effect: root
   limbs stay bundled a little longer; first-level labels still read fine on the overlap. This is a geometry
   constant change, not a config default; the fraction (1/phi^2) is unchanged.
7. **Branch text size left at 18 px** (= node text). Measured: no reference label is shrunk by the fit cascade;
   the "smaller" impression came from the thin outline and the slant, not the size. Spec says "about the same".
8. **Reference page has no React** (`demo/reference.ts` calls `mountMindmap` directly) so the baseline cannot
   be broken by demo chrome and the host bootstrap is minimal; it still uses only the public API (D1).
