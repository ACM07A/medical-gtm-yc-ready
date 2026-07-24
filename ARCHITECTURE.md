# Architecture

MedYatra is a zero-dependency Node HTTP server backed by SQLite through `node:sqlite`.

Core layers:

- `data-core/db.mjs`: legacy GTM schema, migrations and scoring helpers.
- `data-core/os_core.mjs`: MedYatra OS schema, deterministic seed, readiness and backup helpers.
- `server/server.mjs`: HTTP router and API surface.
- `server/os_pages.mjs`: hospital, agent, case, vendor, integration, audit and metrics views.
- `server/studio.mjs`: human approval studio with server-side gates.
- `lib/`: comms, safety, providers and agent helpers.

The default local database is `data-core/medyatra.db`. Docker sets `DATABASE_PATH=/app/runtime/medyatra.db` and persists it in a mounted volume.

Demo mode uses synthetic data, deterministic mock agents, local/dry-run adapters and permanent visual warnings. Production mode is blocked unless critical environment variables are present.
