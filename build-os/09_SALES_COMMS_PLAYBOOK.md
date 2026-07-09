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

## The sequence — what we send, in order

| # | Stage | Type | WA category | Body (minimal, kosher) | Image header (carries the value) |
|---|---|---|---|---|---|
| 1 | **Acknowledge** | template/session | Utility | "Hi {{1}}, thanks for reaching out to MedYatra about {{2}} in India. Your care coordinator will share options shortly." | Welcome ("world-class care, honest prices") |
| 2 | **Qualify** | session (in 24h) | — | "To tailor your options, could you share your recent reports, preferred timing, and the city you'll travel from?" | *How it works* (sets expectations) |
| 3 | **Estimate** | template | Utility | "Hi {{1}}, here's the indicative cost range for {{2}} you asked about — a package estimate, not a final quote. Your coordinator will confirm details." | **Cost comparison** (India vs Western, save X%) ← the workhorse |
| 4 | **Hospital options** | template/session | Utility | "We've shortlisted accredited hospitals for your {{2}}. Tap to see doctor profiles." | Credibility / hospital spotlight |
| 5 | **Logistics** | template/session | Utility | "Here's how your medical trip works — visa invitation, travel, stay and support, step by step." | *How it works* (4 steps) |
| 6 | **Re-engage** | template | Marketing (opt-in) | "Hi {{1}}, still considering treatment in India? Your coordinator is here whenever you're ready — no pressure." | Reassurance / testimonial |

Within the 24h window, steps 2/4/5 are free-form session messages (no template needed). Outside it, they
fall back to the pre-approved template. Step 3 (estimate) and 6 (re-engage) are template-first.

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

## Implementation

- `data-core/gen_comms.mjs` — drafts the 6 approval-ready templates (body + category + buttons + which
  infographic header) and renders the paired infographics; stores them in `comms_template`; view at `/comms`.
- `lib/publishers.mjs` `whatsapp.sendTemplate()` — sends an approved template with image header + variables
  (human-gated).
- `lib/infographic.mjs` — the image headers (welcome, cost comparison, how-it-works).

## Related
[[05_CONTENT_BRAND_CAMPAIGN]] · [[07_SYSTEM_DESIGN]] · [[10_SECURITY_COMPLIANCE]]
