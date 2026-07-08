# 07 — Model Routing

Strong models for decisions and compliance-sensitive drafting; cheaper models for bulk execution. Tests + human gates decide truth.

## Tier 1 — Strategist / Compliance / Final QA
Use for: category scoring logic, partner commercial strategy, proposal drafting, any clinical/price/medical claim, compliance review, contradiction resolution, final readiness sign-off.
Bias toward the strongest available model. Anything touching a clinical claim, patient PII, or a legal question routes here.

## Tier 2 — Builder
Use for: hospital enrichment, POC discovery synthesis, standard SEO page drafts, localization drafts, CRM logic, non-clinical social copy.

**Failover chain (the handoff — keeps generation alive when Opus hits its limit OR the primary model is down).** `integrations/glm_generate.mjs` tries each model in order, first responder within `TIER2_TIMEOUT` wins:
1. `GLM_MODEL` (default `z-ai/glm-5.2`) — **currently unserved on NVIDIA for this account** (hangs; key valid — proven via Llama 200). Re-enable on build.nvidia.com to restore.
2. `meta/llama-3.3-70b-instruct` — strong fallback.
3. `meta/llama-3.1-8b-instruct` — always-reachable last resort (verified live).

Tune via env: `GLM_MODEL`, `GLM_FALLBACKS` (comma list), `TIER2_TIMEOUT` (ms). Because every generator (`gen_content`, `gen_outreach`, `gen_proposals`, `lib/small.mjs`) calls this helper, and `data-core/run_loop.mjs` runs them as standalone Node scripts, the factory continues **without Claude** — schedule `run_loop.mjs` (Task Scheduler/cron) for true unattended operation. Set `DISCOVER=1 STEALTH=1` to include browser POC discovery in the cycle.

## Tier 3 — Narrow patch
Use for: formatting, metadata, copy tweaks, single-field CRM fixes, template fills. No architecture, no clinical claims, no commercial terms, no PII decisions.

## Escalate to Tier 1 when
Same error 2×, a clinical/price/medical/legal claim is involved, patient PII is in scope, a partner commercial term is being set, a compliance question arises, or a lower tier proposes a strategy/architecture change.

## PII rule (overrides routing)
Never place patient PII or medical records in a third-party model prompt without consent + minimization/redaction, regardless of tier.
