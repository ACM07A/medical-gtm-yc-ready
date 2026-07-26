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

We both live in **Bengaluru** and will base the company here: most of our first hospital partners are
headquartered in this city and both our families are here — and the supply side of this business is won in
person at hospitals' international desks. We may open a **UAE office** later to meet Gulf data-residency laws
and open that corridor.

## How far along are you?

- Working product, built in three weeks (started July 2; 83 commits): case workflow for agent → hospital →
  estimate → approval, 13 journey agents (visa, ticketing, stay, interpreter, billing, aftercare), and a
  patient/family concierge bot — all runnable in one command, no API keys, 15 automated tests passing.
- 0 revenue, 0 real patients — the demo runs entirely on synthetic cases, and says so on every screen.
- Direct warm intros into 5 hospitals, most through personal ties (this is our unfair advantage — hospital
  supply is the hard side of this market): **Manipal** (the group's former Lead Counsel is Ajeya's father),
  **Fortis Bannerghatta** (our adviser, an Assistant Manager on their International Desk, connects us inside), **KIMS E-City** (Hussain's
  former company LiveAltlife is partnered and close to the COO), **Sparsh** (family connection to the owner +
  doctors we know there), and **Prime Hospitals, Rajkot** (Hussain's brother-in-law is a 1/3 owner).
- Advised by an Assistant Manager on the Fortis Bannerghatta International Desk, whose numbers (incumbent
  commissions, upfront-payment norms, exactly what a package includes) anchor our model.
- Three hospital conversations so far: our Fortis International Desk adviser, our Aster contact, and Hussain's
  brother-in-law (co-owner, Prime Rajkot) — feedback plus open-ended discussion of actually partnering.
- Health-data-law register covering 22 source markets; we deliberately refuse 4 of them (UAE, Uzbekistan,
  Kazakhstan, Zambia) until we can meet their data-residency laws — the compliance gate is working code.

## How long have each of you been working on this? How much has been full-time?

We started on **July 2, 2026** — about three weeks. Hussain is on a career break and has been on this
effectively full-time since day one; Ajeya has split time with Ricotta Trivia and is moving to full-time on
Canopus Care now. Once we submit this application we're both full-time: we'll incorporate, put in our own
money, and are targeting our first hospital-paid commission by end of October `[FOUNDER FILL — confirm the
exact split of Ajeya's time so this is precise, not rounded up]`.

## How many active users or customers do you have? How many are paying?

> 0 users and 0 paying — we are pre-launch. The pipeline is 3 Bangalore hospital groups under warm
> introduction; hospitals (not patients) are who pay us.

*(The guide's example answer for this stage is exactly this shape: two plain facts, no cushioning.)*

## Why did you pick this idea? Do you have domain expertise? How do you know people need this?

- Hussain spent 4.5 years at LiveAltlife building hospital and doctor partnerships — including embedding a
  Narayana Nethralaya hospital partnership across four locations — and kept seeing international patient cases
  run on WhatsApp, phone calls and spreadsheets; the idea of doing it properly has been in his head for years.
- Domain + access, split cleanly across the two of us: **Hussain** built 0-to-1 sales and channel engines for
  nine years in healthtech and fintech (LiveAltlife: a handful of customers → 250+ subscribers/month and 75+
  partnerships; before that a ₹40Cr lending book at OfBusiness and 50%+ of a city's revenue at a Paytm company)
  — he knows how to win hospital supply and build a demand funnel. **Ajeya** left FMCG in 2021 to build Ricotta
  Trivia to $800k ARR and has shipped AI products for 3+ years on exactly the agent infrastructure this is built
  on — he owns the tech. **Ajeya's father was Lead Counsel of the Manipal Group**, so we understand precisely
  how hospitals' existing facilitator agreements are written and where the commercial friction sits.
- How we know people need it: India already treats ~**644,000 foreign patients a year on medical visas**
  (a ~**$7.7B** market growing ~18%/year), and **~24% of that flow is our corridor** — 16% West Asia, 8% Africa,
  with Ethiopia, Kenya, Tanzania, Oman and Iraq among the top source countries. Today that demand is served by
  agents charging hospitals **25–33%** over WhatsApp, with patients paying **80–100% of the package upfront**.
  We've had first partnering conversations with three hospitals (Fortis, Aster, Prime Rajkot), and our Fortis
  International Desk adviser confirms the numbers.

## Who are your competitors? What do you understand that they don't?

> The real competition isn't the branded platforms — it's a **fragmented army of individual agents**: foreign
> students, interpreters, even former patient-attendants who learned the mechanics and became agents, plus
> **hospitals' own international desks**, which have built deep in-country referral networks, local information
> centres, and senior doctors who refer patients directly for a cut. The visible layer on top is the
> aggregators — Vaidam (100k+ patients since 2016), MediGence, HealthTrip — but they're mostly lead-generation
> directories, not the operating layer.
>
> What we understand that they don't: this is not one market, it's two flows. Most patients today arrive
> already captured by an agent or a referring doctor. But **10–20% arrive organically** — they research, shop
> around, and choose for themselves — and that self-directed flow is underserved by everyone, because agents
> compete on relationships and kickbacks, not on transparent discovery. **We win that direct demand first** by
> removing the complexity and ambiguity of the whole journey — reports, hospital quote, travel, accommodation,
> local logistics — and by being transparent about the true all-in cost (agents quote a clean package price and
> hide the ~44% travel basket; we don't). We do **not** compete on price — the same treatment costs the same
> whether a patient comes via us, an agent, or alone — we compete on certainty, transparency and a supported
> journey, plus a pre-travel video consult with a senior specialist that most patients can't get today.
> Underneath, our advantage is structural: incumbents charge 25–33% because human coordinators scale linearly
> with cases; our coordination is software, so we profitably open at 20% and give the hospital a treatment-ready
> case file, not a lead. And we treat health-data law as a feature — the system legally refuses markets we can't
> yet serve, which is exactly what a hospital's compliance team wants to see.

## How do or will you make money? How much could you make?

> Hospitals pay us a success fee per treated patient: 20% of the package at entry, stepping to 22.5% and
> capping at 25% as annual routed revenue grows — always at or below the 25–33% incumbents charge. This isn't a
> new cost to them: hospital international tariffs are *already* priced to fund agent payouts, so the commission
> comes out of margin they've allocated to acquisition regardless — they simply care about the business coming
> in, and we deliver it cheaper and treatment-ready. On a $5,000–9,000 cardiac package that is ~$1,000–1,800 per
> patient (add modest vendor-side commission on the travel basket). Bottom-up: India treats ~644,000 foreign patients a year on medical visas; ~24% (~155,000)
> come from our Africa + Middle East corridor, so at an average ~$1,200 fee that corridor alone is a
> **~$185M/year facilitation pool today, growing ~18%/year**. $100M ARR is ~83,000 treated patients — a low
> double-digit share of India's inbound flow, reached by owning the self-directed organic segment first and
> layering in agent and hospital-desk channels. We take no patient markup, so growing us costs the patient nothing.

## Equity breakdown

> Hussain 50%, Ajeya 50%.

(Exactly what the guide wants — Michael Seibel: "Aim for roughly equal equity splits.")

## Other ideas you considered (guide: 50-char line + 1 sentence each — YC sometimes funds these)

- `Payer rails for cross-border care benefits` (42) — insurers/TPAs/employers route members to Indian
  hospitals on the same case rails; already prototyped against a Gulf TPA's workflow.
- `White-label rails for medical-travel operators` (46) — multi-tenant platform where existing operators plug
  their lead databases into tenant-isolated journey rails; de-identified cross-operator benchmarks compound.
- `Tiny open health-logistics model for Africa` (43) — a 1.5–2B-parameter open-source on-device model for
  health-adjacent logistics in low-connectivity markets; fine-tuning spec already written.
- `Coordinate Indian surgeons operating abroad` (44) — Indian doctors already fly to Africa/the Gulf to
  perform surgeries in-country; the same case rails could coordinate that reverse flow (surfaced by a
  hospital co-owner we spoke to — an inversion of the corridor, not a separate company).

## Founder / team questions — mostly answerable now

- **How you met / how long:** IIM Trichy batchmates — we've known each other **9 years**, and have been
  swapping ideas and sketching business models together since business school. This is the first we're building
  together (beyond a college project or two), but the working relationship and trust are a decade deep.
- **Who does what:** Ajeya owns AI/product/engineering (built Ricotta Trivia to $800k ARR; 3+ yrs shipping AI
  products on this same agent stack). Hussain owns GTM, hospital supply and the demand funnel (9 yrs 0-to-1
  sales/channel; built the LiveAltlife hospital-partnership engine). Clean, complementary — the tech builder and
  the healthcare-GTM builder — which is the natural shape of an AI-native services company.
- **Who writes the code:** Ajeya-led, with a founder-directed agent stack — worth stating plainly, it's a
  strength: two founders shipped a tested, one-command product in three weeks.
- **Why we'll still be doing this in 10 years:** the fundamentals only widen the gap we serve — India's (and
  other corridors') healthcare keeps getting better and cheaper, while the source markets that will increasingly
  look outward (Europe, the Americas, Japan) face healthcare systems that are already overloaded and only getting
  more strained. Cross-border care is a structural, decades-long shift, and we want to be the layer it runs on.

---

## Submission checklist deltas (vs YC_PLAN)
- [ ] Name frozen with Ajeya → swap into every answer above.
- [ ] Repo URL = `github.com/hussainbombaywala/medical-tourism-gtm` (NOT ACM07A).
- [ ] Deploy demo → paste URL + reviewer credentials into the application block.
- [x] Verified (July 26): India MVT market ~$7.7B / ~644k medical-visa arrivals 2024, growing ~18%/yr;
      corridor mix West Asia 16% + Africa 8%; competitors Vaidam / MediGence / HealthTrip are lead-gen aggregators.
- [ ] Remaining `[FOUNDER FILL]`: Ajeya's precise full-time split (only open founder detail). Everything else
      answered: adviser = Assistant Manager, Fortis International Desk (name withheld); 3 hospital conversations
      (Fortis/Aster/Prime); Hub71 omitted; 10-year answer written; hospital-pays-from-acquisition-margin confirmed.
- [ ] Founder video: use the refocused line from `outputs/06_YC_REFOCUS.md`, not YC_PLAN's agent-SaaS line.

## Sources for the verified market numbers (cite if asked, don't paste into answers)
- India MVT market ~$7.69B (2024) → ~$10.2B (2025): Mordor Intelligence; Medical Buyer.
- ~644,387 foreign medical-visa arrivals 2024 (vs a broad 7.3M "MVT" figure that includes wellness/AYUSH/companions —
  use the 644k, it's the honest number): Business Standard; Medical Buyer.
- Origin mix 70% South Asia / 16% West Asia / 8% Africa / 6% other (Crisil); +18% intl-travel revenue FY24: ORF.
- Competitors: Vaidam (100k+ patients since 2016), MediGence (100k+), HealthTrip (69k+) — company/LinkedIn profiles.
