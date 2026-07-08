// QA Reviewer agent — machine-verifies each DRAFT before it can be published:
//  prices actually present (cited), facilitator disclaimer, WhatsApp CTA, no banned phrasing.
// English drafts that pass advance to status='review' (ready for HUMAN publish — still gated).
// Non-English pass structural checks but stay 'draft' pending native-speaker QA (/build-os/05).
//   node --experimental-sqlite data-core/qa_content.mjs
import { open, logRun } from "./db.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = open();

const BANNED = /\b(guaranteed|guarantee\s+(a\s+)?cure|100%\s*success|no\s+risk|miracle\s+cure)\b/i;
const drafts = db.prepare(`SELECT * FROM content_asset WHERE status='draft'`).all();
let reviewed = 0, flagged = 0, native = 0;

for (const a of drafts) {
  let text; try { text = readFileSync(join(ROOT, a.file_ref), "utf8"); } catch { continue; }
  const prices = db.prepare(`SELECT india_low, india_high FROM category_price WHERE category_id=?`).all(a.category_id);
  const priceHit = prices.some(p => text.includes(p.india_low.toLocaleString()) || text.includes(p.india_high.toLocaleString()));
  const issues = [];
  if (!priceHit) issues.push("injected prices missing");
  if (!/facilitator/i.test(text)) issues.push("no facilitator disclaimer");
  if (!/whatsapp/i.test(text)) issues.push("no WhatsApp CTA");
  if (BANNED.test(text)) issues.push("banned phrasing");

  if (a.language !== "en") {  // structural pass, but native QA is a human gate
    db.prepare(`UPDATE content_asset SET citations_ok=? WHERE id=?`).run(priceHit ? 1 : 0, a.id);
    logRun(db, "QA Reviewer", `QA ${a.category_id}×${a.market_code} (${a.language})`,
      issues.length ? "issues: " + issues.join("; ") : "structural ok · needs native QA", `/draft/${a.id}`, "pending");
    native++; continue;
  }
  if (issues.length === 0) {
    db.prepare(`UPDATE content_asset SET status='review', citations_ok=1 WHERE id=?`).run(a.id);
    logRun(db, "QA Reviewer", `QA passed ${a.category_id}×${a.market_code}`,
      "prices cited · disclaimer · CTA · clean → ready for human publish", `/draft/${a.id}`, "ok");
    reviewed++;
  } else {
    db.prepare(`UPDATE content_asset SET citations_ok=? WHERE id=?`).run(priceHit ? 1 : 0, a.id);
    logRun(db, "QA Reviewer", `QA flagged ${a.category_id}×${a.market_code}`, issues.join("; "), `/draft/${a.id}`, "fail");
    flagged++;
  }
}
logRun(db, "QA Reviewer", "QA pass complete", `${reviewed} →review, ${flagged} flagged, ${native} non-EN pending native QA`);
console.log(`QA: ${reviewed} → review (EN passed), ${flagged} flagged, ${native} non-English pending native QA`);
db.close();
