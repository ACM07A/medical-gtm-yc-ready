# MedYatra — an agentic Go-To-Market engine

An **autonomous, multi-agent go-to-market engine** for a medical-tourism *facilitator* launching in India — and re-tailorable to any market. It decides what to sell, builds the hospital-partner supply side (down to the named decision-maker and a tailored proposal), runs a multilingual content/brand campaign, turns each page into platform-ready social posts with real infographics and stock photos, and shows all of it moving on a live operator console — continuing on a schedule even when Claude is offline.

> Built as a demonstration of end-to-end **AI product engineering**: multi-agent orchestration, a cost-tiered multi-model factory with cross-provider failover, browser automation that gets past what APIs can't, a pluggable integration layer (image gen, social posting, enrichment — each one env-key away), a zero-dependency data core, and a real-time UI — with an honest compliance posture throughout.

![Operator console — the partner account board](outputs/screenshots/console_named_pocs.png)

---

## What it actually does

| # | Capability | How it's real (not a mock) |
|---|---|---|
| 1 | **Decides what to sell** | Weighted scoring model ranks 6 medical categories on cost-arbitrage, quality, ease, demand, margin, whitespace — plus a **bundleable wellness/naturopathy line** sold standalone (lowest-friction, cash-pay) or as a post-op recovery add-on. Prices are cross-checked against live competitor pages (Vaidam/MediGence) via browser scraping. *(Ophthalmology was evaluated and dropped — low-ticket, follow-up-heavy, better delivered locally; see `build-os/03`.)* |
| 2 | **Builds the partner supply side** | Hospital partners tiered by a *"does this partner need us?"* fit score (the margin thesis: high quality × low current international presence), plus naturopathy-resort **wellness supply** (Jindal, Kshemavana, Soukya…). Finds the **named** decision-maker (Head–International Patient Services) via stealth Google→LinkedIn, infers their email, and tracks each account through a pipeline with a next action. |
| 3 | **Builds the demand side** | 30 cornerstone cost-guide pages generated across 6 categories × target markets × 4 languages (EN/AR/AM/MY), QA-gated for cited prices + disclaimers, published to a static site. |
| 4 | **Distributes it** | Each page is repurposed into platform-native posts (LinkedIn / Instagram / Reddit / WhatsApp / X). Visuals pick the right source per slide: **data infographics** (real numbers, crisp text), **stock photos** for people, AI only for abstract graphics. Human-gated at post. |
| 5 | **Globalizes** | Every artifact is market-parameterized (config, not code) across the Middle East, Africa, Europe, SE Asia. |
| 6 | **Runs itself** | A scheduled task drives the whole factory **without Claude** (generation fails over across providers); a live console renders the account board, content heatmap, competitor pricing, a plugin-readiness board, and a real-time run feed. |
| 7 | **Sells & onboards patients** | A **dual-mode funnel**: leads enter from the engine's *own acquisition* **or** an *external lead DB plugged in* by a partner operator (`lead.source_type`). A mapped WhatsApp sales-comms flow — template/session-aware, with a **diagnosis fork** (knows the procedure vs. needs diagnosing) and explicit **hospital handoffs** — drives first touch → booked patient. Approvals happen in **MedYatra Studio**, a human approve-and-deploy console. |

## Architecture — a cost-tiered multi-model factory

```
  Tier 1  Orchestrator / QA / compliance      (Claude — strategy, guardrails, final sign-off)
     │
     ▼
  Tier 2  Bulk generation                      Cross-provider failover chain:
     │      content, proposals, outreach          GLM-5.2 → Gemini 2.5-flash  (NIM gets a short
     ▼                                             probe budget → fast failover; first responder wins;
                                                   survives model outages
  Tier 3  Narrow patches (meta, classify)         AND Claude hitting its usage limit)
     │
     ▼
  Plugin layer (each one env-key away)  ── image gen (Cloudflare FLUX free · Gemini · OpenAI · Stability)
     │                                   ── infographics (HTML→PNG) · stock photos (Pexels/Openverse)
     │                                   ── social posting (Meta · LinkedIn · X · Reddit · WhatsApp)
     ▼                                   ── enrichment · email — all dry-run/human-gated until keyed
  Free/local execution layer  ── SQLite data core (node:sqlite, zero deps)
                              ── Browser automation (puppeteer-core → local Edge; stealth mode)
                              ── Free web research · local .eml outbox · static-site generator
                              ── Zero-dep HTTP server + live console + scheduled factory loop
```

The processing loop runs at **~$0 marginal cost**: generation is on free tiers and fails over across providers, images/infographics/stock are free, and the only optional paid calls (premium image models, enrichment, real posting) are behind env keys, off by default. See the live **plugin-readiness board** at `/plugins`.

## Quickstart

Requires **Node ≥ 22.5** (for the built-in `node:sqlite`).

```bash
npm install                 # only dependency: puppeteer-core (drives your local Edge/Chrome)
cp integrations/.env.example integrations/.env   # add NVIDIA NIM and/or Gemini key (Gemini carries generation when GLM is unserved)
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
- **Real walls, honestly handled — including the legal one.** Named decision-makers live behind forms and Sales-Nav. The **compliant** path is a licensed enrichment API (used first when keyed). The stealth-browser fallback is **off by default and opt-in** (`ALLOW_SCRAPE=1`) because defeating anti-bot detection can violate a service's ToS *regardless of the data being public* — with a **CAPTCHA circuit-breaker** that backs off when the IP is flagged and falls to a human worklist. No pretending scraping is "clean." (See [`build-os/10`](./build-os/10_SECURITY_COMPLIANCE.md).)
- **Human gates** on everything outbound: publishing pages, sending outreach, and any commercial term.
- **Privacy-respecting repo.** Individual contact data lives only in the local gitignored database — the published repo ships institutional/public data only.

## Repo map

| Path | What's there |
|---|---|
| [`agent-os/`](./agent-os/) | *How* the agents loop, route models, QA, and stop — plus the live task queue and evidence log |
| [`build-os/`](./build-os/) | *What* to build + the actual GTM strategy, data sources, compliance, acceptance tests |
| [`data-core/`](./data-core/) | SQLite schema + seed + every agent script (scoring, sourcing, discovery, content, QA, publish, repurpose, proposals, credibility, run-loop) |
| [`server/`](./server/) | Zero-dep HTTP server, live operator console, patient landing, `/plugins`, `/distribution`, `/worklist` |
| [`lib/`](./lib/) | Browser automation, research, enrichment, mailer, image gen, infographics, stock, media router, social publishers, plugin registry, env loader |
| [`integrations/`](./integrations/) | Cross-provider LLM failover helper (+ Gemini) + LiteLLM config |
| [`scripts/`](./scripts/) | `run_factory.bat` — the scheduled unattended factory loop |
| [`outputs/`](./outputs/) | Generated content, social posts + visuals, proposals (gitignored), worklist, screenshots |

**Want the deep version?** See [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) — a full walkthrough of every capability, design decision, nuance, and limitation.
