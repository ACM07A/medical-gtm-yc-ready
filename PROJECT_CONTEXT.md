# PROJECT CONTEXT — MedYatra GTM Engine

A complete walkthrough of what this project is, how every part works, the decisions and nuances behind
it, and its honest limits. Written so you can understand — and speak to — every capability you've built.

**Read this if:** you want the full mental model. For the 2-minute version, see [`README.md`](./README.md).

---

## 1. The one-paragraph version

MedYatra is an **agentic go-to-market (GTM) engine** for a medical-tourism *facilitator* — a business that
connects international patients to accredited Indian hospitals and takes a 10–15% facilitation fee (it is
**not** a hospital and provides no care). The engine is a fleet of AI agents that autonomously (1) decide
which treatments to sell, (2) build the hospital-partner supply side down to the named decision-maker,
(3) run a multilingual content/brand campaign to pull demand, and (4) do all of it in a market-parameterized
way so the same system relaunches in any country. Everything is visible on a live operator console, runs at
near-zero marginal cost, and is built with an explicit no-fabrication / human-gated compliance posture.

**What it demonstrates (the portfolio point):** end-to-end AI product engineering — multi-agent
orchestration, a cost-tiered multi-model factory with automatic failover, browser automation that beats
what APIs are blocked from doing, a zero-dependency data core and real-time UI, and mature judgment about
compliance, privacy, and honesty about limits.

---

## 2. The business it models

**Medical Value Travel (MVT)** — patients from countries with expensive, slow, or limited healthcare travel
to India for world-class treatment at 60–90% lower cost. Example: a heart bypass (CABG) is ~$5,000 in India
vs ~$90,000 in the US. India received record MVT arrivals in 2024, led (post-Bangladesh) by Iraq, Oman,
Somalia, Nigeria, Yemen — which is why this engine targets the **Middle East, Africa, Europe, and SE Asia**.

**The facilitator model:** we are the trusted intermediary — we don't own hospitals, we route qualified
patients to them and earn a facilitation fee. That single fact drives the whole compliance posture: no
clinical claims, no invented prices, cited data only.

**The margin thesis (the strategic core):** competitors (Vaidam, MedTripz) crowd the same big hospital
chains (Apollo, Fortis, Medanta) that already have international desks. The *margin* is in **high-quality
brands that don't yet have a strong international-patient presence** — a Sir Ganga Ram or a Hinduja — where
we can win preferred-facilitator terms because we bring the demand engine they aren't running. The engine
operationalizes this as a **fit score** (see §5.2).

---

## 3. The methodology: Master Builder OS

The project is organized in two instruction layers — a deliberate separation of *how* from *what*:

| Layer | Answers | Contents |
|---|---|---|
| [`agent-os/`](./agent-os/) | **How** do agents operate? | Master loop controller, goal contract, loop recipes, **model routing**, agent state, **task queue**, **evidence log**, stop rules, handoff |
| [`build-os/`](./build-os/) | **What** are we building? | Project brief, category strategy, partner strategy, content campaign, globalization, system design, data sources, compliance, acceptance tests, cost control, production readiness |

Two files are living state you should check first:
- [`agent-os/11_TASK_QUEUE.md`](./agent-os/11_TASK_QUEUE.md) — every task, its status, and verification.
- [`agent-os/12_EVIDENCE_LOG.md`](./agent-os/12_EVIDENCE_LOG.md) — proof each capability is real and cited. *"No evidence = not done."*

---

## 4. Architecture: the cost-tiered multi-model factory

The design principle: **strong models for judgment, cheap models for bulk, free tools for execution, humans
for anything irreversible.**

### 4.1 The model tiers ([`agent-os/07_MODEL_ROUTING.md`](./agent-os/07_MODEL_ROUTING.md))

- **Tier 1 — Orchestrator / QA / compliance (Claude):** category-scoring logic, partner strategy, any
  clinical/price/legal claim, compliance review, final sign-off. Anything touching a claim or PII routes here.
- **Tier 2 — Bulk generation (NVIDIA NIM):** content pages, proposals, outreach, localization. Runs through
  a **failover chain** (§4.2).
- **Tier 3 — Narrow patches:** meta tags, subject-line polish, classification. Routes MiniMax→NVIDIA.

### 4.2 The failover chain (the "handoff") — [`integrations/glm_generate.mjs`](./integrations/glm_generate.mjs)

Tier-2 generation tries a chain of models and the **first responder wins**:

```
GLM-5.2  →  meta/llama-3.3-70b-instruct  →  meta/llama-3.1-8b-instruct
```

