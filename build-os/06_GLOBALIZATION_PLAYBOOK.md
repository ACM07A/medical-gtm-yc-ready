# 06 — Globalization Playbook

**Owner agent:** Localization Agent (+ all agents read the market config).
**Requirement covered:** #5 — ready to be tailored for a global audience.

## Principle

The engine is **destination-agnostic and source-agnostic**. India is the first *destination*; the Middle East, Africa, Central Asia, Europe and SE Asia are the first *source regions*. Nothing hard-codes either. To relaunch, you set a config — you don't rewrite the engine.

## The market config (single source of truth per market)

```yaml
source_market:
  code: IQ                      # ISO country
  name: Iraq
  region: middle_east
  languages: [ar, en]
  rtl: true
  currency: IQD
  primary_channels: [whatsapp, youtube, facebook, seo]
  top_categories: [cardiac, oncology, orthopedics]
  price_reference_source: "<cite>"    # source-market price for comparison tables
  visa_regime: e-medical-visa
  regulatory: [DPDP_IN]          # data laws that apply to this flow
  interpreter_langs: [ar]
  feeder_hubs: [Baghdad, Erbil, Basra]
  compliance_notes: "..."

destination_market:
  code: IN
  name: India
  accreditation_bodies: [JCI, NABH]
  hospital_networks: [...]
  visa_product: e-Medical Visa
```

Every agent reads this. The Content, Partner, Category, and Lead agents all parameterize on it. Add a new source market = add a config + let the agents populate the grid.

## What must be localized (not just translated)

- **Language & tone** — transcreation, native QA, RTL for Arabic. Trust cues differ by culture.
- **Channel mix** — WhatsApp dominates South Asia/Africa/ME; TikTok/Instagram for Western cosmetic.
- **Price references** — always vs. the *source market's* cost, in *its* currency.
- **Regulatory surface** — GDPR for EU sources, US privacy norms, DPDP for India-side data, platform health-ad rules per country.
- **Payment rails** — local methods, forex, escrow expectations.
- **Feeder network** — local referrers per hub city.
- **Category priorities** — from `03`'s category↔market matrix.

## Second-destination readiness

The same architecture re-points to **Thailand, Turkey, UAE, Malaysia, Mexico, or Singapore** as destinations later. Only the destination config + partner list change. This is the long-term moat: one engine, many corridors.

## Rollout sequence

1. India × Arabic Middle East (Iraq + Oman/Gulf) — largest real MVT revenue — prove the loop. Run a parallel **English Africa track (Nigeria/Kenya)** for cheap content velocity.
2. Broaden Africa (Ethiopia, Sudan, Tanzania, Ghana) and add Gulf value markets (UAE, Saudi Arabia).
3. Add SE Asia (Myanmar → Cambodia, Vietnam, Indonesia, Philippines) — the industry's fast-growing diversification hedge.
4. Add Europe (UK/Ireland) for high-margin dental/cosmetic/fertility electives.
5. Add a second destination country once the corridor engine is proven.

## Acceptance (see `14`)
- [ ] A new source market goes live by adding a config + running the population loops — no code changes to core agents.
- [ ] Compliance surface auto-selected from the market config.
- [ ] Content grid, partner targets, and channel mix all derive from config.

## Related
[[00_PROJECT_BRIEF]] · [[03_TREATMENT_CATEGORY_STRATEGY]] · [[05_CONTENT_BRAND_CAMPAIGN]] · [[10_SECURITY_COMPLIANCE]]
