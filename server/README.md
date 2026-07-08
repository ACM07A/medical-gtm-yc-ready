# MedYatra backend + console

A zero-dependency local app (Node built-ins only) that makes the engine **tangible**: a live operator console, a runs/activity feed, and draft→landing rendering — all reading the live data core.

## Run it
```bash
node --experimental-sqlite server/server.mjs      # -> http://localhost:5173
```
Open **http://localhost:5173** in your browser. It auto-refreshes every 4s.

## What you see
- **KPIs** — markets, categories, partners (incl. latent/emerging), candidates, content coverage, POCs.
- **Content grid** — category × market heatmap. **Click any blue (draft) cell** to open that page's **landing preview** (the patient-facing draft, rendered) — this is the console ↔ landing link.
- **Runs — live feed** — every loop iteration (each GLM draft, POC pass, seed) appears here newest-first, with a `view` link to the draft it produced. This is "where do I see the runs."
- **Pipeline / margin candidates / named POCs** — supply side, live.

## Endpoints
`GET /console` · `GET /api/state` (JSON) · `GET /api/runs` (JSON) · `GET /draft/:id` (renders a content asset as a landing page; Arabic served RTL).

## How each loop iteration becomes visible
`gen_content.mjs` and `resolve_pocs.mjs` call `logRun(...)`, so as they run they write `run` rows + `content_asset` rows. The console is polling, so new drafts and activity **appear as they happen** — no rebuild, no re-publish. To reset the feed to the known history: `node --experimental-sqlite data-core/seed_runs.mjs`.

## Notes
- Runs on your machine at localhost — unlike the claude.ai artifacts (which are static snapshots and can't reach the data core).
- The server holds no secrets. Content generation (GLM key) is separate (`integrations/.env`).