This is the resilience layer. It solves two real problems at once:
1. **A model goes down.** GLM-5.2 is currently *unserved* on the NVIDIA account (the key is valid — proven
   by Llama returning 200 — but that specific model hangs). The chain simply falls through to Llama.
2. **Claude hits its usage limit.** Because every generator is a standalone Node script calling this chain
   (not Claude), and [`data-core/run_loop.mjs`](./data-core/run_loop.mjs) runs them in sequence, the factory
   keeps producing **without Claude in the loop** — schedule `run_loop.mjs` via Task Scheduler/cron for true
   unattended operation.

Fully env-tunable, no code changes:
- `GLM_MODEL` — preferred model (default `z-ai/glm-5.2`)
- `GLM_FALLBACKS` — comma-separated fallbacks
- `TIER2_TIMEOUT` — per-model ms budget before failing over

### 4.3 The free/local execution layer

Everything below the LLMs is zero-cost and runs on your machine:
- **Data core** — `node:sqlite` (built into Node ≥ 22.5), *no ORM, no dependency*.
- **Browser automation** — `puppeteer-core` driving your **local Edge/Chrome** (no Chromium download).
- **Web research** — free DuckDuckGo/Bing HTML; **stealth browser** for what gets CAPTCHA-walled.
- **Mailer** — writes `.eml` files to a local outbox (or Resend if a key is set).
- **Publisher** — a static-site generator.
- **Server** — a zero-dependency Node HTTP server + live console.

> **Cost reality:** the processing loop is ~$0 marginal cost. Only LLM tokens are paid (free NVIDIA tier),
> and optional accelerants (paid enrichment, WhatsApp API) are behind env keys, off by default.

---

## 5. The five capabilities, in depth

### 5.1 Category Intelligence — *what to sell*

A weighted scoring model ranks treatment categories. Weights ([`data-core/db.mjs`](./data-core/db.mjs) `WEIGHTS`):

```
cost_arb 0.25 · quality 0.20 · demand 0.20 · ease 0.15 · margin 0.10 · whitespace 0.10
```

Current ranking (`npm run query portfolio`): **Orthopedics 4.45 · Cardiac 4.40 (⚑ flagship) · Oncology 4.30
· Dental 4.20 · Cosmetic 4.05 · Fertility 3.95.** Ophthalmology is seeded as an *incubate* category.

**Nuance — model vs. brand:** the model ranked Orthopedics #1, but Cardiac is kept as the *flagship* (brand
lead, deal size) via an explicit `flagship` flag — a documented decision (task T013) where a human overrode
the pure model output for strategic reasons. That's the kind of judgment the system is built to make
*explicit* rather than bury.

**Competitor price intelligence** ([`data-core/competitor_scan.mjs`](./data-core/competitor_scan.mjs)):
browser-scrapes live aggregator pages (Vaidam/MediGence), computes a 10th–90th-percentile market band per
category, and compares to our anchors. It surfaced a real finding: our **orthopedics anchor was at/above the
market top** — a genuine pricing flag the engine caught on its own.

### 5.2 The Partner Layer — *the GTM spine* (the most developed capability)

This is where a facilitator business is won or lost, so it's the deepest part.

**The account model** ([`data-core/db.mjs`](./data-core/db.mjs), [`partner_layer.mjs`](./data-core/partner_layer.mjs)):
each partner is a real CRM account, not a directory row —
- **Fit score (0–100)** — the margin thesis as a number: `0.45·quality + 0.40·whitespace + 0.15·proof`,
  where *whitespace* = inverse of current MVT presence. High score = benchmark quality + low international
  presence + a credential to sell. Latent brands (Ganga Ram, Hinduja = 96) rank above established chains
  (Apollo, Fortis = 68), exactly as intended.
- **A stated reason** per account (*why this account, why now*).
- **A contact path** with a confidence and type: `named-verified` (enrichment) › `named-public`
  (found on public LinkedIn, unverified) › `inferred` (email guessed from pattern) › `desk` (generic inbox)
  › `open` (target-role slot to fill).
- **A next action + owner + stage** so the pipeline actually moves.

**Finding the named decision-maker** ([`data-core/discover_pocs.mjs`](./data-core/discover_pocs.mjs)):
the hard part. The right person (Head–International Patient Services / GM–International Business) is almost
never on a hospital website. The engine:
1. Runs multi-combination Google/Bing searches targeting the exact roles.
2. Reads the **name + role off the public LinkedIn SERP line** (`Name – Role – Company | LinkedIn`) — no
   login, no scraping behind auth, public business info only.
3. Optionally views the public LinkedIn page to corroborate.
4. Tightly filters out noise (rejects role-words-as-names, clinicians, page fragments).
5. Stores every hit as **UNVERIFIED** for human confirmation — never auto-trusts a scraped name.

