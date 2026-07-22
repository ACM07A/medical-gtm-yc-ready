# 05 — Content-Driven Brand Campaign

**Owner agent:** Content Engine Agent + Localization Agent.
**Requirement covered:** #4 — proactively build a content-driven brand campaign across social platforms.

## Positioning

**Brand promise:** *"World-class treatment, honest prices, a hand to hold the whole way."*
Three pillars: **Quality** (accredited hospitals, named doctors), **Transparency** (real prices, no hidden fees), **Care** (interpreter, coordinator, family support — the emotional layer competitors under-serve).

Visual identity (from the Nuvica reference): clinical blue `#0B4A8B` + trust-green accent `#3BD16F`, glassmorphic cards, 3D anatomical hero visuals, big confident headline type, lots of whitespace, human faces.

## Channel strategy — where each source market actually is

| Channel | Role | Priority markets |
|---|---|---|
| **SEO / blog** | Highest-intent, compounding, cheapest long-run CAC. "Cost of [procedure] in India", "best [X] hospital in India for [nationality]" | ALL |
| **YouTube** | High-intent search + patient-story trust. Procedure explainers, hospital tours, patient journeys | Middle East, Africa, SE Asia, UK |
| **WhatsApp** | The conversion channel in target markets. Broadcast + 1:1 coordination + status updates | Middle East, Africa, SE Asia |
| **Telegram** | The conversion channel where WhatsApp is *not* dominant. Same broadcast + 1:1 role WhatsApp plays elsewhere | **Central Asia** (Uzbekistan, Kazakhstan, Tajikistan, Kyrgyzstan, Turkmenistan), Cameroon |
| **Facebook** | Discovery + community + retargeting | Nigeria, Kenya, Iraq, Myanmar |
| **Instagram / TikTok** | Cosmetic, dental, fertility, wellness; Western + urban | UAE, UK, US, urban India-diaspora, **Kazakhstan** |
| **LinkedIn** | B2B — hospital & feeder partnerships, thought leadership | Global partner side |

## Content engine — what the agent produces (proactively, on a calendar)

The Content Engine Agent runs an always-on editorial calendar. Weekly output targets (agent-drafted, human-approved for anything with clinical claims):

- **SEO cornerstone pages:** one per (category × source market) cell — e.g. "Heart Bypass Surgery Cost in India for Patients from Iraq" / "…from Nigeria." Template: what it is, why India, **cost comparison table (India vs. source market, cited)**, accredited hospitals, top doctors, patient stories, visa/travel, FAQ, WhatsApp CTA.
- **Patient-story assets:** long-form written + 60–90s vertical video + carousel, from consented real journeys.
- **Cost-comparison content:** the single highest-converting format — India vs. source-market price, always sourced.
- **Doctor/hospital spotlights:** credentials, procedure volume, outcomes (verified).
- **Destination/logistics guides:** visa, flights, stay, "what to expect" — reduces the #1 fear (the unknown).
- **Short social:** myth-busting, "5 questions to ask", before/after (consent + platform policy compliant).

## Partner credibility for NON-MAINSTREAM brands (the margin play's content problem)

The margin strategy ([[04_PARTNER_ACQUISITION_STRATEGY]]) brings on high-quality hospitals that patients
abroad haven't heard of (Sir Ganga Ram, Cytecare, Frontier Lifeline). Customer-facing content must *build
their credibility*, not assume it. Levers that work **without** brand fame (in priority order):

1. **Accreditation as the great equalizer.** JCI/NABH is the same global standard whether the hospital is
   famous or not — lead with the credential, not the logo.
2. **Reframe "lesser-known" as "focused specialist centre."** A dedicated cancer or cardiac hospital does
   *only* that — higher procedure volume in the specialty → better outcomes. Focus is a feature.
3. **Named-clinician credentials.** A star surgeon's reputation (international training/fellowships, pioneer
   status — e.g. Frontier Lifeline's Dr. K.M. Cherian) transfers trust the brand can't.
