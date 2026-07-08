# 14 — Acceptance Tests (binary, evidence-backed)

The engine is "done" for a milestone only when these PASS with evidence in `/agent-os/12_EVIDENCE_LOG.md`. No opinion-based completion.

## A. Category selection (req #2)
- [ ] Scoring model runs on sourced data and outputs a ranked category table.
- [ ] Output includes the six weighted factors and a category↔source-market matrix.
- [ ] Every price/quality input is cited; none `UNVERIFIED` in the published portfolio.

## B. Partners + POC + proposals (req #3)
- [ ] ≥ 5 scored anchor hospitals per top-6 category.
- [ ] Each has a verified **public** IPS/MVT POC (no personal PII scraped).
- [ ] Proposal generator outputs a tailored, 8-section proposal in < 5 min, human-approved before send.
- [ ] ≥ 20 feeder referrers listed across Tier-A markets.

## C. Content brand campaign (req #4)
- [ ] Editorial calendar auto-generates from the (category × market × language) gap grid.
- [ ] ≥ 3 languages live; Arabic RTL renders correctly.
- [ ] 100% of published clinical/price claims carry a citation + human sign-off.
- [ ] Every asset ends in a working WhatsApp CTA that lands in the CRM.

## D. Globalization (req #5)
- [ ] A new source market goes live by adding a config only — no core-agent code change.
- [ ] Compliance surface, channel mix, and content grid all derive from the market config.

## E. Engine + compliance
- [ ] Human-in-the-loop gates enforced for claims, outreach sends, commercials, and spend.
- [ ] No cure guarantees / outcome promises anywhere in output.
- [ ] DPDP/GDPR data-handling checklist passes; no PII in third-party model prompts without consent.

## Related
[[16_AGENT_HANDOFF]] · [[30_FINAL_PRODUCTION_READINESS]]
