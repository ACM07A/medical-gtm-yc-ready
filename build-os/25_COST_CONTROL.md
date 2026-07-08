# 25 — Cost Control (run the factory for ~free locally)

Principle: **feature-build or free-tier before paid API.** Everything below runs on this machine at zero or near-zero marginal cost. Paid services are optional upgrades, not requirements.

## Paid API → free/local alternative (what we built)

| Need | Typical paid API | Our free/local alternative | Where |
|---|---|---|---|
| Web search (research) | Tavily / SerpAPI / Bing | **DuckDuckGo HTML** (no key) via `fetch` | `lib/research.mjs` |
| Rendered-page scraping | ScrapingBee / Browserless | **puppeteer-core driving your local Edge/Chrome** (no Chromium download) | `lib/browser.mjs` |
| Contact enrichment | Apollo.io / Lusha / Cognism | **Free research** of public IPS pages + email/phone extraction (public data only) | `data-core/sourcing_research.mjs` |
| Email send | SendGrid / SES / Mailgun | **Local outbox** (`.eml` files) by default; **Resend free tier** if a key is set | `lib/mailer.mjs`, `send_outreach.mjs` |
| CMS / publishing | WordPress host / Contentful | **Local static-site generator** (`/site`) | `data-core/publish_site.mjs` |
| Tier-2 generation | (LLM) | **GLM-5.2** via your NVIDIA key (already wired) | `integrations/` |
| Tier-1 reasoning/QA | Anthropic (paid) | **Route tier-1 to GLM too**, or keep Claude only for the hardest calls | `07_MODEL_ROUTING` |
| Scheduler | cloud cron | **Windows Task Scheduler / cron** running `run_loop.mjs` | `data-core/run_loop.mjs` |
| CRM / DB | HubSpot | **SQLite data core** | `data-core/` |
| Analytics | paid | server logs / GA4 free tier (later) | — |

## Still genuinely needs a paid/verified service (no good free path)
- **WhatsApp Business Platform** — Meta-gated, needs business verification; no compliant free autonomous option. Queue messages locally until provisioned.
- **Enrichment beyond public data** (named private direct-dials) — public research gets public IPS emails; deeper needs a paid provider. Optional.
- **Real outbound email at volume with deliverability** — local outbox is free but a human/ESP must actually send; Resend free tier covers low volume.

## LLM token discipline (the main variable cost)
- Bulk drafting on **GLM-5.2** (cheap), Opus/Claude reserved for hard decisions only.
- Prices/facts **injected from the data core** so models don't waste tokens researching, and can't invent.
- Generation scripts are **idempotent** (regenerate only what changed); the free `run_loop` cycle (QA/research/publish/send) costs **zero** tokens.

## Net
The factory's **processing loop runs at zero marginal cost**; the only spend is GLM tokens when generating new content/outreach, and optional paid services (WhatsApp, enrichment) when you choose to scale.

## Related
[[07_SYSTEM_DESIGN]] · [[29_LIGHTWEIGHT_ARCHITECTURE_RULES]] · `integrations/README.md`
