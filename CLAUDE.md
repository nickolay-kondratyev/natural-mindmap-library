Use typical best practices and idiomatic code.
Goal right now is to implement [spec.md](spec.md). Architecture and module seams: [docs/architecture.md](docs/architecture.md).

## Commands
- `npm install` — deps + Playwright Chromium (the `prepare` script runs `scripts/install-browsers.mjs`, skipped when Chromium is present).
- `npm run typecheck` · `npm test` (Vitest) · `npm run build` (library to `dist/`) · `npm run e2e` (Playwright).
- `npm run dev` — demo at `http://localhost:$PORT` (default 5173). `npm run build:demo && npm run preview` serves the built demo on `$E2E_PORT` (default 4173).

## Conventions
- Ports are env-driven so parallel checkouts do not collide: `PORT=5301 npm run dev`, `E2E_PORT=5311 npm run e2e`.
- `src/core/**` never imports React (a unit test enforces it). Demo/tests import `natural-mindmap` and `natural-mindmap/react` only.
- Tests: Vitest BDD (`describe` GIVEN, `it` WHEN/THEN), one behavior per test. Playwright only for key journeys, no look assertions except the one reference screenshot (`e2e/reference-view.spec.ts`, see docs/architecture.md "Acceptance screenshot").
- Tests never hit the network: E2E imports `test` from `e2e/fixtures.ts`; unit tests use `test-support/` (vendored font, synthetic curves).
- Redirect verbose output to `.tmp/` (git-ignored).
