# YC Refocus — Decisions and Corrected Application Copy

**Date:** 2026-07-26 · **Deadline:** 2026-07-27 20:00 PT (Jul 28 08:30 IST)
**Supersedes** the wedge/buyer sections of `YC_PLAN.md` (§5.1–5.2, §10). Everything else in YC_PLAN —
the honesty discipline, demo mechanics, buzzword table, video guidance, checklists — **stands and should be followed.**

## The decisions (founder, 2026-07-26)

1. **Wedge = patient facilitator; agents are a channel, not the customer.** YC_PLAN's agent-SaaS framing
   (agents pay ₹15–30k/mo) is rejected: it contradicts the commission thesis (we undercut incumbent agents'
   25–33% at 20%) and would arm the incumbents we exist to displace.
2. **Canonical repo = `github.com/hussainbombaywala/medical-tourism-gtm`.** YC_PLAN's `ACM07A/...` URL is
   to be corrected everywhere it appears in the application.
3. **Name frozen with Ajeya today.** Canopus Care remains the propagated placeholder until then.
   "The Health Journey" checked and not recommended: Health Journeys, Inc. (est. 1991, health media,
   hospital/Kaiser clients) is near-identical prior use in-category; descriptive mark = weak protection;
   and the domain economics are inverted (.health renews at ~$59–76/yr, .ai is premium with a 2-yr minimum,
   while .com is the ~$11/yr TLD — availability, not price, is its constraint). If descriptive clarity is
   wanted, it's the tagline's job: *"Canopus Care — the health-journey company."*
4. **Concierge bot ships in the demo pre-deadline** (built: `/concierge`). Bot name configurable
   (`BOT_NAME`, default **Suhail** — the Arabic name for the star Canopus, a warm human name across the
   Gulf; pronounceable in every target market). The bot is the product face of the end-to-end thesis:
   one conversational point of contact for patient and family across the whole journey.

## Corrected company description (replaces YC_PLAN §10)

**Default:**
> Canopus Care takes an international patient from first enquiry to treated-and-home. A patient in Africa,
> the Middle East, or Central Asia — or a travel agent holding their case — starts with us; we structure the
> case, identify what's missing, get it in front of the right Indian hospital, organize the estimate and a
> video consult with the treating surgeon, then run the visa, travel, stay, interpreter, and aftercare
> logistics. Hospitals pay us per treated patient. Clinicians keep every clinical decision, and sensitive
> actions require human approval.

**Short:**
> Canopus Care is the end-to-end facilitator for patients travelling to India for treatment — from first
> message to treated-and-home — paid by hospitals per treated patient.

**How cases arrive on day one (the agent channel, framed correctly):**
> Medical-travel agents already hold caseloads; they plug them into our rails through a tenant-scoped
> ingestion endpoint because we get their patients to treatment faster. The hospital pays us either way —
> the agent is a supply channel, not the buyer.

**The wedge corridor:** Nigeria/Ethiopia → Bengaluru, cardiac. One corridor, one category, the golden case.

## What the demo now shows (map to the story)

| Application claim | Demo surface |
|---|---|
| One point of contact for the whole journey | **`/concierge` — Ask Suhail** (status, documents, costs, travel; clinical deflection; consent refusal; emergency escalation — all deterministic, key-free) |
| Structured case → hospital → estimate → approval | `/cases/case_ibrahim_musa`, `/hospital`, `/studio` |
| End-to-end journey execution | `/journey` — 14 real agent steps, intake → aftercare |
| Compliance is a feature | consent-blocked case (bot + approvals), `/vault` skip-list, `/audit` |
| Agents as channel | `/agent` view + `POST /api/lead/ingest` (per-tenant token) |
| Honest boundaries | demo strip on every page, `/integrations` real/mock/disabled, readiness endpoint |

## Founder-video line to swap

Replace "Canopus Care connects agents and hospitals in one workflow" with:
> "Canopus Care takes the patient's whole journey — we structure the case, the right hospital responds with
> an estimate, and then we handle the consult, visa, travel, and recovery logistics end to end. AI does the
> administrative work; hospitals keep every clinical decision; humans approve anything sensitive."

## Open before submission
- [ ] Name call with Ajeya (today) — then freeze every surface to one name.
- [ ] Founder-facts section (YC_PLAN §5.6): roles, full-time status, who codes, how Ajeya and Hussain met.
- [ ] Fix repo URL in the application block (hussainbombaywala, not ACM07A).
- [ ] Evidence numbers (YC_PLAN §5.7): interviews held (Sachin + ?), pilots discussed — real numbers only.
