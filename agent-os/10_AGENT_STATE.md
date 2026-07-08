# 10 — Agent State

_Memory file for small-context agents. Read this before starting a loop turn._

## Current project state
Spec package (`/build-os/` + `/agent-os/`) complete and refocused to **Middle East · Africa · Europe · SE Asia** (no Bangladesh), pricing rooted in cross-checked real data. First GTM work products generated in `/outputs/`.

## Current goal
Lead corridor (India × Arabic Middle East + English Africa track) passes `/build-os/14_ACCEPTANCE_TESTS.md`. See `01_GOAL_CONTRACT.md`.

## Completed work
- [x] Two-layer spec package authored and cross-linked.
- [x] Source markets refocused; pricing anchors added (cited).
- [x] T003/T004 — Partner target list, 6 categories, verified public IPS channels → `outputs/01_partner-targets.md`.
- [x] T005 — Proposal template + worked example (Apollo × Iraq cardiac) → `outputs/02_proposal-template.md`.
- [x] T006 — 4 cornerstone SEO pages drafted (CABG×Nigeria, knee×Oman, IVF×UAE, dental×UK) → `outputs/content/`.
- [x] T012 — GLM-5.2 tier-2 endpoint validated + LiteLLM config + Node helper + `.env.example` + `.gitignore` → `integrations/`.
- [x] T001 — Data core stood up (SQLite/node:sqlite): schema + seed (real data) + query CLI → `data-core/`. Portfolio/partners/pipeline/content/gaps reports run.

- [x] T015 — Wider sourcing model: latent/emerging high-quality brands (margin play) + unit-level partners/POCs + computed `opportunity`. 24 partners; `query candidates`/`units`.
- [x] T016 (ongoing) — Generation flow moved to **GLM-5.2 tier-2** (`gen_content.mjs`); Opus orchestrates + QAs. 6 gap cells drafted, prices injected from data core, guardrail held. Content grid 10/30.

## Autonomous FREE factory (built)
Zero-marginal-cost local pipeline: `lib/research.mjs` (DDG search, no key), `lib/browser.mjs` (puppeteer-core → local Edge/Chrome), `lib/mailer.mjs` (local .eml outbox; Resend if key), `data-core/publish_site.mjs` (static site → `/site`), `data-core/sourcing_research.mjs` (free public-contact discovery — low yield, T025), `data-core/run_loop.mjs` (factory runner: QA→research→publish→send). Cost map: `build-os/25_COST_CONTROL.md`. Run unattended via Windows Task Scheduler → `node --experimental-sqlite data-core/run_loop.mjs`. Only paid: GLM tokens (generation), optional WhatsApp/enrichment.

## Backend is live (how to see everything)
`node --experimental-sqlite server/server.mjs` → http://localhost:5173. Live console: KPIs, content-grid (click draft cell → landing preview), **runs feed** (every loop iteration), pipeline, candidates, POCs. Each `gen_content`/`resolve_pocs` run logs to the `run` table so activity shows live. Static claude.ai dashboards are snapshots only — the localhost app is the real UI.

## Model routing note
Bulk drafting runs on GLM-5.2 to conserve Opus. Reserve Opus for: strategy, compliance/clinical QA, proposals, weight/portfolio decisions, and any tier-1 escalation (`/agent-os/07`). Cannot self-switch the orchestrator model mid-session; harness controls that.

## Open decision for human (T013 — resolved; kept for history)
Computed weighted score re-ranked the portfolio: **Ortho 4.45 > Cardiac 4.40 > Oncology 4.30 > Dental 4.20 > Cosmetic 4.05 > Fertility 3.95**. Dental rose to #4, Fertility fell to #6. Accept model output or tune weights in `data-core/db.mjs` (raise demand/margin to keep Cardiac #1), then re-seed.

## Active / next
- [ ] Resolve named POCs (LinkedIn title search) for first-wave cardiac (Apollo/Fortis/Medanta).
- [ ] Human review + sign-off on proposal worked example (blocked on POC + live package sheet + fee/terms legal ok).
- [ ] Content: clinical sign-off on Nigeria page → then Arabic transcreation (T007) for Iraq/Gulf.
- [ ] Fertility + dental IPS channels still to verify.

## Known blockers (human/legal gates)
| Item | Why blocked |
|---|---|
| Send any proposal | Needs named POC + live package sheet + legal ok on 12%/net-15 |
| Publish content | Needs clinical sign-off + CRM-wired WhatsApp CTA |
| Real hospital contacts | Public IPS channels captured; re-verify before use |

## Do not repeat
- Don't invent hospital contact details or prices — cite `/build-os/08` or mark indicative.
- Don't reintroduce Bangladesh or Central Asia (out of scope by decision 2026-07-03).

## Next best task
Resolve first-wave cardiac named POCs, then route the Apollo × Iraq proposal to human review.
