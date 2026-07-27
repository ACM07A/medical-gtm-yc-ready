# Canopus Care — Business Status

**As of 27 July 2026.** Written for people deciding whether to back, partner with, or join this — not for
engineers. The technical walkthrough is [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md); the 2-minute version is
[`README.md`](./README.md).

Everything below distinguishes **what we know** from **what we assume**. Assumptions are labelled, because the
single fastest way to lose a hospital partner or an investor is to quote a guess as a fact.

**Who's building it.** Two founders, 50/50, IIM Trichy batchmates who have known each other nine years.
**Hussain** owns GTM, hospital supply and the demand funnel (nine years of 0-to-1 sales and channel building in
healthtech and fintech; built the hospital-partnership engine at LiveAltlife). **Ajeya** owns AI, product and
engineering (built Ricotta Trivia to $800k ARR; 3+ years shipping AI products on the exact agent stack this runs
on). Both in Bengaluru. Started 2 July 2026.

---

## 1. What the business is

Canopus Care is an **end-to-end medical-travel facilitator**. A patient in Africa, the Middle East, or Central
Asia — or a travel agent holding their case — starts a case with us, and **a team of AI agents runs the whole
journey**: structuring the case, chasing missing reports, routing it to the right Indian hospital, organizing the
estimate and a pre-travel video consult with the treating surgeon, then coordinating the visa, flights,
accommodation, interpreter, and aftercare — with **one conversational point of contact** (the concierge, working
name *Suhail*) the patient and their family can ask at any hour. **Hospitals pay us per treated patient.** We are
not a hospital, we make no clinical decisions, and we do not sell software.

**What we replace.** Today that coordination is done by a fragmented network of individual agents and hospitals'
own international desks. Indian hospitals already price **25–33% agent commissions into their international
tariffs** — the acquisition margin is baked in whether the patient comes through an agent or not. That is the
budget we are paid from: we deliver a **treatment-ready patient** more cheaply than an agent, and better
coordinated. We open **below** the incumbent floor (20% vs 25–33%), so the hospital nets more per case.

**We are not "just another agent."** An agent coordinates one patient by hand and cannot scale past their own
bandwidth; most are tied to only one or two hospitals. The real problem is **orchestrating a fragmented,
multi-party supply chain per patient** — hospital, visa, flights, stay, interpreter, aftercare, compliance — fast
and correctly. That is an AI-orchestration problem, and it is the company: we are building the coordination layer
that agents and hospital desks are doing by hand.

**How we win the patient — and how we do not.** We do **not** win on a cheaper treatment price. A hospital will
not pass our lower fee through as a cheaper package; it keeps the difference as margin, so the same treatment
costs the same whether a patient comes via us, an agent, or alone. We win on **removing the complexity and
ambiguity** of the whole journey, on **transparency** (we show the true all-in cost — most quotes hide the ~40%
travel basket on top of the package), on the **named surgeon and a pre-travel video consult** most patients can't
get today, and on a single point of contact that behaves like it is on the patient's side.

**Empathy is a hardcoded requirement, not a value statement.** A patient in this funnel is, by definition, making
a frightening decision — a parent's heart surgery, a diagnosis received abroad — under real financial and
emotional pressure. Every touchpoint has to feel like it is on their side. This shapes the agent prompts, the
concierge copy, and the published content, not just the marketing — a standing filter, not a one-time pass.

---

## 2. Market

India treated roughly **644,000 foreign patients on medical visas in 2024**, a market of about **$7.7bn growing
~18%/year**. **~24% of that flow is our corridor** — ~16% West Asia and ~8% Africa — with Iraq, Oman, Ethiopia,
Kenya, Nigeria, Tanzania and Somalia among the top source countries. (A broader ~7.3m "medical value travel"
figure exists but folds in wellness, AYUSH and accompanying attendants; we use the 644k medical-visa number
because it is the honest one.)

**Our markets: Africa, the Middle East, and Central Asia (SE Asia adjacent).** We segment by *why they travel*,
not by country, because it changes the entire proposition:

