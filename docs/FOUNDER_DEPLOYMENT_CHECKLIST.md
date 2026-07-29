# Founder Deployment and YC Demo Checklist

Use this in order. The public service must remain a **synthetic sandbox**. Do not upload real patient records.

**Hosting note:** this checklist used to describe a Render deployment to `demo.canopuscare.online`. That is
superseded — the public sandbox is **canopuscare.com on Hostinger**, and is live as of this update. For every
step that touches hosting mechanics (connecting the repo, build/start commands, environment variables,
domain/SSL, rollback), follow **[HOSTINGER_DEPLOYMENT_CHECKLIST.md](HOSTINGER_DEPLOYMENT_CHECKLIST.md)** — that
is now the single source of truth for hosting setup, so it isn't duplicated (and doesn't drift) here. This
document covers the founder-facing process around that deployment: ownership, secrets, verification, rehearsal,
and the YC submission package.

## 1. Decide the public-demo setup

- [x] Public sandbox domain: **canopuscare.com**, on Hostinger (see the Hostinger checklist linked above).
- [ ] Keep the production/root domain separate from this synthetic demo, if/when a real-patient production
      environment is stood up later.
- [ ] Choose one founder as deployment owner and one as backup.
- [ ] Deliver reviewer passwords privately, not on a public page.

## 2. Generate secrets

Run this command separately for every secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Generate different values for `SESSION_SECRET`, `CONSOLE_TOKEN`,
`ENCRYPTION_KEY`, and every `DEMO_*_PASSWORD`. Store them in a team password
manager. Do not put them in GitHub, WhatsApp, screenshots or source files.

## 3. Create and configure the hosting service

Follow [HOSTINGER_DEPLOYMENT_CHECKLIST.md](HOSTINGER_DEPLOYMENT_CHECKLIST.md) sections 1–4 (connect the GitHub
source, set build configuration, add environment variables). Use the secrets generated in step 2 above.

## 4. Deploy

Follow [HOSTINGER_DEPLOYMENT_CHECKLIST.md](HOSTINGER_DEPLOYMENT_CHECKLIST.md) section 4 to deploy and confirm
the deployment log.

## 5. Verify the live URL

Open these from an incognito desktop window:

```text
https://canopuscare.com/api/health
https://canopuscare.com/api/readiness
https://canopuscare.com/demo
https://canopuscare.com/login
https://canopuscare.com/cases/CASE-DEMO-001
https://canopuscare.com/cases/CASE-DEMO-002
```

- [ ] Health returns HTTP 200.
- [ ] Readiness has no blocking gaps.
- [ ] Anonymous access is read-only.
- [ ] Hospital login sees only its assigned case.
- [ ] Agent login sees its assigned cases.
- [ ] Logout clears the session.
- [ ] Refresh preserves case transitions.
- [ ] `CASE-DEMO-002` remains blocked.
- [ ] Email, WhatsApp, payments and bookings remain disabled.

Repeat `/demo` and `/login` on a phone using mobile data.

## 6. Domain and SSL

The custom domain and SSL are already connected (canopuscare.com). If the deployment topology changes, follow
[HOSTINGER_DEPLOYMENT_CHECKLIST.md](HOSTINGER_DEPLOYMENT_CHECKLIST.md) section 6 and repeat the verification
checklist above.

## 7. Check GitHub Actions

1. Open the repository on GitHub and select **Actions**.
2. Open the latest run for the branch being deployed.
3. Confirm install, lint, tests, seed, smoke and Docker build are green.
4. Do not submit the YC URL while an unexplained check is failing.

## 8. Confirm backup and restore evidence

The service creates a retained local backup when an existing database starts.
After the first successful deployment, open the Hostinger shell (or SSH, if available for the plan) and run:

```bash
npm run db:backup
npm run db:restore-check
```

- [ ] The restore report says `"ok": true`.
- [ ] `integrity` is `"ok"`.
- [ ] Case, user and audit counts are non-zero.
- [ ] Download or copy the restore report into the deployment evidence folder.

These snapshots live on the same host's disk and protect against application
mistakes, not account/region failure. Before real patient production, choose an
encrypted off-host destination and approve backup retention, RPO and RTO.

## 9. Record the product demo

Use [PRODUCT_DEMO_SCRIPT.md](PRODUCT_DEMO_SCRIPT.md).

- [ ] Record at 1080p and 100% browser zoom.
- [ ] Hide passwords, bookmarks, notifications and unrelated tabs.
- [ ] Keep the walkthrough between 60 and 90 seconds.
- [ ] State that all data is synthetic.
- [ ] State that clinicians retain clinical decisions.
- [ ] Show the hospital-to-agent transition and audit history.
- [ ] Show the consent-blocked case.
- [ ] Explain what is operational, simulated and disabled.

The YC founder video is separate. Follow the current YC application instructions
for its required format and length.

## 10. Rehearse and reset

1. Reset the demo using the authenticated admin reset control.
2. Log out and open `/demo` in incognito.
3. Sign in as the hospital user and open `CASE-DEMO-001`.
4. Advance to **Hospital reviewing**, then **Response received**.
5. Log out and sign in as the agent user.
6. Advance to **Option accepted**, then **Travel preparation**.
7. Refresh and show the persisted audit events.
8. Open `CASE-DEMO-002` and show the consent refusal.
9. Finish on `/readiness`.

Target two to four minutes without developer assistance.

## 11. YC submission package

- [x] Public custom-domain URL: **canopuscare.com**
- [ ] Reviewer credentials delivered privately
- [ ] 60-90 second product-demo video
- [ ] Separate founder video
- [ ] Dashboard, golden-case and compliance-block screenshots
- [ ] Founder monitoring the demo during review

Suggested description:

> Canopus Care coordinates international patient cases from intake through hospital response and travel preparation while clinicians retain all medical decisions.

## 12. Before real patient data

Do not convert the YC sandbox into production. A separate production launch
requires a production identity provider with MFA, encrypted storage and KMS,
a reviewed database plan, monitoring, alerts, tested backups, privacy
deletion/export controls, signed hospital/vendor agreements, legal approval,
tenant-isolation testing and an external penetration test.
