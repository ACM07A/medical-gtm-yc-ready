# The Partner Agent — operating context

The full context for the one subsystem that builds MedYatra's hospital-partner supply side: who to target,
how to score them, how to find the named person who can actually sign a deal, and how to write to them.
This is the "GTM spine" referenced in `PROJECT_CONTEXT.md` §5.2 — pulled into its own file because it's a
distinct, self-contained agent with its own rubric, its own legal posture, and its own pipeline.

**Every number, weight, and rule below is copied from the actual running code**, not paraphrased — file and
line references are given throughout so this document can be checked against the source, or handed to
someone (human or model) who needs to operate this agent without reading five files first.

---

## 0. Mission, in one line

Find the hospitals that most need MedYatra, find the one person at each who can actually say yes, and write
to them like a real person who has done the homework — never inventing a fact, a price, or a name.

## 1. The legal and honesty posture — read this before anything else

Every stage below is downstream of two rules that are not optional:

1. **No fabrication.** A contact is never invented. A price is never invented. A claim without a number is
   tagged `[VERIFY: quantify + cite]` rather than asserted (`lib/claims.mjs`). Every unsupplied credibility
   fact becomes a `[VERIFY: …]` placeholder for a human to fill with a citation, never a guess.
2. **The compliant path is primary; the risky path is opt-in and labelled as a risk, not "clean."** Finding
   a named decision-maker legitimately means going where LinkedIn and Google actively resist automated
   reading. The order of preference, enforced in code (`data-core/discover_pocs.mjs`):
   - **Licensed enrichment API** (Hunter.io-shaped, `lib/enrich.mjs`) — used first whenever a key is
     present. This is the only path that produces a `named-verified` contact.
   - **Human research worklist** (`data-core/research_worklist.mjs`, `/worklist`) — a person opens
     ready-made search links and reads a public LinkedIn result themselves. Normal manual browsing, no
     anti-bot circumvention, no ToS risk. The default free path.
   - **Stealth browser fallback** (`ALLOW_SCRAPE=1`, `data-core/discover_pocs.mjs`) — **off by default**,
     requires explicit opt-in. Circumventing anti-bot detection can violate a service's Terms of Service
     *even though the underlying name and job title are public information*. This is stated in the source
     comment verbatim: "not a ToS-clean activity." A CAPTCHA circuit-breaker (3 consecutive challenges)
     stops it the moment an IP looks flagged and falls back to the human worklist rather than pushing through.

Nothing this agent produces is ever trusted at face value — see the confidence/contact-type hierarchy in §3.

---

## 2. Stage 1 — Sourcing & the fit-scoring rubric

**The margin thesis, as a number.** Competitors (Vaidam, MediGence) crowd the big chains that already run
an international desk. The margin is in high-quality hospitals that *don't* — because MedYatra can win
preferred terms by bringing the demand engine they aren't running themselves. `partnerFit()` is that thesis
encoded (`data-core/db.mjs:264`):

```
score = round(100 × (0.45 × quality + 0.40 × whitespace + 0.15 × proof))
```

| Factor | Weight | What it measures | Values |
|---|---|---|---|
| **quality** | 0.45 | Does this hospital clear the bar at all — a hard filter dressed as a weight | `High → 1.0`, `Med → 0.6` (`QUALITY_W`) |
| **whitespace** | 0.40 | How much room is there for us — inverse of their current international-patient presence | `none → 1.0`, `latent → 0.9`, `emerging → 0.6`, `established → 0.2` (`PRESENCE_W`) |
| **proof** | 0.15 | Do they have a credential we can actually sell to a patient abroad | `JCI` or `NABH+JCI → 1.0`, `NABH → 0.7`, else `0.4` (`ACCRED_W`) |

**Read the weights literally**: whitespace outweighs proof by almost 3×. A JCI-accredited chain with an
established desk (Apollo, Fortis) scores **68**. A benchmark-quality hospital nobody's marketing
internationally (Sir Ganga Ram, Hinduja) scores **96**. That gap *is* the strategy — it's not a bug in the
model, it's the model doing its job.

The score always ships with a **reason**, templated to the account's presence tier so the account board
never shows a number without a sentence explaining it:

