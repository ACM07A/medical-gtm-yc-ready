# CanopusCare Engine (codex/build-aj) — Improvement Report

**Scope:** the build currently running on `http://localhost:5173` — `main` = `b3dedcb` = `origin/codex/build-aj`.
**Method:** read of the codex additions (`data-core/os_core.mjs`, `server/os_pages.mjs`, `server/canopus_ui.mjs`, `data-core/demo_seed.mjs`, `.github/workflows/ci.yml`) + boot/test/smoke verification.
**Date:** 2026-07-24.

## Verdict

The codex build is a real step up in *product surface*: a role-scoped operations layer (cases, hospitals, vendors, approvals, audit), a proper test suite, deploy config, and — genuinely well done — a **consent-gate refusal demo** and disciplined "synthetic/DEMO" watermarking. But it has **two reliability blockers**, a **commission inconsistency**, an **architectural split** (two parallel data models), and a **half-finished rename**. None are hard to fix; prioritized below.

---

## P0 — Reliability blockers — **BOTH FIXED (2026-07-24)**

### 1. ✅ FIXED — The server hard-crashed without `npm install`
`server/canopus_ui.mjs:1` did `import { icons } from "lucide"` at module top-level, pulled in by `server/os_pages.mjs` and `server/demo.mjs`, which `server/server.mjs` imports — so **a single missing dependency killed the entire server at boot** (`ERR_MODULE_NOT_FOUND`), abandoning the engine's documented `node:sqlite`/no-`node_modules` identity (the codex build added `lucide`, `csv-parse`, `puppeteer-core`).
- **Fix applied:** the lucide import is now optional (`try { await import("lucide") } catch`) with a neutral circle-glyph fallback in `icon()`. **Verified:** server boots and every page renders 200 with `node_modules/lucide` removed; with it installed, real icons render as before.
- Remaining (downgraded to P2): decide deliberately whether to keep `csv-parse`/`puppeteer-core` as deps or restore full zero-dep; either way the boot path no longer depends on any of them.

### 2. ✅ FIXED — `npm run demo` (the documented quickstart) stalled for minutes
Original diagnosis refined after instrumentation: the browser steps (`gen_comms`, `gen_header_datauris`) actually fail *fast* when puppeteer can't drive the found Edge — **the real stall was the optional LLM step** (`repurpose_content.mjs`, appended when a generation key exists), which could burn its full 5-minute `execFileSync` timeout against a rate-limited provider. Every best-effort step having 300s of rope made the "seconds, not minutes" quickstart contract unenforceable. **CI inherits this path** (`ci.yml` runs `db:seed`).
- **Fix applied:** `demo_seed.mjs` now (a) probes `lib/browser.mjs:browserPath()` up front and skips `browser: true` steps instantly when no Edge/Chrome exists, (b) bounds every step at **120s default**, and (c) bounds the LLM repurpose step at **90s**. **Verified:** full `npm run demo` completes in **1m49s worst-case** (12 ok, 3 bounded skips — the repurpose step hit its 90s bound exactly as designed), and all 10 tests still pass against the reseeded DB.

---

## P1 — Consistency & honesty

### 3. Commission is inconsistent: OS demo says 15%, the engine model says 20→25%
`data-core/os_core.mjs:232` hardcodes a *"Synthetic 15% facilitation share"* (`expected_amount 1627.5` on a ~$10,850 estimate). But the engine's real model (`data-core/db.mjs:258` `COMMISSION_TIERS`) is the corrected **20% → 22.5% → 25%** ramp. Two sources of truth for the single most-scrutinized number in the pitch.
- **Fix:** compute the OS commission via `commissionModel()` / the tier ladder, not a hardcoded 15%. One number, everywhere.

