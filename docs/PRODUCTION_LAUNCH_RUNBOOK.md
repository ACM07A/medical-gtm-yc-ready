# CanopusCare Production Launch Runbook

## Purpose and launch boundary

This is the end-to-end plan for moving CanopusCare from the current synthetic demo to a controlled vendor pilot and then to production. It is an engineering and operations runbook, not legal or medical approval.

No real patient data, vendor booking, payment, WhatsApp send or clinical workflow may be enabled until every applicable P0 gate has an accountable owner, acceptance evidence and written go-live approval.

## Release stages

| Stage | Permitted data and users | External actions | Exit criteria |
|---|---|---|---|
| Demo | Synthetic records; internal reviewers | Disabled | Hosted build is stable and clearly labelled |
| Staging | Synthetic or approved de-identified test data; invited staff and test vendors | Sandbox providers only | Security, tenancy, migration, backup and workflow tests pass |
| Controlled pilot | Minimum necessary real operational data; one verified vendor and one hospital | Human-approved sends and bookings only | Incident drill, legal pack, audit review and pilot KPIs pass |
| Production | Approved organizations and consented cases | Policy-controlled, observable and reversible | Executive, security, legal and operations sign-off |

## Ownership model

| Role | Accountable for |
|---|---|
| Product owner | Scope, workflow policy, pilot cohort, go-live decision |
| Engineering | Application, migrations, integrations, tests, deployment and rollback |
| Security lead | Threat model, identity policy, secrets, testing and incident readiness |
| Privacy/legal counsel | Privacy notice, DPA, vendor terms, lawful basis, retention and jurisdictions |
| Operations lead | Vendor verification, SLAs, escalation, templates and runbooks |
| Finance/commercial owner | Pricing, commissions, cancellation/refund and payment policy |
| Clinical governance owner | Clinical boundary and hospital-owned decision points; no diagnosis by CanopusCare |
| Vendor administrator | Vendor evidence review, approval, suspension and periodic renewal |

## P0 workstreams

### 1. Product policy and data classification

**CanopusCare engineering**

- Maintain a field-level data inventory and classify public, internal, confidential and sensitive health data.
- Enforce minimum-necessary data views by role and organization.
- Record consent purpose, version, capture source, timestamp, expiry and withdrawal.
- Block new disclosure after consent withdrawal and retain an auditable withdrawal event.
- Add deletion/export workflows with approval, legal-hold checks and completion evidence.

**Company owners**

- Name a privacy owner and clinical governance owner.
- Decide permitted data fields for agents, hospitals, vendors and support staff.
- Approve retention schedules by record type and jurisdiction.
- Obtain counsel approval for lawful basis, privacy notice, DPA, subprocessors and cross-border transfers.

**Acceptance evidence**

- Data-flow diagram, record-of-processing inventory and approved retention matrix.
- Tests proving vendors cannot access clinical documents or unrelated cases.
- Completed export, deletion and consent-withdrawal drills in staging.

### 2. Identity, sessions and tenant administration

**CanopusCare engineering**

- Integrate an OIDC identity provider using authorization-code flow with PKCE.
- Use server-side sessions with secure, `HttpOnly`, `SameSite` cookies and rotation.
- Enforce MFA for privileged roles and step-up authentication for sensitive actions.
- Add invitation, acceptance, disable, role change, organization membership and session revocation flows.
- Log authentication, membership and privilege changes.

**Company owners**

- Select and fund the identity provider.
- Approve role definitions, MFA policy, session duration and joiner/mover/leaver process.
- Configure verified domains and emergency administrators.

**Acceptance evidence**

- Revoked users lose access immediately.
- Cross-organization authorization suite passes.
- Session fixation, expiry, logout, MFA and invitation tests pass.

### 3. Application and API security

**CanopusCare engineering**

- Enforce allowed origins and production hostnames.
- Add CSRF protection to cookie-authenticated mutations.
- Add global, login and high-risk-action rate limits with shared production storage.
- Enforce JSON content type, body limits, schema validation and safe error responses.
- Maintain CSP, HSTS, secure headers, request IDs and structured security logs.
- Add dependency, secret and container scanning to CI.

