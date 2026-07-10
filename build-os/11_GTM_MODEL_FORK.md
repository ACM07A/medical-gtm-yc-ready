# 11 — The GTM Model Fork: Standalone vs Operator-Front

**Decision owner:** founder (+ counsel). **Why it matters:** this one choice determines whether the next 90
days are *legal-and-hiring* work or *integration* work — and what MedYatra ends up owning. The Tier-3 software
(engine, comms, Studio, ancillary services, dual-mode ingestion) is built and mode-agnostic; this is about
the business wrapper around it. See `PROJECT_CONTEXT.md` §"prototype → working" for the tier definitions.

## The two paths

### Path A — Standalone MedYatra (own brand, own entity)
MedYatra is its own facilitator: own entity, own hospital contracts, own per-market regulatory clearances,
own DPA, own WhatsApp Business verification, own coordinators, own demand generation.

| | |
|---|---|
| **Build** | Everything — Tiers 0/1/2 yourself (legal, supply, ops), on top of the built Tier-3 software. |
| **Economics** | Keep 100% of the 10–15% facilitation margin. Highest upside per case. |
| **Time to first paid patient** | Months — cold-start on *both* sides (supply + demand) at once. |
| **Capital** | Meaningful — legal, hiring, working capital, demand-gen spend. |
| **Risk** | Marketplace chicken-and-egg; you carry the full compliance + clinical-liability-adjacent stack. |
| **Moat** | Real and yours — brand, patient relationships, own acquisition channel, hospital network, outcome data. This is the path *if MedYatra is meant to be its own company.* |

### Path B — Operator-Front (acquisition + tech layer for a licensed ME operator, e.g. Trudoc)
MedYatra powers the demand-gen + coordination for an operator that *already* has entity, licenses, hospitals,
coordinators, payment rails, and often source-market presence. The **dual-mode ingestion** (`POST
/api/lead/ingest`) is precisely the plug for their lead DB.

| | |
|---|---|
| **Build** | Mostly integration — Tiers 0/1/2 are *theirs*. Collapses to a data-share + commercial-split agreement on top of Tier-3. |
| **Economics** | Smaller cut (rev-share or SaaS + performance fee) — they own the license/supply/rails. Lower margin, far lower cost/risk. |
| **Time to first paid patient** | Weeks — integration, not cold-start. They bring existing demand + supply. |
| **Capital** | Low — mostly your build time + integration. |
| **Risk** | Commercial dependency on one operator; you don't own the patient or brand; they could build in-house. Thin moat *if you're captive to one*. |
| **Moat** | Weak unless you (a) keep the tech IP + the **outcome/calibration data** advantage, and (b) stay **multi-tenant** — powering several operators, not one. |

## Recommendation — operator-front first, as a multi-tenant platform; standalone later and selectively

These aren't mutually exclusive over time. The sharp sequence:

1. **Start operator-front** to reach a live transaction fast and cheap (weeks), prove the engine on *real*
   patients, and generate revenue + data + calibration **without the legal/hiring cold-start.**
2. **Stay multi-tenant from day one** (already architected: `source_ref`/`tenant` scoping) so you're a
   *platform* powering multiple operators — not one operator's captive tool. **This is the moat.** The two
   assets that keep you a platform rather than a vendor are the **tech IP** and the **cross-tenant outcome
   /calibration data** — neither of which any single operator owns.
3. **Fund the standalone build later, selectively**, from that proof + cashflow — and only in categories where
   owning the full stack pays: per the exclusivity thesis, go **non-exclusive in existing categories, exclusive
   where MedYatra builds or is one of few players** (e.g. the wellness/naturopathy line, or a wedge you
   originate). Moat-building is the trigger to graduate a category to standalone.

This matches the founder's stated instincts: front-for-an-operator (idea 1), non-exclusive-existing /
exclusive-where-we-build (idea 3), moat = the step that makes it its own thing.

## The design principle that protects optionality
**Stay multi-tenant and own the data/calibration layer.** Concretely, in this repo:
- Every lead is tenant-scoped (`lead.source_ref` → a `tenant`); own-acquisition is just the `medyatra` tenant.
- Per-tenant ingest tokens (not one shared key) so operators are isolated and revocable.
- The **outcome feedback loop** (`query.mjs calibration`) aggregates across tenants — the asset no single
  operator can replicate.
- Studio + console are tenant-aware so you can run several operators from one engine.

If you ever go standalone in a category, it's the *same* engine with `medyatra` as just another tenant — no
rebuild. That's why operator-front-first costs you nothing in optionality.

## First move per path (so the decision is actionable)
- **Operator-front:** one paid pilot powering a single operator's existing Gulf/Africa lead base into India on
  the lowest-fear wedge (dental/cosmetic/wellness). Success metric: measurable lift in *their* lead→booked
  conversion. Then add a second tenant.
- **Standalone:** one cleared market × one signed hospital × one wedge × own acquisition → first paid patient.
  Only start here if a category clears the "worth owning the whole stack" bar.

## Related
[[09_SALES_COMMS_PLAYBOOK]] · [[10_SECURITY_COMPLIANCE]] · [[03_TREATMENT_CATEGORY_STRATEGY]]
