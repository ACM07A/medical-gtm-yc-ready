// MEDICAL DATA VAULT — the GDPR-backbone store for clinical information moving between patient and
// hospital (prescriptions, treatment methodologies, recommended tests, medical history, discharge notes).
//
// The architecture in one paragraph (user-directed, 2026-07-22): clinical data is encrypted at rest
// (AES-256-GCM, node:crypto, zero-dep), lives in its OWN database file — never mingled with the GTM
// data core — behind a pluggable backend: `local` (this machine, the sandbox default) today, a fully
// GDPR-compliant EU-hosted server tomorrow (VAULT_BACKEND=remote + VAULT_URL/VAULT_TOKEN, wired-but-off,
// the lib/plugins.mjs pattern; hosting access to be provided for the live product). Canopus Care's own reading
// of it is LIMITED BY CONSTRUCTION to the facilitator envelope — treatment name/protocol, treatment
// timelines, cost structure, surgeon details — which is stored as separate plaintext metadata. The clinical
// payload itself can only be decrypted for a NAMED relay purpose (getting the hospital's words to the
// patient, the patient's reports to the hospital, or the patient their own copy), and every decrypt —
// allowed or refused — is written to an append-only access log. This is data minimization, purpose
// limitation, and auditability as code, not policy.
//
// GDPR mapping, concretely:
//   Art. 5(1)(c) minimization  → envelope-only read surface for the facilitator
//   Art. 5(1)(b) purpose limit → decrypt requires a purpose from RELAY_PURPOSES; anything else is refused
//   Art. 30 records            → vault_access_log (append-only, includes refusals)
//   Art. 17 erasure            → eraseLead() deletes ciphertext + envelopes, leaves an erasure tombstone
//   Art. 32 security           → AES-256-GCM at rest; GCM auth tag = tamper detection on every decrypt
//   Ch. V transfers            → residencyCheck() consults the per-market health_data_law register
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const VAULT_DB_PATH = join(HERE, "..", "data-core", "vault.db");
const KEY_FILE = join(HERE, "..", "data-core", ".vault_key");

// ── backend ──────────────────────────────────────────────────────────────────────────────────────
// local  = sandbox: this machine, encrypted SQLite (the default until live hosting is provided)
// remote = a GDPR-compliant EU-hosted server — wired-but-off until VAULT_URL/VAULT_TOKEN are set
export function vaultBackend() {
  const remote = process.env.VAULT_BACKEND === "remote";
  if (remote && process.env.VAULT_URL && process.env.VAULT_TOKEN)
    return { kind: "remote", live: true, where: process.env.VAULT_URL };
  return { kind: "local", live: false, where: VAULT_DB_PATH,
    note: remote ? "VAULT_BACKEND=remote but VAULT_URL/VAULT_TOKEN missing — falling back to local sandbox"
                 : "sandbox — local encrypted store; swap to the GDPR host with VAULT_BACKEND=remote + VAULT_URL + VAULT_TOKEN" };
}

// ── key management ───────────────────────────────────────────────────────────────────────────────
// Live: VAULT_KEY (64 hex chars) from the host's secret store. Sandbox: generated once into a
// gitignored file so local data survives restarts — clearly not a production key-management story,
// and labelled as such everywhere it surfaces.
function loadKey() {
  const env = process.env.VAULT_KEY;
  if (env && /^[0-9a-f]{64}$/i.test(env)) return { key: Buffer.from(env, "hex"), source: "env (VAULT_KEY)" };
  if (existsSync(KEY_FILE)) return { key: Buffer.from(readFileSync(KEY_FILE, "utf8").trim(), "hex"), source: "sandbox key file (gitignored)" };
  const fresh = randomBytes(32);
  writeFileSync(KEY_FILE, fresh.toString("hex"));
  return { key: fresh, source: "sandbox key file (generated now, gitignored)" };
}

// ── store ────────────────────────────────────────────────────────────────────────────────────────
// Clinical kinds we accept — the data the user named, plus reports moving toward the hospital.
export const RECORD_KINDS = ["prescription", "treatment_methodology", "recommended_tests", "medical_history", "discharge_note", "patient_report"];
// The ONLY purposes a decrypt can ever happen for. Everything else is refused and logged.
export const RELAY_PURPOSES = {
  relay_to_patient: "forward the hospital's own clinical words to the patient (human-gated send)",
  forward_to_hospital: "forward the patient's reports/history to the treating hospital",
  patient_own_copy: "give the patient a copy of their own record (GDPR data portability)",
};

