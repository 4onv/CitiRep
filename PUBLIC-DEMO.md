# CitiRep public demo

https://4onv.github.io/CitiRep/

GitHub Pages publishes `docs/` from `codex/devpost-demo`. It does not depend on a local server or tunnel. Keep this branch and Pages enabled for the URL to remain available.

This is a read-only export of the official Waterloo seed: 417 records collected on November 12, 2026. Search runs in the visitor's browser and supports keyword/topic, document type, location and source filters. Full records and captured versions load on demand. Saved items remain in browser storage.

The Python backend and its SQLite FTS5 search remain in the source repository. The static demo uses simpler keyword ranking with title and tag boosts; it is not a hosted copy of the Python API. It does not accept uploads, create accounts, submit official comments, or send notifications. It does not automatically refresh city data.

## Refreshing the demo

1. Update the official-only seed through the backend's documented sync/export workflow.
2. Run `python scripts/export_public_demo.py`.
3. In `frontend`, install dependencies, set `VITE_PUBLIC_DEMO=true`, then run `npm run build -- --base=/CitiRep/`.
4. Replace `docs/` with the complete contents of `frontend/dist/`, retain `.nojekyll`, and push this branch.

Normal frontend builds without `VITE_PUBLIC_DEMO=true` still use the Python API.
