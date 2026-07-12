# 12 · Go-Live Checklist — from demo to production

**The principle: there is no rebuild between the demo and production.** Every integration is already wired to
the correct API shape and runs in a safe mode (dry-run / local outbox / placeholder / preview) until a key is
present and a human approves. Going live is an `integrations/.env` file plus a few real-world approvals — not an
engineering project. This file is the exact list.

Legend: 🟢 works now · 🔑 needs an API key · 🖊️ needs a human/business action.

---

## 0. Already live (no key needed)
- 🟢 **Text generation** — cross-provider failover (GLM → Gemini). Keys present: `NVIDIA_API_KEY`, `GEMINI_API_KEY`.
- 🟢 **Infographics** — HTML→PNG via the local browser, real data-core numbers.
- 🟢 **Stock photography** — Pexels (`PEXELS_API_KEY` present) / Openverse (no key).
- 🟢 **Abstract image gen** — Cloudflare FLUX (free, no card).
- 🟢 **Visa supporting-docs + accommodation search** — with curated fallbacks; provider keys optional.
- 🟢 **Data core, console, Studio, sandbox, benchmarks, static site** — all local, zero-dep.

## 1. WhatsApp — the patient channel  🔑🖊️
The comms state machine, all 21 templates, and the `/sandbox` are logic-complete. To send for real:
1. 🖊️ Provision a **WhatsApp Business API** number (Meta Cloud API or a BSP — Twilio / 360dialog / Gupshup).
2. 🖊️ **Submit the 21 templates to Meta** for approval (`outputs/comms/whatsapp-templates.md` is the submission sheet). Utility bodies are kept minimal precisely to pass review.
3. 🔑 Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_WABA_ID` (+ webhook verify token) in `.env`.
4. 🔑 Set `POST_LIVE=1` to arm sending. **Still human-gated** — Studio releases each message; the 24h-session / template rules are enforced by `lib/comms_machine.mjs`.
5. Wire the inbound webhook to update `lead.last_inbound_at` + `journey_stage` (the machine already consumes these).

## 2. Named-contact enrichment  🔑
- 🔑 `HUNTER_API_KEY` (or Apollo) → verified named decision-makers flow straight into the partner board as the preferred contact path, replacing the INFERRED/worklist fallback. Free-first stays as the default.

## 3. Social distribution  🔑🖊️
Adapters are wired and **double-gated** (dry-run unless `POST_LIVE=1` **and** per-post approval in `/distribution`).
- 🔑 `LINKEDIN_TOKEN` · `META_TOKEN` (Instagram/Facebook) · `X_*` · `REDDIT_*`.
- 🖊️ Instagram also needs a public image host for the carousel assets.
- Start with one channel (LinkedIn or X) and approve post-by-post.

## 4. Email / outreach  🔑
- 🔑 `RESEND_API_KEY` → partner outreach sends via Resend instead of the local `.eml` outbox. Human-gated at send.

## 5. Regulatory clearance  🖊️  (compliance-critical)
- The demo marks **GB / IE / KE** as `verified` with a note that says *"DEMO clearance — illustrative, not legal sign-off."*
- 🖊️ Before any real solicitation, replace these with **actual counsel sign-off** per market:
  `node --experimental-sqlite data-core/set_regulatory.mjs <MK> verified "counsel confirmed <date>"`.
  Anything not `verified` is auto-gated to preview and will never market live. **Do not ship the demo clearances.**

## 6. Access control & hosting  🔑🖊️
- 🔑 Set `CONSOLE_TOKEN` before exposing anything beyond localhost — it Basic-Auth-gates the console, Studio, sandbox, and all operator APIs (the public patient site + health probe stay open). Currently unset = open for local dev.
- 🖊️ The data core is a single SQLite file (`data-core/medyatra.db`). For multi-user production, host it on a small box or move to a managed SQLite/Postgres; the schema is portable.
- 🖊️ Individual contacts + patient PII live only in the **gitignored** DB and `outputs/proposals/` — keep it that way; never commit a `.db`.

---

## One-glance status

| Area | State | To go live |
|---|---|---|
| Generation / content / infographics / stock | 🟢 live | — |
| Patient landing + cost guides | 🟢 live (10 pages) | real regulatory clearance (§5) |
| Patient journey logic + templates + sandbox | 🟢 built | WhatsApp number + Meta approval + `POST_LIVE` (§1) |
| Named-contact discovery | 🟢 free path | `HUNTER_API_KEY` for verified (§2) |
| Social distribution | 🟡 wired, off | platform tokens + `POST_LIVE` + approval (§3) |
| Email outreach | 🟡 local outbox | `RESEND_API_KEY` (§4) |
| Regulatory gate | 🟢 enforced | replace demo clearances with counsel (§5) |
| Access / hosting | 🟡 localhost | `CONSOLE_TOKEN` + a host (§6) |

> Rule of thumb: if a switch is missing, the system **degrades safely** (dry-run, preview, placeholder, local
> outbox) and says so on `/plugins` — it never silently fails or fabricates. Add the key, restart, done.
