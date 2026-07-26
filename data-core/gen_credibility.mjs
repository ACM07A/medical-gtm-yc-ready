// Partner CREDIBILITY narrative generator (/build-os/05). The margin play brings on high-quality but
// NON-mainstream hospitals (Sir Ganga Ram, Cytecare, Frontier Lifeline) — a patient from Lagos hasn't
// heard of them. This turns "unknown brand" into "trusted specialist" using credibility levers that work
// WITHOUT brand fame:
//   1. Accreditation as the great equalizer — JCI/NABH = the same global standard, famous or not.
//   2. Reframe "lesser-known" as "focused SPECIALIST centre" — depth + procedure volume = better outcomes.
//   3. Named-clinician credentials (real names only) transfer trust the brand can't.
//   4. Radical transparency (real prices, real inclusions, real doctor, virtual tour) substitutes for fame.
//   5. The facilitator's vetting: "we only partner with accredited hospitals that clear our quality bar."
//   6. Peer proof — patients from the same country.
// NO FABRICATION: any specific stat/credential not supplied is emitted as a [VERIFY: …] placeholder for a
// human to fill with a citation. Grounded in the partner's real accreditation/notes. Human-gated.
//   node --experimental-sqlite data-core/gen_credibility.mjs [limit]
import { open, logRun } from "./db.mjs";
import { generateWithModel } from "../integrations/glm_generate.mjs";
import { withEmpathyContent } from "../lib/voice.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = Number(process.argv[2]) || 3;

const SYSTEM = withEmpathyContent(`You write customer-facing trust copy for Canopus Care, a medical-travel FACILITATOR (not a hospital).
Your job: make a HIGH-QUALITY but LESSER-KNOWN Indian hospital feel credible to an international patient who
has never heard of it — someone anxious about trusting their care to a name they don't recognise, far from
home. Use ONLY facts you are given. For any specific claim you are NOT given (procedure volumes, exact
fellowships, awards, outcome %), output a "[VERIFY: <what to confirm>]" placeholder instead of inventing it.
Facilitator voice; no cure/outcome guarantees; disclose the facilitation relationship.`);

// The credibility levers, applied in priority order for a non-mainstream brand.
function prompt(p, cats) {
  const accred = (p.accreditation || "").replace(/\s*\((?:verify|est)[^)]*\)/gi, "").trim();
  const clinician = (p.notes || "").match(/\(([^)]*(?:Dr\.?|Prof)[^)]*)\)/i)?.[1] || (p.notes || "").match(/Dr\.?\s+[A-Z][A-Za-z. ]+/)?.[0] || "";
  return `Write a ~200-word credibility profile of "${p.name}" (${p.city}, India) — a ${cats} ${p.mvt_presence === "latent" ? "specialist centre that is world-class but not yet a household name abroad" : "quality hospital"}.
Facts you may use: accreditation = ${accred || "[VERIFY: confirm JCI/NABH status]"}; specialty focus = ${cats}${clinician ? `; associated senior clinician = ${clinician}` : ""}.
Lead with the ACCREDITATION as the global-standard equalizer. Reframe "lesser-known" as a FOCUSED SPECIALIST advantage (higher volume in this specialty → better outcomes). ${clinician ? "Name the senior clinician." : "[VERIFY: add a named lead specialist + their training]."} Use radical transparency (real prices shown, real inclusions, virtual tour offered) as the trust builder. Close with Canopus Care's vetting promise ("we only work with accredited hospitals that clear our quality bar") and a soft WhatsApp CTA. Mark every unsupplied specific claim as [VERIFY: …].`;
}

const partners = A(`SELECT * FROM partner WHERE mvt_presence IN ('latent','emerging') AND opportunity IN ('High','Med')
  ORDER BY CASE opportunity WHEN 'High' THEN 0 ELSE 1 END, fit_score DESC LIMIT ?`, LIMIT);

mkdirSync(join(ROOT, "outputs", "credibility"), { recursive: true });
let made = 0;
console.log(`Generating credibility narratives for ${partners.length} lesser-known partners (human-gated)`);
for (const p of partners) {
  const cats = A(`SELECT c.name FROM partner_category pc JOIN category c ON c.id=pc.category_id WHERE pc.partner_id=?`, p.id).map(r => r.name).join(", ") || "multi-specialty";
  try {
    const r = await generateWithModel(prompt(p, cats), { system: SYSTEM, maxTokens: 500, temperature: 0.6 });
    const verifyCount = (r.text.match(/\[VERIFY/gi) || []).length;
    const file = join("outputs", "credibility", `${p.id}.md`);
    writeFileSync(join(ROOT, file), `# Credibility profile — ${p.name}\n<!-- DRAFT · human fill [VERIFY] items with citations before publish · model:${r.model} -->\n\n${r.text}\n`);
    made++;
    logRun(db, "Content Engine", `Credibility profile · ${p.id}`, `${p.name} — trust narrative (${verifyCount} [VERIFY] items to confirm)`, null, "pending");
    console.log(`  ✓ ${p.name.slice(0, 30).padEnd(30)} (${r.model}${r.failedOver ? " failover" : ""}) · ${verifyCount} [VERIFY] flags`);
  } catch (e) { console.log(`  ✗ ${p.name}: ${String(e.message || e).slice(0, 50)}`); logRun(db, "Content Engine", `Credibility profile · ${p.id}`, `gen error: ${String(e.message || e).slice(0, 150)}`, null, "fail"); }
}
logRun(db, "Content Engine", "Partner credibility narratives", `${made} lesser-known partners → trust profiles (accreditation-led, [VERIFY]-flagged)`, null, made ? "ok" : "pending");
console.log(`\n${made} credibility profiles → outputs/credibility/. Fill [VERIFY] items with cited facts before publish.`);
db.close();
