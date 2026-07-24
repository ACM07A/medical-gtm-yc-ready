# Security

Current demo controls:

- `APP_MODE=demo` disables live outbound actions.
- Production readiness blocks on missing `SESSION_SECRET`, `APP_BASE_URL`, `CONSOLE_TOKEN`, `ALLOWED_ORIGINS` and `ENCRYPTION_KEY`.
- Protected operator routes support `CONSOLE_TOKEN` Basic Auth for hosted demos.
- State-changing approval paths re-check gates server-side.
- Lead ingestion uses per-tenant tokens and PII-minimized handles.
- Role-scoped APIs restrict cases by hospital, agent or vendor organization.
- Audit rows record material seeded workflow actions and blocked consent.
- SQLite foreign keys are enabled.
- Responses include correlation IDs and browser security headers.
- Vendor service-request updates are organization-scoped and audited.

Known limitations:

- Demo authentication is deterministic and not production identity.
- Password hashing is sufficient only for non-production demo credentials.
- File upload storage is not implemented for real records.
- Production pilots need a real identity provider, stronger CSRF/session controls, managed secrets, encrypted document storage, monitoring and a legal DPA.

See `docs/VENDOR_DEPLOYMENT_READINESS.md` for the complete production gate.
