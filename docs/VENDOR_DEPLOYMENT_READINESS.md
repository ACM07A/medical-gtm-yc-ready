# CanopusCare Vendor Deployment Readiness

## Current verdict

The repository can be deployed today as a synthetic, outbound-disabled product demo. It is not ready for unrestricted vendor use with real patient or booking data.

The new vendor workflow supports organization-scoped request visibility, quote/status updates and audit events. Those controls are useful for a controlled pilot, but the platform must clear every P0 gate below before real vendor accounts are invited.

## P0 launch gates

| Area | Current implementation | Required before real vendor use | Acceptance evidence |
|---|---|---|---|
| Identity | Deterministic demo users selected by `X-Demo-User`; optional shared Basic Auth | Production identity provider, secure server sessions, MFA for admins, invitation/disable flow and verified organization membership | Cross-tenant authorization tests; revoked user loses access immediately |
| Request security | Security headers and request IDs | CSRF protection, enforced origin allowlist, API rate limits, secure cookies, body limits with explicit errors and login throttling | Automated CSRF, origin, rate-limit and session-expiry tests |
| Vendor tenancy | Vendor requests are scoped by vendor organization | Admin-controlled vendor onboarding, verification state, per-user roles and assignment revocation | Vendor A cannot read or update Vendor B requests in API and UI tests |
| Patient data | Synthetic case metadata; no real upload workflow | Data-minimized vendor view, field-level disclosure policy, encrypted object storage, malware scanning and signed download URLs | Vendor receives only logistics fields required for the assigned service |
| Consent and legal basis | Seeded consent gate | Persisted consent evidence, purpose, expiry, withdrawal and vendor disclosure event | Withdrawal blocks new disclosures and is visible in audit |
| Service workflow | Mock quote text and status updates | Structured currency/amount, service date/time/location, capacity, cancellation, expiry and enforced transition rules | Invalid transitions and expired quotes are rejected server-side |
| Notifications | No vendor delivery channel | Verified email/WhatsApp notification adapter, retry/dead-letter behavior and human-approved templates | Assignment and change notifications are delivered once or visibly fail |
| Audit | Database audit rows for material demo actions | Immutable centralized audit retention, actor/session/IP context and export for incident review | End-to-end request can be reconstructed from correlation ID |
| Database | Single SQLite file on a persistent disk | Managed transactional database for multi-instance production, migrations, connection pooling and tested rollback | Restore drill meets documented RPO/RTO and migrations run in staging |
| Backups | Local timestamped file copies | Encrypted off-host backups, retention policy, scheduled restore tests and access monitoring | Successful clean-environment restore report |
| Observability | Health/readiness JSON and local logs | Central logs, error tracking, uptime checks, queue/integration metrics and paging alerts | Synthetic failure triggers an alert and links to a correlation ID |
| Secrets | Environment-variable readiness checks | Managed secret store, rotation procedure and separate staging/production credentials | Rotation completed without exposing or restarting unrelated services |
| Compliance | Facilitator boundaries documented | Privacy notice, vendor DPA, subprocessor register, retention/deletion policy, incident plan and jurisdiction review | Counsel-approved pilot pack signed by every participating organization |

## Controlled vendor pilot sequence

1. Deploy the current build as `APP_MODE=demo`, with synthetic data and `POST_LIVE=0`.
2. Add production identity, tenant administration and vendor invitations in a staging environment.
3. Move operational records to a managed database and documents to encrypted object storage.
4. Implement structured service requests, quote expiry, assignment notifications and transition rules.
5. Complete penetration testing, backup restore testing and the legal pilot pack.
6. Invite one verified vendor organization with non-clinical test cases.
7. Run a supervised pilot with live outbound actions still human-approved.
8. Expand only after audit review, incident rehearsal and explicit go-live approval.

## Deployment configuration still needed

- Production domain and HTTPS.
- Managed database URL and migration job.
- Identity-provider client, issuer and callback configuration.
- Managed session and encryption secrets.
- Object-storage bucket, KMS key and signed-URL policy.
- Email or WhatsApp provider credentials and approved templates.
- Error tracking, log drain and uptime monitor.
- Off-host backup destination and restore schedule.
- Production `ALLOWED_ORIGINS` enforcement.

`APP_MODE=production` and environment variables alone do not make the application production-ready. External actions should remain disabled until the full P0 gate is reviewed and signed off.
