# Demo Security Review

Date: 2026-07-26  
Scope: public synthetic YC sandbox, not a production patient-data system.

## Resolved for the sandbox

- HMAC-signed, expiring, `HttpOnly`, `SameSite=Lax` sessions; `Secure` on HTTPS.
- Server-side organization and role checks for case reads and mutations.
- Anonymous demo access is read-only.
- Production ignores the `x-demo-user` test shortcut and rejects demo accounts.
- Login rate limiting and generic authentication failures.
- Operator/GTM routes remain behind `CONSOLE_TOKEN`.
- Case transitions use an authoritative allow-list, transactions and audit events.
- Missing consent blocks state progression in the backend.
- Security headers include CSP, frame denial, MIME sniffing protection and restrictive permissions.
- Request bodies are bounded; external posting is double-gated and disabled in demo.
- Secrets and real patient data are excluded from seed content and tracked output.

## Remaining before production

- Replace shared demo credentials with a production identity provider, MFA and invitation lifecycle.
- Add CSRF tokens or strict same-origin enforcement for every cookie-authenticated mutation.
- Move from in-memory login throttling to distributed rate limiting.
- Implement encrypted object storage, malware scanning, MIME validation and upload quotas.
- Perform external tenant-isolation testing and penetration testing.
- Add centralized logs, error tracking, alerts and incident-response ownership.
- Define backup retention, RPO/RTO and prove a restore.
- Complete privacy deletion/export workflows and legal review.
- Review Git history with an approved secret scanner and rotate any historical credentials.

## Production decision

The sandbox is suitable only for synthetic reviewer data. It must not accept real patient records. `ALLOW_REAL_PATIENT_DATA=0` and `ALLOW_REAL_UPLOADS=0` remain mandatory for the public demo.
