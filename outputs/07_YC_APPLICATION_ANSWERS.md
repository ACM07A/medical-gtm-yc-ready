# YC Application — Drafted Answers (Fall 2026)

**Source of method:** Fluently (YC W24) alumni guide — Yurii Rebryk, accepted on his 3rd application.
**Rules applied throughout** (rewrite in the same spirit): answer *directly* in 1–5 sentences; facts and
numbers, no marketing buzz; YC invests in **people** — sell the team; share the insights and obstacles you
actually discovered; make it one cohesive story; **be honest**. Progress answers = 3–5 plain bullets, strongest
fact first, zero fluff. TAM = bottom-up, ideally "we need only X% of the market for $100M ARR."

`[FOUNDER FILL]` = only Ajeya/Hussain can answer — YC weighs these most.
`[VERIFY]` = plausible number that must be source-checked before submission.
Name used below: **Canopus Care** (swap once frozen).

---

## Describe what your company does in 50 characters or less.

**Primary (50 chars exactly):**
> The end-to-end care journey to India for treatment

**Alternates (counted programmatically):**
- `Gets African patients treated in India, end to end` (50) — most concrete, but drops ME/Central Asia
- `End-to-end medical travel to India, hospital-paid` (49) — leads with the business model
- `Medical travel to India, handled end to end` (43) — shortest, safest

## Company URL

`[FOUNDER FILL — deploy first]` — the demo Render URL or a one-page Framer site. The guide is emphatic that
a URL materially helps; the landing page repo exists and needs only the deploy + `SANDBOX_URL` env to go live.

## If you have a demo, attach it below.

60–90-second product video per the recorded plan (YC_PLAN §7.3 structure is good — one case, one story):
golden cardiac case → missing document caught → hospital match → estimate + human approval → **Ask Suhail
answering the family** → the consent-blocked case refusing. `[FOUNDER FILL — record after name freeze]`

## What is your company going to make?

> Canopus Care runs the whole journey for a patient travelling to India for treatment. A patient in Africa,
> the Middle East, or Central Asia — or a travel agent holding their case — starts a case with us; software
> structures it, finds what's missing, routes it to the right Indian hospital, and organizes the estimate and
> a video consult with the treating surgeon. We then handle visa paperwork, flights, accommodation, an
> interpreter, and aftercare follow-up, with one conversational point of contact the patient's family can ask
> at any hour. Hospitals pay us per treated patient; clinicians keep every clinical decision, and anything
> sensitive needs a human approval. Long-term, we want to be the operating layer that cross-border care runs on.

