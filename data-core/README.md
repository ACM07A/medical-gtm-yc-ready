# Data Core

The lean source of truth for the agent fleet (`/build-os/07`). SQLite via Node's built-in `node:sqlite` — **zero external dependencies**. Seeded with the real data produced so far.

## Run
```bash
node --experimental-sqlite data-core/seed.mjs           # (re)build medyatra.db from real data
node --experimental-sqlite data-core/query.mjs portfolio
node --experimental-sqlite data-core/query.mjs partners cardiac
node --experimental-sqlite data-core/query.mjs pipeline
node --experimental-sqlite data-core/query.mjs content
node --experimental-sqlite data-core/query.mjs gaps      # Content Engine worklist
node --experimental-sqlite data-core/query.mjs lead-add IQ cardiac whatsapp soon mid   # demo CRM insert
```
`--experimental-sqlite` prints a harmless warning on some Node versions. `medyatra.db` is gitignored.

## Schema (see `schema.sql`)
`market` (source-market config) · `category` + `category_price` + `category_market` (Category Intelligence) · `partner` + `partner_category` + `poc` + `proposal` (Partner/Proposal agents) · `content_asset` (Content Engine) · `lead` (Lead/CRM).

## How agents use it
- **Category Intelligence** writes `category` scores (computed from `/build-os/03` weights in `db.mjs`) → `query portfolio`.
- **Partner Sourcing** writes `partner`/`poc` and advances `stage` → `query pipeline`.
- **Content Engine** reads `gaps` (the uncovered category×market cells) as its worklist, writes `content_asset` rows.
- **Lead/CRM** inserts PII-minimized `lead` rows (store a handle + consent flag, never medical records).

## Design notes / guardrails
- **PII minimization is schema-level:** `lead.ref` holds a handle, not a medical record; `consent` must be set before processing (`/build-os/10`).
- **POC `person_name` is null until resolved** via public LinkedIn search; only public business channels stored.
- **Pricing is `indicative=1`** until a signed partner package sheet confirms.
- The `score`/`rank` are **computed**, not hard-coded — change the weights in `db.mjs` and re-seed to re-rank.

## ⚠️ Model surfaced a portfolio re-rank (needs a human decision)
Computing the weighted score reordered the launch portfolio vs. the directional ranking in `/build-os/03`:

| Model rank (computed) | Doc rank (directional) |
|---|---|
| 1 Orthopedics 4.45 · 2 Cardiac 4.40 · 3 Oncology 4.30 · **4 Dental 4.20** · 5 Cosmetic 4.05 · 6 Fertility 3.95 | 1 Cardiac · 2 Ortho · 3 Oncology · 4 Fertility · 5 Cosmetic · 6 Dental |

Ortho edging Cardiac is noise (0.05). The real signals: **Dental jumps to #4** (high cost-arbitrage + ease + whitespace) and **Fertility falls to #6**. Decide: accept the model output, or tune the weights (e.g. raise `demand`/`margin` to reflect cardiac deal-size). Logged as a reconciliation task in `/agent-os/11`.
