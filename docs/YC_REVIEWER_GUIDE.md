# YC Reviewer Guide

## What Canopus Care Does

Canopus Care prepares and coordinates the administrative work needed to move an
international patient case from a medical-travel agent to an Indian hospital.
Hospitals retain clinical decisions and humans approve sensitive actions.

The repository contains the complete Canopus Care landing page and product
sandbox in one deployable application.

## Public Demo

Public deployment is pending. Do not treat an unverified URL as live.

Local entry point: `http://localhost:5173/demo`

Default local role accounts:

```text
Hospital: hospital@canopuscare.demo
Agent: agent@canopuscare.demo
Read only: reviewer@canopuscare.com
Local password: canopus-demo
```

Public role passwords are configured through `DEMO_HOSPITAL_PASSWORD`,
`DEMO_AGENT_PASSWORD` and `DEMO_REVIEWER_PASSWORD`.

## One-Command Setup

```bash
git clone https://github.com/ACM07A/medical-gtm-yc-ready.git
cd medical-gtm-yc-ready
cp .env.example .env
docker compose up --build
```

Node alternative:

```bash
npm ci
npm run yc-demo
```

No paid API key is required.

## Three-Minute Path

1. Open `/demo` and confirm the synthetic-data banner and readiness state.
2. Sign in as the hospital user and open `CASE-DEMO-001`.
3. Select **Hospital reviewing**, then **Response received**. Refresh and show
   both persisted transition events in the audit history.
4. Log out, sign in as the agent user and open the same case.
5. Select **Option accepted**, then **Travel preparation**.
6. Open `CASE-DEMO-002` and confirm consent blocks progression.
7. Open `/readiness` for the operational, simulated and disabled inventory.

## Golden Case

`case_ibrahim_musa` is the deterministic Nigerian cardiac administrative
workflow. It contains synthetic documents, three fictional operational matches,
an indicative estimate, human approvals, non-clinical vendor requests, tasks,
agent runs, and audit records.

## Compliance Case

`case_amina_okoro` has missing consent. The consent gate blocks communication
and routing and records the refusal. It is intentionally not a happy path.

## Architecture

The zero-dependency Node HTTP server reads and writes SQLite using
`node:sqlite`. The GTM `lead` is the canonical minimized demand record and
`patient_case` is its operational projection. Signed cookies provide demo role
scope. Operator/GTM routes have a separate Basic-auth token gate.

See `ARCHITECTURE.md` and `docs/DATA_MODEL.md`.

## AI-Agent Execution

Demo agent runs are deterministic and require no external model. Each run stores
the trigger, input reference, output summary, evidence, provider, duration,
estimated cost, confidence, status, retry count, approval requirement,
timestamps, and correlation ID. A provider outage does not prevent the demo.

## Real, Mocked, and Disabled

See `docs/REAL_MOCKED_DISABLED.md` and `/readiness`.

## Known Limitations

- The public Render URL has not yet been verified.
- Production identity, MFA, invitations, encrypted object storage, monitoring,
  restore testing, external penetration testing, and legal approval are not
  implemented.
- Real email, WhatsApp, social posting, payments, and booking are disabled.
- The current deployment is synthetic demo infrastructure, not a real-patient
  production system.

## Main Commands

```bash
npm run env:check
npm run yc-demo
npm run check
npm run verify
npm run smoke:hermetic
npm run db:check
npm run db:backup
npm run docker:build
```

## Troubleshooting

- Node must be 22.5 or newer for `node:sqlite`.
- If port 5173 is busy, set another `PORT`.
- A copied `.env.example` uses `./data/canopus-care-demo.db`.
- Existing databases are preserved. Use the guarded reset command only when a
  deliberate synthetic reset is required.
- Browser and LLM keys are optional; default seeding skips those steps.
