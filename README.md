# MedYatra — an agentic Go-To-Market engine

An **autonomous, multi-agent go-to-market engine** for a medical-tourism *facilitator* launching in India — and re-tailorable to any market. It decides what to sell, builds the hospital-partner supply side (down to the named decision-maker), runs a multilingual content/brand campaign, and shows all of it moving on a live operator console.

> Built as a demonstration of end-to-end **AI product engineering**: agent orchestration, a multi-model cost-tiered factory with failover, browser automation that gets past what APIs can't, a zero-dependency data core, and a real-time UI — with an honest compliance posture throughout.

![Operator console — the partner account board](outputs/screenshots/console_named_pocs.png)

---

## What it actually does

| # | Capability | How it's real (not a mock) |
|---|---|---|
| 1 | **Decides what to sell** | Weighted scoring model ranks 6 treatment categories on cost-arbitrage, quality, ease, demand, margin, whitespace. Prices are cross-checked against live competitor pages (Vaidam/MediGence) via browser scraping. |
| 2 | **Builds the partner supply side** | 24 hospital partners tiered by a *"does this partner need us?"* fit score (the margin thesis: high quality × low current international presence). Finds the **named** decision-maker (Head–International Patient Services) via stealth Google→LinkedIn, infers their email, and tracks each account through a pipeline with a next action. |
| 3 | **Builds the demand side** | 30 cornerstone cost-guide pages generated across 6 categories × target markets × 4 languages (EN/AR/AM/MY), QA-gated for cited prices + disclaimers, published to a static site. |
| 4 | **Globalizes** | Every artifact is market-parameterized (config, not code) across the Middle East, Africa, Europe, SE Asia. |
| 5 | **Shows its work** | A live localhost console renders the account board, content heatmap, competitor pricing, and a real-time run feed — every agent action is logged and visible. |

## Architecture — a cost-tiered multi-model factory

```
  Tier 1  Orchestrator / QA / compliance      (Claude — strategy, guardrails, final sign-off)
     │
     ▼
  Tier 2  Bulk generation                      NVIDIA NIM failover chain:
     │      content, proposals, outreach          GLM-5.2 → llama-3.3-70b → llama-3.1-8b
     ▼                                             (first responder wins; survives model outages
  Tier 3  Narrow patches (meta, classify)         AND Claude hitting its usage limit)
     │
     ▼
  Free/local execution layer  ── SQLite data core (node:sqlite, zero deps)
                              ── Browser automation (puppeteer-core → local Edge; stealth mode)
                              ── Free web research · local .eml outbox · static-site generator
                              ── Zero-dep HTTP server + live console
```

The processing loop runs at **~$0 marginal cost**: the only paid call is LLM tokens (on a free NVIDIA tier), and even generation fails over automatically if a model is unreachable.

## Quickstart

Requires **Node ≥ 22.5** (for the built-in `node:sqlite`).

```bash
npm install                 # only dependency: puppeteer-core (drives your local Edge/Chrome)
cp integrations/.env.example integrations/.env   # add your NVIDIA NIM key (optional; failover works without GLM)
npm run seed                # build + seed the SQLite data core
npm run serve               # → http://localhost:5173  (patient landing) and /console (operator console)
```

Then explore the engine:

```bash
npm run query portfolio     # ranked treatment categories with scores
npm run partner-layer       # rebuild the fit-ranked account board
npm run worklist            # generate the human research worklist (/worklist)
STEALTH=1 npm run discover  # find named decision-makers via Google→LinkedIn (real browser)
npm run loop                # one unattended factory cycle (runs without Claude)
```

## What's honest about it

This is a **first-draft engine**, and it says so where it matters:

- **No fabrication.** Prices are cited or marked indicative; discovered contacts are stored **UNVERIFIED** for human confirmation; the engine is a *facilitator*, never a provider, and makes no clinical claims.
- **Real walls, honestly handled.** Named decision-makers live behind forms and Sales-Nav — free *automated* search is CAPTCHA-walled, so the engine uses a **stealth real-browser** path plus a paid-enrichment adapter that's one env-key away. Both documented, neither faked.
- **Human gates** on everything outbound: publishing pages, sending outreach, and any commercial term.
- **Privacy-respecting repo.** Individual contact data lives only in the local gitignored database — the published repo ships institutional/public data only.

## Repo map

| Path | What's there |
|---|---|
| [`agent-os/`](./agent-os/) | *How* the agents loop, route models, QA, and stop — plus the live task queue and evidence log |
| [`build-os/`](./build-os/) | *What* to build + the actual GTM strategy, data sources, compliance, acceptance tests |
| [`data-core/`](./data-core/) | SQLite schema + seed + every agent script (scoring, sourcing, discovery, content, QA, publish) |
| [`server/`](./server/) | Zero-dep HTTP server, live operator console, patient landing page |
| [`lib/`](./lib/) | Browser automation, free web research, enrichment adapter, mailer, tier-3 router |
| [`integrations/`](./integrations/) | NVIDIA GLM/failover helper + LiteLLM config |
| [`outputs/`](./outputs/) | Generated content, outreach drafts, research worklist, screenshots |

**Want the deep version?** See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — a full walkthrough of every capability, design decision, nuance, and limitation.
