# AGENTS.md

This repo runs an **agentic GTM engine** for a medical-tourism company (India launch, globally reusable). It uses two instruction layers:

1. `/agent-os/` — controls looping, goal execution, QA, model routing, fallback, and stop rules.
2. `/build-os/` — defines the product, the GTM strategy, the data, acceptance tests, and production-readiness.

## Before doing anything

Read, in order:
- `/agent-os/15_FINAL_LOOP_HANDOFF.md`
- `/agent-os/01_GOAL_CONTRACT.md`
- `/agent-os/13_STOP_RULES.md`
- `/build-os/16_AGENT_HANDOFF.md`

Then pick ONE task from `/agent-os/11_TASK_QUEUE.md`, compile a context packet, and work in a small verified iteration.

## Non-negotiables for this domain (medical tourism)

- **Never fabricate clinical claims, outcomes, prices, accreditations, or doctor credentials.** Every such fact must trace to a cited source in `/build-os/08_DATA_SOURCES.md`. Unverified = mark `UNVERIFIED`, never publish.
- **Never present the company as a medical provider.** We are a *facilitator*. No diagnosis, no treatment advice, no guarantees of cure.
- **Respect patient-data law** (India DPDP Act 2023, GDPR for EU source markets, HIPAA-equivalent care for US). No PII in prompts sent to third-party models without consent + minimization.
- **Outreach must comply** with anti-spam law in the target market (CAN-SPAM, GDPR consent, WhatsApp Business Policy). No scraped-PII cold blasting.
- Do not load every file. Compile a task-specific context packet first. Work small. Verify. Log evidence.

## Rename / rebrand

The working brand is **MedYatra**. It is parameterized — see `/build-os/06_GLOBALIZATION_PLAYBOOK.md` for the source-market variables that must be set before any regional relaunch.
