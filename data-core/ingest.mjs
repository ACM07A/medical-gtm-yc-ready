// DUAL-MODE lead ingestion — the "plug in your lead DB" front door. An outside operator (e.g. a Middle-East
// health company) POSTs a batch of their leads; we normalise field names, map country→market + treatment→
// category, MINIMISE PII (store a masked handle, never the raw phone/email), dedupe, tag source_type=external
// + source_ref=<tenant>, and drop each valid lead into the funnel at journey_stage='intake'. The comms engine
// then treats them identically to our own leads — held at the consent gate until opt-in, and at the
// regulatory gate until the market is cleared. Reusable: called by POST /api/lead/ingest and this CLI.
//   node --experimental-sqlite data-core/ingest.mjs <batch.json>
import { open, marketCleared, logRun } from "./db.mjs";

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
