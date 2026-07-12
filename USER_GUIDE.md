# MedYatra — User Guide

A practical, step-by-step guide to running and operating the engine. For the *why* behind it, see
[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md); for the 2-minute pitch, see [`README.md`](./README.md).

> **What it is, in one line:** an agentic go-to-market engine for a medical-tourism *facilitator* — it decides
> what to sell, builds the hospital-partner supply side, runs a multilingual content campaign, and drives each
> patient from first WhatsApp touch to treated-and-referred, all human-gated, running at ~$0 until you plug in keys.

---

## Part 1 — Setup (once)

### Step 1. Prerequisites
- **Node ≥ 22.5** (for the built-in `node:sqlite`). Check: `node -v`.
- **Microsoft Edge or Google Chrome** installed (the browser automation and infographic rendering drive your local browser — no Chromium download).

### Step 2. Install
```bash
npm install          # only dependency: puppeteer-core
```

### Step 3. Add keys (optional but recommended)
```bash
cp integrations/.env.example integrations/.env
```
Open `integrations/.env` and add at least one generation key so content/proposals/comms can be drafted:
- `GEMINI_API_KEY` — carries generation today (free tier).
- `NVIDIA_API_KEY` — the GLM tier (fails over to Gemini).
- `PEXELS_API_KEY` — real stock photos (optional; falls back to Openverse).

Everything else (WhatsApp, enrichment, social, email) is **off until keyed** and not needed to run the demo. See [`build-os/12_GO_LIVE.md`](./build-os/12_GO_LIVE.md).

### Step 4. Build the data core
```bash
npm run seed             # creates + seeds data-core/medyatra.db (+ activity feed)
npm run seed-tenants     # the own-brand + a demo operator tenant (dual-mode)
npm run seed-leads       # demo patient leads for the journey/comms
npm run comms            # generate the 21 WhatsApp templates + infographic headers
```

### Step 5. Start it
```bash
npm run serve            # → http://localhost:5173
```
Leave this running. Open **http://localhost:5173/demo** — that's your home base.

> **Tip:** if a page 404s or looks stale, you edited code while the server was up — stop it (Ctrl-C) and
> `npm run serve` again.

---

## Part 2 — The 60-second demo path

The fastest way to *see* the whole thing, in order:

1. **`/demo`** — the hub. Live counts of everything; every card is a real, clickable surface.
2. **`/sandbox`** — click into the **patient-journey sandbox**. Hit **▶ Auto-play** to watch a patient go from
   first WhatsApp touch to treated-and-referred. Then click any message → **edit** its text → **Save**.
3. **`/console`** — the operator cockpit: the fit-ranked partner accounts, named decision-makers, and a live feed.
4. **`/studio`** — the human gate: everything awaiting approval in one inbox, with the compliance gates enforced.
5. **`/`** — the patient-facing landing with the published cost-guides.

That's the story: **decide what to sell → build supply → build demand → convert patients → approve everything.**

---

## Part 3 — Using each surface

### `/demo` — the hub
Your launchpad. Shows live counts (partners, contacts, content, templates, leads, tenants) and links every
capability. The "Going live = plugging in keys" strip points at what production needs. Start here when showing anyone.

### `/sandbox` — the patient-journey sandbox ⭐ (the editable one)
A WhatsApp phone simulator for the entire sales journey. This is the surface you put in front of a prospective operator.
- **Play the journey:** click the green **▶ advance** button (happy path) or **Auto-play**. Each step shows the
  patient's action, then the message that fires.
- **Take a branch:** the control bar under the phone lists every real event — *Knows their procedure*, *Has symptoms*,
  *Raises an objection*, *Visa denied*, *A complication arises*, *Goes quiet*, etc. Click one to steer the conversation.
- **Browse the map:** the left rail groups all 22 stages by phase (Acquire → Qualify → Decide → Book & travel →
  Treat → Recover → Dormant). Dots mark hospital-handoffs, won, and terminal states.
