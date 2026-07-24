// DUAL-MODE lead ingestion — the "plug in your lead DB" front door. An outside operator (e.g. a Middle-East
// health company) POSTs a batch of their leads; we normalise field names, map country→market + treatment→
// category, MINIMISE PII (store a masked handle, never the raw phone/email), dedupe, tag source_type=external
// + source_ref=<tenant>, and drop each valid lead into the funnel at journey_stage='intake'. The comms engine
// then treats them identically to our own leads — held at the consent gate until opt-in, and at the
// regulatory gate until the market is cleared. Reusable: called by POST /api/lead/ingest and this CLI.
//   node --experimental-sqlite data-core/ingest.mjs <batch.json>
import { open, marketCleared, logRun } from "./db.mjs";

function parseCsv(csv) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const input = csv.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') {
      if (field) throw new Error("quote must start at the beginning of a field");
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim()); field = "";
    } else if (char === "\n") {
      row.push(field.trim()); field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (quoted) throw new Error("unterminated quoted field");
  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0];
  if (headers.some((header) => !header)) throw new Error("header names must not be empty");
  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`row ${index + 2} has ${values.length} columns; expected ${headers.length}`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

// Map a free-text treatment to one of our category ids (verified against the DB), else null.
const CAT_KW = [
  ["cardiac", /heart|cardiac|bypass|cabg|valve|angio|stent/i],
  ["oncology", /cancer|oncolog|tumou?r|chemo|marrow|bmt/i],
  ["ortho", /knee|hip|joint|spine|orthop|replacement/i],
  ["fertility", /ivf|fertilit|icsi|conceive/i],
  ["cosmetic", /cosmetic|plastic|aesthetic|bariatric|sleeve|rhino|implant.*breast/i],
  ["dental", /dental|teeth|tooth|implant|smile/i],
  ["wellness", /wellness|naturopath|ayurved|detox|panchakarma|recovery/i],
];
function mapCategory(db, raw) {
  const s = String(raw || "");
  const direct = db.prepare(`SELECT id FROM category WHERE lower(id)=lower(?) OR lower(name)=lower(?)`).get(s, s);
  if (direct) return direct.id;
  for (const [id, re] of CAT_KW) if (re.test(s)) {
    if (db.prepare(`SELECT 1 FROM category WHERE id=?`).get(id)) return id;
  }
  return null;
}
// Map a country name/code to a market code (verified against the DB), else null.
function mapMarket(db, raw) {
  const s = String(raw || "").trim();
  const m = db.prepare(`SELECT code FROM market WHERE lower(code)=lower(?) OR lower(name)=lower(?)`).get(s, s);
  return m ? m.code : null;
}
// PII minimisation: never store the raw contact. Keep a masked handle so a human can reconcile, not identify.
function minimiseHandle(raw) {
  const v = String(raw.ref || raw.phone || raw.mobile || raw.email || raw.id || "").trim();
  if (!v) return null;
  if (v.includes("@")) { const [u, d] = v.split("@"); return `${u.slice(0, 2)}***@${d || ""}`; }
  const digits = v.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : `ref-${v.slice(-4)}`;
}

const CSV_FIELDS = {
  country: ["country", "country_code", "market", "source_market"],
  treatment: ["treatment", "procedure", "category", "interest"],
  contact: ["contact", "phone", "mobile", "email", "ref", "id"],
  consent: ["consent", "opt_in", "consented"],
  urgency: ["urgency", "timeline"],
  budget_band: ["budget_band", "budget"],
};

const consentValue = (value) => ["true", "1", "yes", "y", "captured", "consented"].includes(String(value ?? "").trim().toLowerCase());

export function parseLeadCsv(csv, requestedMapping = {}) {
  if (typeof csv !== "string" || !csv.trim()) return { ok: false, error: "csv must be a non-empty string" };
  let records;
  try {
    records = parseCsv(csv);
  } catch (error) {
    return { ok: false, error: `invalid CSV: ${error.message}` };
  }
  if (!records.length) return { ok: false, error: "csv contains headers but no data rows" };
  if (records.length > 500) return { ok: false, error: "csv preview is limited to 500 rows" };
  const headers = Object.keys(records[0]);
  const byLower = new Map(headers.map((header) => [header.toLowerCase(), header]));
  const mapping = {};
  for (const [field, aliases] of Object.entries(CSV_FIELDS)) {
    const requested = String(requestedMapping[field] || "").trim();
    mapping[field] = requested && headers.includes(requested)
      ? requested
      : aliases.map((alias) => byLower.get(alias)).find(Boolean) || null;
  }
  const missing = ["country", "treatment", "contact"].filter((field) => !mapping[field]);
  if (missing.length) return { ok: false, error: `missing required column mapping: ${missing.join(", ")}`, headers, mapping };
  const leads = records.map((row) => ({
    country: row[mapping.country],
    treatment: row[mapping.treatment],
    ref: row[mapping.contact],
    consent: mapping.consent ? consentValue(row[mapping.consent]) : false,
    urgency: mapping.urgency ? row[mapping.urgency] : undefined,
    budget_band: mapping.budget_band ? row[mapping.budget_band] : undefined,
  }));
  return { ok: true, headers, mapping, leads };
}

