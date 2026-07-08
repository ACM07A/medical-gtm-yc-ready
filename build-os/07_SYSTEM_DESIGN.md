# 07 — System Design (the Agentic GTM Engine)

**Requirement covered:** #1 — the engine itself. Keep it lightweight (see `/build-os` architecture rules; no premature microservices/Kubernetes).

## The agent fleet

Six specialist agents on a shared data core + orchestrator. Each has one job, one output, one QA gate.

```
                    ┌──────────────────────────┐
                    │   Orchestrator / Loop     │  (agent-os: master loop)
                    │  goal → task → verify     │
                    └──────────┬───────────────┘
        ┌──────────┬───────────┼───────────┬──────────────┬────────────┐
        ▼          ▼           ▼           ▼              ▼            ▼
 ┌────────────┐┌──────────┐┌──────────┐┌────────────┐┌──────────┐┌────────────┐
 │ Category   ││ Partner  ││ Proposal ││ Content    ││ Lead/CRM ││ Localization│
 │Intelligence││ Sourcing ││ Generator││ Engine     ││ Agent    ││ Agent       │
 └─────┬──────┘└────┬─────┘└────┬─────┘└─────┬──────┘└────┬─────┘└──────┬──────┘
       └────────────┴───────────┴────────────┴───────────┴─────────────┘
                                   ▼
                    ┌──────────────────────────┐
                    │  Data Core (source of     │
                    │  truth): CRM, content DB, │
                    │  category scores, market  │
                    │  configs, evidence log    │
                    └──────────────────────────┘
```

| Agent | Input | Output | Human gate |
|---|---|---|---|
| **Category Intelligence** | data sources, market configs | ranked category portfolio (`03`) | strategy review monthly |
| **Partner Sourcing** | category list, hospital seeds | enriched hospitals + verified public POCs in CRM | review before outreach |
| **Proposal Generator** | hospital record + category fit | tailored proposal draft (`04`) | **must** approve before send |
| **Content Engine** | content grid, performance data | drafted + scheduled multichannel assets (`05`) | approve clinical claims |
| **Lead / CRM** | inbound WhatsApp/forms | qualified, routed leads | human coordinator closes |
| **Localization** | any asset + market config | transcreated, QA'd localized asset | native QA for clinical |

## Tech approach (lean)

- **Orchestration:** the `/agent-os/` loop (this repo) drives agents via a coding agent / scheduled runs. Start with scheduled batch loops, not a always-on server.
- **Models:** tiered routing per `/agent-os/07_MODEL_ROUTING.md` — strong model for strategy/proposals/compliance-sensitive drafting, cheaper models for bulk content drafts and enrichment.
- **Data core:** a simple database (Postgres/SQLite to start) + object storage for content. No Kubernetes, no microservices for MVP.
- **Integrations:** WhatsApp Business API (Meta), Meta/YouTube for scheduling + ads, a CMS/SSG for SEO pages, a lightweight CRM (or Airtable/Notion to start), enrichment via public web + LinkedIn (compliant, public-data only).
- **Public product surface (Nuvica-inspired):** patient-facing site + category/hospital pages + WhatsApp CTA. Fast, static-first SEO pages; glassmorphic clinical-blue/green UI, 3D anatomy hero visuals.

## Human-in-the-loop boundaries (non-negotiable)

Agents **draft and research**; humans **approve and close** for: any clinical/price claim, any outreach send, any partner commercial term, any patient-facing medical content, any spend. See `/agent-os/13_STOP_RULES.md`.

## Non-goals / lightweight rules

No custom telemedicine, no owning infra, no ML model training in v1, no real-time streaming architecture. Batch + scheduled loops are enough. Add complexity only when a metric demands it.

## Related
[[03_TREATMENT_CATEGORY_STRATEGY]] · [[04_PARTNER_ACQUISITION_STRATEGY]] · [[05_CONTENT_BRAND_CAMPAIGN]] · [[08_DATA_SOURCES]] · [[10_SECURITY_COMPLIANCE]]
