# Founder Deployment and YC Demo Checklist

Use this in order. The public service must remain a **synthetic sandbox**. Do not upload real patient records.

## 1. Decide the public-demo setup

- [ ] Approve a paid Render web service and persistent disk.
- [ ] Use `demo.canopuscare.online` as the public sandbox domain.
- [ ] Keep the production/root domain separate from this synthetic demo.
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

## 3. Create the Render service

1. Sign in to Render.
2. Select **New +**, then **Blueprint**.
3. Connect the GitHub account with access to `ACM07A/medical-gtm-yc-ready`.
4. Select that repository and branch `main`.
5. Render should detect `render.yaml`.
6. Name the service `canopuscare-demo`.
7. Confirm the persistent disk is mounted at `/var/data`.
8. Create/apply the Blueprint.

Do not create a second service if the Blueprint already created one.

## 4. Configure Render

Open the service, select **Environment**, and set:

```env
APP_MODE=demo
POST_LIVE=0
ALLOW_REAL_PATIENT_DATA=0
ALLOW_REAL_UPLOADS=0
AUTH_PROVIDER=demo
DATABASE_PATH=/var/data/canopus-care-demo.db
UPLOAD_DIR=/var/data/uploads
BACKUP_DIR=/var/data/backups

DEMO_AGENT_EMAIL=agent@canopuscare.demo
DEMO_HOSPITAL_EMAIL=hospital@canopuscare.demo
DEMO_USERNAME=reviewer@canopuscare.com
DEMO_ADMIN_EMAIL=admin@canopuscare.demo
DEMO_VENDOR_EMAIL=vendor@canopuscare.demo
```

Add all generated secret values separately. Until the custom domain is connected:

```env
APP_BASE_URL=https://<render-service-name>.onrender.com
ALLOWED_ORIGINS=https://<render-service-name>.onrender.com
```

Select **Manual Deploy > Deploy latest commit**.

## 5. Verify the Render URL

Open these from an incognito desktop window:

```text
https://<render-url>/api/health
https://<render-url>/api/readiness
https://<render-url>/demo
https://<render-url>/login
https://<render-url>/cases/CASE-DEMO-001
https://<render-url>/cases/CASE-DEMO-002
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

## 6. Connect `demo.canopuscare.online`

1. In Render, open **Settings > Custom Domains**.
2. Add `demo.canopuscare.online`.
3. Copy the exact DNS target shown by Render.
4. In the `canopuscare.online` DNS manager, add a CNAME:
   - Name/host: `demo`
   - Target/value: the Render target
   - TTL: automatic or 300 seconds
5. Wait for Render to verify the domain and issue TLS.
6. Change the Render variables:

```env
APP_BASE_URL=https://demo.canopuscare.online
ALLOWED_ORIGINS=https://demo.canopuscare.online
```

7. Redeploy and repeat the complete verification checklist.

## 7. Check GitHub Actions

1. Open the repository on GitHub and select **Actions**.
2. Open the latest run for `main`.
3. Confirm install, lint, tests, seed, smoke and Docker build are green.
4. Do not submit the YC URL while an unexplained check is failing.

## 8. Confirm backup and restore evidence

The service creates a retained local backup when an existing database starts.
After the first successful deployment, open the Render shell and run:

```bash
npm run db:backup
npm run db:restore-check
```

- [ ] The restore report says `"ok": true`.
- [ ] `integrity` is `"ok"`.
- [ ] Case, user and audit counts are non-zero.
- [ ] Download or copy the restore report into the deployment evidence folder.

These snapshots live on the same Render disk and protect against application
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

- [ ] Public custom-domain URL
- [ ] Reviewer credentials delivered privately
- [ ] 60-90 second product-demo video
- [ ] Separate founder video
- [ ] Dashboard, golden-case and compliance-block screenshots
- [ ] Backup Render URL
- [ ] Founder monitoring the demo during review

Suggested description:

> Canopus Care coordinates international patient cases from intake through hospital response and travel preparation while clinicians retain all medical decisions.

## 12. Before real patient data

Do not convert the YC sandbox into production. A separate production launch
requires a production identity provider with MFA, encrypted storage and KMS,
a reviewed database plan, monitoring, alerts, tested backups, privacy
deletion/export controls, signed hospital/vendor agreements, legal approval,
tenant-isolation testing and an external penetration test.
