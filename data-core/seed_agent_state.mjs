// SEED AGENT STATE — gives the stateful agents (family channel, document KYC, billing reconciliation) real
// rows to work against, so opening /agents and running them against a real lead ID produces something
// immediately, instead of an empty state nobody wants to hand-populate before a demo.
//   node --experimental-sqlite data-core/seed_agent_state.mjs
import { open, logRun } from "./db.mjs";
import { initChecklist, submitDocument } from "../lib/agents/document_kyc.mjs";
import { addFamilyContact, recordOptIn } from "../lib/agents/family_channel.mjs";
import { recordEstimate } from "../lib/agents/billing_reconciliation.mjs";

const db = open();
const leads = db.prepare(`SELECT id, market_code, category_id FROM lead ORDER BY id LIMIT 3`).all();
if (!leads.length) { console.log("No leads found — run `npm run seed-leads` first."); process.exit(0); }

const [visaLead, familyLead, billingLead] = [leads[0], leads[1] || leads[0], leads[2] || leads[0]];

// 1) A document KYC in progress — one item auto-verified, one auto-rejected (bad expiry), rest still open.
initChecklist(db, visaLead.id, { countryCode: visaLead.market_code, attendants: 1, category: visaLead.category_id });
const future = new Date(); future.setFullYear(future.getFullYear() + 2);
submitDocument(db, visaLead.id, "passport_valid_6_months_with_2_blank_pages", future.toISOString().slice(0, 10));
submitDocument(db, visaLead.id, "proof_of_residence_address", "utility bill on file", { note: "submitted, awaiting human check" });

// 2) A family contact, already opted in — so a demo run shows the real update path, not just the opt-in template.
const fc = addFamilyContact(db, familyLead.id, { name: "Amina", phone: "+968XXXXXXXX", relationship: "spouse", language: "en" });
if (fc.id) recordOptIn(db, fc.id, true);

// 3) A quote + a discharge-time actual with a deliberate ~20% overage, so reconciliation has something real to explain.
recordEstimate(db, billingLead.id, "quote", [
  { label: "Procedure", amount: 5500 }, { label: "Hospital stay (5 nights)", amount: 800 }, { label: "Coordination fee", amount: 300 },
]);
recordEstimate(db, billingLead.id, "actual", [
  { label: "Procedure", amount: 5500 }, { label: "Hospital stay (5 nights)", amount: 1400 },
  { label: "Coordination fee", amount: 300 }, { label: "Unplanned ICU night", amount: 900 },
]);

logRun(db, "Agents", "seed-agent-state", `KYC on lead ${visaLead.id} · family contact on lead ${familyLead.id} · estimate on lead ${billingLead.id}`);
console.log(`\n✓ Agent demo state seeded:`);
console.log(`   document KYC     → lead ${visaLead.id} (${visaLead.market_code}) — 2 of ~9 items actioned`);
console.log(`   family contact   → lead ${familyLead.id} — Amina, consented, ready for a real update`);
console.log(`   billing estimate → lead ${billingLead.id} — quote $6,600 vs actual $8,100 (+23%)`);
console.log(`\n  Try them at /agents using these lead IDs.\n`);