| Driver | The reader's situation | 
|---|---|
| **Capability** | The treatment isn't reliably available at home. Their fear is competence, not price. |
| **Cost** | Available and timely at home, but unaffordable privately. They're doing arithmetic. |
| **Queue** | Available at home but with an unacceptable wait. Comparing a date, not a hospital. |

**Europe is deliberately held back.** Those patients are queue-driven — a different trigger, a different
competitor set (Türkiye and Poland are closer and cheaper to reach), and a materially harder regulatory position
(GDPR requires standard contractual clauses and a transfer risk assessment before an EU patient's data can be
processed in India). It is a later corridor, not part of the wedge — though the ten-year thesis is that Europe,
the Americas and Japan increasingly *become* source markets as their own systems strain.

**Sachin's ranked target markets** (an Assistant Manager on a Bangalore hospital's international desk, ~9.5-year
MVT veteran, interviewed 2026-07-22): **1. Ethiopia · 2. Nigeria · 3. Kenya · 4. Tanzania · 5.
Zambia/Zimbabwe/Namibia** (a cluster). This is one experienced operator's desk read on where we could actually
win — agent-supply saturation, category fit, relationship access — a complementary signal to the aggregate
volume figures. **Genuinely unresolved:** whether Ethiopia-led Africa should outrank the existing Iraq/Oman-led
Gulf corridor is a real open decision, not yet made.

**One operational gap, flagged honestly.** Central Asia and Francophone Cameroon are **Telegram/Instagram-first,
not WhatsApp**. Our comms engine is WhatsApp-first today, so serving those markets means adding a Telegram
channel before spend goes there — a market added is not a market served.

---

## 3. Business model & unit economics

**Two revenue streams.**

1. **Hospital success fee** — 20% of the treatment package at entry, stepping to 22.5% and capping at 25% as
   cumulative annual routed revenue crosses ₹20L and ₹50L. Always **at or below** the 25–33% incumbents charge.
   On a $5,000–9,000 cardiac package that is ~$1,000–1,800 per treated patient. This is not a new cost to the
   hospital — it comes out of the acquisition margin their tariffs already carry.
2. **Vendor-side commissions** on the logistics we book — accommodation (~10–15%, the OTA-standard rate), ground
   transfers, interpreter, and visa-documentation service fees (flights carry near-zero commission — a service,
   not a revenue line). This moves to **pre-negotiated bundles** for common corridors and a **live AI quotation
   system** beyond them. Getting the right quote across hospital and every vendor — fast, at a good price and a
   good commission — is the core ops problem, and where the AI agents compound.

**The patient's real budget is package + basket.** An Indian hospital's international package covers the clinical
stay only. It does **not** cover flights, visas, out-of-hospital accommodation, food, local transport, or an
attendant — which add **~40% on top** of the package. Most quotes hide this; our estimates always show the true
all-in, because that transparency is part of how we win.

**Go-to-market sequence (this is the plan, stated plainly).**

- **Start with organic + paid performance marketing** to acquire patients directly. Initial capital is the
  founders' own. This is the only path that earns the **full 20% commission**, because on a patient we bring, we
  are the full facilitator.
- **Build the agent-facilitation channel later**, after the first ~30–50 treated patients for partner hospitals.
  The agent channel does **not** pay 20% — the agent keeps the patient relationship, so at best we earn a nominal
  per-patient fee or a monthly admin-facilitator subscription. It is a lower-margin volume tier, not the core.
- **Hospitals should eventually introduce us to their own agents** — the hospital also suffers agent
  fragmentation and disconnected information, so our supply relationship becomes a demand channel.

**Two sides, not a contradiction.** Warm hospital access is the **supply** side — the hard side of this market,
and our unfair advantage. Owned organic/paid demand is how we reach patient one and earn the whole fee. They are
complementary.

**Honest framing on the numbers.** Only two inputs in our funnel model are measured (package price, and the
reader→lead rate + media cost from published benchmarks); the rest are ours, labelled, and three of them close
with a single good hospital conversation. The finding that shaped strategy: **Google charges us the same
cost-per-lead as an incumbent agency**, so paid acquisition is thin-to-negative at mid-ticket on its own — which
is why **organic compounds into the real acquisition engine** over 6–12 months, and why the AI-driven **cost of
converting and serving** a case (not acquiring it) is where our advantage actually lives.