4. **Procedure volume + outcomes data** as a quality proxy (cited).
5. **Radical transparency** — real prices, real inclusions, real doctor names, virtual hospital tours —
   substitutes for fame; "we hide nothing" is the trust posture when recognition is absent.
6. **Peer proof** — consented patient stories from the *same source market*.
7. **The facilitator's vetting** — "we only partner with accredited hospitals that clear our quality bar."

Implemented by `data-core/gen_credibility.mjs` (accreditation-led trust profile per lesser-known partner;
every unsupplied stat/credential emitted as a `[VERIFY: …]` placeholder — never fabricated; human fills with
a citation before publish).

## Distribution — repurposing to platform-native posts

Each published cornerstone page is repurposed (`data-core/repurpose_content.mjs`) into platform-native posts —
**LinkedIn** (B2B thought-leadership), **Instagram** (5-slide carousel + per-slide image briefs + caption +
hashtags), **Reddit** (value-first, non-promotional), **WhatsApp** (broadcast), **X** (thread) — via the
Tier-2 failover chain, with facts injected from the source page. Visual platforms get copy + **image briefs**
(prompts for a designer or an image model; wiring NVIDIA's `genai` image endpoint would render them
directly). Queue is human-gated at `/distribution` — nothing auto-posts. Actual publishing to each platform
needs its API (Meta Graph, LinkedIn, etc.) behind a key, and stays human-approved for health content.

## The proactive campaign loop (agentic)

```
/loop weekly:
  1. Pull top-converting queries + trending topics per source market
  2. Identify content gaps in the (category × market × language) grid
  3. Draft the highest-leverage 10 assets
  4. Localize into target languages (Localization Agent)
  5. Route clinical claims to human/compliance review
  6. Schedule + publish across channels
  7. Ingest performance (rankings, CTR, WhatsApp opt-ins, MQLs)
  8. Feed winners/losers back into next week's plan
```

## Multilingual from day one

Priority languages: **English, Arabic, French, Swahili, Amharic, Burmese** (English covers Nigeria/Kenya/UK/SE-Asia B2B; Arabic covers Iraq/Gulf/Yemen; French for Francophone Africa; Swahili/Amharic for East Africa; Burmese for Myanmar). Localization Agent does culturally-adapted transcreation (not literal MT) + native-speaker QA for published clinical content. Right-to-left support for Arabic. Currency + phone + WhatsApp formats localized per market.

## Lead funnel (content → revenue)

`Content → WhatsApp/form opt-in → Lead Agent qualifies (treatment, urgency, budget, docs) → routes to human coordinator → hospital quote → conversion`. Every asset ends in a low-friction WhatsApp CTA. Retargeting via Meta/YouTube on non-converters.

## Brand-safety & compliance guardrails (critical for health content)

- **No cure guarantees, no outcome promises, no fear-mongering.** Facilitator voice only.
- Every clinical/price claim cites `08_DATA_SOURCES.md`; unverified claims never publish.
- Patient stories require signed consent (image + medical-detail release); comply with platform health-ad policies and DPDP/GDPR.
- Disclose the facilitation relationship. No fake reviews, no stock "patients" presented as real.
- Before/after imagery only where platform policy and consent allow.

## KPIs

Indexed pages, top-10 keyword count, organic sessions, WhatsApp opt-in rate, MQLs/channel, cost-per-MQL, MQL→treated %, brand search volume, video watch-through, languages live.

## Acceptance (see `14`)
- [ ] Editorial calendar auto-generates from the (category × market × language) gap grid.
- [ ] ≥ 3 languages live at launch; RTL works.
- [ ] Zero published clinical claims without a citation + human sign-off.
- [ ] Every asset routes to a working WhatsApp CTA and into the CRM.

## Related
[[03_TREATMENT_CATEGORY_STRATEGY]] · [[06_GLOBALIZATION_PLAYBOOK]] · [[07_SYSTEM_DESIGN]] · [[08_DATA_SOURCES]]
