# 10 — Security & Compliance

Medical tourism handles health data and makes health-adjacent claims. Compliance is a launch gate, not a nice-to-have.

## Legal / regulatory surface
- **India DPDP Act 2023** — lawful basis + consent for processing patient PII; data-minimization; breach notification.
- **GDPR** — for EU source markets (UK GDPR for UK): consent, DSAR, cross-border transfer safeguards for sending data to India.
- **Health-advertising policy** — Meta, Google, YouTube health/medical ad rules; no prohibited claims; before/after restrictions.
- **WhatsApp Business Policy** — opt-in required; no unsolicited health messaging; template approval.
- **Facilitator, not provider** — no diagnosis/treatment advice; clear disclaimers; disclose commercial relationship with hospitals.
- **Organ transplant (THOTA)** — donor-legality documentation mandatory; engine flags for compliance, never auto-markets donor-dependent procedures.

## Data handling rules
- Collect the minimum PII to qualify a lead; encrypt at rest + in transit.
- **Do not** send patient PII / medical records to third-party LLMs without consent + minimization; redact where possible.
- Consent capture for patient stories (image + medical-detail release), retained and revocable.
- Role-based access; audit log on PII access; retention + deletion policy per market.

## Data acquisition — the honest legal posture on scraping (important)
Automated discovery of named contacts has a **real legal risk that honesty does not remove**: using stealth
techniques to defeat search-engine/LinkedIn bot detection can violate those services' **Terms of Service**
even when the underlying name+role is public. The test is the *circumvention*, not the data's sensitivity.
So:
- **Primary path is a LICENSED data provider** (Hunter / Apollo / Proxycurl). `discover_pocs.mjs` uses it
  first whenever a key is present. This is the compliant, scalable answer and it replaces scraping entirely.
- **Browser scraping is a fallback, OFF by default.** It requires explicit opt-in (`ALLOW_SCRAPE=1`) that
  acknowledges the ToS risk; runs at low volume; and a **CAPTCHA circuit-breaker** stops it the moment the
  IP looks flagged, falling back to the human worklist (`/worklist`) — a person searching manually is
  much lower risk (normal use, no automated circumvention). There is now a defined answer to "what happens
  on the flagged run": back off, don't hammer.
- We do **not** log into LinkedIn or scrape connection/member lists; only a public SERP/profile line, and
  every scraped contact is stored **UNVERIFIED** for human confirmation. Individual PII stays in the local
  gitignored DB, never committed.

## Outreach compliance (CAN-SPAM / GDPR) — email deliverability + consent
Content guardrails are not enough; the *messages and domain* must be compliant or they land in spam anyway.
Enforced in `lib/mailer.mjs` (every message) + required as ops (`SENDER_ADDRESS`, DNS):
- **Every email** carries: accurate sender identity, a **real physical postal address** (CAN-SPAM), a clear
  reason-you-received-this (GDPR legitimate-interest basis for B2B), and a working **unsubscribe** (footer +
  one-click `List-Unsubscribe` header). Honor opt-out immediately (maintain a suppression list).
- **Sending domain** needs **SPF + DKIM + DMARC** or deliverability collapses regardless of content.
- **Domain warm-up** — ramp volume slowly from a fresh domain; no cold-blasting at volume.
- B2B cold outreach in EU-adjacent markets relies on legitimate interest + easy opt-out; some markets require
  stricter consent — check per market before scaling.

## Resilience & access control (single-desktop ops)
- **Backups** — the SQLite file is the only record of contacts/pipeline/outcomes and is gitignored (privacy),
  so it's not in git either. `backup.mjs` snapshots it every cycle (keeps last 14); sync `outputs/backups/`
  to cloud storage for real durability.
- **Monitoring** — a lone Scheduled Task fails silently. `check_health.mjs` / `/api/health` expose last-loop
  time + failure count and exit non-zero when stale (>8h) so an external monitor can alert.
- **Console access control** — `/console` + APIs expose named contacts and pipeline stage. Set
  `CONSOLE_TOKEN` (Basic-auth gate) **before exposing beyond localhost**; the public patient site stays open.

## Feedback loop (model validity)
- The fit-score weights are a **prior, not validated truth**, until outcomes are logged. `log_outcome.mjs`
  records real results (replied / meeting / signed / lost); `query calibration` checks whether higher fit
  actually correlates with better outcomes. Re-weight only after ≥20 logged outcomes.

## Claim integrity
- Every clinical/price claim cited (`08`); unverified claims blocked from publish.
- No cure guarantees, outcome promises, or fear-based messaging.

## Related
[[08_DATA_SOURCES]] · [[04_PARTNER_ACQUISITION_STRATEGY]] · [[05_CONTENT_BRAND_CAMPAIGN]]
