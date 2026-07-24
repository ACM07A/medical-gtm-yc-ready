# Changelog

## 2026-07-24

- Rebranded the operating experience to CanopusCare with a new icon-led dashboard shell and responsive visual system.
- Added vendor-scoped service-request quote and status updates with audit logging.
- Added a production vendor deployment gate and controlled pilot checklist.
- Reworked `/demo` into an executive OS demo hub with network diagram, status, golden path, current scenario, local-run instructions, credentials and reset action.
- Added demo auth, approvals, tasks, vendors, service-request and demo-reset APIs.
- Added role-scoped case-resource, agent-run, integration and audit APIs.
- Added request correlation and browser security headers across server responses.
- Made demo health depend on OS database readiness while retaining legacy loop health diagnostics.
- Added functional CSV lead preview and import with explicit column mapping, validation, masked contacts, duplicate detection and rejected-row reporting.
- Added static docs rendering for `docs/*.md` from the local server.
- Added MedYatra OS deterministic demo schema and seed.
- Added hospital command centre, agent portal, case workspace, vendor network, agent activity centre, integrations, audit, tasks and metrics surfaces.
- Added `/api/readiness`, `/api/session`, `/api/cases`, `/api/metrics`.
- Added guarded demo reset, backup, DB check, smoke and `yc-demo` scripts.
- Added Dockerfile, Docker Compose, Render config and GitHub Actions CI.
- Fixed Studio proposal approval so it moves partners to `Outreach sent`, not `Responded`.
- Added tests for consent gate, tenant/role isolation, ingestion and golden path rendering.
