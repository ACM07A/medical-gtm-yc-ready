-- MedYatra data core — lean SQLite schema (source of truth for the agent fleet).
-- Maps to /build-os/07_SYSTEM_DESIGN.md. Keep it simple; no ORM, no migrations tool yet.
PRAGMA foreign_keys = ON;

-- Source markets (the globalization config, /build-os/06). json fields stored as TEXT.
CREATE TABLE IF NOT EXISTS market (
  code TEXT PRIMARY KEY,              -- ISO country
  name TEXT NOT NULL,
  region TEXT NOT NULL,              -- middle_east | africa | europe | se_asia
  tier TEXT,                         -- A | B | C | D
  languages TEXT,                    -- json array
  rtl INTEGER DEFAULT 0,
  currency TEXT,
  primary_channels TEXT,             -- json array
  visa_regime TEXT,
  regulatory TEXT,                   -- json array
  interpreter_langs TEXT,            -- json array
  feeder_hubs TEXT,                  -- json array
  status TEXT DEFAULT 'planned',     -- planned | live
  notes TEXT
);

-- Treatment categories + the Category Intelligence scoring (/build-os/03).
CREATE TABLE IF NOT EXISTS category (
  id TEXT PRIMARY KEY,               -- cardiac, ortho, oncology, fertility, cosmetic, dental
  name TEXT NOT NULL,
  subtypes TEXT,
  status TEXT DEFAULT 'launch',      -- launch | incubate | park
  cost_arb REAL, quality REAL, ease REAL, demand REAL, margin REAL, whitespace REAL,
  score REAL,                        -- computed weighted score (seed computes from weights)
  rank INTEGER,                      -- rank by computed score (model output)
  flagship INTEGER DEFAULT 0         -- brand/deal-size lead, independent of model rank (T013)
);

-- Competitor / market price intelligence (scraped from live aggregator pages, free research).
CREATE TABLE IF NOT EXISTS competitor_price (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT REFERENCES category(id),
  procedure TEXT,
  low INTEGER, high INTEGER, samples INTEGER,
  sources TEXT, retrieved TEXT
);

-- Cross-checked pricing anchors (/build-os/03 + /build-os/08). Ranges, cited, indicative.
CREATE TABLE IF NOT EXISTS category_price (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT NOT NULL REFERENCES category(id),
  procedure TEXT NOT NULL,
  india_low INTEGER, india_high INTEGER, currency TEXT DEFAULT 'USD',
  comparator TEXT,                   -- source-market/Western reference
  indicative INTEGER DEFAULT 1,      -- 1 until a signed partner package sheet confirms
  source_cite TEXT,
  retrieved TEXT
);

-- Category <-> source-market fit matrix (/build-os/03).
CREATE TABLE IF NOT EXISTS category_market (
  category_id TEXT NOT NULL REFERENCES category(id),
  market_code TEXT NOT NULL REFERENCES market(code),
  priority INTEGER DEFAULT 1,
  PRIMARY KEY (category_id, market_code)
);

-- Partners (/build-os/04). Public IPS business channels only. Now supports:
--  (a) latent/emerging high-quality brands (the margin play, not just existing-desk hospitals)
--  (b) unit/location-level rows (parent_id -> chain) so POCs attach at the hospital, not just the chain.
CREATE TABLE IF NOT EXISTS partner (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  network TEXT,
  city TEXT,
  accreditation TEXT,
  ips_channel_public TEXT,           -- PUBLIC business channel only (no personal PII)
  ips_source TEXT,
  fit TEXT,                          -- quality benchmark: High | Med (must clear the bar; /build-os/04)
  stage TEXT DEFAULT 'Sourced',      -- Sourced->Enriched->POC found->Outreach sent->Responded->Pilot proposed->Pilot live->Signed->Active
  priority INTEGER DEFAULT 0,        -- 1 = first-wave target
  type TEXT DEFAULT 'chain',         -- chain | unit | standalone | emerging
  parent_id TEXT REFERENCES partner(id),  -- unit -> its chain
  mvt_presence TEXT DEFAULT 'established', -- established | emerging | latent | none
  opportunity TEXT,                  -- High | Med | Low  (computed: quality x inverse-presence = margin/terms upside)
  notes TEXT
);

