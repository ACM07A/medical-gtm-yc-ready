# Hostinger Deployment Checklist

This repository is a single Hostinger Node.js application:

- `/` is the public Canopus Care landing page.
- `/demo` is the live product sandbox.
- `/login`, `/cases`, role views, and APIs use the same backend and domain.
- No second landing-page repository, proxy, or Google AI Studio deployment is required.

The public environment is a synthetic YC demonstration. It is not approved for
real patient data or live clinical operations.

## 1. Connect the GitHub Source

In Hostinger hPanel:

1. Open **Websites** and choose **Add website**.
2. Choose **Deploy Web App**.
3. Choose **Import Git Repository**.
4. Connect the GitHub account that can access:
   `ACM07A/medical-gtm-yc-ready`.
5. Select branch `main`.

Hostinger currently supports Node.js web apps on Business and Cloud hosting
plans. Use a plan that exposes **Deploy Web App**.

## 2. Set Build Configuration

Use these values:

| Setting | Value |
|---|---|
| Framework | `Other` |
| Node.js version | `24.x` |
| Project/root directory | repository root / blank |
| Install command | Hostinger default, or `npm ci` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Entry file, if requested | `scripts/start-app.mjs` |
| Output directory | blank |

This is a server-side Node application. Do not configure it as a static Vite,
React, or Next.js export.

The server binds to `0.0.0.0` and defaults to Hostinger's expected port `3000`
when `NODE_ENV=production`. Do not add a custom `PORT` environment variable.

The startup script creates the SQLite directory and seeds a missing demo
database exactly once. It preserves an existing database on normal restarts.

## 3. Add Environment Variables

Replace `https://demo.canopuscare.com` with the exact Hostinger preview or custom
domain before deployment.

```dotenv
APP_MODE=demo
NODE_ENV=production
APP_BASE_URL=https://demo.canopuscare.com
ALLOWED_ORIGINS=https://demo.canopuscare.com

DATABASE_PATH=./data/canopus-care-demo.db
UPLOAD_DIR=./data/uploads
BACKUP_DIR=./data/backups
BACKUP_KEEP=14
BACKUP_ON_START=1

AUTH_PROVIDER=demo
DEMO_USERNAME=reviewer@canopuscare.com
DEMO_REVIEWER_PASSWORD=USE_A_NEW_REVIEWER_PASSWORD
DEMO_REVIEWER_PASSWORD_B64=BASE64_OF_THE_SAME_REVIEWER_PASSWORD
DEMO_AGENT_EMAIL=agent@canopuscare.demo
DEMO_AGENT_PASSWORD=USE_A_NEW_AGENT_PASSWORD
DEMO_HOSPITAL_EMAIL=hospital@canopuscare.demo
DEMO_HOSPITAL_PASSWORD=USE_A_NEW_HOSPITAL_PASSWORD
DEMO_ADMIN_EMAIL=admin@canopuscare.demo
DEMO_ADMIN_PASSWORD=USE_A_NEW_ADMIN_PASSWORD
DEMO_VENDOR_EMAIL=vendor@canopuscare.demo
DEMO_VENDOR_PASSWORD=USE_A_NEW_VENDOR_PASSWORD

SESSION_SECRET=USE_A_RANDOM_VALUE_AT_LEAST_32_CHARACTERS
ENCRYPTION_KEY=USE_A_RANDOM_VALUE_AT_LEAST_32_CHARACTERS
CONSOLE_TOKEN=USE_A_DIFFERENT_RANDOM_VALUE

POST_LIVE=0
ALLOW_REAL_PATIENT_DATA=0
ALLOW_REAL_UPLOADS=0
ALLOW_SCRAPE=0
SEED_BROWSER=0
SEED_GENERATION=0
```

Do not add AI, WhatsApp, email, payment, or social credentials to the public YC
demo. Those integrations intentionally remain disabled.

Generate independent secrets locally in PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Run that command three times. Use a different result for `SESSION_SECRET`,
`ENCRYPTION_KEY`, and `CONSOLE_TOKEN`.

## 4. Deploy

1. Review the branch and settings.
2. Click **Deploy**.
3. Open the deployment log.
4. Confirm the log contains `Initializing synthetic demo database` on the first
   deployment, followed by the server listening message.
5. Save the assigned Hostinger URL.
6. Update `APP_BASE_URL` and `ALLOWED_ORIGINS` if the final URL differs, then use
   **Settings and redeploy**.

Hostinger deploys server-side build output outside `public_html` and creates the
routing configuration. Do not manually move this application into
`public_html`.

## 5. Verify Before Sharing

Open these URLs in an incognito window and on a phone:

| URL | Expected result |
|---|---|
| `/` | Public Canopus Care landing page |
| `/demo` | Redirects to `/login`; after reviewer login, opens the read-only dashboard |
| `/concierge` | Redirects to `/login`; after reviewer login, opens Suhail with safety boundaries |
| `/cases/CASE-DEMO-001` | Redirects to `/login`; after reviewer login, opens the synthetic golden case |
| `/cases/CASE-DEMO-002` | Redirects to `/login`; after reviewer login, opens the consent-blocked safety case |
| `/login` | Role login panel |
| `/api/health` | JSON with `"ok": true` |
| `/api/readiness` | JSON readiness report |
| `/console` | Browser Basic Auth prompt |

Also verify:

- Landing buttons open routes on the same domain.
- A clean incognito session cannot open `/demo`, `/concierge`, or a case without signing in.
- Signing out invalidates the reviewer session and returns the browser to `/login`.
- Images and CSS load with no mixed-content warning.
- The mobile navigation opens and closes.
- The synthetic-data banner remains visible throughout the OS.
- Anonymous mutations are refused.
- No message, payment, booking, or external action can execute.

## 6. Domain and SSL

1. Attach the intended domain or subdomain in hPanel.
2. Wait for DNS and Hostinger SSL to become active.
3. Set `APP_BASE_URL` and `ALLOWED_ORIGINS` to the final HTTPS origin, with no
   trailing slash.
4. Redeploy.
5. Repeat the incognito and phone checks above.

## 7. Demo Data and Persistence

This deployment uses SQLite for a synthetic demonstration. A missing database is
seeded during startup. The app creates a backup when an existing database starts.

Treat managed-hosting filesystem persistence as deployment-specific. Download a
backup before removing the Hostinger website or changing deployment topology.
For real patient operations, move the application to an approved managed
database and encrypted object storage first; do not use this demo SQLite setup.

## 8. Rollback

If a deployment fails:

1. Open **Deployments** and inspect the first error in the log.
2. Confirm Node `24.x`, the repository root, and the commands above.
3. Confirm every required environment variable is present.
4. Redeploy the last known-good Git commit.
5. Re-run the route verification table.

Hostinger documents GitHub import, branch selection, Node version, build/start
settings, environment variables, deployment logs, restart, and redeployment in
its Node.js Web App help center.
