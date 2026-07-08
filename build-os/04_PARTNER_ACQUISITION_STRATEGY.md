# 04 — Partner Acquisition Strategy

**Owner agent:** Partner Sourcing Agent + Proposal Agent.
**Requirement covered:** #3 — identify the right partners per category, find the right POCs, and generate the key proposal items.

## Partner types (the full supply stack)

A medical-tourism trip needs more than a hospital. The engine builds and maintains five partner classes:

| Class | Role | Priority |
|---|---|---|
| **Anchor hospitals** | Accredited providers per treatment category | P0 — supply must lead |
| **Feeder network** | Source-market clinics/doctors/agents who refer patients | P0 — cheapest qualified demand |
| **Travel & stay** | Airlines, hospital-adjacent hotels/serviced apartments, ground transport | P1 |
| **Patient-experience** | Interpreters (Arabic/French/Swahili/Burmese/Amharic), forex, SIM, visa facilitation, post-op care | P1 |
| **Trust & payment** | TPAs/insurers, escrow/payment rails, teleconsult platform | P2 |

## Anchor-hospital target list (India, category-mapped)

The agent seeds from these accredited chains and enriches per city/specialty. (Public, well-known JCI/NABH networks — verify current accreditation via `08`.)

| Category | Primary targets |
|---|---|
| Cardiac | Apollo, Fortis (Escorts), Medanta, Narayana Health, Max, Manipal |
| Orthopedics | Fortis, Max, Medanta, Apollo, Manipal, BLK-Max |
| Oncology | **HCG** (specialist), Tata Memorial ecosystem, Apollo, Fortis, Amrita, Kokilaben |
| Fertility/IVF | Nova IVF, Indira IVF, Apollo Fertility, Cloudnine |
| Cosmetic/bariatric | Fortis, Apollo, Kokilaben, dedicated cosmetic centres |
| Dental | Accredited dental chains (Clove, Sabka Dentist premium arms), hospital dental depts |

**Selection criteria the agent scores each hospital on:** accreditation (JCI/NABH), procedure-specific outcome data, international-patient infrastructure (dedicated IPD desk, interpreters, visa help), price competitiveness, quote turnaround SLA, willingness on commercials, city accessibility (direct flights from source markets).

## Sourcing wider: the latent-partner margin play