**Company owners**

- Confirm production and staging domains.
- Select rate-limit and abuse thresholds with operations.
- Commission an independent penetration test before production.

**Acceptance evidence**

- Automated origin, CSRF, body-limit, throttling and authorization tests.
- No unresolved critical/high findings, or documented risk acceptance by an accountable owner.

### 4. Database and migrations

**CanopusCare engineering**

- Move operational data from SQLite to managed PostgreSQL.
- Introduce versioned, transactional, forward-only migrations with a tested rollback/roll-forward procedure.
- Use connection pooling, statement timeouts, least-privilege database roles and TLS.
- Create staging and production databases with separate credentials.
- Test concurrency, locking, idempotency and multi-instance behavior.

**Company owners**

- Select region, provider, plan, data residency and spend ceiling.
- Approve RPO, RTO and maintenance windows.

**Acceptance evidence**

- Clean database migration and representative-data migration both pass.
- Restore and rollback drills meet approved RPO/RTO.
- Load test meets agreed latency and error-rate targets.

### 5. Documents, encryption and malware controls

**CanopusCare engineering**

- Store documents in private object storage, not the application filesystem or database.
- Use provider-managed KMS encryption, short-lived signed URLs and per-object authorization.
- Validate file type and size, quarantine uploads, scan for malware and release only clean objects.
- Record upload, scan, view, download, disclosure and deletion events.
- Prevent document content from reaching third-party AI services without explicit approved processing rules.

**Company owners**

- Create storage and KMS accounts and provide secrets through the managed secret store.
- Approve file types, size limits, retention, legal hold and scan-failure process.

**Acceptance evidence**

- Cross-tenant object access fails.
- Expired signed URLs fail.
- Test malware is quarantined and alerts operations.

### 6. Vendor lifecycle

**CanopusCare engineering**

- Add vendor application, document checklist, review, approve, reject, suspend and renewal screens.
- Store verification evidence, reviewer, decision reason, expiry and change history.
- Restrict assignment and login to active, verified organizations.
- Add service areas, capacity, SLA, escalation and contacts.

**Company owners**

- Define required evidence by vendor category and jurisdiction.
- Define approvers, renewal cadence, rejection/suspension policy and escalation contacts.
- Complete commercial and data-processing agreements.

**Acceptance evidence**

- Unverified or suspended vendors cannot receive new assignments.
- Every approval is attributable and renewable.

### 7. Quotes, bookings, cancellation and commissions

**CanopusCare engineering**

- Enforce the request lifecycle: Requested, Accepted, Quoted, Approved, Scheduled, Completed; with explicit Declined and Cancelled terminal states.
- Store currency, amount, expiry, service date/location, capacity and cancellation terms as structured fields.
- Reject skipped transitions, expired quote approvals and unexplained cancellations.
- Add immutable quote versions and human approval before booking.
- Add commission disclosure, calculation, reconciliation and dispute audit.

**Company owners**

- Approve currencies, taxes, quote validity, cancellation/refund rules and commission policy.
- Decide which actions require patient, operations or finance approval.
- Define settlement, invoice and dispute process.

**Acceptance evidence**

- Lifecycle and permission test suite passes.
- Quote-to-completion audit can be reconstructed from one correlation ID.
- Finance signs off calculation examples and edge cases.

### 8. Notifications and queues

**CanopusCare engineering**

- Introduce a durable job queue with idempotency keys, retries, exponential backoff and dead-letter handling.
- Build provider adapters for transactional email and WhatsApp.
- Track accepted, delivered, failed, opted-out and manually resolved states.
- Require approved template versions and human approval for consequential sends.

**Company owners**

- Create provider accounts and approved sender identities.
- Obtain WhatsApp Business approval and template approval.
- Approve template content, quiet hours, opt-out behavior and escalation.

**Acceptance evidence**

- Duplicate event produces one delivery.
- Provider outage retries and then reaches an actionable dead-letter queue.
- Consent withdrawal and opt-out prevent later sends.