- **Edit a template:** click **edit** on any message (or a rail chip). Change the body, the `{{variables}}`, or the
  quick-reply buttons — the phone updates live. Click **Save draft**.
- **The gate:** saving sets that template back to **Review** — it *cannot send* until a human re-approves in Studio.
- **White-label:** the "Viewing as" dropdown swaps the brand (MedYatra ↔ a demo operator) so you can show an operator their own front.
- **Reset** clears the conversation; nothing is ever sent from here.

### `/` and the content library
The patient-facing landing shows launch categories with prices and the **published** cost-guides. A guide only appears
here once it has (a) passed QA and (b) had its market cleared by the regulatory gate (Part 4).

### `/console` — the operator console
Read-only cockpit, polls every few seconds:
- **Account board** — hospital partners ranked by *fit score* (quality × low current international presence), each with
  a stated reason, a contact path (named-verified › named-public › inferred › desk › open), and a next action.
- **Portfolio** — category scores and our-price-vs-market band.
- **Live feed** — every agent action writes a `run` row; this is the proof it's working.

### `/studio` — approve & deploy (your daily driver)
The single human gate for everything outbound. One inbox of items awaiting approval — a content page, a partner
proposal, a social post, a WhatsApp comms draft.
- Each item shows its **automated-QA badges** and the **gates**: *regulatory · verified contact · consent*.
- The **Approve** button stays physically disabled until the required gates are green.
- Approving **writes back**: publishes the page / marks the proposal sent / approves the post / releases the comms
  draft and advances the lead's journey stage.
- Scope it to one operator with `/studio?tenant=<id>` — they see only their own queue (tenant isolation).

### `/comms` — the WhatsApp template library
The read-only list of all 21 approval-ready templates (body + header + buttons + category/type). This is what a human
files with Meta. To *edit* them interactively, use `/sandbox`.

### `/worklist` — partner research (the compliant sourcing bridge)
For each star account, ready-to-click Google + LinkedIn search URLs and the real hospital domain, so a human confirms
the named decision-maker in ~10 minutes — manual search, no anti-bot circumvention. Capture a confirmed find with:
```bash
node --experimental-sqlite data-core/capture_poc.mjs <partner_id> "Full Name" "Role" "<email|linkedin-url>"
```

### `/distribution` — the social queue
Each published page repurposed into platform-native posts (LinkedIn / Instagram / Reddit / WhatsApp / X). All drafts;
**nothing auto-posts** (real posting needs a platform key + `POST_LIVE=1` + per-post approval).

### `/benchmarks` — cross-tenant learning
A de-identified, k-anonymised funnel across operators. Every tenant + patient identifier is stripped and small cells
are suppressed — this is aggregate learning, **not** patient-data reuse.

### `/plugins` — integration readiness
The board of what's live (🟢) vs. one key away (⚪). Add a key to `integrations/.env`, restart, and it flips.

---

## Part 4 — The operating loop (day-to-day)

The engine runs the same loop for content and outreach. **Generate → QA → gate → human-approve → publish/send.**

**Content:**
```bash
node --experimental-sqlite data-core/gen_content.mjs        # draft cost-guides (fills gap cells)
npm run qa                                                  # English drafts that pass → 'review'
# clear a market for real (or demo) before it can go live:
node --experimental-sqlite data-core/set_regulatory.mjs <MK> verified "counsel confirmed <date>"
node --experimental-sqlite data-core/publish_site.mjs       # 'review' + cleared market → 'published'
```

**Distribution:**
```bash
FORCE=1 node --experimental-sqlite data-core/repurpose_content.mjs <N>   # first N published pages → social drafts
```

