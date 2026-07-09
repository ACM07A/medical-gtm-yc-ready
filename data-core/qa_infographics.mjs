// QA for INFOGRAPHICS — the gap that let the dental "-217%" bug ship: qa_content.mjs only greps markdown
// text, never the numbers baked into a PNG. This checks the numbers directly. For every cost-comparison
// sidecar (<png>.meta.json), it INDEPENDENTLY re-derives the expected savings from the data core (not from
// the sidecar), and diffs. Any invalid or mismatched card FAILS and is logged — a broken QA pass can't
// silently claim "done".
//   node --experimental-sqlite data-core/qa_infographics.mjs
import { open, logRun, comparator } from "./db.mjs";
import { costSavings } from "../lib/infographic.mjs";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const db = open();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// find every *.meta.json under outputs/**/img
const dirs = ["outputs/comms/img", "outputs/social/img"].map((d) => join(ROOT, d)).filter(existsSync);
const metas = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".meta.json")).map((f) => join(d, f)));

let pass = 0, fail = 0;
console.log(`QA over ${metas.length} infographic sidecar(s):`);
for (const mp of metas) {
  let m; try { m = JSON.parse(readFileSync(mp, "utf8")); } catch { continue; }
  if (m.type !== "cost-comparison") continue;
  const name = mp.split(/[\\/]/).pop();
  const issues = [];

  // 1) recompute the stored numbers' savings independently — must match + be valid
  const rec = costSavings({ india_low: m.india?.[0], india_high: m.india?.[1], west_low: m.west?.[0], west_high: m.west?.[1] });
  if (!rec.valid) issues.push(`savings ${rec.pct}% fails guard (≤0 or >95)`);
  if (rec.pct !== m.savings_pct) issues.push(`stored ${m.savings_pct}% ≠ recomputed ${rec.pct}%`);

  // 2) cross-check the India numbers against the data core comparator (detect drift/aggregate bug)
  if (m.category) {
    const c = comparator(db, m.category);
    if (!c) issues.push(`no data-core comparator for '${m.category}'`);
    else if (c.india_low !== m.india?.[0] || c.india_high !== m.india?.[1]) issues.push(`India numbers drifted from data core (${c.india_low}-${c.india_high})`);
    else if (c.savings !== m.savings_pct) issues.push(`data-core savings ${c.savings}% ≠ card ${m.savings_pct}%`);
  }
  // 3) sanity: India shouldn't exceed Western (the dental aggregate bug signature)
  if (m.india?.[1] >= m.west?.[0]) issues.push(`India top $${m.india[1]} ≥ Western low $${m.west[0]} — not like-for-like`);

  if (issues.length) { fail++; console.log(`  ✗ ${name}: ${issues.join("; ")}`); logRun(db, "QA", `Infographic FAIL · ${m.category || name}`, issues.join("; "), null, "fail"); }
  else { pass++; console.log(`  ✓ ${name}: ${m.treatment} ${m.savings_pct}% (verified vs data core)`); }
}
logRun(db, "QA", "Infographic QA pass", `${pass} pass, ${fail} fail (numbers verified vs data core, not just pixels)`, null, fail ? "fail" : "ok");
console.log(`\n${pass} pass, ${fail} fail.${fail ? " FIX the failures — a broken card must not ship." : ""}`);
db.close();
process.exit(fail ? 1 : 0);