- `latent`/`none` → *"Benchmark quality, strong in [categories], but little/no international-patient
  presence — best margin & terms; we bring the demand engine they aren't running."*
- `emerging` → *"Quality brand building MVT — early enough to win preferred-facilitator terms before the
  desk matures."*
- `established` → *"Established IPS desk; compete on our source-market demand + service depth. Thinner
  margin — pursue for volume/brand, not terms."*

A derived **opportunity** tag (`oppOf()`, `data-core/db.mjs:255`) collapses quality × whitespace into
`High ≥ 0.8`, `Med ≥ 0.45`, else `Low` — the coarse filter used to decide who's even worth discovery effort
(§3) and who gets a proposal at all (§5).

### 2b. Sales readiness — a deliberately separate number

Fit answers *"should we want them"*; readiness answers *"can they actually take a patient soon"* — and
conflating the two hides real setup time behind an attractive score. A 96-fit latent brand usually has **no**
visa-invite desk, no interpreter network, no international pricing sheet — 6–12 months of setup behind the
number that makes them look like the best account on the board.

```
base = { established: 85, emerging: 55, latent: 30, none: 20 }[presence]
score = min(100, base + (JCI accredited ? 15 : 0))
label = score≥75 "ready" · score≥50 "ramping" · else "needs setup"
months = score≥75 "0–2" · score≥50 "3–6" · else "6–12"
```
(`readiness()`, `data-core/db.mjs`)

Rebuild both scores for every account: `npm run partner-layer` (`data-core/partner_layer.mjs`) — idempotent,
free, no external calls. It also assigns the **next action** for every account from its real state, not a
guess: past-outreach accounts get a 4-day follow-up; a named POC gets "verify contact, send [margin/scale]
outreach"; a desk-only account gets "resolve the named [top target role]"; a bare account gets "add an IPS
channel."

### 2c. The pursuit score — access + fit + speed (the 2026-07-22 re-think, and the board's ranking key)

The set of real warm introductions (the adviser's own desk at Fortis Bannerghatta, the Aster family, the
ex-Manipal group legal head) changed *who we approach first* far more than fit ever did — so reachability and
time-to-market became first-class scored inputs, and the board now ranks on:

```
pursuit = round(0.45 × access + 0.30 × fit + 0.25 × speed)
band    = ≥70 "work now" · ≥45 "warm up" · else "park / build path"
```

| Axis | Function | What it measures |
|---|---|---|
| **access** (0.45) | `accessScore()` | The `connection` field: `adviser_desk 100` › `warm_group 85` › `warm_individual 65` › `named_public 35` › `desk 15` › `cold 5`. A great account we can't reach is a worse *next move* than a good one a trusted person walks us into. |
| **fit** (0.30) | `partnerFit()` (§2, unchanged) | The margin thesis — still legible on its own, no longer the ranking key. No more hand-hacking fit to force warm accounts up. |
| **speed** (0.25) | `speedScore()` | Time-to-signed-pilot. Sachin's read: partnering is **fast once the commission number is agreed** — so speed = `commission_status` (`agreed 60` / `in_discussion 35` / `unknown 20`) + 30% of desk readiness (§2b). |

Three companion fields carry the terms conversation on the account itself: `commission_target_pct` (the
number that unblocks a fast close — **20% entry on the warm accounts**, vs incumbent agents' **25–33%**, with
a revenue-tiered step-down to 18%/16% as volume proves out — `COMMISSION_TIERS` in `db.mjs`),
`commission_status`, and **`value_ask`** — the extra we ask the hospital for in exchange for the *lower* fee,
because we bring the volume:
best-of-book package rates, priority admission/OT scheduling, a named international coordinator, co-funded
patient education. The next-action generator leads with the commission close whenever status is
`in_discussion`. Real-board result: Fortis Bannerghatta 82 › Aster India 75 › Manipal 74 › Aster GCC 71,
with Ganga Ram (fit 96, cold) correctly at pursuit 40.

Once terms are agreed, the **actual rate card** goes in through `capture_partner_price.mjs` (the only entry
point; `confirmed` only when a signed package sheet exists) and `npm run pricing` turns it into per-case
commission economics — including the hospital's net uplift vs a 25–33% incumbent, which *is* the pitch deck
number for the next partner.