### 9. Observability and incident response

**CanopusCare engineering**

- Emit structured logs with environment, organization, actor, request and correlation IDs without sensitive payloads.
- Integrate error tracking, uptime monitoring, latency/error dashboards and queue/provider metrics.
- Alert on authentication abuse, cross-tenant denials, malware, backup failure and provider failure.
- Provide operational health, readiness and dependency probes.

**Company owners**

- Create monitoring accounts and on-call contacts.
- Approve severity definitions, paging hours, response targets and breach escalation.
- Name incident commander, privacy contact and communications approver.

**Acceptance evidence**

- Synthetic failures page the correct owner.
- A tabletop incident can be reconstructed, contained and communicated within target times.

### 10. Backups, continuity and disaster recovery

**CanopusCare engineering**

- Automate encrypted off-account or logically isolated database and object metadata backups.
- Monitor backup completion and protect backup deletion.
- Automate restore verification into an isolated environment.
- Document regional outage, credential compromise and provider failure procedures.

**Company owners**

- Approve retention, RPO, RTO, alternate-region strategy and business continuity owners.
- Fund required storage and standby capacity.

**Acceptance evidence**

- Timestamped restore report with row/object counts and integrity checks.
- Recovery exercise meets approved RPO/RTO.

### 11. Delivery pipeline and environments

**CanopusCare engineering**

- Maintain separate development, staging and production environments and secrets.
- Run lint, unit, integration, authorization, migration, dependency and container checks on pull requests.
- Build immutable artifacts and promote the same artifact from staging to production.
- Require approvals for production migrations and deployments.
- Provide health-based rollback and a tested database roll-forward plan.

**Company owners**

- Approve hosting spend, regions, production administrators and change windows.
- Define release approvers and emergency-change policy.

**Acceptance evidence**

- Staging deployment, migration, smoke test, promotion and rollback are demonstrated.
- Production access is least privilege and audited.

### 12. Legal, commercial and operational launch

**CanopusCare engineering**

- Expose approved policy versions and capture acceptance evidence.
- Implement configurable retention/deletion, data export and incident-support controls.
- Keep facilitator boundaries visible; hospital clinicians own clinical decisions.

**Company owners**

- Obtain signed vendor agreements, DPAs, hospital/pilot agreements and approved patient notices.
- Complete insurance, tax, payment, refund and commission review.
- Train support and vendor operations; publish escalation and complaint procedures.
- Approve the launch cohort, support hours and stop-launch authority.

**Acceptance evidence**

- Signed legal pack and completed training roster.
- Pilot rehearsal covers onboarding, quote, cancellation, complaint, security incident and recovery.

## Suggested execution sequence

| Phase | Engineering deliverable | Company decision or dependency | Exit gate |
|---|---|---|---|
| 0 | Stable hosted demo, CI baseline, threat model | Hosting account and spend | Synthetic demo online |
| 1 | OIDC, sessions, organizations, invitations | Identity provider and role policy | Staff staging access |
| 2 | PostgreSQL, migrations, backups | Database region, RPO/RTO | Restore drill passes |
| 3 | Vendor verification and structured service workflows | Verification and commercial policy | Test vendor approved |
| 4 | Object storage, consent and disclosure controls | KMS/storage and privacy rules | Data minimization tests pass |
| 5 | Queue, email/WhatsApp and monitoring | Provider accounts/templates/on-call | Failure drills pass |
| 6 | Security testing, legal pack and operational training | Pen test, counsel and signed agreements | Pilot approval |
| 7 | One-vendor controlled pilot | Named pilot participants | Pilot review passes |
| 8 | Production promotion | Executive go-live approval | Public production service |

## Go-live decision record

The final decision must list:

- Release version and immutable artifact identifier.
- Approved domains, regions and subprocessors.
- Open risks with owner and expiry.
- Backup/restore and rollback evidence.
- Security and legal sign-offs.
- Pilot or production cohort.
- Monitoring and on-call confirmation.
- Explicit authorization for external actions.

Until that record is signed, `POST_LIVE` must remain `0`.
