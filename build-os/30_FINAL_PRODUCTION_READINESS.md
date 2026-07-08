# 30 — Final Production Readiness (PASS / FAIL launch gate)

Mark each PASS, FAIL, or N/A (with reason). Launch only when all required items PASS.

## Strategy
- [ ] Treatment portfolio ranked from sourced data; top-6 each have a signed/pilot partner.
- [ ] Category↔source-market matrix drives content + partner targeting.

## Supply
- [ ] ≥ 5 scored hospitals + verified public POC per top-6 category.
- [ ] Feeder network ≥ 20 referrers (Tier-A).
- [ ] Commercial terms (facilitation fee, SLAs) documented per active partner.

## Demand / brand
- [ ] SEO cornerstone pages live for launch (category × market) cells.
- [ ] ≥ 3 languages live; Arabic RTL correct.
- [ ] WhatsApp funnel live end-to-end into CRM.
- [ ] Paid + retargeting accounts compliant with health-ad policy.

## Engine
- [ ] Six agents run on schedule; orchestrator loop stable.
- [ ] Human-in-the-loop gates enforced (claims/sends/commercials/spend).
- [ ] Model routing + fallback configured (`/agent-os/07`, `/08`).

## Compliance & trust
- [ ] DPDP + GDPR data handling verified; no PII to third-party models without consent.
- [ ] No cure/outcome guarantees anywhere; facilitator disclaimers present.
- [ ] Every clinical/price claim cited; UNVERIFIED claims blocked.
- [ ] Patient-story consent process live.

## Ops
- [ ] Lead SLA (first response, quote turnaround) defined + measurable.
- [ ] Analytics/attribution capturing channel → MQL → treated.
- [ ] Rollback for content/outreach mistakes (unpublish, retract) documented.

**Final rule:** the engine may be marked launch-ready only when every required item is PASS or explicitly N/A with reason, with evidence logged.

## Related
[[14_ACCEPTANCE_TESTS]] · [[16_AGENT_HANDOFF]]