export function previewLeadCsv(db, { source = "external", token, csv, mapping = {} } = {}) {
  const tenant = db.prepare(`SELECT * FROM tenant WHERE id=? AND active=1`).get(source);
  if (!tenant) return { ok: false, error: `unknown or inactive tenant '${source}'` };
  if (tenant.token && token !== tenant.token) return { ok: false, error: "invalid tenant token (X-Ingest-Token)" };
  const parsed = parseLeadCsv(csv, mapping);
  if (!parsed.ok) return parsed;
  const batchKeys = new Set();
  const rows = parsed.leads.map((raw, index) => {
    const market = mapMarket(db, raw.country);
    const category = mapCategory(db, raw.treatment);
    const ref = minimiseHandle(raw);
    const reasons = [];
    if (!market) reasons.push(`unknown market '${raw.country || ""}'`);
    if (!category) reasons.push(`unmapped treatment '${raw.treatment || ""}'`);
    if (!ref) reasons.push("no contact handle");
    const key = market && category && ref ? `${ref}|${market}|${category}` : null;
    const existing = key && db.prepare(`SELECT id FROM lead WHERE source_ref=? AND ref=? AND market_code=? AND category_id=?`)
      .get(source, ref, market, category);
    const duplicate = !!existing || (key ? batchKeys.has(key) : false);
    if (key) batchKeys.add(key);
    return {
      row: index + 2,
      ref,
      market,
      category,
      consent: raw.consent ? "captured" : "missing",
      status: reasons.length ? "rejected" : duplicate ? "duplicate" : raw.consent ? "ready" : "held_no_consent",
      reasons,
    };
  });
  const count = (status) => rows.filter((row) => row.status === status).length;
  return {
    ok: true,
    source: tenant.id,
    tenant: tenant.name,
    headers: parsed.headers,
    mapping: parsed.mapping,
    summary: {
      received: rows.length,
      ready: count("ready"),
      held_no_consent: count("held_no_consent"),
      duplicates: count("duplicate"),
      rejected: count("rejected"),
    },
    rows,
  };
}

export function ingestLeads(db, { source = "external", token, leads = [] } = {}) {
  if (!Array.isArray(leads)) return { ok: false, error: "body.leads must be an array" };
  // TENANT auth (build-os/11): the source must be a known, active tenant; per-tenant token if it has one.
  const tenant = db.prepare(`SELECT * FROM tenant WHERE id=? AND active=1`).get(source);
  if (!tenant) return { ok: false, error: `unknown or inactive tenant '${source}' — provision it in the tenant table` };
  if (tenant.token && token !== tenant.token) return { ok: false, error: "invalid tenant token (X-Ingest-Token)" };
  const res = { ok: true, source: tenant.id, tenant: tenant.name, received: leads.length, accepted: 0, deduped: 0, held_no_consent: 0, held_regulatory: 0, rejected: [] };
  const ins = db.prepare(`INSERT INTO lead
    (market_code,category_id,channel,ref,urgency,budget_band,consent,status,source_type,source_ref,ingested_at,journey_stage,docs_ready,opted_out)
    VALUES (?,?, 'import', ?, ?, ?, ?, 'qualified', 'external', ?, datetime('now'), 'intake', 0, 0)`);

  for (const raw of leads) {
    const market = mapMarket(db, raw.market || raw.country || raw.country_code);
    const category = mapCategory(db, raw.category || raw.treatment || raw.procedure || raw.interest);
    const handle = minimiseHandle(raw);
    if (!market) { res.rejected.push({ ref: handle, reason: `unknown market '${raw.market || raw.country || ""}'` }); continue; }
    if (!category) { res.rejected.push({ ref: handle, reason: `unmapped treatment '${raw.treatment || raw.category || ""}'` }); continue; }
    if (!handle) { res.rejected.push({ ref: null, reason: "no contact handle" }); continue; }

    // Dedupe within this tenant on the masked handle + market + category.
    const dup = db.prepare(`SELECT id FROM lead WHERE source_ref=? AND ref=? AND market_code=? AND category_id=?`)
      .get(source, handle, market, category);
    if (dup) { res.deduped++; continue; }

    const consent = raw.consent === true || raw.consent === 1 || raw.consent === "true" ? 1 : 0;
    ins.run(market, category, handle, raw.urgency || "planning", raw.budget_band || raw.budget || "unknown", consent, source);
    res.accepted++;
    if (!consent) res.held_no_consent++;                 // comms engine will opt-in-first before any WhatsApp
    if (!marketCleared(db, market).cleared) res.held_regulatory++;  // and nurture-only until the market clears
  }

  logRun(db, "Ingest", `Lead batch · ${source}`,
    `${res.accepted} accepted (${res.held_no_consent} need opt-in · ${res.held_regulatory} market-gated) · ${res.deduped} dupes · ${res.rejected.length} rejected`,
    null, "ok");
  return res;
}

// CLI: node --experimental-sqlite data-core/ingest.mjs <batch.json>
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFileSync } = await import("node:fs");
  const file = process.argv[2];
  if (!file) { console.error("usage: node data-core/ingest.mjs <batch.json>  (JSON: {source, leads:[...]})"); process.exit(1); }
  const db = open();
  const body = JSON.parse(readFileSync(file, "utf8"));
  const r = ingestLeads(db, body);
  console.log(JSON.stringify(r, null, 2));
  db.close();
}
