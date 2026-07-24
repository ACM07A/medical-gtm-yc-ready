# Architecture

CanopusCare is a lightweight Node HTTP server backed by SQLite through `node:sqlite`.

Core layers:

- `data-core/db.mjs`: canonical GTM and demand-generation schema, migrations and scoring helpers. `lead` is the canonical pre-operations patient record.
- `data-core/os_core.mjs`: CanopusCare operations schema, deterministic seed, readiness and backup helpers. `patient_case` is an operational projection linked through `source_lead_id`.
- `server/server.mjs`: HTTP router and API surface.
- `server/os_pages.mjs`: hospital, agent, case, vendor, integration, audit and metrics views.
- `server/studio.mjs`: human approval studio with server-side gates.
- `lib/`: comms, safety, providers and agent helpers.

The default local database remains `data-core/medyatra.db`, and the own-acquisition tenant key remains `medyatra`. These are migration-stable internal identifiers retained to avoid breaking existing databases and integrations; all product-facing identity is CanopusCare. Docker sets `DATABASE_PATH=/app/runtime/medyatra.db` and persists it in a mounted volume.

## Lead-to-case boundary

`lead` owns acquisition source, market/category routing, consent and journey state. `patient_case` owns multi-organization operations, documents, hospital review, estimates, vendors, approvals and audit.

- Every OS case has a `source_lead_id`.
- Case APIs expose a minimized `source_lead` projection.
- The case UI links to the journey orchestrator.
- A journey run updates the linked case stage and writes a case audit event.

This is a one-way operational projection. GTM records are not duplicated into a second unlinked patient universe.

## Dependency boundary

The HTTP server and deterministic data core use only Node built-ins and boot without `node_modules`. `puppeteer-core` remains an optional generation dependency for browser-rendered media. Demo seeding skips browser work unless `SEED_BROWSER=1` and a browser executable is available.

Demo mode uses synthetic data, deterministic mock agents, local/dry-run adapters and permanent visual warnings. Production mode is blocked unless critical environment variables are present.
