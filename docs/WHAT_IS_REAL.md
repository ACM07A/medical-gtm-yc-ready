# What Is Real, Mocked, and Disabled

This inventory describes the public Canopus Care demo. It does not authorize
production handling of real patient data.

## Real

- Structured patient-case intake and local SQLite persistence
- Consent status and compliance blocking
- Missing-information and document-checklist state
- Operational case, hospital, estimate, vendor, task, and approval records
- Human approval and role-scoped mutation checks
- Signed, expiring, HttpOnly reviewer sessions
- Tenant-aware lead ingestion and lead-to-case projection
- Deterministic estimate normalization and commission calculation
- Deterministic agent job records with evidence and audit history
- Docker runtime configuration, health checks, readiness checks, and tests

## Mocked

- Patient identities and medical-document contents
- Hospital responses, reviews, estimates, and clinical-review states
- Hospital matches and partner relationships
- Vendor availability, quotations, and service fulfillment
- Email and WhatsApp delivery
- Regulatory sign-off and commercial agreements
- Payments and payouts
- AI output when no provider key is configured

## Disabled

- Real patient-data ingestion and real medical-record uploads
- Real email, WhatsApp, and social publishing
- Payments, payouts, and vendor booking
- Visa filing and flight booking
- Clinical diagnosis, scan interpretation, treatment recommendation, and
  clinical-eligibility decisions
- Automatic release of sensitive communications
- Live outreach to inferred contacts

## Required Before Production

Production requires a real identity provider, per-user credentials and MFA,
encrypted object storage and key management, monitoring and alerting, tested
backup restoration, legal and privacy approval, external penetration testing,
and production tenant-isolation verification.