*(5 sentences — at the guide's limit. Dropbox-style: concrete, mechanism-first, vision in one line.)*

## Where do you live now, and where would the company be based after YC?

`[FOUNDER FILL]`. Suggested honest framing if staying: "Bengaluru — our first five hospital partners are in
one city here, and the supply side of this business is won in person at their international desks."

## How far along are you?

- Working product, built in 20 days (83 commits since July 8): case workflow for agent → hospital → estimate
  → approval, 13 journey agents (visa, ticketing, stay, interpreter, billing, aftercare), and a patient/family
  concierge bot — all runnable in one command, no API keys, 15 automated tests passing.
- 0 revenue, 0 real patients — the demo runs entirely on synthetic cases, and says so on every screen.
- Warm introductions in progress to 3 Bangalore hospital groups (Aster, Manipal, Fortis Bannerghatta) via
  `[FOUNDER FILL: the owning family / a former group legal head / our adviser's own desk — state precisely]`.
- Advised by a veteran hospital international-patient-desk operator `[FOUNDER FILL: Sachin's title + consent
  to name him]`, whose numbers (incumbent commissions, upfront-payment norms) anchor our pricing model.
- Health-data-law register covering 22 source markets; we deliberately refuse 4 of them (UAE, Uzbekistan,
  Kazakhstan, Zambia) until we can meet their data-residency laws — the compliance gate is working code.

## How long have each of you been working on this? How much has been full-time?

`[FOUNDER FILL — per founder, with dates]`. Verifiable piece: the codebase started **July 8, 2026** (83
commits since). The guide: full-time is the green flag; if either of you quit or is quitting a job for this,
say it plainly with the date.

## How many active users or customers do you have? How many are paying?

> 0 users and 0 paying — we are pre-launch. The pipeline is 3 Bangalore hospital groups under warm
> introduction; hospitals (not patients) are who pay us.

*(The guide's example answer for this stage is exactly this shape: two plain facts, no cushioning.)*

## Why did you pick this idea? Do you have domain expertise? How do you know people need this?

- `[FOUNDER FILL — 1 sentence: the real moment this became your problem. Do not invent a dramatic origin.]`
- Domain: `[FOUNDER FILL — each founder's relevant background in 1–2 sentences]`; plus a standing adviser who
  ran an international patient desk inside `[VERIFY: Sachin's hospital + role]`.
- Demand facts we've verified so far: incumbent facilitation agents charge Indian hospitals **25–33% of the
  package** for cases coordinated over WhatsApp and spreadsheets; hospitals require **80–100% of the package
  upfront** before surgery; `[FOUNDER FILL: N hospital-desk and M agent interviews conducted — real numbers
  only]`. Patients pay these costs invisibly today; hospitals sign us because we open at 20%.

## Who are your competitors? What do you understand that they don't?

> Incumbent facilitators (Vaidam, HealthTrip, MediGence `[VERIFY current top 3]`) and the informal agent
> networks that route most of this flow today; hospitals' own international desks are the substitute.
>
> What we understand: the constraint isn't demand — India's hospitals already receive it — it's coordination
> cost. Incumbents charge hospitals 25–33% because human coordinators scale linearly with cases; since our
> coordination is software, we profitably open at 20%, rising only to 25% (their floor) at volume — the
> hospital never pays more than its cheapest current agent and gets a treatment-ready case file instead of a
> lead. And we treat health-data law as a feature, not friction: our system legally refuses markets we can't
> serve yet, which is exactly what a hospital's compliance team wants to see.

## How do or will you make money? How much could you make?

> Hospitals pay us a success fee per treated patient: 20% of the package at entry, stepping to 22.5% and
> capping at 25% as annual routed revenue grows — always at or below the 25–33% incumbents charge. On a
> $5,000–9,000 cardiac package that is ~$1,000–1,800 per patient. Bottom-up: at an average $1,200 fee, $100M
> ARR needs ~83,000 treated patients a year — about 4% of the ~2 million international patients India already
> treats annually `[VERIFY figure + source before submission]`. We take no patient markup, so growing us costs
> the patient nothing.

## Equity breakdown

`[FOUNDER FILL]`. Guide (quoting Michael Seibel): "Aim for roughly equal equity splits" — a 90/10 split is a
red flag to YC because the 10% founder has little reason to stay when it gets hard.

## Other ideas you considered (guide: 50-char line + 1 sentence each — YC sometimes funds these)

- `Payer rails for cross-border care benefits` (42) — insurers/TPAs/employers route members to Indian
  hospitals on the same case rails; already prototyped against a Gulf TPA's workflow.
- `White-label rails for medical-travel operators` (46) — multi-tenant platform where existing operators plug
  their lead databases into tenant-isolated journey rails; de-identified cross-operator benchmarks compound.
- `Tiny open health-logistics model for Africa` (43) — a 1.5–2B-parameter open-source on-device model for
  health-adjacent logistics in low-connectivity markets; fine-tuning spec already written.

## Founder-only questions the application will also ask — prepare these together

How you met · how long you've worked together · who writes code (be specific about the AI-assisted workflow —
it's a strength: **one founder-directed agent stack produced a tested product in 20 days**) · what each of you
built or sold before · what you've done together under pressure · why you'll still be doing this in 10 years.

---

## Submission checklist deltas (vs YC_PLAN)
- [ ] Name frozen with Ajeya → swap into every answer above.
- [ ] Repo URL = `github.com/hussainbombaywala/medical-tourism-gtm` (NOT ACM07A).
- [ ] Deploy demo → paste URL + reviewer credentials into the application block.
- [ ] Verify: incumbent-commission range attribution, India inbound-patient volume, competitor top-3.
- [ ] Founder video: use the refocused line from `outputs/06_YC_REFOCUS.md`, not YC_PLAN's agent-SaaS line.
