# 09 — Sales Comms Playbook (post-lead)

**Owner agent:** Lead / Comms Agent. **Covers:** what & how we communicate with a patient-lead after it's
created, on the conversion channel (WhatsApp), within Meta's template rules. Human-gated at send.

## The channel reality

WhatsApp is the conversion channel for our markets (ME/Africa/SE Asia). Two message modes:

- **Session messages** (free-form): allowed for **24 hours** after the *user's* last message. No template,
  no pre-approval — say anything compliant. This is where real conversation happens.
- **Template messages**: required to *open* or *re-open* a conversation outside the 24h window. Must be a
  **pre-approved** Meta template. Categories: **Utility** (transactional — highest approval, tied to a user
  action/request), **Marketing** (promotional — needs opt-in, more scrutiny), Authentication (OTP, N/A).

## The template-approval tactic (the core idea)

Meta scrutinizes template **body text** hardest — promotional or claim-heavy copy gets rejected, especially
under Utility. So:

> **Keep the body minimal, transactional, variable-driven. Put the persuasion in the IMAGE header.**

An **image header** (our infographic) is not text-scanned the way body copy is. So the cost-comparison,
the "save 80%", the credibility — all live in the **infographic**, while the template body stays lean and
"kosher": an acknowledgement, a hand-off to a human coordinator, a soft next step. The body's job is only to
be approvable and to **redirect attention to the image**, where the real message is. This is why the
infographic engine (`lib/infographic.mjs`) and the comms system are built together.

Rules we follow so templates pass:
- Correct category (Utility for post-inquiry/estimates/updates; Marketing only for re-engagement, with opt-in).
- Body tied to a user action ("you requested…", "here's the estimate you asked for…"). No unsolicited pitch.
- `{{1}}` variables for name/treatment/city — never leave a variable dangling or start/end body with one.
- No prices/claims/guarantees in the body (prices are "indicative package ranges", shown in the image).
- Quick-reply + CTA buttons (talk to coordinator, view options) — allowed and lift engagement.
- Facilitator voice; no clinical claims; consent captured (`lead.consent`) before any outbound.

## The full journey — a state machine, not a fixed list

The post-lead comms are a **state machine** (`lib/comms_machine.mjs`) that drives the map in
[`design/patient-journey-flow.html`](../design/patient-journey-flow.html). It decides the next action per
lead from its journey position + timing, honouring the 24h session rule, the no-reply nudge cadence
(D2/D5/D9, cap 3 → channel-fallback → dormant), human gates, and which steps are **clinical hospital
handoffs** (remote opinion, quote, slot, invitation letter, pre-op, discharge).

**19 approval-ready templates** (`medyatra_<stage>`) cover every stage — first-touch, nudge, channel-
fallback, qualify, collect-reports, opinion-pending, off-ramp, estimate, doc-reminder, objection, booking,
**visa_start**, **stay_options**, pre-op, in-treatment, post-op, recovery-bundle, review/referral, re-engage.
Utility for transactional; Marketing (opt-in + STOP) for recovery-bundle / review / re-engage. Bodies stay
minimal; the persuasion rides in the image header.

The driver `data-core/comms_run.mjs` walks each lead: **consent → regulatory → opt-out** gates, then drafts
the next message (human-gated dry-run to `outputs/comms/outbox/`), advances stages on no-reply, and fires the
ancillary services (below) at the visa/travel stages. Run: `npm run seed-leads && npm run comms-run`.

## Buttons

- Quick replies: "Talk to a coordinator", "See hospital options", "Not now".
- CTA: "Chat on WhatsApp" / call — routes to the human coordinator (all commercials human-gated).

## Compliance guardrails (health + messaging)

- **Consent first** — no outbound before `lead.consent = 1`; honor opt-out immediately.
- **No clinical claims, no guarantees, no fear-mongering.** Facilitator voice only.
- **Prices** are indicative package ranges (cited), shown as ranges, never presented as a final quote.
- **PII-minimized** — store a handle/ref, not medical records; DPDP/GDPR aligned.
- **Human gate** — templates are drafted by the agent, **submitted to Meta and sent by a human**. The engine
  never auto-sends (see `lib/publishers.mjs`: dry-run unless `POST_LIVE=1` + approval).

## Ancillary services — the wrap-around that makes it a TRIP

A procedure isn't a trip. Two services close the gap (both human-gated, tracked in the `service` table):

- **Visa assistance** (`lib/visa.mjs`) — a *workflow*, not an API (no third-party access to the government
  portal). Since **1 Apr 2025** the e-Medical Visa requires a **system-generated invitation letter issued by
  the hospital** (a clinical handoff we already model); the patient then applies on indianvisaonline.gov.in.
  We orchestrate the letter, give a **country-correct document checklist**, guide the application, and handle
  **attendant visas** (2 allowed; PK 1, BD 3). `startVisa()` creates the patient + attendant service rows,
  blocked on the hospital letter. Optional VFS concierge via `VFS_API_KEY`.
- **Accommodation** (`lib/stay.mjs`) — near-hospital, **extended-stay, family rooms for patient + relatives,
  pre- AND post-op** (post-op window sized by category). Provider-agnostic behind env keys (Booking.com
  Demand API / Hotelbeds / RateHawk), with a **curated near-hospital fallback** until a provider is keyed.
  `bookStay()` is dry-run unless a provider is keyed + `POST_LIVE=1` + confirm.

## Implementation

- `lib/comms_machine.mjs` — the state machine (states, transitions, session/template + nudge logic).
- `data-core/gen_comms.mjs` — drafts the **19** approval-ready templates + renders infographic headers → `comms_template` (`/comms`).
- `data-core/comms_run.mjs` — the engine driver (gates → draft → advance → fire services). `npm run comms-run`.
- `data-core/seed_leads.mjs` — demo leads across journey stages. `npm run seed-leads`.
- `lib/visa.mjs` · `lib/stay.mjs` — ancillary-service adapters. `lib/publishers.mjs` `whatsapp.sendTemplate()` sends (human-gated).
- `lib/infographic.mjs` — the image headers (welcome, cost comparison, how-it-works).

## Related
[[05_CONTENT_BRAND_CAMPAIGN]] · [[07_SYSTEM_DESIGN]] · [[10_SECURITY_COMPLIANCE]]
