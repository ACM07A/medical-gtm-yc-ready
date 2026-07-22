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
  type TEXT DEFAULT 'chain',         -- chain | unit | standalone | emerging | doctor
  parent_id TEXT REFERENCES partner(id),  -- unit -> its chain
  mvt_presence TEXT DEFAULT 'established', -- established | emerging | latent | none (NULL for type='doctor')
  opportunity TEXT,                  -- High | Med | Low  (computed: quality x inverse-presence = margin/terms upside)
  notes TEXT
);

CREATE TABLE IF NOT EXISTS partner_category (
  partner_id TEXT NOT NULL REFERENCES partner(id),
  category_id TEXT NOT NULL REFERENCES category(id),
  PRIMARY KEY (partner_id, category_id)
);

-- DOCTOR AFFILIATE — a second account type on the same partner/pipeline machinery (stage, fit_score,
-- next_action, outreach, proposal all reused via type='doctor') but scored on a different rubric: an
-- individual clinician recruited as a referral/training partner — Sachin Rai's own "next level" playbook
-- (CME engagement, a revenue share, a local info-center) — not an institution being sold a pilot.
-- A hospital's fields (accreditation, mvt_presence, JCI/NABH) don't apply to a person; these do instead.
CREATE TABLE IF NOT EXISTS doctor_affiliate (
  partner_id TEXT PRIMARY KEY REFERENCES partner(id),
  specialty TEXT,                    -- a category id (cardiac, ortho, oncology, fertility, cosmetic, dental)
  country_code TEXT,                 -- ISO, cross-referenced against market(code) for target-market fit
  current_hospital TEXT,             -- their home institution today (public info; not necessarily a partner of ours)
  reach_est TEXT DEFAULT 'unknown',  -- low | med | high | unknown — estimated referral volume, never invented
  warmth TEXT DEFAULT 'cold',        -- cold | warm — is there a real introduction (same concept as the warm hospital accounts)
  contact_channel TEXT,              -- PUBLIC business channel only (no personal PII) — same rule as ips_channel_public
  cme_notes TEXT,
  source TEXT                        -- how we were introduced / who is vouching for this
);

-- PAYER — a THIRD account type (type='payer'), the base of a channel deliberately parked for phase 2/3.
-- An insurer / TPA / self-insured employer / government health office redirects a POPULATION at once, and
-- the pitch is financial (lower claims cost for treatment they already fund), not a clinical-trust pitch to
-- one referring person. Precedent: Sachin Rai's Toyota example; already prototyped once as the MedYatra ×
-- TruDoc partnership. Base only for now: table + fit rubric + a human-vouched capture path. No outreach
-- generator, no console UI yet — see PARTNER_AGENT.md §12.
CREATE TABLE IF NOT EXISTS payer (
  partner_id TEXT PRIMARY KEY REFERENCES partner(id),
  payer_type TEXT,                   -- insurer | tpa | employer | government
  country_code TEXT,                 -- ISO, cross-referenced against market(code) for target-market fit
  population_est TEXT,               -- rough covered lives / member count as GIVEN — free text, never invented ("4.4M", "unknown")
  claims_pain TEXT DEFAULT 'unknown',-- low | med | high | unknown — how much they bleed on treatments we could redirect
  decision_authority TEXT DEFAULT 'unknown', -- concentrated | distributed | unknown — can one deal actually move volume
  warmth TEXT DEFAULT 'cold',        -- cold | warm — is there a real introduction
  contact_channel TEXT,              -- PUBLIC business channel only (no personal PII)
  source TEXT                        -- how we were introduced / who is vouching for this
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

-- Sales comms templates (/build-os/09). The post-lead WhatsApp sequence. Body kept minimal & approvable;
-- the persuasion rides in the image HEADER (an infographic). Human-gated: drafted here, submitted to Meta
-- and sent by a human. status: draft -> review -> submitted (to Meta) -> approved.
CREATE TABLE IF NOT EXISTS comms_template (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage TEXT,                          -- acknowledge | qualify | estimate | hospital_options | logistics | reengage
  seq INTEGER,                         -- order in the sequence
  name TEXT,                           -- meta template name (snake_case)
  channel TEXT DEFAULT 'whatsapp',
  msg_type TEXT,                       -- template | session (session = free-form, within 24h window)
  category TEXT,                       -- utility | marketing
  language TEXT DEFAULT 'en',
  header_type TEXT DEFAULT 'image',    -- image | none
  header_asset TEXT,                   -- path to the infographic used as the header
  body TEXT,                           -- minimal, {{n}}-variable body
  variables TEXT,                      -- json: what each {{n}} maps to
  buttons TEXT,                        -- json: quick-reply / CTA buttons
  status TEXT DEFAULT 'draft'          -- draft | review | submitted | approved
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

-- PRICE LADDER (/build-os/03) — the honest comparison a patient actually makes. A patient in Muscat does
-- NOT first compare India to the USA; they compare it to the best care they can get AT HOME, then to the
-- regional/international options they've heard of, and only then to India. Ordering the comparison that way
-- is the trust play: it shows we're answering their real question, not selling a pre-picked answer.
--   tier: 'local'         — best available option in the patient's own country (rung 1)
--         'international'  — other destinations they'd realistically consider (rung 2..n, sorted by price)
--         'india'          — our destination (final rung, highlighted)
-- Rows with status='needs_research' carry NULL prices and are rendered as an explicit gap, never guessed.
CREATE TABLE IF NOT EXISTS reference_price (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT NOT NULL REFERENCES category(id),
  procedure_key TEXT NOT NULL,       -- matches CATEGORY_COMPARATOR.match (e.g. 'bypass', 'knee')
  tier TEXT NOT NULL,                -- local | international | india
  market_code TEXT,                  -- audience market this rung is FOR ('*' = every market)
  dest_code TEXT,                    -- ISO of where the care happens (OM, AE, TH, TR, IN, US, GB...)
  dest_label TEXT NOT NULL,          -- patient-facing label ("Private hospital, Muscat")
  low INTEGER, high INTEGER, currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'needs_research',  -- cited | needs_research
  source_cite TEXT,
  retrieved TEXT,
  UNIQUE(category_id, procedure_key, market_code, dest_code)
);

-- PARTNER-SPECIFIC PRICING — the negotiated package rate from a signed partner. Once a row exists and is
-- 'confirmed', it REPLACES the indicative India range on the ladder's final rung (that's the whole pitch:
-- a real quoted number from a named hospital, not an aggregator's range). Never shown while 'indicative'.
CREATE TABLE IF NOT EXISTS partner_price (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id TEXT NOT NULL REFERENCES partner(id),
  category_id TEXT NOT NULL REFERENCES category(id),
  procedure_key TEXT NOT NULL,
  low INTEGER, high INTEGER, currency TEXT DEFAULT 'USD',
  includes TEXT,                     -- what the package covers (stay, follow-up, transfers)
  status TEXT DEFAULT 'indicative',  -- indicative | confirmed   (confirmed = signed package sheet)
  valid_until TEXT,
  source_cite TEXT,
  retrieved TEXT,
  UNIQUE(partner_id, category_id, procedure_key)
);
