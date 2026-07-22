# MedYatra — Business Status

**As of 21 July 2026.** Written for people deciding whether to back, partner with, or join this — not for
engineers. The technical walkthrough is [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

Everything below distinguishes **what we know** from **what we assume**. Assumptions are labelled, because
the single fastest way to lose a hospital partner or an investor is to quote a guess as a fact.

---

## 1. What the business is

MedYatra is a **medical-travel facilitator**. We acquire international patients, qualify and triage them
into a case file a consultant can review in minutes, coordinate the entire journey, and earn a commission
from the treating hospital. We are not a hospital, we make no clinical decisions, and we do not sell
software.

**What we replace.** Today that work is done by a fragmented network of agents and in-house international
desks. Industry reporting indicates Indian and Turkish hospitals build **25–35% padding into international
quotes** specifically to fund agent commissions. The patient pays it, and increasingly knows they are being
quoted a foreigner price. That padding is the surplus we are competing for — it can fund a lower patient
price, restored hospital margin, or our take.

**Why now.** The coordinator function — intake, qualification, quoting, documents, logistics, follow-up,
across time zones and languages, mostly over WhatsApp — became automatable in the last eighteen months.
It is also the entire cost structure of a facilitator.

**Empathy is a hardcoded requirement, not a value statement.** A patient in this funnel is, by definition,
making a frightening decision — a parent's heart surgery, a diagnosis received abroad — under real financial
and emotional pressure. The facilitator relationship only works if every touchpoint feels like it's on their
side. This is meant to shape agent prompts, WhatsApp copy, and the product itself, not just marketing —
a standing filter to apply going forward, not a one-time pass.

---

## 2. Market

India treated **507,244 foreign nationals in 2025**; the market is estimated at **$8.71bn in 2025 growing
to $16.21bn by 2030**. Top source countries: Bangladesh (325,127), Iraq (30,989), Uzbekistan (13,699),
Somalia (11,506), Turkmenistan (10,231), **Oman (9,738)**, **Kenya (9,357)**.

**Our markets: Africa, the Middle East, and South East Asia.** We segment by *why they travel*, not by
country, because it changes the entire proposition:

| Driver | The reader's situation | Cells |
|---|---|---|
| **Capability** | The treatment isn't reliably available at home. Their fear is competence, not price. | 11 |
| **Cost** | Available and timely at home, but unaffordable privately. They're doing arithmetic. | 14 |
| **Queue** | Available at home but with an unacceptable wait. Comparing a date, not a hospital. | 5 |

**Europe is deliberately held back.** Those patients are queue-driven, which is a different trigger, a
different competitor set (Türkiye and Poland are closer and cheaper to reach), and a materially harder
regulatory position — GDPR requires standard contractual clauses and a transfer risk assessment before a
UK or Irish patient's data can be processed in India at all. It is a later corridor, not part of the wedge.

**Sachin Rai's ranked top-5 target markets** (9.5-year MVT desk veteran, interviewed 2026-07-22, re-confirmed
same day): **1. Ethiopia · 2. Nigeria · 3. Kenya · 4. Tanzania · 5. Zambia/Zimbabwe/Namibia** (a cluster, not
individually ranked). Cameroon and Sudan named as possible extensions, not core. This is one experienced
operator's real desk read on where MedYatra could actually win — agent-supply saturation, category fit, and
relationship access in each market — not aggregate industry volume; it's a different, complementary signal
to the cited 2025 figures above (which rank Oman ahead of Kenya at the country level). All five markets are
now in the data core (`market` table); Tanzania, Zambia, Zimbabwe, Namibia, Cameroon were newly added
2026-07-22. **Genuinely unresolved**: the existing build still treats Iraq/Oman/Yemen as the lead corridor
(Tier A) with all of Africa at Tier B — whether Ethiopia-led Africa should outrank that is a real open
decision, not yet made.

---

## 3. Unit economics

**Honest framing first: only two inputs in this model are measured. The rest are ours.** Package prices come
from cited pricing rows; the reader→lead rate and media cost come from published benchmarks. Five of seven
funnel stages have no published benchmark that we could find, and three of those five can be closed by a
single good conversation with a hospital partner.

The funnel, per 1,000 readers of a cost guide:

```
  Sees a cost guide or ad                    1000
  Messages us on WhatsApp                      45
  Treatment, country, timeline captured        16
▶ Reports in · structured case file            9      ◀ THE UNIT WE SELL
  Hospital returns opinion + estimate           6
  Accepts · deposit paid                        2
  Travels and is treated                        2
```