---

## 3. Stage 2 — Decision-maker identification

**Target roles, in priority order** (`TARGET_ROLES`, `data-core/partner_layer.mjs`):

1. GM / VP – International Business
2. Head – International Patient Services (IPD)
3. Business Development – Medical Value Travel
4. International Marketing Manager

Discovery targets **these roles specifically**, never the reception desk — a generic inbox is stored as a
fallback (`contact_type: desk`), not treated as progress.

**The contact-type / confidence hierarchy** — every contact carries both, and outreach always prefers the
strongest available:

| `contact_type` | Confidence | How it's produced |
|---|---|---|
| `named-verified` | 60–75+ | Licensed enrichment API returned the person + a verified email, **or** a human confirmed one via `capture_poc.mjs` with an email |
| `named-public` | 45–58 | A public LinkedIn/SERP result named a person in-role — unverified, human-confirm before send |
| `inferred` | 35–55, reduced 20pts if MX fails | An email pattern guessed for a named person (§4) |
| `desk` | 10–25 | A generic inbox or "resolve IPS" placeholder — no named owner yet |

**How a candidate is found**, in the order the code actually tries them (`discover_pocs.mjs`):

1. **Enrichment (primary, if `HUNTER_API_KEY`/`ENRICH_API_KEY` set)** — domain search against the partner's
   known email domain, filtered to role hints (`international`, `medical value travel`, `business
   development`). A hit is immediately `named-verified`.
2. **Human worklist (default, free)** — for every `opportunity='High'` or `latent`/`emerging` account,
   generates ready-to-click Google + LinkedIn search URLs across four query combinations, plus the inferred
   email pattern, plus the exact `capture_poc.mjs` command to log a confirmed find. A person does the
   searching; nothing here is automated against a search engine.
3. **Stealth browser (opt-in only, `ALLOW_SCRAPE=1`)** — real, non-headless browser session reads public
   SERP text for name/role patterns matching the target roles, filters obvious noise (a regex bad-list
   rejects role-words-as-names, clinicians, chain/brand names, page fragments), optionally opens the public
   LinkedIn profile to corroborate. Every hit is capped at confidence 52–58 and logged as `pending` —
   **never auto-trusted**, always awaiting human confirmation. Idempotent: skips accounts already attempted
   in the last 7 days (`isFresh(last_discovery_at, 7)`) so re-runs don't repeat work or hammer a target.

**Idempotency and rate discipline throughout**: `discover_pocs.mjs` only works accounts without an existing
named POC, rate-limits at a minimum 1.8s between accounts, and the CAPTCHA circuit-breaker halts the whole
run rather than pushing through a flagged IP.

---

## 4. Stage 3 — Email inference (`data-core/infer_contacts.mjs`)

For a named person with no email on file yet, construct the *likely* address from an observed or common
pattern — standard SDR tradecraft, always labelled a guess:

```
domain  = an @-address already on file for this partner, or a known real domain (PARTNER_DOMAINS)
pattern = an OBSERVED pattern for that domain if one exists (currently only fortishealthcare.com:
          "first.last", learned from two real confirmed samples), else the industry-common default
guess   = {first}.{last}@domain   (or firstlast / flast / first, per pattern)
mx      = does the domain actually have a mail server? (node:dns resolveMx)
conf    = (55 if pattern is OBSERVED, else 35) − 20 if MX lookup fails
```

Always lands as `contact_type: inferred`. Never promoted to `verified` by this step — that only happens via
a human (`capture_poc.mjs`) or a licensed enrichment hit.

## 5. Stage 4 — Human capture (`data-core/capture_poc.mjs`)

The close-the-loop step for both the worklist and any manual research: a person read a public result
themselves and is vouching for it.

```
node --experimental-sqlite data-core/capture_poc.mjs <partner_id> "Full Name" "Role" "<email|linkedin-url>"
```

An email-shaped contact → `named-verified`, confidence 75. A URL-only contact → `named-public`, confidence
55. Either way `resolved=1` and the partner's stage advances to `POC found` with the next action set to
"verify email deliverability" or "find/infer a direct email," respectively.

---

## 6. Stage 5 — Proposal crafting (`data-core/gen_proposals.mjs`)

