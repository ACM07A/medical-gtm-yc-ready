// RETROFIT E-E-A-T — bring already-written pages up to the trust bar organic acquisition requires.
//
// The existing library was drafted before the E-E-A-T gate existed and scores 19/100 against it: no visible
// authorship, no review date, no traceable sources, no statement of what a package price excludes. Those
// are not cosmetic gaps. Since the economics say organic IS the profitable acquisition path, an unranked
// page is a page with no funnel above it — and an undated price page actively misleads someone making a
// five-figure decision on a number that has since moved.
//
// This appends the trust block (idempotently) and rescores. It does NOT rewrite the body: `cited` and
// `limitations` inside the prose still need a regeneration pass, and the script reports what remains.
//
//   node --experimental-sqlite data-core/retrofit_eeat.mjs [--write]
import { open, logRun } from "./db.mjs";
import { eeatCheck, trustBlock } from "../lib/eeat.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");
const db = open();
const today = new Date().toISOString().slice(0, 10);

const rows = db.prepare(`SELECT * FROM content_asset WHERE file_ref IS NOT NULL ORDER BY language, category_id`).all();
let touched = 0, already = 0, missing = 0;
const before = [], after = [];

for (const a of rows) {
  const path = join(ROOT, a.file_ref);
  let text; try { text = readFileSync(path, "utf8"); } catch { missing++; continue; }

  const pre = eeatCheck(text);
  before.push(pre.score);

  // Idempotent: the block is keyed on its own heading, so re-running never stacks duplicates.
  let out = text;
  if (!/^### About this page$/m.test(text)) {
    out = text.trimEnd() + trustBlock({ reviewedAt: today });
    touched++;
  } else already++;

  const post = eeatCheck(out);
  after.push(post.score);

  if (WRITE) {
    if (out !== text) writeFileSync(path, out);
    db.prepare(`UPDATE content_asset SET eeat_score=?, reviewed_at=? WHERE id=?`).run(post.score, today, a.id);
  }
}

const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);
const passing = after.filter((s) => s >= 75).length;

console.log(`\n  E-E-A-T RETROFIT ${WRITE ? "" : "(dry run — pass --write to apply)"}`);
console.log(`  ${rows.length} pages · ${touched} would gain a trust block · ${already} already had one${missing ? ` · ${missing} file(s) missing` : ""}`);
console.log(`  average score  ${avg(before)}/100  →  ${avg(after)}/100`);
console.log(`  publishable    ${before.filter((s) => s >= 75).length}/${rows.length}  →  ${passing}/${rows.length}\n`);

// What the retrofit CANNOT fix — these live in the body copy and need regeneration or a human editor.
const stillMissing = {};
for (const a of rows) {
  let t; try { t = readFileSync(join(ROOT, a.file_ref), "utf8"); } catch { continue; }
  const check = eeatCheck(/^### About this page$/m.test(t) ? t : t + trustBlock({ reviewedAt: today }));
  for (const m of check.missing) stillMissing[m.signal] = (stillMissing[m.signal] || 0) + 1;
}
if (Object.keys(stillMissing).length) {
  console.log(`  STILL MISSING after retrofit — these need a regeneration pass, not a footer:`);
  for (const [k, v] of Object.entries(stillMissing)) console.log(`    ${k.padEnd(12)} ${v} page(s)`);
  console.log();
}

if (WRITE) logRun(db, "Content", "eeat-retrofit", `${touched} pages · avg ${avg(before)}→${avg(after)}`);
else console.log(`  Nothing written. Re-run with --write to apply.\n`);