**The finding that shaped strategy.** Acquisition channel matters more than treatment category:

| Cardiac (package $5,667, fee $1,133) | Contribution per patient |
|---|---|
| Paid acquisition | **−$558** |
| Organic acquisition | **+$1,027 (91% of fee)** |
| A traditional agency, same fee | −$267 |

At mid-ticket, **paid acquisition does not work for anyone** — including us. Published medical-travel cost
per lead is $120–200 for bariatric/orthopaedic procedures; at any plausible conversion rate that exceeds a
$1,133 commission. Our advantage is in the cost of *converting and serving* a lead, never in acquiring one:
Google charges us exactly what it charges an incumbent.

Two consequences:

1. **Organic acquisition is the business**, not a marketing channel. It is the only route to a viable CAC at
   mid-ticket, and it compounds over 6–12 months rather than switching on.
2. **Oncology is the only category that survives paid acquisition** (package $21,500, fee $4,300,
   contribution $2,609). It is the candidate for funding the business while organic compounds.

**The strategic question still open:** oncology on paid to generate revenue now, or cardiac on organic with
a slower ramp. This resolves on two numbers only the hospitals have — the real commission rate by specialty,
and their real inquiry-to-treated conversion.

---

## 4. Hospital partnerships

The supply side is where a facilitator is won or lost, and it is our strongest current asset.

| Group | Status | Route |
|---|---|---|
| **Aster** | Warm intro pending, group level | Via the owning family |
| **Manipal** | Warm intro pending, group level | Via the former group legal head |
| **Fortis Bangalore** | Expected | — |

All three are strong in our target categories — oncology, cardiac, orthopaedics — and Manipal adds a
transplant programme of 2,000+ procedures, the highest-ticket category in medical travel and one we do not
yet model.

**One structural note on Aster:** the India and GCC businesses separated in April 2024 into two companies
(a Fajr Capital consortium holds 65% of the GCC entity; the Moopen family holds 35% there with operational
rights, and 41.88% of the India entity). Because the introduction comes from the family, it may reach both
— which would put demand-side clinics in the Gulf and supply-side hospitals in India inside one relationship.
That is the single highest-value thread we have.

**What we are asking for.** Not exclusivity and not volume promises. A preferred rate in exchange for
**pre-triaged, high-intent case files with attribution** — and, as a first step, permission to send three to
five test cases.

**What we have not yet secured:** any signed agreement, LOI, or preferred rate. That is the honest position.