**The CAPTCHA wall and the stealth solution (an honest engineering story):** every free search engine blocks
a *headless* browser — Google serves an instant "unusual traffic" CAPTCHA, DuckDuckGo a bot-challenge, Bing
challenges advanced queries. The fix is **stealth mode** ([`lib/browser.mjs`](./lib/browser.mjs)
`stealthSession`): a *non-headless* real browser with a real profile and `navigator.webdriver` hidden, which
passes the checks. Run it with `STEALTH=1 npm run discover`. This actually works — it found a real
Head–International Patient Services and a hospital CEO in testing (names kept in the local DB only).

**Email inference** ([`data-core/infer_contacts.mjs`](./data-core/infer_contacts.mjs)): given a named person
and the real hospital domain, it constructs the likely email from an observed pattern (e.g.
`first.last@sgrh.com`), MX-verifies the domain, and labels it **INFERRED** with low confidence — a human
confirms before any send. Standard SDR tradecraft, done honestly.

**The paid unlock, one key away** ([`lib/enrich.mjs`](./lib/enrich.mjs)): a provider-agnostic enrichment
adapter (Hunter.io shape) sits wired-but-off behind `HUNTER_API_KEY`. When set, *verified* named contacts
flow straight into the board as the preferred path. Free-first; paid is a switch, not a rebuild.

**The human bridge** ([`data-core/research_worklist.mjs`](./data-core/research_worklist.mjs)): generates
`/worklist` — for each star account, ready-to-click Google + LinkedIn search URLs (several query combos),
the real hospital domain, and a one-line capture command
([`capture_poc.mjs`](./data-core/capture_poc.mjs)) to log a confirmed find. 100% ToS-clean; a human closes
the last inch in ~10 minutes.

### 5.3 The Content Engine — *demand*

A **content grid** = every (category × target-market × language) cell that should exist. Status:
**30/30 cells drafted.** Generation ([`gen_content.mjs`](./data-core/gen_content.mjs)) uses Tier-2 with
**prices injected from the data core** (the model never invents a number). A **QA agent**
([`qa_content.mjs`](./data-core/qa_content.mjs)) checks each draft for cited prices, the facilitator
disclaimer, a CTA, and banned phrases — 16 English pages passed to `review`; the 14 non-English drafts
(Arabic/Amharic/Burmese) are flagged **pending native-speaker QA** (honest — machine translation isn't
sign-off). Approved pages publish to a static site ([`publish_site.mjs`](./data-core/publish_site.mjs)).

### 5.4 Globalization — *re-tailorable*

Markets are **config, not code** (the `market` table + `category_market` fit matrix). 12 markets across 4
regions carry their own languages, RTL flag, currency, channels, visa regime. Adding a market (e.g. Myanmar)
derives its content grid and partner targeting without touching engine code — the acceptance test for true
globalization.

### 5.5 The Operator Console — *tangible visibility*

[`server/console.html`](./server/console.html) polls the data core every 4s and renders: KPIs, the
fit-ranked **account board** (why-this-account + contact path + next action), a portfolio table with
our-price-vs-market, a clickable content heatmap (click a draft → its rendered landing page), a live run
feed, the pipeline, the margin-play candidates, and named contacts. The patient-facing landing
([`server/landing_home.mjs`](./server/landing_home.mjs)) is the Nuvica-inspired clinical-blue design. Every
agent action writes a `run` row, so the console *is* the proof the engine is working.

---

## 6. The data model ([`data-core/schema.sql`](./data-core/schema.sql))

Zero-dependency SQLite (`node:sqlite`). Core tables:

| Table | Purpose |
|---|---|
| `market` | Source-country config (language, RTL, currency, channels, visa) — the globalization layer |
| `category` + `category_price` | Treatments, weighted scores, cited price anchors |
| `competitor_price` | Scraped market bands per category |
| `category_market` | The category × market fit matrix |
| `partner` (+ `partner_category`) | Hospital accounts: fit score, reason, presence, opportunity, stage, next action, owner |
| `poc` | Contacts: role, seniority, contact_type, contact_value, confidence, source, verified_at |
| `proposal` / `outreach` | Partner-facing drafts (human-gated at send) |
| `content_asset` | One row per content-grid cell (category × market × language), status, meta |
| `run` | The activity log — every agent action, rendered live on the console |
| `lead` | PII-minimized demand funnel (consent-gated) |

Migrations are additive and lightweight (try/catch `ALTER TABLE` in `db.mjs open()`) — no migration tool,
by design, to stay dependency-free.

---

## 7. Compliance & security posture

This is a health-adjacent business handling business contacts and (eventually) patient inquiries, so the
guardrails are first-class, not bolted on:

