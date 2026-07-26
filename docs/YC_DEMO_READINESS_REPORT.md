# YC Demo Readiness Report

## Executive summary

**Ready with limitations for local review; not yet ready as a public YC link.**

The product workflow, synthetic seed, signed demo sessions, role scoping, compliance refusal, persistence, audit history, tests and deployment configuration are implemented. A hosting-account owner must still create the Render service, configure secrets, verify HTTPS and provide the public URL. Docker could not be executed on the current machine because Docker is unavailable.

## Completed work

- Preserved the existing Node `node:sqlite` architecture and agent/GTM engine.
- Added deterministic `CASE-DEMO-001` and compliance-blocked `CASE-DEMO-002`.
- Added canonical case states, role-owned allowed transitions and transactional audit writes.
- Added signed sessions, logout, expiry, login throttling and server-side tenant scoping.
- Added public read-only sandbox and token-gated operator/GTM route posture.
- Added safe first-boot seeding, reset with backup, migrations, health and readiness.
- Added neutral fictional hospitals and canonical commission calculations.
- Added Docker, Compose, Render and CI configuration.

## Existing functionality preserved

The GTM data core, journey orchestrator, concierge agents, vendor lifecycle, lead ingestion, market/economics APIs, content engine and outbound human gates remain intact.

## Verification performed

- `npm ci` in a clean temporary clone: pass, zero reported vulnerabilities.
- Bare checkout without `node_modules`: first boot and readiness pass.
- `npm test`: 24/24 pass after the workflow changes.
- `npm run smoke:hermetic`: pass on the previous branch checkpoint; rerun required before final push.
- `npm run yc-demo`: deterministic seed completes without browser or LLM credentials.
- Restart preservation: covered by integration test.
- Docker: not run because Docker is not installed/available on this workstation.

## Public deployment

- URL: **Not deployed**
- Health: local `/api/health` passes
- Readiness: local demo mode reports ready
- Deployment date: pending hosting-account action
- Commit: pending final commit for this checklist iteration

## Demo credentials

Account identifiers are configured with `DEMO_AGENT_EMAIL`, `DEMO_HOSPITAL_EMAIL` and `DEMO_USERNAME`. Passwords are server-side environment secrets and are not embedded in browser JavaScript or printed by startup.

## Real, mocked and disabled

See [REAL_MOCKED_DISABLED.md](REAL_MOCKED_DISABLED.md). Persistence, access control, transitions and audit are operational. External hospital, vendor and AI events are synthetic or simulated. Outbound messaging, payments and clinical decisions are disabled.

## Remaining P0 blockers

- Deploy to a paid/approved Render account and set production demo secrets.
- Verify the public URL from clean desktop and mobile networks.
- Run and verify Docker Compose on a machine with Docker.
- Confirm GitHub Actions is green for the pushed commit.
- Perform a final browser walkthrough and regenerate screenshots against the deployed URL.

## Remaining P1 issues

- Full Playwright cross-browser automation and failure screenshots.
- Privacy-safe funnel analytics.
- External monitoring and alerting.
- Broader keyboard and screen-reader audit.

## Known limitations

SQLite is appropriate for the single-instance sandbox but not a multi-instance production service. Files are synthetic metadata rather than encrypted uploads. Optional model and communication providers are not required for the deterministic demo.

## Important files

- `data-core/case_workflow.mjs`: canonical case states and transition enforcement.
- `data-core/os_core.mjs`: schema, seed, demo accounts and readiness.
- `server/server.mjs`: HTTP routes, auth, health and transition API.
- `server/os_pages.mjs`: role-scoped reviewer UI.
- `scripts/start-app.mjs`: safe first boot.
- `render.yaml`, `Dockerfile`, `docker-compose.yml`: deployment.

## Final demo walkthrough

1. Open `/demo`, sign in as the hospital demo user and open `CASE-DEMO-001`.
2. Advance to **Hospital reviewing**, then **Response received**.
3. Log out and sign in as the agent demo user.
4. Accept the response and begin travel preparation.
5. Refresh and show persisted stage plus `case_transition` audit events.
6. Open `CASE-DEMO-002` and show the server-enforced consent block.
7. End on `/integrations` to distinguish operational, simulated and disabled systems.
