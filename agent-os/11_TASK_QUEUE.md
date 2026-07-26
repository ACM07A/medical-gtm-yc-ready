# 11 — Task Queue

Each task small, verifiable, safe. Status: TODO · IN_PROGRESS · BLOCKED · PASS · FAIL.

| ID | Status | Task | Relevant files | Verification | Risk |
|---|---|---|---|---|---|
| T100 | PASS | CanopusCare OS deterministic demo layer: roles, cases, hospital/agent/vendor surfaces, approvals, audit, readiness and metrics | data-core/os_core.mjs, server/os_pages.mjs, server/server.mjs | `npm run test`, `npm run smoke` pass locally | Med |
| T101 | IN_PROGRESS | One-command and deployment readiness commands: safe first boot, environment validation, reviewer sessions and public-demo access posture | package.json, scripts/yc-demo.mjs, scripts/validate-env.mjs, Dockerfile, docker-compose.yml, render.yaml, server/ | clean-database first boot seeds once; restart preserves state; env/auth/access tests and smoke pass | Med |
| T102 | PASS | Studio misleading transition fixed: proposal approval now records `Outreach sent`, not `Responded`; dry-run messaging avoids delivery/posting claims | server/studio.mjs | code inspection + tests/smoke | Low |
| T103 | PASS | Executive demo hub and expanded OS APIs: auth, approvals, tasks, vendors, service requests, demo reset and docs rendering | server/demo.mjs, server/server.mjs, server/os_pages.mjs, scripts/smoke-test.mjs | expanded `npm run smoke` covers new endpoints and docs | Med |
| T104 | PASS | Structured vendor quote and service lifecycle: amount/currency/expiry, service details, cancellation reason, allowed transitions, tenant-scoped UI and legacy demo backfill | data-core/os_core.mjs, server/os_pages.mjs, server/canopus_ui.mjs, tests/integration.test.mjs | lifecycle/expiry/cancellation/tenant tests; lint, smoke and mobile browser QA pass | Med |
| T105 | PASS | Reliability and consistency hardening: zero-dependency server boot, fast opt-in media seed, canonical commission, neutral demo entities, lead-to-case projection, production demo-auth fence and hermetic smoke | server/canopus_ui.mjs, data-core/ingest.mjs, data-core/demo_seed.mjs, data-core/os_core.mjs, server/orchestrate.mjs, tests/, scripts/hermetic-smoke.mjs | bare-copy boot HTTP 200; demo seed under 5s; 14 tests; hermetic/agent/vault smoke pass | Med |
| T106 | PASS | YC reviewer workflow: canonical case states, role-owned transitions, compliance refusal, transactional persistence, audit events and role-specific demo credentials | data-core/case_workflow.mjs, data-core/os_core.mjs, server/os_pages.mjs, server/server.mjs, tests/ | `npm run verify`; 24 tests and 46 hermetic HTTP checks pass | Med |
| T107 | PASS | Pre-deployment request hardening: same-origin session mutations, safe API/HTML errors, structured logs and founder deployment runbook | server/session.mjs, server/server.mjs, server/logger.mjs, server/canopus_ui.mjs, docs/FOUNDER_DEPLOYMENT_CHECKLIST.md, tests/ | `npm run verify`; 25 tests and hermetic smoke pass | Med |
| T108 | PASS | Local recovery evidence: retained startup backups and isolated restore verification with integrity/table/row checks | data-core/backup_os.mjs, data-core/verify_restore.mjs, scripts/start-app.mjs, tests/integration.test.mjs | `npm run db:restore-check`; automated restore test | Med |
| T109 | PASS | DESIGN.md visual binding: Inter typography, cobalt clinical tokens, top capsule navigation, semantic states, responsive shell and accessible focus/reduced-motion behavior | server/canopus_ui.mjs, server/login.mjs, server/server.mjs, tests/e2e.test.mjs | `npm run verify`; shared render assertions pass | Low |
| T001 | PASS | Stand up data core + market-config schema (SQLite, node:sqlite) | data-core/ | seed loads 12 markets/6 cats/12 partners; 5 query reports run | Low |
| T013 | PASS | Reconciled portfolio: accept model rank, Cardiac=flagship (brand/deal-size). Dental resourced as easy-volume wedge | 03, data-core | flagship flag set; re-seeded | Med |
| T014 | IN_PROGRESS | Resolve real named POCs (public-web pass). Fortis: 2 named ✅. Apollo/Medanta ops head not public → needs enrichment API / Sales-Nav | 04, data-core/poc | ≥1 named public POC per ★ partner, cited | Med |
| T022 | PASS | Partner outreach drafts (GLM-5.2), established vs latent differentiated + sanitizer | 04, data-core/gen_outreach | 5 clean drafts, in console, send human-gated | Low |
| T023 | IN_PROGRESS | Outreach send: 3 queued to local outbox (.eml); 2 skipped (no email). Real send = Resend key or human dispatch | 04, lib/mailer | 3 .eml in outputs/outbox | Med |
| T024 | PASS | Autonomous FREE factory: browser automation (Edge), free search, local mailer/outbox, static-site publisher, run_loop | lib/, data-core/, 25 | cycle ran; 16 pages live locally, 3 queued | Med |
| T025 | HANDED-OFF | Improve enrichment (form/mailto parsing) — assigned to opencode+MiniMax browser worker | data-core/browser_tasks | ≥ some emails found | Med |
| T026 | PASS | Deploy patient landing (Nuvica style) at localhost / ; console→/console | server/landing_home | home 200, 16 guides linked | Med |
| T027 | PASS | Browser sub-task module (enrich + screenshot QA) | data-core/browser_tasks | screenshots 3/3 | Low |
| T028 | HANDOFF-READY | opencode+MiniMax browser worker (config+brief). Needs: install opencode, MINIMAX_API_KEY, verify base-url/model | opencode.json, handoff/opencode | opencode runs a sub-task | Med |
| T029 | PASS | MiniMax tier-3 small-task router (MiniMax→GLM fallback) + SEO meta for 16 pages | lib/small, gen_meta | meta injected; runs labelled by model | Low |
| T030 | TODO | Set MINIMAX_API_KEY → small tasks (meta, subject polish, classify) route to MiniMax | integrations/.env | a run logs model=MiniMax | Low |
| T031 | PASS | Competitor price intelligence (browser-driven, free) + console ours-vs-market | data-core/competitor_scan, browser.session | 3 categories real bands; console shows mkt | Med |
| T032 | TODO | Review orthopedics anchor pricing — flagged at/above market top ($7k vs mkt $6k) | 03, 08 | anchor decision | Med |
| T033 | TODO | Broaden competitor URL map (fertility/cosmetic/dental thin data) | competitor_scan | ≥3 samples each | Low |
| T034 | PASS | Partner-layer CRM backbone: account model + fit score/reason + next-action/owner | data-core/partner_layer, db.partnerFit | 24 accounts fit-ranked w/ reason+next-action; poc normalized | Med |
| T035 | PASS | Console Account Board (fit · why · contact path · next action) | server, console.html | board live at /console; contact-confidence mix shown; screenshot | Low |
| T036 | PASS | Email-pattern inference (FREE, INFERRED+MX, human-gate) | data-core/infer_contacts | logic proven; MX pends un-sandbox | Low |
| T037 | HANDOFF-READY | Enrichment adapter (paid unlock, HUNTER_API_KEY) wired as preferred discovery path | lib/enrich, discover_pocs | verified contacts flow to board when key set; **needs user key decision** | Med |
| T038 | IN_PROGRESS | Named decision-maker contacts for star accounts (FREE path chosen) | discover_pocs, research_worklist, capture_poc | worklist ready (11 accts); run STEALTH=1 on desktop OR human works /worklist → capture_poc | High |
| T039 | PASS | Multi-query discovery + LinkedIn-snippet extraction + stealth mode + CAPTCHA detection | discover_pocs, lib/browser stealthSession | runs clean; honestly reports engine blocks | Med |
| T040 | PASS | Research worklist (Google/LinkedIn multi-combo URLs, real domains) + /worklist route + capture_poc | research_worklist, capture_poc, server | /worklist 200; capture guards verified | Low |
| T041 | IN_PROGRESS | Star-account named POCs via STEALTH Google→LinkedIn | discover_pocs (STEALTH=1) | 6/9 found (e.g. Head-IPS at Ganga Ram ✅; names in local gitignored DB only); extractor tightened; human-confirm | Med |
| T042 | PASS | Tier-2 FAILOVER handoff (GLM→llama-70b→llama-8b) + env-tunable + all generators routed | glm_generate, small, run_loop | proven: failover → 8b answered; run_loop standalone (no Claude) | High |
| T043 | ACTION-USER | Re-enable z-ai/glm-5.2 on build.nvidia.com (key valid, model unserved) | integrations/.env | glm-5.2 returns 200; chain uses it as primary | Low |
| T044 | ACTION-USER | Schedule run_loop.mjs (Task Scheduler) for unattended factory when Claude is offline | run_loop | a scheduled cycle logs runs without Claude | Med |
| T045 | IN_PROGRESS | Confirm/verify discovered named POCs (human) + infer/verify emails | /worklist, capture_poc, infer_contacts | ★ accounts human-confirmed, emails verified | Med |
| T046 | PASS | Scheduled factory loop (GLM carries loop offline, no Claude) | scripts/run_factory.bat, run_loop, lib/env | Task "MedYatra Factory Loop" (6h); full cycle ran headless | High |
| T047 | PASS | Content distribution: repurpose cornerstone → 5 platforms (human-gated) | repurpose_content, channel_post, /distribution | 5 posts/page incl. IG carousel+briefs; failover | Med |
| T048 | PASS | Partner credibility narratives for non-mainstream brands | gen_credibility, build-os/05 | accreditation-led profiles, [VERIFY] flags | Med |
| T049 | PASS | Image generation — FREE (Pollinations turbo) + Gemini/OpenAI/Stability adapters | lib/image, repurpose | real image generated from a brief; /plugins 🟢 | Med |
| T051 | PASS | Content-plugin layer: image + 5 posting adapters + readiness registry | lib/image,publishers,plugins, /plugins | 2/10 ready, rest one-key-away; delivery double-gated | Med |
| T052 | PASS | Gemini text backup in failover chain (free tier) | glm_generate | proven catching failover; carries proposals | Low |
| T053 | PASS | Account-specific partnership proposals (was T005) | gen_proposals | 3 tailored proposals → review; named-POC addressed | Med |
| T005 | PASS | Proposal generator (superseded by T053) | gen_proposals | done | Med |
| T050 | TODO | Platform posting APIs (Meta Graph/LinkedIn) behind keys, human-approved | repurpose, new adapter | a post published to a test account | Med |
| T054 | PASS | Sales comms: post-lead WhatsApp sequence (approval-ready, infographic-header tactic) | build-os/09, gen_comms, comms_template, /comms | 6 templates + headers; /comms renders; sendTemplate wired | Med |
| T055 | TODO | Wire comms sequence to lead lifecycle (trigger per lead stage) + Meta template submission | gen_comms, lead, publishers | a lead advances through the sequence (human-gated) | Med |
| T021 | PASS(local) | Publish: 16 EN pages built to /site (local preview). Deploy to public host = human/deploy gate | data-core/publish_site | site index 200 | Med |
| T002 | TODO | Category Intelligence: score + rank portfolio | 03, 08 | ranked top-6, all inputs cited | Med |
| T003 | TODO | Partner Sourcing: cardiac hospitals + POCs | 04, 08 | ≥5 hospitals, public POC each | Med |
| T004 | TODO | Repeat T003 for ortho, oncology, fertility, cosmetic, dental | 04 | ≥5 each w/ POC | Med |
| T005 | TODO | Proposal Generator template + first batch | 04 | tailored 8-section draft, human-approved | Med |
| T006 | IN_PROGRESS | Content grid: 30/30 drafted; 16 EN QA-passed → review; 14 non-EN pending native QA | 05, 08 | publish is human gate; CRM wire pending | Med |
| T020 | PASS | QA-reviewer agent (prices/disclaimer/CTA/banned-phrase checks) | data-core/qa_content.mjs | 30 drafts checked, 16→review, 0 flagged | Low |
| T021 | TODO | Human publish gate for the 16 review-ready EN pages (flip to published) | server, data-core | human sign-off; then cells go green | Med |
| T017 | SUPERSEDED | Static dashboard artifact (couldn't show live runs/drafts) → replaced by live backend T019 | dashboard.html | — | Low |
| T019 | PASS | Live backend + console (localhost): runs feed, draft→landing rendering, console↔landing | server/ | verified: /api/state, /api/runs (35), /console 200, /draft/1 renders | Med |
| T018 | TODO | Native-speaker QA for non-English drafts (AR/AM/MY) before publish | 05, outputs/content | native QA sign-off logged | Med |
| T015 | PASS | Wider sourcing model: latent/emerging brands + unit-level partners/POCs + opportunity score | 04, data-core | 24 partners, `candidates`/`units` reports run | Med |
| T016 | IN_PROGRESS | Generation flow moved to GLM-5.2 (tier-2); Opus orchestrates + QAs | integrations, data-core/gen_content.mjs | 6 drafts on GLM, guardrail held | Low |
| T012 | PASS | Wire GLM-5.2 tier-2 endpoint + LiteLLM config + Node helper | integrations/ | endpoint validated live (MEDYATRA_OK); helper CLI works | Low |
| T007 | TODO | Localization Agent: Arabic transcreation + RTL check | 05, 06 | AR live, native QA passed | Med |
| T008 | TODO | Lead/CRM: WhatsApp → qualify → route | 05, 07 | test lead flows end-to-end | Med |
| T009 | TODO | Feeder network: 20 referrers, Tier-A | 04 | list + public contacts + drafted outreach | Med |
| T010 | TODO | Compliance sweep + evidence log wiring | 08, 10 | 0 uncited claims, gates green | High |
| T011 | TODO | New-market dry run: add a SE Asia market (Myanmar) via config only | 06 | grids derive from config, no code change | Med |

Rule: split any task touching commercials + content + compliance at once. Feeder/hospital outreach and any clinical claim are human-gated.