**Partners & outreach:**
```bash
npm run partner-layer     # (re)build the fit-ranked account board
npm run worklist          # generate the human research worklist (/worklist)
STEALTH=1 npm run discover # find named decision-makers via Google→LinkedIn (real browser, your desktop)
npm run infer             # infer likely emails (INFERRED, low-confidence, human-gate)
npm run proposals         # tailored partnership proposals per top account (→ Studio 'review')
```

**Patient comms:**
```bash
npm run comms-run         # the state machine computes each lead's next human-gated action
```

**Run it all unattended (the "without Claude" loop):**
```bash
npm run loop              # one full factory cycle; generation fails over across providers
```

Then approve the results in **`/studio`**. Nothing outbound happens without that click.

---

## Part 5 — Dual-mode: plug in an operator's leads

The engine works as its own acquisition front **or** as the backend for an outside operator who pushes their leads in.
Each operator is a tenant with its own token; ingestion normalises the data, masks PII, dedupes, and tags the source.

```bash
curl -X POST http://localhost:5173/api/lead/ingest \
  -H "content-type: application/json" \
  -H "X-Ingest-Token: <that tenant's token>" \
  -d '{"source":"<tenant-id>","leads":[
        {"handle":"+9715xxxxxxx","country":"AE","treatment":"knee replacement","consent":true}
      ]}'
```
Returns a breakdown: `accepted / deduped / held_no_consent / held_regulatory / rejected`. Ingested leads flow into the
same journey + Studio, isolated to that tenant. (Tenant tokens are set by `npm run seed-tenants`; never commit them.)

---

## Part 6 — Going live

There is **no rebuild** between demo and production — it's an env file plus a few real-world approvals. The exact,
itemised checklist is [`build-os/12_GO_LIVE.md`](./build-os/12_GO_LIVE.md). In short:
1. **WhatsApp:** provision a Business API number, submit the 21 templates to Meta, set the tokens + `POST_LIVE=1`.
2. **Enrichment / social / email:** add the respective keys; each stays double-gated.
3. **Regulatory:** replace the demo market clearances with real counsel sign-off (`set_regulatory.mjs`).
4. **Access:** set `CONSOLE_TOKEN` before exposing anything beyond localhost.

---

## Part 7 — The rules you can't break (built in, by design)

- **Facilitator, not provider** — no clinical claims, diagnoses, or outcome guarantees anywhere.
- **No fabrication** — prices are cited or marked indicative; discovered contacts are stored **UNVERIFIED** until a human confirms.
- **Human gates** on every publish, send, and commercial term. The engine drafts; a person approves.
- **Tenant isolation** — one operator's patient data is never reused for another. Cross-tenant learning is de-identified aggregate only.
- **Privacy** — individual contacts + patient PII live only in the gitignored `medyatra.db` and `outputs/proposals/`. Never commit a `.db`.

---

## Part 8 — Troubleshooting

| Symptom | Fix |
|---|---|
| **localhost won't load / a route 404s** | The server is stale or not running. Stop it (Ctrl-C) and `npm run serve` again — code changes need a restart. |
| **"experimental-sqlite" / DatabaseSync error** | You're on Node < 22.5. Upgrade Node. |
| **Generation fails with 429 / "too many requests"** | Provider rate limit. Wait a minute and retry; batch scripts back off automatically. Keep batch sizes small. |
| **Landing shows no guides** | Content isn't published. Run `npm run qa`, clear a market with `set_regulatory.mjs`, then `publish_site.mjs`. |
| **`/distribution` is empty** | Run `FORCE=1 node --experimental-sqlite data-core/repurpose_content.mjs <N>`. |
| **Infographics/discovery do nothing** | No local Edge/Chrome found, or it's busy. Ensure one is installed; for `discover`, close it first (profile lock). |
| **Approve button is disabled in Studio** | A gate isn't green — the item needs a cleared market, a verified contact, or consent. That's intended. |

---

*MedYatra is a working first-draft engine and a demonstration of end-to-end agentic product engineering. Codename
"MedYatra" ("medical journey") — rename freely.*
