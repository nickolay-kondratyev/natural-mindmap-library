# natural-mindmap

Mindmap library for the web that feels hand-drawn: framework-free TypeScript core plus a thin React wrapper.
Requirements live in [spec.md](spec.md); architecture in [docs/architecture.md](docs/architecture.md).

## Use

```tsx
import { REFERENCE_DATA } from 'natural-mindmap';
import { Mindmap } from 'natural-mindmap/react';

<Mindmap data={REFERENCE_DATA} config={{ theme: { color: { background: '#101418' } } }} />;
```

Without React: `mountMindmap(canvas, { data })` returns a handle with `setData`, `setConfig`, `setExtensions`, `resize`, `destroy`.

## Develop

```bash
npm install         # deps + Playwright Chromium (postinstall)
npm run dev         # demo on http://localhost:5173 (PORT=... to change)
npm run typecheck && npm test && npm run build
npm run e2e         # builds the demo, serves it on E2E_PORT (default 4173), runs Playwright
```