**The wedge-by-trust-tier rule — the single most important piece of judgment in this agent.** An unknown
brand cannot lead with the highest-fear purchase (a parent's cardiac bypass at a hospital nobody's heard
of). Low-consideration categories convert on price and *build* the trust a higher-stakes ask needs later.
So the category chosen for the proposal depends on the account's presence tier, via a hard-coded fear
ranking (`FEAR`, ascending):

```
dental(1) < cosmetic(2) < fertility(3) < ortho(4) < oncology(5) < cardiac(6)
```

- **`latent`/`emerging` accounts** → the proposal leads with their **lowest-fear** available category.
- **`established` accounts** → leads with their **highest-ranked** category (their existing strength).

**The two angles, and what each is honestly allowed to claim:**

| | `latent` / `emerging` (angle: `latent`) | `established` (angle: `established`) |
|---|---|---|
| Framing | Founding-partner pilot | Scale play — incremental volume |
| Demand claim | **Never** claims existing volume — explicitly instructed not to; MedYatra is building the pipeline now | Incremental, pre-qualified patients from low-effort acquisition |
| Commercial | Zero-downside: no exclusivity, no upfront, fee only on delivered patients | Non-exclusive pilot, pay-per-delivered-patient |
| What's leaned on | Their accreditation as "the global-standard equalizer"; MedYatra's demand-generation + credibility marketing | Existing brand strength; MedYatra's low-effort incremental volume |

