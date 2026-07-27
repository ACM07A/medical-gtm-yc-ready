# Canopus Care Repository Audit

Date: 2026-07-26

Release baseline: standalone repository branch `main`

## Scope

This audit covers the existing Canopus Care operating-system demo, the legacy
GTM engine behind it, local startup, database behavior, authentication,
deployment configuration, test coverage, and public-demo risk.

The repository name and selected database identifiers remain legacy internal
identifiers. The user-facing product is Canopus Care.

## Baseline Commands

| Command | Result | Evidence |
|---|---|---|
| `node --version` | PASS | Node `v24.14.0`; requirement is Node 22.5 or newer |
| `npm run check` | PASS | Syntax checks and 15 tests passed |
| `npm run smoke:hermetic` | PASS | Server booted on an isolated database and the documented route/API smoke checks passed |
| `npm run db:seed` | PASS | Deterministic seed completed in about 5.4 seconds with no browser or model key |
| `npm run env:check` | FAIL | Script and validator do not exist yet |
| `docker --version` | BLOCKED | Docker is not installed in the current Windows environment |

The browser-dependent and model-dependent seed steps are opt-in. The default
seed does not wait for Chrome or an LLM key.

## Working Product Surface

The repository already contains:

- A zero-dependency Node HTTP boot path using `node:sqlite`.
- A deterministic synthetic OS seed with a golden case and a consent-blocked case.
- Role-scoped case, hospital, agent, vendor, task, approval, audit, integration,
  and agent-run readers.
- Human-gated estimate and service-request workflows.
- Deterministic agent output when no external model is configured.
- `/api/health`, `/api/readiness`, deployment manifests, a Dockerfile, and a
  persistent-disk database path.
- A lead-to-operational-case projection and journey synchronization.
- A permanent synthetic-data demo banner on OS pages.

The main reviewer routes respond in the hermetic smoke test:

`/demo`, `/agent`, `/hospital`, `/cases`, `/cases/case_ibrahim_musa`,
`/vendors`, `/agents`, `/studio`, `/integrations`, `/audit`, `/journey`,
`/console`, `/api/health`, and `/api/readiness`.

## Database Behavior

- SQLite is the active local/demo database.
- `DATABASE_PATH` overrides the legacy default at `data-core/medyatra.db`.
- Foreign keys are enabled when the database is opened.
- Schema creation and lightweight migrations are idempotent.
- The OS seed is deterministic and includes a seed-version record.
- `npm run db:reset-demo` refuses outside demo mode unless `--force` is supplied.
- `scripts/yc-demo.mjs` preserves an existing database.

Deployment gap: `docker-compose.yml` runs the full demo seed on every container
start. That can overwrite or duplicate state and violates the preserve-on-restart
requirement. The Docker entrypoint also does not own first-boot initialization.

## Environment Handling

Current strengths:

- `APP_MODE` recognizes `demo`, `development`, `test`, and `production`.
- `POST_LIVE=0` keeps outbound adapters disabled.
- Production readiness reports missing critical variables.
- Optional model and delivery credentials are not required for demo startup.

Current gaps:

- There is no `scripts/validate-env.mjs` or `npm run env:check`.
- Root `.env.example` omits the requested database, upload, backup, reviewer,
  safety, provider, and monitoring variables.
- Render does not generate `SESSION_SECRET` or `ENCRYPTION_KEY`.
- Production startup does not fail before listening when readiness is blocked.

## Authentication and Authorization

Current behavior is not deployable:

- `/api/auth/login` validates a shared demo password but sets no session cookie.
- `/api/auth/logout` does not invalidate anything.
- In demo mode, an anonymous request defaults to the platform-admin account.
- The `x-demo-user` shortcut is accepted in demo mode and ignored in production.
- `CONSOLE_TOKEN`, when set, currently Basic-auth gates `/demo` and all OS pages,
  which conflicts with the intended public read-only sandbox.
- Several mutation routes rely on the spoofable demo header or do not receive the
  OS session at all.

Required correction: signed, expiring, HttpOnly sessions; anonymous read-only
demo access; explicit mutation authorization; a deliberate public-OS versus
operator-console route matrix; and login rate limiting.

## Data and Product Honesty

The Canopus Care OS seed uses synthetic patient data and neutral demo hospital
names. Numeric vendor ratings are not rendered. Commission is derived from the
engine's canonical entry tier. Clinical decisions remain hospital-owned and
the consent-blocked case refuses communication.

The legacy GTM data layer still contains real hospital and public-business
contact research. Those records belong behind the operator gate and must not be
presented as signed Canopus Care partners in the public OS demo.

## Tests

Existing coverage:

- 15 Node tests across unit, integration, and rendered-page behavior.
- Hermetic server startup and broad route/API smoke coverage.
- Legacy agent and vault smoke suites.
- Consent blocking, tenant scope, vendor lifecycle, commission consistency,
  production demo-auth fencing, and journey-to-case synchronization.

Gaps:

- Cookie login/logout and expiry are not tested.
- Public/read-only versus Basic-auth operator route posture is not tested.
- Production readiness with persisted demo users is not tested.
- The smoke login check does not prove that the returned cookie authorizes a
  subsequent hospital-scoped request.
- The requested suite count is at least 20; the current suite has 15 tests.

## Deployment Blockers

1. Implement real signed reviewer sessions and anonymous read-only access.
2. Separate public OS browsing from Basic-auth-protected GTM/operator surfaces.
3. Add environment validation and block unsafe production startup.
4. Seed a missing persistent database once and preserve it on restart.
5. Generate required Render secrets and document public credential setup.
6. Verify Docker startup and persistence in an environment with Docker installed.
7. Deploy Render and verify the public URL; no public deployment is claimed yet.

## Security and Privacy Findings

- No tracked `.env`, SQLite database, or private-key file was found.
- The targeted high-confidence secret-pattern scan found no committed provider key.
- Generated databases, backups, proposals, and environment files are ignored.
- The legacy console exposes partner/contact pipeline data and must remain gated.
- Demo data must remain synthetic; real uploads and outbound actions stay disabled.
- External sending remains double-gated by `POST_LIVE=1` and per-item human approval.

## Baseline Decision

Preserve the current backend and product surfaces. The next implementation
iteration will harden startup and deployment behavior rather than replacing the
application or data model.
