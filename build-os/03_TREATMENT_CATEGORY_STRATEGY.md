# 03 — Treatment Category Strategy

**Owner agent:** Category Intelligence Agent (see `07_SYSTEM_DESIGN.md`).
**Requirement covered:** #2 — identify treatment categories that make the most sense by quality, cost, ease, demand.

## The scoring model (how the agent decides)

Each candidate category is scored 1–5 on six weighted factors. The agent recomputes monthly from `08_DATA_SOURCES.md`.

| Factor | Weight | What it measures |
|---|---|---|
| **Cost arbitrage** | 0.25 | India package price vs. source-market price (higher gap = higher score) |
| **Clinical quality** | 0.20 | Accredited-hospital depth, published outcomes, surgeon reputation for this procedure in India |
| **Ease / low friction** | 0.15 | Visa simplicity, length of stay, follow-up complexity, regulatory load (transplants = hard) |
| **Demand volume** | 0.20 | Search volume + known referral flows from target source markets |
| **Margin / deal size** | 0.10 | Facilitation revenue per case (value procedures score higher) |
| **Competitive whitespace** | 0.10 | Inverse of how saturated Vaidam/MediGence/etc. already are |

`Category Score = Σ(factor × weight)`. Portfolio rule: launch the **top 6**, incubate the next 4, park the rest.

## Launch portfolio (India, v1) — the agent's current ranking

> Directional scores for planning; the live engine replaces these with sourced data. Not medical advice.

| Rank | Category | Cost arb. | Quality | Ease | Demand | Margin | Whitespace | Why it wins |
|---|---|---|---|---|---|---|---|---|
| 1 | **Cardiac (CABG, valve, angioplasty)** | 5 | 5 | 3 | 5 | 5 | 2 | India's flagship strength; deep Middle-East + Africa demand; large deal size |
| 2 | **Orthopedics (knee/hip replacement, spine)** | 5 | 5 | 4 | 5 | 4 | 2 | High volume, elective (plannable), short-ish stay, strong outcomes |
| 3 | **Oncology (surgical + medical + BMT)** | 5 | 4 | 3 | 5 | 5 | 3 | Long stays = high ancillary revenue; specialist chains (HCG); deep demand |
| 4 | **Fertility / IVF** | 4 | 4 | 5 | 4 | 3 | 3 | Elective, low regulatory friction, repeat/word-of-mouth, strong ME+Africa pull |
| 5 | **Cosmetic & bariatric surgery** | 4 | 4 | 5 | 4 | 4 | 3 | Elective, high margin, Western + regional; strong social-content fit |
| 6 | **Dental (implants, full-mouth, cosmetic)** | 5 | 4 | 5 | 4 | 2 | 4 | Easiest funnel, short trip, Western "combine with holiday" angle; low competition |

**Incubate (next 4):** Ophthalmology (LASIK/cataract), Neurosurgery/spine, Organ transplant (liver/kidney — high value but heavy regulation & ethics/donor rules; handle carefully), Ayurveda/wellness (brand differentiator for Western wellness tourists).

**Park:** anything requiring emergency/unplanned travel, experimental treatments, or procedures where India lacks accreditation depth.

## Real pricing anchors (cross-checked, USD)

Representative **international-patient package** ranges, cross-checked across multiple aggregators and hospital pages (Vaidam, Medsurge, IndiCure, Alafiya, MedicalTourismCo, Dentaly, etc. — see `08_DATA_SOURCES.md`). These are *market-representative planning figures*; the live engine reconciles each against actual signed-partner package sheets before publishing.

| Category | Procedure | India (intl package) | Source-market reference | Typical saving |
|---|---|---|---|---|
| Cardiac | CABG (bypass) | **$5,000–9,000** | US $90k–120k · UK £15k–30k | ~85–90% |
| Cardiac | Valve replacement | **$4,500–7,000** | US $80k–150k | ~90% |
| Cardiac | Angioplasty (1 stent) | **$3,500–5,000** | US $28k–60k | ~85% |
| Orthopedics | Total knee replacement | **$3,500–6,500** | US ~$49k · UK £15k–21k | ~80% |
| Orthopedics | Hip replacement | **$4,200–7,000** | US $40k+ · UK £12k+ | ~80% |
| Oncology | BMT (autologous) | **$14,000–22,000** | US $150k–400k | ~85% |
| Oncology | BMT (allogeneic matched) | **$22,000–28,000** | US $300k–800k | ~90% |
| Fertility | IVF (per cycle) | **$2,500–5,000** | US $12k–20k · UK ~£5k | ~70% |
| Cosmetic/bariatric | Gastric sleeve/bypass | **$4,000–7,000** | US $20k–25k | ~75% |
| Dental | Single implant | **$500–950** | UK £2,000–3,000 | ~75–80% |
| Dental | Full-mouth restoration | **$4,800–9,500** | UK £15k–40k | ~75% |

> Rule: publish a **range with citation**, never a single invented figure. If only aggregator data exists (not a signed package), label it "indicative" until a partner sheet confirms.

## Category → source-market fit matrix

Focus regions: **Middle East, Africa, Europe, South East Asia** (no Bangladesh). Grounded in India's 2024 MVT arrivals (Iraq, Oman, Somalia, Nigeria, Yemen, Sudan, Kenya lead ex-Bangladesh) and the industry's active diversification from Middle-East concentration into Africa + SE Asia. This drives content language + partner targeting.

| Category | Best-fit source markets |
|---|---|
| Cardiac | Iraq, Oman, Yemen, Nigeria, Kenya, Ethiopia |
| Orthopedics | Oman, Kenya, Nigeria, Myanmar, UK (NHS-waitlist escapees) |
| Oncology | Iraq, Ethiopia, Sudan, Kenya, Myanmar |
| Fertility/IVF | Oman, UAE, Saudi Arabia, Nigeria, UK |
| Cosmetic/bariatric | UAE, Saudi Arabia, UK, Nigeria, Kenya |
| Dental | UK, Ireland, UAE, Kenya (expat) |

## Guardrails

- **Transplants:** only via hospitals with airtight legal donor documentation; the engine flags but does not auto-market donor-dependent procedures. Compliance review required (see `13`/stop rules).
- Never publish a category we don't yet have a credible accredited partner for — supply must lead demand by category (see `04`).
- Every price/outcome claim must cite `08_DATA_SOURCES.md`.

## Acceptance (see `14`)

- [ ] Scoring model runs on current data and outputs a ranked table.
- [ ] Top-6 portfolio each has ≥ 1 signed partner before demand content goes live.
- [ ] Category↔market matrix drives the content calendar and partner target list.

## Related
[[04_PARTNER_ACQUISITION_STRATEGY]] · [[05_CONTENT_BRAND_CAMPAIGN]] · [[08_DATA_SOURCES]] · [[07_SYSTEM_DESIGN]]
