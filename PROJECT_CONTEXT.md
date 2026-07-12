# PROJECT CONTEXT — MedYatra GTM Engine

A complete walkthrough of what this project is, how every part works, the decisions and nuances behind
it, and its honest limits. Written so you can understand — and speak to — every capability you've built.

**Read this if:** you want the full mental model. For the 2-minute version, see [`README.md`](./README.md).

---

## 1. The one-paragraph version

MedYatra is an **agentic go-to-market (GTM) engine** for a medical-tourism *facilitator* — a business that
connects international patients to accredited Indian hospitals and takes a 10–15% facilitation fee (it is
**not** a hospital and provides no care). The engine is a fleet of AI agents that autonomously (1) decide
which treatments to sell, (2) build the hospital-partner supply side down to the named decision-maker and a
tailored proposal, (3) run a multilingual content/brand campaign and repurpose it into platform-ready social
posts with real infographics and stock photos, and (4) do all of it in a market-parameterized way so the same
system relaunches in any country — continuing on a schedule even when Claude is offline. Everything is visible
on a live operator console, runs at near-zero marginal cost, and is built with an explicit no-fabrication /
human-gated compliance posture.

**What it demonstrates (the portfolio point):** end-to-end AI product engineering — multi-agent
orchestration, a cost-tiered multi-model factory with **cross-provider failover**, browser automation that
beats what APIs are blocked from doing, a **pluggable integration layer** (image gen, social posting,
enrichment — each an env-key away), a zero-dependency data core and real-time UI, and mature judgment about
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

Tier-2 generation tries a chain of models and the **first responder wins** — and it now spans **two
providers** (NVIDIA NIM + Google Gemini), routed by a `gemini:` prefix inside the same chain:

```
GLM-5.2  →  gemini-2.5-flash     (llama tiers dropped; NIM gets a short probe budget → fast failover)
```

This is the resilience layer. It solves two real problems at once:
1. **A model goes down.** GLM-5.2 is currently *unserved* on the NVIDIA account (the key is valid — proven
   by Llama returning 200 — but that specific model hangs). The backend research/generation was deliberately
   narrowed to **GLM → Gemini**; a short NIM probe budget (`NIM_TIMEOUT`, default 12s) means a dead GLM
   **fails over to Gemini in seconds, not 40s**. In practice Gemini carries generation and produces the
   higher-quality proposals.
2. **Claude hits its usage limit.** Because every generator is a standalone Node script calling this chain
   (not Claude), and [`data-core/run_loop.mjs`](./data-core/run_loop.mjs) runs them in sequence, the factory
   keeps producing **without Claude in the loop**. This is wired for real: a Windows Scheduled Task
   (`scripts/run_factory.bat`) runs the full cycle every 6 hours; a zero-dep `.env` loader (`lib/env.mjs`)
   gives the headless scripts their keys.

Fully env-tunable, no code changes: `GLM_MODEL`, `GLM_FALLBACKS`, `TIER2_TIMEOUT`, and `GEMINI_API_KEY`
(appends Gemini as the backup automatically when present).

### 4.2b The plugin layer (every integration one key away) — [`lib/plugins.mjs`](./lib/plugins.mjs), `/plugins`

The content/delivery integrations are all wired to the correct API shape and **OFF until keyed** — a
readiness board at `/plugins` shows what's live vs. one key away:
- **Generation:** text (the failover chain), **image gen** ([`lib/image.mjs`](./lib/image.mjs) — Cloudflare
  FLUX *free/no-card*, Gemini "Nano Banana", OpenAI, Stability, Pollinations fallback), **infographics**
  (free), **stock photos** (free).