**The proposal's fixed 7-section structure**, every time: (1) who we are — facilitator, not a provider,
(2) the case for travelling for this treatment — cost gap, quality, no unsupported demand numbers,
(3) what MedYatra brings — precise and modest: demand generation, pre-qualified patients, coordination of
the enquiry and *supporting documents* (never interpreters, flights, hotels, or on-ground logistics — those
are explicitly **not** claimed), (4) commercial model — facilitation fee **20% entry, revenue-tiered down to
16%** (vs incumbents' 25–33%), pay only on delivered
patients, non-exclusive, (5) a small time-boxed pilot cohort, zero upfront, (6) compliance & trust —
facilitator disclosure, accredited-partners-only, DPDP/GDPR, no clinical claims, (7) next steps — ask for a
package sheet, a named coordinator, and a 30-minute call. **Never asks for a commitment in the first ask.**

**Banned outright, enforced in the system prompt**: *seamless, world-class, bridging the gap, leverage,
patient journey, ecosystem, cutting-edge, holistic, empower, tailored solutions, unlock, elevate,
state-of-the-art, synergy, robust, streamline* — plus AI-register tells ("I hope this finds you well," "In
today's world," a closing paragraph that just restates the ask). Every draft is then linted
(`lib/claims.mjs`): any magnitude claim without a cited number gets tagged `[VERIFY: quantify + cite]`
rather than shipping as an assertion.

**Idempotency, so tokens and a partner's inbox are both respected**: skipped outright if the account's
`stage` is already past proposing (`Responded`, `Pilot proposed`, `Pilot live`, `Signed`, `Active`) or its
`outcome` already shows real movement (`replied`, `meeting`, `pilot`, `signed`) — unless `FORCE=1`. Skipped
if a proposal for that partner+category was generated within the last 14 days. Wellness/naturopathy supply
is excluded outright — that's a cash-pay product sell, not a surgical founding-partner pilot.

Lands in `outputs/proposals/`, `status='review'` — a human reads it in **Studio** before it can ever be
marked sent; nothing here sends itself.

### 6b. Credibility narratives — for accounts that need to be introduced (`data-core/gen_credibility.mjs`)

A separate, shorter piece for `latent`/`emerging`, `High`/`Med`-opportunity accounts: a ~200-word profile
answering *"why should I trust a hospital I've never heard of?"* using six levers, applied in priority order:

1. **Accreditation as the great equalizer** — JCI/NABH is the same global standard, famous or not.
2. **Reframe "lesser-known" as "focused specialist"** — depth and procedure volume, not obscurity.
3. **Named-clinician credentials** — a real name transfers trust the hospital's brand alone can't.
4. **Radical transparency** — real prices, real inclusions, a virtual tour offered — substitutes for fame.
5. **MedYatra's own vetting promise** — "we only partner with accredited hospitals that clear our bar."
6. **Peer proof** — patients from the same country who've already gone.

Any specific claim not actually supplied — procedure volumes, exact fellowships, awards, an outcome
percentage — ships as `[VERIFY: <what to confirm>]`, never invented. The output states its own `[VERIFY]`
count so a human knows exactly how much citation work remains before publish.

---

## 7. The pipeline — how an account actually moves

```
Sourced → Enriched → POC found → Outreach sent → Responded → Pilot proposed → Pilot live → Signed → Active
```

Every script above reads and writes real state, not a status a person has to remember to update:
`partner_layer.mjs` sets fit + readiness + next action on every run; `discover_pocs.mjs` and
`capture_poc.mjs` advance an account to `POC found`; `gen_proposals.mjs` advances it to `Pilot proposed` (and
refuses to re-propose past that point). An `outcome` field (`none | contacted | replied | meeting | pilot |
signed | lost`) is the only real validation of the fit model — it's the ground-truth feedback loop the score
itself doesn't have without real-world results flowing back in.

---

## 8. Run it

```bash
npm run partner-layer                       # rebuild fit + readiness + next-action for every account (free)
npm run worklist                             # generate the human research worklist → /worklist
node --experimental-sqlite data-core/discover_pocs.mjs [limit]     # enrichment path (needs a key)
ALLOW_SCRAPE=1 STEALTH=1 node --experimental-sqlite data-core/discover_pocs.mjs   # opt-in browser fallback
node --experimental-sqlite data-core/capture_poc.mjs <id> "Name" "Role" "<email|url>"   # log a human-confirmed find
node --experimental-sqlite data-core/infer_contacts.mjs            # guess emails for named-but-unemailed POCs
node --experimental-sqlite data-core/gen_proposals.mjs [limit]     # tailored proposals → outputs/proposals/, review
node --experimental-sqlite data-core/gen_credibility.mjs [limit]   # trust narratives for lesser-known brands
node --experimental-sqlite data-core/capture_doctor.mjs "Name" <specialty> <country> "Hospital" <reach> <warmth> "source"   # §11 — capture a doctor-affiliate
npm run doctor-outreach                      # §11 — outreach drafts for doctor-affiliate accounts (compensation never auto-filled)
npm run capture-payer -- "Name" <insurer|tpa|employer|government> <country> "<population|unknown>" <claims_pain> <authority> <warmth> "source"   # §12 — capture a payer (base only; outreach parked for phase 2/3)
node --experimental-sqlite data-core/log_outcome.mjs <id> <contacted|replied|meeting|pilot|signed|lost> ["note"]
npm run calibration                          # is the rubric actually right? fit-score bucket vs. real outcome
```

Live board: `/console` (fit-ranked account board, contact path, next action) · `/worklist` (the human bridge)
· `/studio` (approve a proposal before it can be marked sent).

## 9. Data model this agent owns

| Table | Columns this agent writes |
|---|---|
| `partner` | `fit_score`, `fit_reason`, `next_action`, `owner`, `stage`, `outcome`, `outcome_at`, `outcome_note`, `last_discovery_at` |
| `poc` | `role`, `seniority`, `contact_type`, `contact_value`, `confidence`, `source`, `resolved`, `verified_at` |
| `proposal` | `partner_id`, `category_id`, `market_code`, `fee_pct`, `status`, `file_ref`, `blockers`, `generated_at`, `outcome` |
| `doctor_affiliate` | `specialty`, `country_code`, `current_hospital`, `reach_est`, `warmth`, `contact_channel`, `cme_notes`, `source` — §11 |
| `payer` | `payer_type`, `country_code`, `population_est`, `claims_pain`, `decision_authority`, `warmth`, `contact_channel`, `source` — §12 (base only) |

## 10. Honest limitations of this specific agent

- **Named-contact discovery is intermittent** even with stealth mode on — roughly 6/9 in testing — and
  running on a fresh/cloud IP performs worse than a real desktop's less-flagged one.
- **Inferred emails are guesses.** Low-confidence until MX-verified and, ultimately, until a real send
  either bounces or doesn't — there is no deliverability check beyond MX presence.
- **The `OBSERVED` email-pattern table has exactly one entry** (Fortis), learned from two real samples.
  Every other domain falls back to the generic `first.last` guess.
- **The rubric is a stated hypothesis, not yet a validated one — and the code says so explicitly.** Outcomes
  do flow back (`log_outcome.mjs`) and `npm run calibration` buckets accounts by fit score (`High 85+` /
  `Med 68–84` / `Low <68`) against real positive-outcome rate — but nothing *automatically* re-weights
  `partnerFit()` from that data, and the tool's own output says why: *"Need ≥20 [outcomes] across buckets
  before re-weighting; until then fit_score is a PRIOR, not validated."* Right now it almost certainly has
  far fewer than 20 — this repo's outcomes are demo-seeded, not real conversions.
- **Proposal generation runs on the same failover chain as everything else** (GLM → Gemini) — quality and
  voice can vary slightly by which model actually served a given draft (recorded in the file header as
  `model:`).

---

## 11. A second account type: doctor-affiliate

Sachin Rai (9.5–10 years running the international desk at two hospital groups, interviewed 2026-07-22)
described a "next level" beyond the hospital-partner motion this agent was built for: recruit an individual
clinician directly — engage them via CME, offer a revenue share, eventually stand up a local info-center
around them — rather than only signing the institution they work at. This is a genuinely different account,
not a variant of the hospital one: a doctor has no accreditation, no `mvt_presence`, no international desk to
assess. Scoring them on `partnerFit()` would silently misrepresent the account.

**How it's wired in, and what deliberately reuses the existing machinery**: a doctor is a `partner` row with
`type='doctor'` — so the pipeline stage machine, `next_action`, `outreach`, and `proposal` tables all work
unchanged. What's different is a companion `doctor_affiliate` table (schema.sql) holding the fields a
hospital doesn't have (`specialty`, `country_code`, `current_hospital`, `reach_est`, `warmth`), and its own
scoring pair in `data-core/db.mjs`:

```
doctorFit(d)       = round(100 × (0.35 × specialty + 0.35 × market + 0.30 × reach))
doctorReadiness(d) = min(100, (warmth==='warm' ? 70 : 30) + (routes to an existing partner hospital ? 15 : 0))
```

- **specialty** — `1.0` if the specialty is one Sachin named as real, unprompted volume (`DOCTOR_PRIORITY_SPECIALTIES
  = oncology, ortho, fertility, cardiac` — cardiac is in the list only because it's the flagship override,
  T013, not because his numbers support it), `0.6` if adjacent, `0.3` if unrelated.
- **market** — `1.0` if their country is in Africa / Middle East / SE Asia (the actual target markets, per
  `market.region`), `0.4` otherwise.
- **reach** — `1.0`/`0.6`/`0.3` for a self-reported/estimated high/med/low referral volume, never invented.
- **readiness is dominated by warmth on purpose** — Sachin's account is that tenure and trust decide flow,
  not a pitch. This is the same warm-intro thesis already applied to Aster/Manipal/Fortis
  (`seed_warm_accounts.mjs`), one level down to an individual.

**There is no bulk-sourcing step for this account type, and there shouldn't be.** Hospitals get sourced into
a directory and scored cold; a doctor only becomes real through an actual introduction — so
`data-core/capture_doctor.mjs` is the only entry point, mirroring `capture_poc.mjs`'s "a human is vouching
for this" rule one level up:

```bash
node --experimental-sqlite data-core/capture_doctor.mjs "Dr Full Name" <specialty> <country_code> "Current Hospital" <reach:low|med|high> <warmth:cold|warm> "source note"
```

**Status: the capability exists, the board is empty.** Zero doctor-affiliate rows are seeded — there is no
real name to put here yet, and inventing one would violate §1's no-fabrication rule. This section exists so
that the moment a real introduction shows up (through Sachin or otherwise), it has a scoring model and a
place to land instead of a scramble to build one. It is explicitly **not** wired into the console board's
hospital-specific UI (`console.html`'s `mvt_presence`/accreditation columns) — the generic
`SELECT * FROM partner ORDER BY fit_score DESC` account list already surfaces it adequately for a
zero-to-few-record stage; a doctor-specific view is a "build it when there's something to show" item, not a
gap today.

**Outreach generation** (`data-core/gen_doctor_outreach.mjs`, `npm run doctor-outreach`) mirrors
`gen_proposals.mjs`'s pattern — same failover chain, same `lib/claims.mjs` lint, same human-gated `review`
status on the `proposal` table — but for `type='doctor'` rows, and with one addition that is **not**
optional: physician self-referral / anti-kickback rules vary sharply and unpredictably by country, and
several jurisdictions restrict or ban direct payment to a referring clinician outright. So the system prompt
forbids the model from ever stating a referral-fee number, and a **hard regex gate** — not just a lint flag —
refuses to write a draft to disk at all if one leaks through anyway (tested against both a percentage and a
dollar-figure leak; both are caught). Every draft's compensation section is instead a required
`[VERIFY: confirm local permissibility + structure of any referral arrangement with counsel before discussing
terms]` placeholder. `warmth` decides the opening: a `warm` account may reference the real introduction on
file (`doctor_affiliate.source`); a `cold` one must not imply a relationship that doesn't exist.

---

## 12. A third GTM motion, documented but not built: the payer channel

Hospital partnerships (§2–§8) and doctor-affiliates (§11) both work by finding a person who refers patients
one at a time. Sachin named a structurally different motion, with a real precedent: **Toyota routed its own
insured employees through medical tourism for treatment.** The user separately proposed the general version —
for new-market entry or fast volume in an open market, partner with an insurer, a TPA, or a large
self-insured employer, and pitch reducing THEIR claims payout by redirecting a procedure to MedYatra's
curated hospital network instead of a costlier local or third-country route.

**Why this doesn't fit the existing rubric.** `partnerFit()` scores an institution's quality × whitespace;
`doctorFit()` scores a clinician's specialty × market × reach. A payer isn't scored on either axis — the
pitch is pure claims-cost arithmetic applied to a population, not a trust relationship with an individual.
It needs its own logic if it's ever built out, not a forced fit into either existing rubric.

**This is not theoretical — it's already been pitched once.** The `MedYatra × TruDoc` partnership document
(built earlier this session) is exactly this motion, worked out in full for one company: TruDoc (a UAE
chronic-care manager, 4.4M members) gets a claims-cost-reduction pitch, a tenant-isolation guarantee ("your
members' data stays yours"), and a performance-based commercial model — no retainer, paid on delivered
patients. Toyota is independent evidence the underlying thesis holds beyond TruDoc specifically: any large
payer or self-insured employer with a population and a claims budget is a candidate.

**Status: the BASE is built; the channel is parked for phase 2/3 by decision (2026-07-22).** What exists now,
mirroring the doctor-affiliate pattern exactly:

- a `payer` companion table (`schema.sql` + `db.mjs` migration) with the fields a hospital/doctor doesn't
  have: `payer_type` (insurer / tpa / employer / government), `population_est`, `claims_pain`,
  `decision_authority`, `warmth`;
- a scoring pair in `data-core/db.mjs` — the pitch is claims-cost math on a population, so fit is scored on
  none of the hospital or doctor axes:

```
payerFit(p)       = round(100 × (0.35 × population + 0.30 × claims_pain + 0.20 × decision_authority + 0.15 × market))
payerReadiness(p) = min(100, (warmth==='warm' ? 70 : 30) + (decision_authority==='concentrated' ? 15 : 0))
```

  `population_est` is free text ("4.4M", "50k employees", "unknown") bucketed coarsely by `popBucket()`,
  never invented; `decision_authority=concentrated` (one deal moves volume) beats `distributed`; readiness is
  warmth-dominated, same thesis as the other two account types.
- `data-core/capture_payer.mjs` (`npm run capture-payer`) — the only entry point, same "a human vouches for a
  real relationship" rule as `capture_doctor.mjs`/`capture_poc.mjs`.

**What is deliberately NOT built, and is parked for phase 2/3**: an outreach generator (the TruDoc pitch
generalized into a per-prospect template, the way `gen_doctor_outreach.mjs` generalized proposals), and any
console/board UI beyond the generic fit-ranked account list. Zero payer rows are seeded — no real name to add
yet, and inventing one would break §1's no-fabrication rule. The base exists so that when a real payer
conversation starts, there's a scored place for it to land instead of a scramble; the rest waits.