**A third acquisition channel worth naming: payers, not just hospitals or doctors.** Sachin cited a real
precedent — Toyota routed its own insured employees through medical tourism for treatment. The pitch to an
insurer, a TPA, or a large self-insured employer is different from the hospital or doctor pitch: it's
financial (lower claims cost for treatment they're already going to pay for) applied to a whole population
at once, not a clinical-trust pitch to one referring person. This exact pitch is already built, once — the
`MedYatra × TruDoc` partnership document — and Toyota is independent evidence the underlying thesis holds
beyond that one company. **Documented, not yet built out as a repeatable motion** (no scoring rubric or
generalized outreach generator exists for it yet, unlike the hospital and doctor-affiliate tracks).

---

## 5. What is built

Operational today, without any API keys:

- **Patient journey** — a 22-stage WhatsApp sales-comms state machine with 21 approval-ready templates,
  covering the diagnosis fork, hospital handoffs, and stress cases (visa denial, complication, going quiet).
  Fully demonstrable in an interactive sandbox.
- **Supply side** — 22 hospital accounts ranked by a fit score, with a research worklist for confirming
  named decision-makers.
- **Content engine** — 32 guide cells across categories, markets and four languages; 10 published;
  demand-driver-aware generation; average trust score 100/100 across 30 pages after retrofit.
- **Pricing** — a price ladder comparing the patient's best local option first, then other international
  options, then India. 72 rungs carry a citation; **312 are explicit, unfilled research gaps** — deliberately
  left empty rather than estimated.
- **Human approval console** — nothing goes out without a person approving it.

**Not built:** roughly two-thirds of the concierge (flights, ground logistics, interpreter scheduling,
billing reconciliation, family updates, FRRO registration), the clinical pathway engine, and any live
WhatsApp connection.

**Nothing is live.** No real patient has been contacted, no real outreach has been sent, and there is no
revenue.

---

## 6. Safety, compliance and data

This is a health-adjacent business handling patient data across borders. The posture is deliberate and
enforced mechanically, not by policy document.

- **Clinical scope is enforced on every agent message.** Diagnosis, treatment advice, dosage, prognosis,
  fitness-to-fly and outcome guarantees are blocked before a human can approve them. A patient describing an
  emergency escalates out of the funnel to local emergency care. Verified by a 20-case adversarial test
  suite that fails the build on regression.
- **Non-English fails closed.** Our checks are English patterns; Arabic, Amharic, Burmese and Swahili
  messages cannot auto-send at all until a native clinical reviewer validates coverage. We would rather be
  slow than silently unguarded.
- **Data residency is enforced per market.** The sharpest constraint is the UAE: Federal Law No. 2/2019
  prohibits health data relating to UAE-provided services from leaving the country, absent a case-by-case
  authority exception. A UAE patient's records cannot be pulled into an India-hosted pipeline — including
  into an AI prompt, which is a transfer.

**That last point is also a moat.** Competitors running a Bangalore-hosted WhatsApp funnel into the Gulf are
non-compliant and mostly unaware of it. Solving it requires in-country presence — which is a strong argument
for an Abu Dhabi base.

**Regulatory status:** 3 of 12 markets cleared, and those clearances are illustrative demo clearances, not
legal sign-off. Replacing them with counsel opinions is a prerequisite to going live anywhere.

---

## 7. What we need to learn

In priority order. The first three are the model's weakest inputs and are all obtainable free, from the
partner conversations already scheduled.

1. **Inquiry-to-treated conversion.** No credible published benchmark exists beyond an aspirational "10%".
2. **The real commission rate**, by specialty. The range 15–25% swings the business from marginal to strong.
3. **What hospitals currently pay their agent panel**, as a share of the case. Validates or kills the wedge.
4. **Show-up rate** — what share of booked patients actually travel. Assumed 85%; could plausibly be 60%.
5. **Real acquisition cost in our markets.** Published CPL data is US-to-Latin-America. A few hundred dollars
   of test spend in Oman and Kenya would tell us more than further research.

---

## 8. Sequence to a first treated patient

Three constraints bind, and **none of them are engineering**:

| Constraint | Time | Owner |
|---|---|---|
| WhatsApp Business API number + Meta template approval | 2–4 weeks | Us, in parallel |
| One hospital agreement + clinical pathway sign-off | 4–8 weeks | Hospital governance |
| One market cleared by counsel | 2–4 weeks | External counsel |
| Remaining concierge build | 4–6 weeks | Us, in parallel |

**Realistic first treated patient: 8–12 weeks**, if the hospital relationships move at a normal pace.

---

## 9. Where this goes

Medical travel is the wedge, not the destination. The long-term position is the infrastructure layer for
cross-border care — but that claim has to be *earned*, and the argument is specific:

> The comparison sites that came before failed because they were built on brochures. Running the concierge
> is what produces data nobody else has — real negotiated prices, real wait times, real conversion by
> corridor, real recovery timelines, real complication rates. You have to do the unscalable facilitation to
> earn the dataset that makes the platform possible.

Adjacent expansions — financing, insurance claims, a portable health record — are each regulated activities
requiring a licence or a licensed partner. They are year-three items and are recorded as such so nobody
builds toward them by accident.

---

## 10. Honest risk register

- **We have no signed hospital agreement.** Everything downstream depends on relationships that are warm but
  unconsummated.
- **The unit economics rest on assumptions.** Two grounded inputs, thirteen assumed. The model has already
  reversed one strategic conclusion once when real data replaced a guess; it may do so again.
- **Organic acquisition takes 6–12 months to compound**, and it is the only channel that works at mid-ticket.
  That is a real runway requirement, not a detail.
- **Cardiac is the most competed segment in Indian medical travel** at 22.46% of market revenue.
- **International arrivals have fallen sharply** across several Indian cities, with West Asian volumes down
  materially. That is why hospital desks are receptive — but it is also a shrinking near-term pool.
- **Non-English content is machine-drafted** and not publish-ready without native review.
- **No revenue, no patients, no entity.**

---

*Working codename MedYatra ("medical journey"). Prepared for partner and investor conversations; every
figure is either cited or labelled as an assumption. Where a number is ours, it is a hypothesis awaiting a
real one.*