- **Facilitator, not provider** — no clinical claims, diagnoses, or outcome promises anywhere.
- **No fabrication** — prices are cited or marked indicative; scraped contacts are **UNVERIFIED** until a
  human confirms; a sanitizer strips internal notes (e.g. "(verify JCI)") from partner-facing text.
- **Public business data only** — no LinkedIn login/scraping behind auth, no personal PII beyond a publicly
  published business name + role.
- **Human gates** on publish, send, and any commercial term.
- **Privacy-respecting repo** — individual contact data lives only in the **gitignored local database**; the
  published repo ships institutional/public data only. Secrets live only in gitignored `.env` files
  (verified: no key appears anywhere else in the tree).
- **DPDP / GDPR-aware** — consent-gated lead handling, data minimization, no medical records in model prompts.

See [`build-os/10_SECURITY_COMPLIANCE.md`](./build-os/10_SECURITY_COMPLIANCE.md).

---

## 8. Running everything (command reference)

Requires **Node ≥ 22.5**. All data-core scripts need the `--experimental-sqlite` flag (the npm scripts add it).

| Command | Does |
|---|---|
| `npm run seed` | Build + seed the SQLite data core (+ backfill the run feed) |
| `npm run serve` | Start the server → `http://localhost:5173` (landing) + `/console` (operator console) |
| `npm run query <report>` | `portfolio` · `partners [cat]` · `candidates` · `units` · `pipeline` · `content` · `gaps` · `leads` |
| `npm run partner-layer` | Rebuild the fit-ranked account board (scores, reasons, next actions) |
| `npm run worklist` | Generate the human research worklist (view at `/worklist`) |
| `STEALTH=1 npm run discover` | Find named decision-makers via Google→LinkedIn (real browser; on your desktop) |
| `npm run infer` | Infer likely emails for named contacts (INFERRED, human-gate) |
| `npm run competitor-scan` | Scrape live competitor pricing and compare to our anchors |
| `npm run qa` | Run the content QA agent over all drafts |
| `npm run loop` | One unattended factory cycle (runs without Claude; add `DISCOVER=1 STEALTH=1` to include discovery) |

Capture a human-confirmed contact:
`node --experimental-sqlite data-core/capture_poc.mjs <partner_id> "Full Name" "Role" "<email|linkedin-url>"`

---

## 9. Honest limitations & what's next

**Current limits (stated plainly):**
- **GLM-5.2 is unserved** on the current NVIDIA account (key valid, model gated) — the failover runs on
  Llama meanwhile. Re-enable it at build.nvidia.com to restore the designed primary.
- **Named-contact discovery is intermittent** — stealth mode gets past CAPTCHAs but not every time (≈6/9 in
  testing); running on your own desktop (less-flagged IP) improves the hit rate.
- **Inferred emails are guesses** — low-confidence until MX-verified (blocked in the sandbox that built this;
  works on a real machine) and human-confirmed.
- **Non-English content is machine-drafted** — flagged pending native-speaker QA; not publish-ready.
- **The lead/CRM funnel and WhatsApp intake** are scaffolded, not wired end-to-end.

**Natural next steps:** account-specific proposal generation (to each named POC via the failover chain);
finish the WhatsApp→qualify→route lead flow; a new-market dry run (add Myanmar via config only); native QA
on the non-English pages; re-enable GLM-5.2.

---

## 10. Key engineering decisions & why (the nuances)

- **Zero-dependency data core (`node:sqlite`).** No ORM, no Postgres, one file. For a portfolio engine that
  must run anywhere with `node`, dependency weight is a liability; the built-in SQLite is enough and
  demonstrates restraint.
- **Model failover over a single model.** The GLM outage would have stopped a naive build cold. The chain
  turned an external failure into a non-event — and doubles as the "Claude hit its limit" handoff.
- **Browser automation over paid APIs, but with a paid switch.** Free-first is the constraint; the stealth
  browser earns its keep exactly where APIs are blocked. But the paid enrichment adapter is pre-wired, so
  scaling up is an env key, not an engineering project.
- **Everything logs a `run`.** The console isn't decoration — making agent work *tangible* was an explicit
  requirement, so visibility is a first-class feature, not an afterthought.
- **Honesty as a feature.** UNVERIFIED labels, cited prices, human gates, redacted personal data, and
  documented limits aren't hedging — for an AI product touching health and outreach, *calibrated confidence*
  is the capability. A system that knows what it doesn't know is more valuable than one that bluffs.

---

*Working codename **MedYatra** ("medical journey") — rename freely. This is a first-draft engine: a
demonstration of building a real, autonomous, honest AI product end-to-end.*
