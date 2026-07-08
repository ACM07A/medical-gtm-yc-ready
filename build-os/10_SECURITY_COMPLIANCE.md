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

## Outreach compliance
- Partner/feeder outreach uses **public business contacts only** — no scraped personal PII, no bought lists.
- Respect CAN-SPAM/GDPR consent + unsubscribe; rate-limit; no spam blasting.

## Claim integrity
- Every clinical/price claim cited (`08`); unverified claims blocked from publish.
- No cure guarantees, outcome promises, or fear-based messaging.

## Related
[[08_DATA_SOURCES]] · [[04_PARTNER_ACQUISITION_STRATEGY]] · [[05_CONTENT_BRAND_CAMPAIGN]]
