# Canopus Care Deployment

No public deployment is claimed until the verification section passes against
the deployed HTTPS URL.

## Local Docker

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:5173/demo`.

The container runs as a non-root user. On a missing `/app/data` database it
performs the deterministic, browser-free demo seed once. On every later boot it
preserves the existing database.

## Render Blueprint

1. Sign in to Render and create a new Blueprint.
2. Connect `ACM07A/medical-gtm-yc-ready`.
3. Select branch `main`.
4. Allow Render to read `render.yaml`.
5. Confirm the persistent disk is mounted at `/var/data`.
6. Set `APP_BASE_URL` to the assigned HTTPS service URL.
7. Set `ALLOWED_ORIGINS` to the same origin.
8. Set a strong `DEMO_PASSWORD`; do not use the local default publicly.
9. Keep `APP_MODE=demo`, `POST_LIVE=0`, and `AUTH_PROVIDER=demo`.
10. Retain the generated `SESSION_SECRET`, `CONSOLE_TOKEN`, and
    `ENCRYPTION_KEY` values in Render's secret store.
11. Deploy and wait for `/api/readiness`.

The blueprint defaults `DATABASE_PATH` to
`/var/data/canopus-care-demo.db`. A fresh disk is seeded once; a redeploy or
container restart preserves it.

## Verification

Replace `<render-url>` below:

```bash
curl -fsS <render-url>/api/health
curl -fsS <render-url>/api/readiness
```

Confirm:

- `service` is `canopus-care`.
- readiness is not `BLOCKED`.
- the database and patient-intake components are `READY`.
- WhatsApp and external delivery are `MOCKED` or `DISABLED`.
- `/demo`, `/cases`, `/vendors`, `/audit`, and `/readiness` open in incognito.
- `/console` returns an authentication challenge without `CONSOLE_TOKEN`.
- reviewer login sets a Secure, HttpOnly, SameSite=Lax cookie.
- a hospital role sees only its assigned synthetic case.
- a restart preserves a test audit/state record.
- the consent-blocked case still refuses release.

## Landing-Page Wiring

In the separate landing-page deployment set:

```text
SANDBOX_URL=<render-url>
SANDBOX_TOKEN=<CONSOLE_TOKEN>
```

Then verify `/api/markets`, `/api/vault`, `/api/economics`, and
`/api/journey/run` through the landing-page proxy. Do not expose
`CONSOLE_TOKEN` to browser JavaScript.

## Custom Domain

After the Render URL passes verification:

1. Add `demo.canopuscare.com` in Render.
2. Configure the DNS record Render provides.
3. Wait for the managed TLS certificate.
4. Change `APP_BASE_URL` and `ALLOWED_ORIGINS` to the branded HTTPS origin.
5. Repeat the full incognito and cookie verification.

Do not claim the branded domain exists until DNS and TLS are confirmed.

## Production Warning

This Blueprint is a synthetic public demo, not a real-patient production
deployment. Keep `APP_MODE=demo`. Complete
`docs/VENDOR_DEPLOYMENT_READINESS.md` and the legal, privacy, identity,
storage, monitoring, backup, and security gates before any real pilot.
