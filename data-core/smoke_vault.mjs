// VAULT SMOKE TEST — proves the medical-data architecture's claims mechanically, on a throwaway DB:
// encryption at rest, envelope-only facilitator scope, purpose-limited decrypt with logged refusals,
// direction discipline, GCM tamper detection, and Art.-17 erasure with a tombstone. Runs with no seed and
// no key configured (generates the sandbox key), so CI can run it cold.
//   node --experimental-sqlite data-core/smoke_vault.mjs
import { openVault, putRecord, getEnvelopes, relayRecord, eraseLead, accessLog, vaultBackend } from "../lib/vault.mjs";
import { unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEST_DB = join(HERE, "smoke_vault_test.db");
if (existsSync(TEST_DB)) unlinkSync(TEST_DB);

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); ok ? pass++ : fail++; };

console.log(`\n  VAULT SMOKE TEST — backend: ${vaultBackend().kind}\n`);
const v = openVault(TEST_DB);

// 1) put: clinical payload encrypted, envelope stored
const CLINICAL = { prescription: "amoxicillin 500mg TDS x5d", notes: "post-op day 2, wound clean" };
const put = putRecord(v, {
  leadRef: 901, marketCode: "OM", kind: "prescription", direction: "hospital_to_patient",
  payload: CLINICAL,
  envelope: { treatment_name: "Total knee replacement", protocol: "TKR standard pathway", timeline_start: "2026-08-15", timeline_end: "2026-08-27", cost_structure: "package $5,800 incl. 5-day stay", surgeon_name: "[VERIFY: surgeon name]", hospital_ref: "fortis-bangalore" },
});
check("put: record stored encrypted", put.recordId > 0 && put.encrypted === true);

// 2) at-rest check: the raw row must NOT contain the clinical text anywhere
const raw = v.prepare(`SELECT ciphertext FROM vault_record WHERE id=?`).get(put.recordId);
check("at rest: ciphertext does not contain the plaintext", !Buffer.from(raw.ciphertext).toString("latin1").includes("amoxicillin"));

// 3) envelope: the facilitator surface has treatment/timeline/cost/surgeon and NOTHING clinical
const env = getEnvelopes(v, 901);
const e = env.records[0];
check("envelope: facilitator fields present", e.treatment_name === "Total knee replacement" && !!e.cost_structure && !!e.surgeon_name);
check("envelope: no clinical content in any envelope field", !JSON.stringify(env).includes("amoxicillin"));

// 4) purpose limitation: an unnamed purpose is refused AND logged
const nosy = relayRecord(v, { recordId: put.recordId, purpose: "marketing_analysis" });
check("decrypt refused for a non-relay purpose", nosy.refused === true);

// 5) direction discipline: a hospital→patient record can't be 'forwarded to hospital'
const wrongDir = relayRecord(v, { recordId: put.recordId, purpose: "forward_to_hospital" });
check("direction mismatch refused", wrongDir.refused === true);

// 6) the legitimate relay decrypts cleanly
const relay = relayRecord(v, { recordId: put.recordId, purpose: "relay_to_patient", actor: "discharge-relay-agent" });
check("legitimate relay decrypts", relay.payload?.prescription === CLINICAL.prescription && !!relay.humanGate);

// 7) tamper detection: flip a ciphertext byte → GCM must refuse
const tampered = Buffer.from(raw.ciphertext); tampered[0] ^= 0xff;
v.prepare(`UPDATE vault_record SET ciphertext=? WHERE id=?`).run(tampered, put.recordId);
const broken = relayRecord(v, { recordId: put.recordId, purpose: "relay_to_patient" });
check("tampered record refuses to decrypt (GCM integrity)", !!broken.error && /integrity/i.test(broken.error));
v.prepare(`UPDATE vault_record SET ciphertext=? WHERE id=?`).run(raw.ciphertext, put.recordId);   // restore

// 8) erasure: content gone, tombstone kept
putRecord(v, { leadRef: 901, marketCode: "OM", kind: "medical_history", direction: "patient_to_hospital", payload: { history: "hypertension 5y" } });
const erased = eraseLead(v, 901, { reason: "smoke-test erasure" });
const left = v.prepare(`SELECT count(*) c FROM vault_record WHERE lead_ref=901`).get().c;
const tomb = accessLog(v, { limit: 5 }).some((l) => l.action === "erase" && l.lead_ref === 901);
check("erasure: all records deleted", erased.erased === 2 && left === 0);
check("erasure: tombstone in the access log", tomb);

// 9) audit completeness: every touch above (incl. both refusals) is in the log
const log = accessLog(v, { limit: 50 });
const actions = log.map((l) => l.action);
check("access log holds put/envelope_read/relay/refused/erase", ["put", "envelope_read", "relay", "refused", "erase"].every((a) => actions.includes(a)),
  `${log.length} entries`);

v.close();
unlinkSync(TEST_DB);
console.log(`\n  ${pass} passed, ${fail} failed.\n`);
process.exit(fail ? 1 : 0);
