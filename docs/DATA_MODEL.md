# Data Model

Legacy GTM tables remain in `data-core/schema.sql`.

CanopusCare OS demo tables are created idempotently in `data-core/os_core.mjs`:

- `organization`, `app_user`, `membership`
- `patient_case`, `case_document`, `hospital_match`, `hospital_review`
- `estimate`, `estimate_item`
- `vendor`, `service_request`
- `ops_task`
- `agent_definition`, `agent_run`
- `approval`, `audit_event`, `message`
- `integration_connection`
- `commission`
- `seed_version`

The model is intentionally SQLite-first for local/demo mode. `DATABASE_PATH` can point Docker or production-like deployments at a persistent volume.