export function openVault(path = VAULT_DB_PATH) {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_record (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_ref INTEGER NOT NULL,             -- lead id in the GTM core (a reference, not a join — separate DBs on purpose)
      market_code TEXT,                      -- source market (drives the residency rule)
      kind TEXT NOT NULL,                    -- one of RECORD_KINDS
      direction TEXT NOT NULL,               -- patient_to_hospital | hospital_to_patient
      iv BLOB NOT NULL, tag BLOB NOT NULL, ciphertext BLOB NOT NULL,   -- AES-256-GCM triple
      created TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS vault_envelope (
      record_id INTEGER PRIMARY KEY REFERENCES vault_record(id),
      -- THE FACILITATOR READ-SCOPE, in full. Nothing else about a record is ever plaintext:
      treatment_name TEXT, protocol TEXT,    -- what treatment / which protocol name
      timeline_start TEXT, timeline_end TEXT,-- treatment timelines
      cost_structure TEXT,                   -- cost lines (non-clinical)
      surgeon_name TEXT, hospital_ref TEXT); -- surgeon + which partner hospital
    CREATE TABLE IF NOT EXISTS vault_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT DEFAULT (datetime('now')),
      record_id INTEGER, lead_ref INTEGER,
      actor TEXT, action TEXT,               -- put | envelope_read | relay | refused | erase
      purpose TEXT, note TEXT);
  `);
  return db;
}

function log(v, { recordId = null, leadRef = null, actor = "system", action, purpose = null, note = "" }) {
  v.prepare(`INSERT INTO vault_access_log (record_id, lead_ref, actor, action, purpose, note) VALUES (?,?,?,?,?,?)`)
    .run(recordId, leadRef, actor, action, purpose, note);
}

// ── residency check (Ch. V) ──────────────────────────────────────────────────────────────────────
// Consults the per-market health_data_law register in the GTM core (seed_health_data_laws.mjs). The
// sandbox backend is LOCAL storage — no cross-border hosting transfer happens at rest — so hard rules
// surface as warnings here and become BLOCKING at the live-backend swap (that's when data would move).
export function residencyCheck(coreDb, marketCode, backend = vaultBackend()) {
  // FIRST: the founder skip-list. A market marked regulatory_status='blocked' (seed.mjs RESIDENCY_SKIP) is a
  // deliberate decision NOT to serve it until the infrastructure exists — so a clinical write is a HARD refuse
  // regardless of backend or sandbox, not a warning. Skipping the market means skipping its data, full stop.
  let mkt = null;
  try { mkt = coreDb?.prepare(`SELECT regulatory_status s, regulatory_note n FROM market WHERE code=?`).get(marketCode) || null; } catch {}
  if (mkt?.s === "blocked") return { rule: "blocked", ok: false, blocked: true, warnings: [mkt.n || `${marketCode} is on the data-residency skip list — not served at this juncture`] };

  let law = null;
  try { law = coreDb?.prepare(`SELECT * FROM health_data_law WHERE market_code=?`).get(marketCode) || null; } catch {}
  if (!law) return { rule: "unknown", ok: true, warning: `no health-data-law entry for '${marketCode}' — add it to the register before going live with this market` };
  const w = [];
  if (law.transfer_rule === "in_country_only")
    w.push(`${law.law_name}: health data must stay in-country — the live vault for ${marketCode} patients must be hosted IN ${marketCode}, an EU host is NOT sufficient`);
  if (law.transfer_rule === "localization_copy")
    w.push(`${law.law_name}: a local copy must be kept in-country (localization) — plan an in-country replica before going live in ${marketCode}`);
  if (law.transfer_rule === "adequacy_or_sccs")
    w.push(`${law.law_name}: transfer needs an adequacy basis or SCCs + assessment — counsel sign-off before live`);
  if (law.status !== "verified") w.push(`register entry is '${law.status}' — counsel has not verified it yet`);
  const blockingLive = law.transfer_rule === "in_country_only" && backend.kind !== "in_country";
  return { rule: law.transfer_rule, law: law.law_name, ok: !(blockingLive && backend.live), warnings: w };
}

// ── write ────────────────────────────────────────────────────────────────────────────────────────
// Store a clinical payload (encrypted) + its facilitator envelope (the only plaintext). `coreDb` is the
// GTM data core handle, used ONLY to read the law register for the residency check.
export function putRecord(v, { leadRef, marketCode, kind, direction, payload, envelope = {}, actor = "system", coreDb = null }) {
  if (!RECORD_KINDS.includes(kind)) return { error: `kind must be one of: ${RECORD_KINDS.join(" | ")}` };
  if (!["patient_to_hospital", "hospital_to_patient"].includes(direction)) return { error: "direction must be patient_to_hospital | hospital_to_patient" };
  if (!payload || !leadRef) return { error: "leadRef and payload are required" };
  const backend = vaultBackend();
  const res = residencyCheck(coreDb, marketCode, backend);
  if (!res.ok) { log(v, { leadRef, actor, action: "refused", note: `put blocked by residency: ${res.warnings?.join("; ")}` }); return { refused: true, reason: res.warnings?.join("; ") }; }

  const { key } = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(payload), "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();

  const r = v.prepare(`INSERT INTO vault_record (lead_ref, market_code, kind, direction, iv, tag, ciphertext) VALUES (?,?,?,?,?,?,?)`)
    .run(leadRef, marketCode || null, kind, direction, iv, tag, ciphertext);
  const recordId = Number(r.lastInsertRowid);
  v.prepare(`INSERT INTO vault_envelope (record_id, treatment_name, protocol, timeline_start, timeline_end, cost_structure, surgeon_name, hospital_ref)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(recordId, envelope.treatment_name || null, envelope.protocol || null, envelope.timeline_start || null,
         envelope.timeline_end || null, envelope.cost_structure || null, envelope.surgeon_name || null, envelope.hospital_ref || null);
  log(v, { recordId, leadRef, actor, action: "put", note: `${kind} (${direction}) encrypted; envelope stored` });
  return { recordId, kind, encrypted: true, backend: backend.kind, residency: res.warnings?.length ? { rule: res.rule, warnings: res.warnings } : { rule: res.rule } };
}

