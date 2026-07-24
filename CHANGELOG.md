# Changelog

## 2026-07-24

- Removed Lucide and CSV parser dependencies from the server boot path; the server now boots without `node_modules`.
- Made browser/model seed work opt-in and reduced the timeout backstop; deterministic demo seed completes in seconds.
- Linked canonical GTM leads to operational cases and synchronized journey runs back to case state and audit.
- Unified the OS commission forecast with the engine's 20% entry tier.
- Replaced real hospital brands and invented vendor ratings in the OS demo with explicitly synthetic data.
- Fenced demo credentials and `X-Demo-User` out of production mode.
- Added hermetic empty-database smoke coverage for markets, vault, economics and journey surfaces.
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
- Added CanopusCare OS deterministic demo schema and seed.
- Added hospital command centre, agent portal, case workspace, vendor network, agent activity centre, integrations, audit, tasks and metrics surfaces.
- Added `/api/readiness`, `/api/session`, `/api/cases`, `/api/metrics`.
- Added guarded demo reset, backup, DB check, smoke and `yc-demo` scripts.
- Added Dockerfile, Docker Compose, Render config and GitHub Actions CI.
- Fixed Studio proposal approval so it moves partners to `Outreach sent`, not `Responded`.
- Added tests for consent gate, tenant/role isolation, ingestion and golden path rendering.
