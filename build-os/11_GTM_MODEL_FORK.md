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
| **Moat** | Weak unless you (a) keep the tech IP + a **de-identified aggregate benchmark** advantage (NOT patient-data reuse — that stays siloed per operator), and (b) stay **multi-tenant**. |

## Recommendation — operator-front first, as a multi-tenant platform; standalone later and selectively

These aren't mutually exclusive over time. The sharp sequence:

1. **Start operator-front** to reach a live transaction fast and cheap (weeks), prove the engine on *real*
   patients, and generate revenue + data + calibration **without the legal/hiring cold-start.**
2. **Stay multi-tenant, with strict data isolation** so you're a *platform* powering multiple operators —
   each fully siloed — not one operator's captive tool. **This is the moat**, and it rests on exactly two
   legally-clean assets: the **tech IP**, and **de-identified aggregate learning** (see the hard rules below).
   Patient data is *never* shared across operators; only anonymised statistical patterns compound.
3. **Fund the standalone build later, selectively**, from that proof + cashflow — and only in categories where
   owning the full stack pays: per the exclusivity thesis, go **non-exclusive in existing categories, exclusive
   where MedYatra builds or is one of few players** (e.g. the wellness/naturopathy line, or a wedge you
   originate). Moat-building is the trigger to graduate a category to standalone.

This matches the founder's stated instincts: front-for-an-operator (idea 1), non-exclusive-existing /
exclusive-where-we-build (idea 3), moat = the step that makes it its own thing.

## Two hard rules that shape the platform

**1 — Tenant data isolation (privacy by design).** Each operator's patient data is siloed to their tenant.
Operator A never sees operator B's leads, and **no operator's patient records are ever reused for anyone
else.** This is a legal necessity (DPDP/GDPR + the operators' own patient contracts) *and* the trust that
makes them plug in at all. In this repo: leads are scoped by `source_ref`, the Studio queue is tenant-
scoped (`/studio?tenant=…` shows only that operator's leads), and per-tenant tokens isolate ingestion.

**2 — The shareable asset is de-identified aggregate learning, not patient data.** What compounds across
tenants is NOT anyone's patient rows — it's the *statistical patterns*: category×market conversion
benchmarks, message/stage performance, fit-model calibration. Computed with a **k-anonymity threshold**
(cells below K leads are suppressed) so nothing is re-identifiable and no tenant is attributable
(`data-core/benchmarks.mjs` → `/api/benchmarks`). That aggregate + the tech IP is the moat: legally clean,
and impossible for one operator to replicate because only the platform sees across operators. **Crucially,
this is NOT "use one operator's patient data elsewhere"** — it's counts and rates above a privacy threshold,
with every patient- and tenant-identifier stripped before aggregation.

If you ever go standalone in a category, it's the *same* engine with `medyatra` as just another tenant — no
rebuild. That's why operator-front-first costs you nothing in optionality.

## Longer-term extension (optional, contingent)
As a multi-tenant platform, MedYatra could become an **aggregator of med-tourism operators** across
categories — many operators, one engine, one benchmark layer. From there, a **customer-facing platform** (a
patient-side marketplace spanning operators and categories) is a natural but much later step, with its own
entity, licensing and liability questions. Flagged as a direction the architecture deliberately keeps open —
not a near-term build. *(This repo's present purpose is to demonstrate the thinking and the architecture, not
to run live patients.)*

## First move per path (so the decision is actionable)
- **Operator-front:** one paid pilot powering a single operator's existing Gulf/Africa lead base into India on
  the lowest-fear wedge (dental/cosmetic/wellness). Success metric: measurable lift in *their* lead→booked
  conversion. Then add a second tenant.
- **Standalone:** one cleared market × one signed hospital × one wedge × own acquisition → first paid patient.
  Only start here if a category clears the "worth owning the whole stack" bar.

## Related
[[09_SALES_COMMS_PLAYBOOK]] · [[10_SECURITY_COMPLIANCE]] · [[03_TREATMENT_CATEGORY_STRATEGY]]