- **Delivery:** social posting for Instagram / LinkedIn / X / Reddit / WhatsApp
  ([`lib/publishers.mjs`](./lib/publishers.mjs)) — **double-gated** (dry-run unless `POST_LIVE=1` *and*
  per-post approval), email (Resend or local outbox), contact enrichment (Hunter/Apollo).

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
· Dental 4.20 · Cosmetic 4.05 · Fertility 3.95.** A **wellness/naturopathy** line (score 4.5, `kind='wellness'`, `bundleable=1`) sits alongside these — sold standalone (lowest-friction, cash-pay) or bundled as a post-op recovery add-on onto a surgical journey. *(Ophthalmology was evaluated and **dropped** — low-ticket, follow-up-heavy, better delivered locally; the category leader, Dr Agarwal's, built clinics in the African source markets rather than importing patients. See `build-os/03`.)*

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
([`capture_poc.mjs`](./data-core/capture_poc.mjs)) to log a confirmed find. Much lower risk than
automated scraping — a human does the searching (manual use, no anti-bot circumvention) — ~10 min.

**Tailored proposals** ([`data-core/gen_proposals.mjs`](./data-core/gen_proposals.mjs)): a 7-section
partnership proposal per top account, **addressed to the named POC**, grounded in that account's fit reason,
categories, and cited pricing, with the differentiated angle (margin/demand for latent brands, scale for
established chains) and the credibility framing (§5.2c). Facilitator terms only (10–15% fee, non-exclusive,
pilot), no invented prices/outcomes, human-gated at `review`. Generated via the failover chain — Gemini
already produces the best of these.

### 5.2c Partner credibility for non-mainstream brands ([`data-core/gen_credibility.mjs`](./data-core/gen_credibility.mjs))

The margin play brings on high-quality hospitals patients abroad haven't heard of. Customer-facing content
must *build* their credibility, using levers that work without brand fame: **accreditation as the global
equalizer**, reframing "lesser-known" as a **focused-specialist** advantage, named-clinician credentials,
radical transparency, and MedYatra's vetting promise. Every unsupplied stat is emitted as a `[VERIFY: …]`
placeholder — never fabricated. See [`build-os/05`](./build-os/05_CONTENT_BRAND_CAMPAIGN.md).

### 5.3 The Content Engine — *demand*

A **content grid** = every (category × target-market × language) cell that should exist. Status:
**30/30 cells drafted.** Generation ([`gen_content.mjs`](./data-core/gen_content.mjs)) uses Tier-2 with
**prices injected from the data core** (the model never invents a number). A **QA agent**
([`qa_content.mjs`](./data-core/qa_content.mjs)) checks each draft for cited prices, the facilitator
disclaimer, a CTA, and banned phrases — 16 English pages passed to `review`; the 14 non-English drafts
(Arabic/Amharic/Burmese) are flagged **pending native-speaker QA** (honest — machine translation isn't
sign-off). Approved pages publish to a static site ([`publish_site.mjs`](./data-core/publish_site.mjs)).

### 5.3b Distribution & the media strategy — *reach*

Each published page is repurposed ([`data-core/repurpose_content.mjs`](./data-core/repurpose_content.mjs))
into platform-native posts — LinkedIn (B2B), Instagram (carousel), Reddit (value-first), WhatsApp, X — via
the failover chain, facts injected from the source page. Queue at `/distribution`; **human-gated**, nothing
auto-posts (real posting needs a platform key + `POST_LIVE=1` + approval, per [`lib/publishers.mjs`](./lib/publishers.mjs)).

**The media strategy** ([`lib/media.mjs`](./lib/media.mjs)) — a deliberate art-direction call: AI-generated
*people* read as uncanny, so the router picks the right source per slide:
- **Data → infographic** ([`lib/infographic.mjs`](./lib/infographic.mjs)): on-brand HTML rendered to PNG via
  the local browser, built from **real data-core numbers** with a live-computed savings % — crisp real text,
  no AI gibberish.
- **People → stock photo** ([`lib/stock.mjs`](./lib/stock.mjs)): real, warm photography from Pexels (free
  key) or Openverse (no key), with attribution.
- **Abstract → AI** ([`lib/image.mjs`](./lib/image.mjs)): only for decorative graphics, prompted with no
  faces/text. Free via Cloudflare FLUX.

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

### 5.6 Patient acquisition & the journey sandbox — *demand → booked patient*

Once a lead exists, a **WhatsApp sales-comms state machine** ([`lib/comms_machine.mjs`](./lib/comms_machine.mjs))
drives it from first touch to treated-and-referred. It's pure logic (no I/O): given a lead's journey position
and timing, it returns the next human-gated action, honouring the WhatsApp **24-hour session rule** (free-form
only ≤24h after the patient's last message, otherwise an approved template), a no-reply **nudge cadence + cap**,
a **diagnosis fork** (knows the procedure → product selection vs. has symptoms → remote opinion), explicit
**hospital handoffs** (`clinical:true` steps the medical team owns — MedYatra never advises), and stress-hardened
edge states (visa denied / not-fit-to-fly, reschedule, complication). 22 stages, one approval-ready template each
([`data-core/gen_comms.mjs`](./data-core/gen_comms.mjs), stored in `comms_template`).

**Scope, deliberately narrow** (build-os/09): MedYatra does *light* coordination — demand-gen, qualification,
relaying reports to the hospital, and **supporting documents** (orchestrating the hospital invitation letter +
a visa checklist, [`lib/visa.mjs`](./lib/visa.mjs)). The **patient applies for their own visa and books their
own tickets**; near-hospital stay is partner-provided ([`lib/stay.mjs`](./lib/stay.mjs)). No heavy logistics.

**Dual-mode intake:** leads enter from the engine's own acquisition *or* an external operator's lead DB plugged
in via `POST /api/lead/ingest` ([`data-core/ingest.mjs`](./data-core/ingest.mjs) — per-tenant token, normalises
country→market + treatment→category, masks PII, dedupes, tags `source_type`). Multi-tenant, with **tenant data
isolation** and a de-identified k-anonymised cross-tenant benchmark (`/benchmarks`) as the honest, legally-clean
learning layer — *not* patient-data reuse (see [`build-os/11`](./build-os/11_GTM_MODEL_FORK.md)).

**The deployment surface — `/sandbox`** ([`server/sandbox.mjs`](./server/sandbox.mjs)): the customer-facing,
deployment-ready demo of the whole journey. A WhatsApp **phone simulator** plays the conversation; every branch
and fallback is a one-click event; the journey rail groups all 22 stages by phase. Any of the 21 templates is
**clickable and editable live** — body text, quick-reply buttons, variables — with a live preview and a
white-label **tenant switch** (show an operator their own front). Editing is **human-gated**: a saved edit routes
the template back to `review` before it can ever send. The same page powers the live route (edits `POST` to the
DB) and a self-contained shareable artifact (edits persist to the browser). This is what you put in front of a
prospective operator to let them *feel* the product and shape the copy without touching anything real.

Everything outbound is still approved in **MedYatra Studio** (`/studio`, [`server/studio.mjs`](./server/studio.mjs)) —
the live approve-and-deploy console that re-checks the gates (regulatory · verified contact · consent) and writes
back: publishes a page, marks a proposal sent, approves a post, or releases a comms draft and advances the lead.

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
| `channel_post` | Repurposed platform posts (LinkedIn/IG/Reddit/WhatsApp/X), human-gated |
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

Also available (run with `node --experimental-sqlite data-core/<script>`):
`repurpose_content.mjs` (→ social posts + visuals · `/distribution`) · `gen_proposals.mjs` (tailored
proposals) · `gen_credibility.mjs` (trust narratives). Server routes: `/console`, `/studio` (approve-and-deploy),
`/sandbox` (editable patient-journey demo), `/comms` (template list), `/benchmarks` (de-identified aggregate),
`/plugins` (integration readiness), `/distribution`, `/worklist`. Capture a confirmed contact:
`node --experimental-sqlite data-core/capture_poc.mjs <partner_id> "Full Name" "Role" "<email|linkedin-url>"`

---

## 9. Honest limitations & what's next

**Current limits (stated plainly):**
- **GLM-5.2 is unserved** on the current NVIDIA account (key valid, model gated) — the chain now runs on
  **Gemini 2.5-flash** (llama tiers dropped; GLM fails over in ~12s via a short NIM probe budget). Re-enable GLM at build.nvidia.com to restore the designed primary.
- **Named-contact discovery is intermittent** — stealth mode gets past CAPTCHAs but not every time (≈6/9 in
  testing); running on your own desktop (less-flagged IP) improves the hit rate.
- **Inferred emails are guesses** — low-confidence until MX-verified (blocked in the sandbox that built this;
  works on a real machine) and human-confirmed.
- **Non-English content is machine-drafted** — flagged pending native-speaker QA; not publish-ready.
- **Real social posting is wired but off** — adapters are dry-run until a platform key + `POST_LIVE=1` +
  approval; Instagram also needs a public image host (see the setup notes).
- **Premium image gen (Gemini "Nano Banana") needs billing** — the free default (Cloudflare FLUX) is on.
- **The WhatsApp comms are logic-complete but not connected to a real Meta number.** The state machine, all
  21 approval-ready templates, the diagnosis fork, hospital handoffs, and the editable **/sandbox** demo are
  built and driveable; going live needs a WhatsApp Business API number + template approval + `POST_LIVE=1`.

**Natural next steps:** connect a live WhatsApp number and submit the templates to Meta; a new-market dry run
(add Myanmar via config only); native QA on the non-English pages; turn on a real social channel (LinkedIn/X
first); re-enable GLM-5.2.

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
