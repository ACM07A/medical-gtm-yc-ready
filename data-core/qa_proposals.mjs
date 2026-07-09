// QA for PROPOSALS — the "significant demand" leak got past the fabrication guardrail because that guard
// only watched for MISSING numbers, not vague adjectives standing in for them. This pass runs over the
// drafted proposals (no LLM needed), auto-tags every unquantified magnitude claim with [VERIFY], and flags
// AI-filler for a human to cut. Idempotent (won't double-tag). Writes a run so a QA pass can't silently
// claim clean.
//   node --experimental-sqlite data-core/qa_proposals.mjs
import { open, logRun } from "./db.mjs";
import { lintClaims } from "../lib/claims.mjs";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const db = open();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "outputs", "proposals");
if (!existsSync(DIR)) { console.log("no proposals yet."); process.exit(0); }

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
let vagueT = 0, fillerFiles = 0;
for (const f of files) {
  const p = join(DIR, f);
  let text = readFileSync(p, "utf8");
  if (text.includes("[VERIFY: quantify")) { console.log(`  · ${f}: already linted`); continue; }   // idempotent
  const lint = lintClaims(text);
  if (lint.vague.length) {
    const note = `<!-- QA (qa_proposals): ${lint.vague.length} vague claim(s) auto-tagged [VERIFY]${lint.filler.length ? ` · filler to cut: ${lint.filler.slice(0, 6).join(", ")}` : ""} -->\n`;
    text = note + lint.text;
    writeFileSync(p, text);
    vagueT += lint.vague.length;
  }
  if (lint.filler.length) fillerFiles++;
  const flag = lint.vague.length || lint.filler.length;
  console.log(`  ${flag ? "⚑" : "✓"} ${f}: ${lint.vague.length} vague→[VERIFY], filler: ${lint.filler.slice(0, 5).join(", ") || "none"}`);
}
logRun(db, "QA", "Proposal QA pass", `${files.length} proposals · ${vagueT} vague claims tagged · ${fillerFiles} with filler to cut`, null, vagueT ? "pending" : "ok");
console.log(`\n${files.length} proposals checked · ${vagueT} vague claims [VERIFY]-tagged · ${fillerFiles} flagged for filler.`);
db.close();