Do **not** limit the target list to hospitals that already run a medical-tourism desk — those are the most competed-for and give the thinnest terms. The bigger margin is with brands that have the **name, quality, and capability but not yet the MVT presence** (or aren't large in it yet). They are hungrier, more flexible on commercials, and give us differentiated supply competitors don't list.

Two supply tiers, sourced in parallel:

| Tier | Who | Why | Commercial reality |
|---|---|---|---|
| **Established anchors** | Apollo, Fortis, Medanta, Max, Manipal, HCG… | Fast, proven, deep infra | Known, competed-for → **Low** opportunity/terms |
| **Latent / emerging brands** | High-quality hospitals with weak/no MVT presence: e.g. Sir Ganga Ram, Hinduja, Sakra, Artemis, Marengo, Frontier Lifeline, Cytecare, L V Prasad, Sankara Nethralaya | Same quality bar, under-penetrated in MVT | Hungry, flexible → **High** opportunity/margin |

**Opportunity score = quality (must clear the bar) × inverse of current MVT presence.** High quality + low presence = the margin play. Encoded in the data core (`opportunity` field, `query candidates`).

### Partner qualification benchmark (the bar — applies regardless of current MVT presence)
A brand qualifies as a target if it clears:
1. **Accreditation** — NABH minimum, JCI preferred, or a credible specialty accreditation.
2. **Clinical depth** — procedure-specific volume + outcomes in the target categories.
3. **Reputation** — named senior clinicians, awards, peer/reputation signals.
4. **Infrastructure** — capacity to handle international patients *even if there's no desk yet* (beds, ICU, tech).
5. **Willingness/fit** — appetite to grow MVT (latent brands usually score highest → better terms).

### How the agent finds them (beyond "has an international-patients page")
Source from: **NABH/JCI accreditation registries**, specialty rankings and outcome publications, surgeon reputation and awards (e.g. FICCI MVT awards), hospital capacity/bed data, and news of new/consolidating brands (e.g. Marengo). A hospital with no MVT web presence but strong accreditation + clinical depth is a *lead*, not a skip. Latent candidates are logged with fields marked **`est — verify`** and must have accreditation + presence confirmed before outreach.

## Finding the right POC (this is the hard part, and it's automatable)

Do **not** target the CEO. The correct entry point at an Indian hospital is the **Medical Value Travel / International Patient Services** function.

Target titles (in order): **Head/GM – International Patient Services (IPS)** → **Head – Medical Value Travel** → **AVP/VP – International Business** → **Manager – International Marketing** → **International Patient Coordinator**.

**Enrichment pipeline (Partner Sourcing Agent):**
1. Resolve the hospital's IPS department page + international-patient microsite.
2. Find named POCs via LinkedIn title search, hospital site, press releases, MVT conference speaker lists (e.g. medical-value-travel summits, FICCI Heal-in-India events).
3. Capture verified public business contact (IPS desk email/WhatsApp, published int'l helpline). **Only public business contacts — no scraped personal PII.**
4. Score contactability + fit; write to CRM with source citation.
5. Draft personalized outreach (see proposal below) for human approval before send.

## Key proposal items (what the Proposal Agent generates per hospital)

A partnership proposal must contain these sections, tailored to the hospital's strong categories and target source markets:

1. **Who we are** — facilitator, source-market reach, languages, digital demand engine.
2. **Qualified demand we bring** — projected MQLs by category + source market, our lead-qualification standard (so they get pre-screened, treatment-ready patients, not tire-kickers).
3. **Commercial model** — transparent facilitation fee **10–15%** of package value OR fixed per-case coordination fee; net-package or gross model; payment terms; no double-charging the patient.
4. **Service-level asks** — quote turnaround SLA (≤ 48h), dedicated coordinator, package pricing sheet, teleconsult slots for pre-arrival, priority scheduling.
5. **Patient-experience commitments** — interpreter, airport pickup, accommodation coordination, post-op telefollow-up — who does what.
6. **Co-marketing** — hospital doctor features in our content, verified patient stories (with consent), listing in category pages.
7. **Data & compliance** — consent-based data sharing, DPDP/GDPR adherence, no sharing of patient records without authorization.
8. **Pilot terms** — 90-day pilot, N patients, success metrics, exclusivity NONE (non-exclusive both ways), review gate.

Output format: a 2-page PDF/email + a one-page pricing annex, generated from a template with hospital-specific variables. Always human-reviewed before send.

## Feeder network (the demand multiplier)

Parallel to hospitals, the agent builds a network of **source-market referrers** — local GPs, diagnostic centers, small clinics, and travel agents in Baghdad, Erbil, Muscat, Lagos, Nairobi, Addis Ababa, Yangon. Proposal to them: referral commission + co-branded materials + fast quotes + patient-status transparency. This is the lowest-CAC, highest-trust channel.

## CRM & pipeline stages

`Sourced → Enriched → POC found → Outreach sent → Responded → Pilot proposed → Pilot live → Signed → Active`. Agent maintains; human closes P0 deals.

## Acceptance (see `14`)

- [ ] For each top-6 category, ≥ 5 scored anchor-hospital targets with a named/verified public POC.
- [ ] Proposal generator produces a tailored, human-reviewable proposal in < 5 min per hospital.
- [ ] No proposal ships without human approval and cited claims.
- [ ] Feeder-network list of ≥ 20 referrers across Tier-A markets.

## Related
[[03_TREATMENT_CATEGORY_STRATEGY]] · [[07_SYSTEM_DESIGN]] · [[08_DATA_SOURCES]] · [[10_SECURITY_COMPLIANCE]]