**The size of it, bottom-up.** ~24% of India's 644k medical-visa arrivals is ~155,000 patients from our
corridor; at an average ~$1,200 fee that corridor alone is a **~$185m/year facilitation pool today, growing
~18%/year**. **$100m ARR is ~83,000 treated patients** — a low double-digit share of India's inbound flow. We
take no patient markup, so growing us costs the patient nothing.

---

## 4. Hospital partnerships

The supply side is where a facilitator is won or lost, and it is our strongest current asset.

The **first partner set is a deliberate Bangalore cluster** — same city as our MVT adviser — plus one family
connection in Gujarat. Clustering the first outreach makes site visits, warm introductions and a repeatable pitch
cheap; it is a beachhead, not the whole map.

| Hospital | Status | Route |
|---|---|---|
| **Fortis, Bannerghatta Road** | Warmest path — our adviser's own desk | Via the international-desk adviser |
| **Aster (Hebbal)** | Warm intro, group level | Via the owning family |
| **Manipal** | Warm intro, group level | Ajeya's father is the group's former Lead Counsel |
| **KIMS (E-City)** | Warm — Hussain's former company partnered, close to the COO | Direct + warm |
| **SPARSH** | Warm — family connection to the owner + doctors we know | Family connection |
| **Prime Hospitals, Rajkot** | Warm — Hussain's brother-in-law is a 1/3 owner | Family |

All are strong in our target categories — oncology, cardiac, orthopaedics. SPARSH and KIMS are the
lesser-known names in the set, where the credibility engine and better margin terms both matter most.

**Three real conversations so far — and what they changed.** With our Fortis international-desk adviser, our Aster
contact, and Hussain's brother-in-law (co-owner, Prime Rajkot). They changed our assumptions, not just confirmed
them: hospitals already **budget the 25–33% commission** into international cases; they value a **treatment-ready
patient over lead volume**; they **don't cover travel or stay**; and they treat **compliance as a bigger concern
than software**. Those learnings shaped our pricing and roadmap.

**Who we approach first is a scored decision.** The account board ranks on a **pursuit score = 0.45·access +
0.30·fit + 0.25·speed** — access because a warm introduction changes everything, fit because the margin thesis
still matters, and speed because partnering is fast once the commission number is agreed. The board's next-action
for every warm account is literally "close the commission number."

**What we ask for — the value exchange.** Not exclusivity and not volume promises. In exchange for our
below-incumbent fee we ask for **the same package inclusions the hospital already extends to its agents, plus a
pre-travel video consult with a senior specialist**, priority admission/OT scheduling for our patients, and a
named international coordinator. Quantified at the 20% entry tier: on a $6,200–8,500 cardiac package the hospital
nets **$310–425 more per case** than under a 25% incumbent, and **$806–1,105 more** than a 33% one.

**Pricing runs on actuals.** Commission economics run on real hospital rate cards where one exists and
clearly-labelled indicative ranges where none does — and today the honest output is the gap: **0 of 16 pursued
partner×category cells have a confirmed rate card.** Collecting those is a first-call agenda item.

**Two more acquisition motions exist alongside hospitals** (built, not yet worked): a **doctor-affiliate** account
type (recruit an individual clinician as a referral partner; the outreach generator refuses to state a
referral-fee number, enforced in code) and the **base of a payer channel** (insurers/TPAs/large employers routing
insured members — a real precedent is Toyota; prototyped once as the TruDoc partnership document; repeatable
outreach parked for phase 2/3).

**What we have not secured:** any signed agreement, LOI, preferred rate, or actual rate card. That is the honest
position.

---

## 5. What is built

Operational today in a sandbox, runnable in one command, with no API keys:

- **The operator OS / reviewer console** — role-scoped surfaces for the agent, hospital, vendor and platform
  views, a golden synthetic cardiac case that moves through the real workflow (agent → hospital → estimate →
  human approval), and a consent-blocked case that refuses. Signed, expiring reviewer sessions; anonymous
  visitors get a read-only role. Every action writes an audit row.