### 4. Real hospital brand names seeded as demo "partners"
`os_core.mjs:132-133,153` seed *"Apollo International Cardiac Centre"*, *"Fortis International Patient Desk"*, *"Sir Ganga Ram International Desk"* as matched hospitals. **Credit where due:** unlike the landing page, these are labelled `demo`, *"illustrative demo rate,"* *"commercial relationship disclosed,"* *"no live outreach to inferred contacts"* — much more disciplined. But they still use real brands to imply partnerships you don't have (0 signed).
- **Fix:** use neutral names (*"Demo Cardiac Centre A/B"*) **or** add a persistent *"Illustrative — not affiliated; no partnership implied"* banner on `/cases` and the hospital match view. (This is lower-risk than the landing page's unlabelled real-doctor naming — see the separate landing-page review.)

### 5. Invented vendor ratings
`os_core.mjs` vendor rows carry numeric ratings (`4.7`, `4.8`, `4.5`). Labelled *"Mock marketplace / Verified demo docs,"* so lower-risk — but it's the same fabricated-metric pattern.
- **Fix:** drop the numeric rating in the UI or render it explicitly as *"illustrative."*

---

## P2 — Architecture & maintainability

### 6. Two parallel data models that don't share state
The OS introduces `patient_case`, `organization`, `membership`, `hospital_match`, `service_request`, etc. (`os_core.mjs`) alongside the existing `lead`, `partner`, `market`, `estimate_line`. As a result **`/journey` orchestrates `lead` rows while `/cases` reads `patient_case` rows — two disconnected universes in one app.** A patient exists as either a "lead" or a "case," never both; the concierge agents and the OS don't operate on the same records. This is the build's biggest structural smell and a future double-maintenance trap.
- **Fix:** decide the canonical entity and bridge them — e.g., a `patient_case` is the operational projection of a `lead`, with a foreign key and a one-way sync — or explicitly document the boundary (GTM/demand-gen model vs operations model) in `ARCHITECTURE.md` and add a mapping so a journey run can surface on a case.

### 7. The MedYatra→CanopusCare rename is ~half done
41 files still contain `medyatra`: the DB file is `medyatra.db`, the own-brand tenant id is `medyatra`, `logRun("MedYatra OS", ...)`, and the Docker image tags `medyatra-demo` (`ci.yml:45`). The UI says CanopusCare; the internals don't.
- **Fix:** finish the rename (or consciously keep `medyatra.db` as the stable data path and rename only user-visible strings) — but make it a decision, not a leftover. A YC technical reviewer opening the repo will notice the split identity.

---

## P3 — Security (demo→prod) & testing

### 8. Demo auth must stay fenced off from production
`os_core.mjs` hashes passwords with a **static salt** (`"canopuscare-demo-salt"`) and one shared `DEMO_PASSWORD`. That's fine for a demo, and `readinessReport()` does gate production (requires `SESSION_SECRET`, `ENCRYPTION_KEY`, `CONSOLE_TOKEN`, `ALLOWED_ORIGINS`). **Keep it that way:** ensure the production auth path uses per-user random salts + signed sessions, and that the demo login is unreachable unless `APP_MODE=demo`. Add a test asserting demo credentials fail when `APP_MODE=production`.

### 9. Test coverage is a good start but has holes
`npm test` (10/10) plus legacy `smoke-agents` (25) and `smoke-vault` (13) pass. Gaps: no test exercises `/api/markets`, `/api/vault`, `/api/economics`, or the `/journey` orchestrator; the live `npm run smoke` needs a manually seeded DB + running server (4 auth checks fail without the seed). CI does boot+smoke (good) but is exposed to the P0-#2 hang.
- **Fix:** add endpoint tests for the three JSON APIs and one journey-orchestration test; make the smoke self-seed (or depend on a fast seed) so it's hermetic.

---

## To actually go live (completes the earlier runtime-link goal)

- The build added `render.yaml`, `Dockerfile`, and `scripts/start-production.mjs` — so the engine is now **deployable**. Deploy it to get a public URL, then set the **landing page's `SANDBOX_URL`** to that URL (env var on the landing deploy). That finishes the "changes in the sandbox reflect on the landing page" link end-to-end.
- The **landing page repo** (separate) still carries its own fabricated-traction issues (named real oncologist, fake ratings/contract counts) — see the earlier landing-page review; fix before the YC link is shared.

---

## Quick-wins checklist (highest value / lowest effort)
1. ~~Make the `lucide` import in `canopus_ui.mjs` non-fatal~~ **DONE** — server boots from a bare clone again. **[P0]**
2. ~~Bound `demo_seed.mjs` steps + browser probe~~ **DONE** — `npm run demo` completes in <2 min worst-case. **[P0]**
3. Replace the hardcoded 15% in `os_core.mjs` with `commissionModel()`. **[P1]**
4. Neutralize hospital/vendor names or add an "illustrative, not affiliated" banner on `/cases`. **[P1]**
5. Finish (or consciously scope) the CanopusCare rename; fix the `medyatra-demo` Docker tag. **[P2]**
6. Add endpoint + journey tests; make smoke self-seeding. **[P3]**
