# Pre-Deployment Brief — for Codex

**To:** Codex, working on `codex/build-aj` / mainline.
**Goal:** take the CanopusCare OS (the `/demo` control panel and everything behind it) from "runs great locally" to **deployed and live** as the public sandbox demo — without breaking the honesty and zero-dep principles the build now embodies.
**Context you already have right:** zero-dep boot (inline icon set), opt-in browser/generation seeding (4s bootstrap), 15/15 tests, role-scoped OS pages, consent-gate demo, `render.yaml` + `Dockerfile` + persistent disk, `/api/readiness` health check, `DATABASE_PATH` honored. This brief is only what's **left**.

Work the sections in order. Each task has an acceptance check — treat it as the definition of done.

---

## A. Ship blockers (must land before the deploy)

### A1. Make login real: sessions are currently a spoofable header
`server/os_pages.mjs:25-28` — `getSession()` reads `req.headers["x-demo-user"]` and **defaults every anonymous visitor to `admin@canopuscare.demo` (platform_admin)**. `/api/auth/login` verifies the password but sets no cookie; nothing ever consumes a login. Role isolation is therefore voluntary.
- Implement a minimal signed session: on successful login set an HMAC-signed cookie (`SESSION_SECRET`, `node:crypto`, HttpOnly, SameSite=Lax; Secure when `APP_BASE_URL` is https). `getSession()` reads the cookie first. Add `/api/auth/logout`.
- The `x-demo-user` header shortcut may remain **only when `APP_MODE=demo`** (it's what the smoke test uses); in `production` it must be ignored.
- Anonymous visitors in demo mode: default to the **`read_only`** role, not platform_admin — the demo stays clickable but "admin by accident" disappears.
- **Accept:** logging in as `hospital@` then requesting `/api/cases` returns only hospital-scoped rows *via cookie alone*; sending `x-demo-user: admin@canopuscare.demo` with `APP_MODE=production` does **not** elevate; a test covers both.

### A2. One commission number, derived from the engine model
`data-core/os_core.mjs` seeds `commission_ibrahim` as a **hardcoded 15% / 1627.5** — but the engine's real model is the tiered **20% → 22.5% → 25%** ramp (`COMMISSION_TIERS` / `commissionModel()` in `data-core/db.mjs`, incumbents 25–33%). Two sources of truth for the most-scrutinized number in the pitch.
- Compute the seeded commission from `commissionModel()` at the entry tier; carry the disclosure text from the model, not a literal.
- **Accept:** `grep -r "15%" data-core server` finds no facilitation-fee claim; the case page shows a value equal to `estimate.indicative_total × COMMISSION_TIERS[0].pct`; a unit test asserts the seed matches the model.

### A3. Stop naming real hospital brands as demo partners
`os_core.mjs` seeds "Apollo International Cardiac Centre", "Fortis International Patient Desk", "Sir Ganga Ram International Desk" as matched hospitals. The rows are labelled illustrative (good), but a public deploy showing real brands as partners we don't have (0 signed) is a reputational/legal exposure.
- Rename to neutral fictional names ("Meridian Cardiac Institute (demo)", etc.) **or**, if brand realism is essential to the demo, add a persistent strip on `/cases`, `/hospital`, and the case detail: *"Hospitals shown are illustrative; no affiliation or partnership is implied."* Prefer renaming — it needs no caveat.
- Same pass for vendor `rating` values (4.7/4.8/4.5): drop the number or render it as "illustrative".
- **Accept:** no real hospital brand appears as an assigned/matched partner anywhere in the seeded OS, or every surface that shows one carries the disclaimer strip; screenshots in `artifacts/` regenerated to match.

### A4. Fence the demo credentials out of production
`DEMO_PASSWORD` is a shared constant with a static salt — fine for demo, must be unreachable in production.
- When `APP_MODE=production`: `/api/auth/login` rejects all `*@canopuscare.demo` users (or demo users are not seeded at all), and `readinessReport()` fails if any demo user exists in the DB.
- **Accept:** a test boots with `APP_MODE=production` and proves demo credentials 401 and readiness reports the gap.

### A5. Decide and encode the public-access posture
`CONSOLE_TOKEN` Basic-auth gates the old console routes; the OS pages are open. For the YC demo deploy the intended posture is: **OS pages public** (synthetic data, demo strip, read-only default from A1) and **operator/GTM surfaces gated** (`/console`, `/studio` approve actions, `/api/lead/ingest` already per-tenant).
- Review the `PROTECTED` regex in `server/server.mjs` against every route the OS added; make the split deliberate and comment it.
- **Accept:** with `CONSOLE_TOKEN` set, an incognito visitor can browse `/demo`, `/cases`, `/vendors`, `/audit` but cannot reach `/console` or mutate anything without the token; a test asserts the matrix.

---

## B. Deploy mechanics (the "make it live" part)

### B1. First-boot seeding on the persistent disk
Render mounts `/var/data`; `DATABASE_PATH` points there. A fresh disk has no DB — the container must self-seed exactly once.
- In the entrypoint (root `Dockerfile`): if `$DATABASE_PATH` does not exist, run the demo seed (no `SEED_BROWSER`, no `SEED_GENERATION`), then start the server. Never reseed an existing DB on boot (deploys must not wipe state); expose reseeding as the existing `npm run db:reset-demo` invoked deliberately.
- **Accept:** `docker compose up` from a clean volume serves a fully-populated `/demo` with no manual step; a second boot preserves data.

### B2. Deploy to Render and wire the landing page
- Deploy per `render.yaml` (name it `canopuscare-demo`; fix the Docker image tag in `ci.yml` line ~45 — still `medyatra-demo`). Set `APP_BASE_URL`; keep `POST_LIVE=0`.
- On the **landing-page repo's** deploy (separate repo: `medical-tourism-gtm-landing-page`), set `SANDBOX_URL=<the Render URL>` and `SANDBOX_TOKEN=<CONSOLE_TOKEN>` — its Express proxy (`proxyOrFallback`) then serves live engine data to `/api/journey/run`, `/api/state`, `/api/markets`, `/api/vault`, `/api/economics`.
- **Accept:** `curl <render-url>/api/readiness` → READY; the landing page's markets/economics panels show live data (`x-canopus-source` header absent), and a journey run on the landing page returns 14 real steps.

### B3. CI stays green and honest
- CI must run the fast seed (no browser env), the 15 tests, boot + hermetic smoke. Verify `scripts/hermetic-smoke.mjs` covers the login flow after A1 (cookie, not header).
- **Accept:** a PR with A1–A5 lands with CI green; the workflow has no step that can stall on a missing browser or LLM key.

---

## C. Left to build (product gaps — next after the deploy, sequenced)

1. **Bridge the two data models.** `/journey` orchestrates `lead` rows; `/cases` reads `patient_case` rows — a patient exists in one universe or the other. Minimum viable bridge: `patient_case.lead_id` FK + a "Run journey" panel on the case detail that calls `/api/journey/run` for the linked lead and stores the step summary as an `agent_run`. **Accept:** the golden case shows its own live 14-step journey.
2. **Finish the rename.** 41 files still say `medyatra` (`logRun("MedYatra OS", …)`, tenant id, Docker tag, DB filename). Rename user-visible strings + tags now; keep `medyatra.db`/tenant id as stable internal identifiers if migration is risky — but record that decision in `ARCHITECTURE.md`. **Accept:** no user-visible "MedYatra" anywhere; `grep -ri medyatra --include=*.md docs/ README.md` clean.
3. **Endpoint test gaps.** Add tests for `/api/markets`, `/api/vault`, `/api/economics` (shape + skip-list correctness: AE/UZ/KZ/ZM skipped, 6 telegram-first) and one `/api/journey/run` orchestration test. **Accept:** suite ≥ 20 tests, all green.
4. **Integrations stay honest.** WhatsApp/email/social remain keys-off and double-gated (`POST_LIVE=1` + per-item approval) — no change pre-deploy; the `/integrations` page already tells the truth. Telegram (Central Asia + Cameroon markets) remains an acknowledged gap — do not fake it.

---

## D. Guardrails — do not regress these
- **No fabricated data**: no invented ratings, patient counts, named real clinicians, or "signed partner" implications anywhere public. The demo's credibility *is* the honesty (`DEMO ENVIRONMENT · SYNTHETIC DATA` strip stays on every OS page).
- **Zero-dep boot**: the HTTP server must keep booting with an empty `node_modules`. `puppeteer-core` stays optional/lazy.
- **Human gates**: nothing sends outbound without `POST_LIVE=1` **and** a per-item human approval; the consent-gate refusal (`case_amina_okoro`) must keep refusing.
- **Facilitator posture**: non-clinical only; the hospital owns every clinical decision; fees are hospital-paid and never framed as a patient markup.
- **Compliance skip-list**: AE/UZ/KZ/ZM stay hard-refused until residency infrastructure exists.