- **The concierge (Suhail)** — one conversational point of contact for patient and family across the whole
  journey. Deterministic and key-free: it answers from the live case record (status, documents, costs, travel,
  hospitals), **deflects every clinical question to the doctors**, **escalates emergencies**, and **refuses to
  share anything on a case without consent on file** — the same boundaries the rest of the system enforces,
  demonstrated from the family's side.
- **The 13-agent journey engine** — a booked patient carried from intake through aftercare: triage,
  document-KYC, visa documents, a **patient–doctor video consult** (gated on a finalized quote; we schedule it and
  are not a party to the clinical conversation), accommodation, flexible-date ticketing, airport logistics,
  interpreter scheduling, family updates (on the family member's own consent), discharge-and-medication relay,
  billing reconciliation, and payment routing. A full-journey orchestrator runs one real lead through all
  thirteen in chronological order in a single click. Several agents are deliberately deterministic — a visa rule,
  a medication instruction, a sum of money — because a wrong answer there is worse than no answer.
- **Medical data vault — GDPR as the backbone, in code.** Clinical information moving between patient and hospital
  lives in an AES-256-GCM-encrypted vault in its own database, separate from everything commercial. Our own read
  surface is limited by construction to what a non-clinical facilitator needs (treatment name/protocol,
  timelines, cost structure, surgeon details). Decryption exists only for named relay purposes; every access
  including refusals is logged; erasure leaves an audit tombstone. A per-market health-data law register covers
  all 22 source markets + India (every entry pending counsel).
- **Patient acquisition rails** — a 22-stage WhatsApp sales-comms state machine with approval-ready templates
  (diagnosis fork, hospital handoffs, stress cases), an editable journey sandbox, a demand-driver-aware content
  engine, and a price ladder that leads with the patient's best local option. Dual-mode intake: our own
  acquisition *or* an external operator's lead DB via a per-tenant ingestion endpoint.
- **Empathy in code** — a single canonical voice module governs every patient- and family-facing message and
  every published guide, closing a real gap where an emergency message once returned only an internal flag.
- **Deployment + resilience** — Dockerized, `render.yaml` with a persistent disk, first-boot-only deterministic
  seeding, `/api/readiness` health checks, database backup and restore-verification, and generation that fails
  over across two model providers with an auto-loop that resumes when a rate limit clears.
- **Tested** — **33 automated tests** run in CI on every push, covering signed sessions, role scope,
  consent blocking, commission consistency, case projection, vendor lifecycle, the safety gate (a 20-case
  adversarial suite), and a **concierge red-team suite** that verifies the bot leaks no PHI through any phrasing,
  refuses cross-tenant access, escalates emergencies over the consent gate, and holds no write pen.

**Still not built, or built-but-not-live:** a live WhatsApp Business connection; real vendor keys (flights,
hotels, interpreters run on curated estimates until keyed); a live public deployment URL + reviewer credentials;
the generalized payer-outreach motion (phase 2/3); and native-speaker sign-off on the non-English safety lexicon.

**Nothing is live.** No real patient has been contacted, no real outreach has been sent, and there is no revenue.
The demo runs entirely on synthetic cases and says so on every screen.

---

## 6. Safety, compliance and data

This is a health-adjacent business handling patient data across borders. The posture is deliberate and enforced
mechanically, not by policy document.

- **Facilitator, not provider.** That is the legal basis for operating without a healthcare licence in every
  source market, and one agent sentence of diagnosis, dosage, or prognosis voids it — so scope is enforced on
  agent *output*, not requested in a prompt. Diagnosis, treatment advice, dosage, prognosis, fitness-to-fly and
  outcome guarantees are blocked before a human can approve them. A patient describing an emergency escalates out
  of the funnel to local emergency care.
- **We red-team the boundaries, and treat leakage as an authorization property.** The concierge is deterministic,
  so it can't fabricate a clinical or cost claim; consent and cross-tenant access are enforced in code and tested
  adversarially in CI (the concierge red-team suite, §5). This is the trust-and-safety spine for the payer channel
  and for reviewers.
- **Non-English fails closed.** Arabic, Amharic, Burmese and Swahili messages cannot auto-send until a native
  clinical reviewer validates coverage. We would rather be slow than silently unguarded.
- **Data residency is enforced per market.** The sharpest constraint is the UAE: Federal Law No. 2/2019 prohibits
  health data relating to UAE-provided services from leaving the country — including into an AI prompt, which is a
  transfer. **Four of 22 markets are blocked** on data-residency grounds (UAE, Uzbekistan, Kazakhstan, Zambia):
  the vault hard-refuses their clinical data and the marketing gate blocks outreach, until in-country hosting or a
  replica exists.

**That last point is also a moat.** Competitors running a Bangalore-hosted funnel into the Gulf are non-compliant
and mostly unaware of it. Solving it requires in-country presence — a strong argument for a UAE base later.

---

## 7. What we need to learn

In priority order. The first three are the model's weakest inputs and are all obtainable free, from partner
conversations already in motion.

1. **Inquiry-to-treated conversion.** No credible published benchmark exists beyond an aspirational "10%".
2. **The real commission rate, by specialty.** The range swings the business from marginal to strong.
3. **What hospitals currently pay their agent panel**, as a share of the case. Validates or kills the wedge.
4. **Show-up rate** — what share of booked patients actually travel. Assumed 85%; could plausibly be lower.
5. **Real acquisition cost in our markets.** A few hundred dollars of test spend in Ethiopia, Oman and Kenya
   would tell us more than further desk research.

---

## 8. Sequence to a first treated patient

The binding constraints are **relationships, counsel, and configuration — not engineering.**

| Constraint | Time | Owner |
|---|---|---|
| Name freeze + public deploy (URL + reviewer credentials) | days | Us |
| WhatsApp Business API number + Meta template approval | 2–4 weeks | Us, in parallel |
| One hospital agreement + clinical pathway sign-off | 4–8 weeks | Hospital governance |
| One market cleared by counsel | 2–4 weeks | External counsel |
| Vendor keys + live wiring (flights, stay, interpreter) | days–2 weeks | Us — config, not a rebuild |

The concierge build is done and off this list. **Realistic first treated patient: 8–12 weeks**, if the hospital
relationships move at a normal pace.

---

## 9. Where this goes

Medical travel is the wedge, not the destination. The long-term position is the **infrastructure layer for
cross-border care** — but the claim has to be earned, and the argument is specific:

> The comparison sites that came before failed because they were built on brochures. Running the concierge is what
> produces data nobody else has — real negotiated prices, real wait times, real conversion by corridor, real
> recovery timelines. You have to do the unscalable facilitation to earn the dataset that makes the platform
> possible.

And the tailwind is structural: India's (and other corridors') healthcare keeps getting better and cheaper, while
the markets that will increasingly look outward — Europe, the Americas, Japan — face systems that are only getting
more strained. Adjacent expansions (financing, insurance claims, a portable health record) are each regulated and
are recorded as year-three items so nobody builds toward them by accident.

---

## 10. Honest risk register

- **We have no signed hospital agreement.** Everything downstream depends on relationships that are warm but
  unconsummated.
- **Founder commitment is a live question.** Ajeya is transitioning off Ricotta Trivia (a running $800k-ARR
  business); until that has a clean answer, divided attention is the risk a partner will name first.
- **The unit economics rest on assumptions.** Two grounded inputs, the rest ours. The model has reversed a
  strategic conclusion once when real data replaced a guess; it may again.
- **Organic acquisition takes 6–12 months to compound**, and it is the only channel that clears CAC at
  mid-ticket. That is a real runway requirement, not a detail.
- **Cardiac is the most competed segment** in Indian medical travel.
- **International arrivals softened** across several Indian cities — which is why hospital desks are receptive, but
  it is also a tighter near-term pool.
- **Non-English content is machine-drafted** and not publish-ready without native review.
- **No revenue, no patients, no legal entity yet.**

---

*Working codename Canopus Care ("medical journey"), not yet trademark-cleared. Prepared for partner and investor
conversations; every figure is either cited or labelled as an assumption. Where a number is ours, it is a
hypothesis awaiting a real one.*
