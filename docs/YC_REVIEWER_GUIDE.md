# YC Reviewer Guide

1. Clone: `git clone https://github.com/hussainbombaywala/medical-tourism-gtm.git`
2. Start: `cp .env.example .env && npm ci && npm run yc-demo`
3. Login credentials: all demo users use `canopuscare-demo`.
4. Ten-minute walkthrough: follow `DEMO_SCRIPT.md`.
5. Architecture: see `ARCHITECTURE.md`.
6. Autonomous agent model: `/agents` shows deterministic runs, evidence, provider, confidence, cost and approval flags.
7. Safety and human gates: `/studio`, `/integrations`, `SECURITY.md`, `COMPLIANCE.md`.
8. What is real: persisted SQLite state, deterministic seed, routes, APIs, role scoping, tests, CI and Docker.
9. What is mocked: LLMs, email, WhatsApp, social publishing, vendor booking, payments and object storage.
10. Known limitations: production identity, real document storage, managed database, live provider setup, legal sign-off and clinical review workflows are required before pilots.
11. Production differences: set `APP_MODE=production`, provide required secrets, use HTTPS, persistent storage, identity and monitoring.
12. Suggested questions: tenant isolation, outbound gates, data minimization, why hospitals adopt, lead-to-estimate conversion, and how hospital clinical ownership is preserved.