CREATE TABLE IF NOT EXISTS partner_category (
  partner_id TEXT NOT NULL REFERENCES partner(id),
  category_id TEXT NOT NULL REFERENCES category(id),
  PRIMARY KEY (partner_id, category_id)
);

-- Points of contact (public business roles/channels; person_name null until resolved).
CREATE TABLE IF NOT EXISTS poc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id TEXT NOT NULL REFERENCES partner(id),
  title_target TEXT,
  person_name TEXT,                  -- null until resolved via public LinkedIn search
  channel_public TEXT,
  source TEXT,
  resolved INTEGER DEFAULT 0
);

-- Partnership proposals (/build-os/04). Human-gated before send.
CREATE TABLE IF NOT EXISTS proposal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id TEXT REFERENCES partner(id),
  category_id TEXT REFERENCES category(id),
  market_code TEXT REFERENCES market(code),
  fee_pct REAL,
  status TEXT DEFAULT 'draft',       -- draft | review | approved | sent
  file_ref TEXT,
  blockers TEXT
);

-- Outreach drafts (/build-os/04). First-touch messages per partner; human-gated at send.
CREATE TABLE IF NOT EXISTS outreach (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created TEXT DEFAULT (datetime('now')),
  partner_id TEXT REFERENCES partner(id),
  category_id TEXT REFERENCES category(id),
  market_code TEXT REFERENCES market(code),
  channel TEXT DEFAULT 'email',
  angle TEXT,                        -- established (scale/competitive) | latent (margin/demand-we-bring)
  subject TEXT,
  file_ref TEXT,
  status TEXT DEFAULT 'draft'        -- draft | review | approved | sent
);

-- Content assets (/build-os/05). One row per (category x market x language) cell.
CREATE TABLE IF NOT EXISTS content_asset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT REFERENCES category(id),
  market_code TEXT REFERENCES market(code),
  language TEXT,
  title TEXT,
  file_ref TEXT,
  status TEXT DEFAULT 'draft',       -- draft | review | published
  cta_wired INTEGER DEFAULT 0,
  citations_ok INTEGER DEFAULT 0
);

-- Channel posts (/build-os/05 distribution). Each cornerstone page is REPURPOSED into platform-native
-- posts (LinkedIn / Instagram carousel / Reddit / WhatsApp / X). Facts are injected from the source page
-- (no invention). Human-gated: nothing auto-posts — status flows draft -> review -> approved -> posted.
CREATE TABLE IF NOT EXISTS channel_post (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created TEXT DEFAULT (datetime('now')),
  content_asset_id INTEGER REFERENCES content_asset(id),
  category_id TEXT, market_code TEXT,
  channel TEXT,                       -- linkedin | instagram | reddit | whatsapp | x
  format TEXT,                        -- post | carousel | thread | broadcast
  body TEXT,                          -- the ready-to-post copy (+ image briefs for visual platforms)
  model TEXT,                         -- which tier-2 model generated it
  file_ref TEXT,
  status TEXT DEFAULT 'draft'         -- draft | review | approved | posted
);

-- Run / activity log — every loop iteration writes here so it's tangibly visible in the console.
CREATE TABLE IF NOT EXISTS run (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT (datetime('now')),
  agent TEXT,                        -- Content Engine | Partner Sourcing | Category Intelligence | System
  action TEXT,
  detail TEXT,
  ref TEXT,                          -- optional link target (e.g. /draft/12)
  status TEXT DEFAULT 'ok'           -- ok | fail | pending
);

-- Leads (/build-os/05 funnel). PII-minimized: store a handle/ref, not full records.
CREATE TABLE IF NOT EXISTS lead (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created TEXT DEFAULT (datetime('now')),
  market_code TEXT REFERENCES market(code),
  category_id TEXT REFERENCES category(id),
  channel TEXT,                      -- whatsapp | form | ...
  ref TEXT,                          -- minimized handle (NOT full PII / no medical records)
  urgency TEXT,                      -- emergency | soon | planning
  budget_band TEXT,
  docs_ready INTEGER DEFAULT 0,
  consent INTEGER DEFAULT 0,         -- consent captured before any processing
  status TEXT DEFAULT 'new',         -- new | qualified | routed | quoted | treated | lost
  routed_to TEXT
);