// ── the facilitator's read surface — ENVELOPE ONLY, never touches ciphertext ─────────────────────
export function getEnvelopes(v, leadRef, { actor = "system" } = {}) {
  const rows = v.prepare(`SELECT e.*, r.kind, r.direction, r.created FROM vault_envelope e
    JOIN vault_record r ON r.id = e.record_id WHERE r.lead_ref=? ORDER BY r.id`).all(leadRef);
  log(v, { leadRef, actor, action: "envelope_read", note: `${rows.length} envelope(s) — facilitator scope only` });
  return { leadRef, scope: "treatment name/protocol · timelines · cost structure · surgeon details — the full facilitator read surface", records: rows };
}

// ── the ONLY decrypt path — named purpose, always logged, refusals logged too ────────────────────
export function relayRecord(v, { recordId, purpose, actor = "system" }) {
  const rec = v.prepare(`SELECT * FROM vault_record WHERE id=?`).get(recordId);
  if (!rec) return { error: `no record ${recordId}` };
  if (!RELAY_PURPOSES[purpose]) {
    log(v, { recordId, leadRef: rec.lead_ref, actor, action: "refused", purpose: String(purpose), note: "decrypt refused — purpose not in RELAY_PURPOSES" });
    return { refused: true, reason: `'${purpose}' is not a permitted purpose. Clinical payloads decrypt only for: ${Object.keys(RELAY_PURPOSES).join(" | ")}. Canopus Care's own read surface is the envelope.` };
  }
  // Direction discipline: hospital→patient content relays to the patient; patient→hospital content forwards
  // to the hospital. The patient can always have their own copy (portability).
  const dirOk = purpose === "patient_own_copy"
    || (purpose === "relay_to_patient" && rec.direction === "hospital_to_patient")
    || (purpose === "forward_to_hospital" && rec.direction === "patient_to_hospital");
  if (!dirOk) {
    log(v, { recordId, leadRef: rec.lead_ref, actor, action: "refused", purpose, note: `direction mismatch: ${rec.direction} record` });
    return { refused: true, reason: `a ${rec.direction} record cannot be released under '${purpose}' — direction mismatch` };
  }
  const { key } = loadKey();
  let payload;
  try {
    const d = createDecipheriv("aes-256-gcm", key, rec.iv);
    d.setAuthTag(rec.tag);
    payload = JSON.parse(Buffer.concat([d.update(rec.ciphertext), d.final()]).toString("utf8"));
  } catch {
    log(v, { recordId, leadRef: rec.lead_ref, actor, action: "refused", purpose, note: "INTEGRITY FAILURE — GCM tag mismatch (tamper or wrong key)" });
    return { error: "integrity check failed — the record does not decrypt cleanly (tampering or key mismatch). Not released." };
  }
  log(v, { recordId, leadRef: rec.lead_ref, actor, action: "relay", purpose, note: RELAY_PURPOSES[purpose] });
  return { recordId, kind: rec.kind, direction: rec.direction, purpose, payload,
    humanGate: "release to the recipient is human-gated — this decrypt is for the approved relay only, same posture as every outbound path" };
}

// ── erasure (Art. 17) — delete ciphertext + envelope, leave a tombstone in the log ───────────────
export function eraseLead(v, leadRef, { actor = "system", reason = "erasure request" } = {}) {
  const ids = v.prepare(`SELECT id FROM vault_record WHERE lead_ref=?`).all(leadRef).map((r) => r.id);
  for (const id of ids) v.prepare(`DELETE FROM vault_envelope WHERE record_id=?`).run(id);
  v.prepare(`DELETE FROM vault_record WHERE lead_ref=?`).run(leadRef);
  log(v, { leadRef, actor, action: "erase", note: `${ids.length} record(s) erased — ${reason}` });
  return { leadRef, erased: ids.length, tombstone: "erasure recorded in the access log (proof of deletion retained, content gone)" };
}

export function accessLog(v, { limit = 50 } = {}) {
  return v.prepare(`SELECT * FROM vault_access_log ORDER BY id DESC LIMIT ?`).all(limit);
}
