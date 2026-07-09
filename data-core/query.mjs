// Read/report CLI over the data core. Run: node --experimental-sqlite data-core/query.mjs <cmd>
// Commands: portfolio | partners [category] | pipeline | content | gaps | leads
//           lead-add <market> <category> <channel> <urgency> <budget>   (demo CRM insert, consent assumed)
import { open } from "./db.mjs";
const db = open();
const [cmd, ...args] = process.argv.slice(2);
const rows = (sql, ...p) => db.prepare(sql).all(...p);
const money = (lo, hi) => `$${(lo/1000).toLocaleString()}k–${(hi/1000).toLocaleString()}k`;

function portfolio() {
  console.log("\n== TREATMENT PORTFOLIO (model-ranked by weighted score) ==");
  for (const c of rows(`SELECT * FROM category WHERE status='launch' ORDER BY rank`)) {
    const pr = rows(`SELECT * FROM category_price WHERE category_id=? ORDER BY india_low`, c.id);
    const mk = rows(`SELECT market_code FROM category_market WHERE category_id=?`, c.id).map(r=>r.market_code).join(",");
    const lead = pr[0] ? `${pr[0].procedure} ${money(pr[0].india_low,pr[0].india_high)}` : "";
    console.log(`  #${c.rank} ${c.name.padEnd(22)} score ${c.score} ${c.flagship?"⚑ flagship":"          "}  [cost${c.cost_arb} qual${c.quality} ease${c.ease} dem${c.demand} mgn${c.margin} ws${c.whitespace}]`);
    console.log(`      ${lead}   markets: ${mk}`);
  }
}
function partners(cat) {
  const where = cat ? `WHERE pc.category_id=?` : ``;
  const sql = `SELECT DISTINCT p.* FROM partner p ${cat?`JOIN partner_category pc ON pc.partner_id=p.id ${where}`:``} ORDER BY p.priority DESC, p.fit DESC, p.name`;
  console.log(`\n== PARTNERS${cat?` · ${cat}`:``} ==`);
  for (const p of (cat?rows(sql,cat):rows(sql))) {
    const star = p.priority ? "★" : " ";
    console.log(`  ${star} ${p.name.padEnd(36)} ${(p.accreditation||"").padEnd(18)} q:${p.fit.padEnd(4)} pres:${(p.mvt_presence||"").padEnd(12)} opp:${p.opportunity} [${p.stage}]`);
    console.log(`      IPS: ${p.ips_channel_public}`);
  }
}
function candidates() {
  console.log("\n== WIDER SOURCING · latent/emerging high-quality brands (the MARGIN play) ==");
  console.log("   (quality clears the bar, MVT presence low => better terms, less competition)\n");
  const cs = rows(`SELECT * FROM partner WHERE mvt_presence IN ('latent','emerging') AND opportunity IN ('High','Med')
                   ORDER BY CASE opportunity WHEN 'High' THEN 0 ELSE 1 END, mvt_presence, name`);
  for (const p of cs) {
    const cats = rows(`SELECT category_id FROM partner_category WHERE partner_id=?`, p.id).map(r=>r.category_id).join(",");
    console.log(`  ${p.opportunity==="High"?"★":" "} ${p.name.padEnd(34)} ${p.city.padEnd(16)} ${(p.accreditation||"").padEnd(18)} opp:${p.opportunity.padEnd(4)} pres:${p.mvt_presence}`);
    console.log(`      cats:${cats}  — ${p.notes||""}`);
  }
  console.log(`\n  ${cs.length} candidates. Note 'est — verify' rows: confirm accreditation + MVT presence before outreach.`);
}
function units() {
  console.log("\n== UNIT-LEVEL PARTNERS (desk head at the hospital, not just the chain) ==");
  for (const p of rows(`SELECT * FROM partner WHERE type='unit' ORDER BY priority DESC, name`)) {
    const poc = rows(`SELECT title_target FROM poc WHERE partner_id=?`, p.id)[0];
    console.log(`  ${p.priority?"★":" "} ${p.name.padEnd(38)} parent:${p.parent_id}`);
    console.log(`      channel: ${p.ips_channel_public}`);
    console.log(`      target: ${poc?.title_target||""}`);
  }
}
function pipeline() {
  console.log("\n== SUPPLY PIPELINE ==");
  for (const r of rows(`SELECT stage, count(*) n FROM partner GROUP BY stage ORDER BY n DESC`)) console.log(`  ${r.stage.padEnd(16)} ${r.n}`);
  console.log("  proposals:");
  for (const r of rows(`SELECT status, count(*) n FROM proposal GROUP BY status`)) console.log(`    ${r.status.padEnd(12)} ${r.n}`);
  const poc = rows(`SELECT count(*) c, sum(resolved) r FROM poc`)[0];
  console.log(`  POCs: ${poc.c} targets, ${poc.r||0} named/resolved`);
}
function content() {
  console.log("\n== CONTENT ASSETS ==");
  for (const r of rows(`SELECT ca.*, c.name cat FROM content_asset ca JOIN category c ON c.id=ca.category_id ORDER BY status`))
    console.log(`  [${r.status}] ${r.cat} × ${r.market_code} (${r.language})  cites:${r.citations_ok?"✓":"✗"} cta:${r.cta_wired?"✓":"✗"}  ${r.title}`);
}
function gaps() {
  // required cells = launch-category × its fit-markets; gap = no content_asset yet
  console.log("\n== CONTENT GRID GAPS (Content Engine worklist) ==");
  const cells = rows(`
    SELECT cm.category_id, cm.market_code, m.name mname, m.tier, m.languages
    FROM category_market cm JOIN category c ON c.id=cm.category_id JOIN market m ON m.code=cm.market_code
    WHERE c.status='launch'
      AND NOT EXISTS (SELECT 1 FROM content_asset ca WHERE ca.category_id=cm.category_id AND ca.market_code=cm.market_code)
    ORDER BY m.tier, cm.category_id`);
  console.log(`  ${cells.length} uncovered cells (of ${rows(`SELECT count(*) c FROM category_market cm JOIN category c ON c.id=cm.category_id WHERE c.status='launch'`)[0].c} total):`);
  for (const g of cells) {
    const lang = JSON.parse(g.languages)[0];
    console.log(`  · ${g.category_id.padEnd(10)} × ${g.market_code} ${g.mname.padEnd(22)} tier ${g.tier}  → draft in ${lang}${lang==="ar"?" (RTL)":""}`);
  }
}
function leads() {
  console.log("\n== LEADS ==");
  const r = rows(`SELECT status, count(*) n FROM lead GROUP BY status`);
  if (!r.length) return console.log("  (none yet)");
  for (const x of r) console.log(`  ${x.status.padEnd(10)} ${x.n}`);
}
// Regulatory clearance per market — can we legally solicit patients there yet? (default 'unverified' = no).
function regulatory() {
  console.log("\n== REGULATORY CLEARANCE (may we market/solicit patients?) ==");
  for (const m of rows(`SELECT code,name,tier,COALESCE(regulatory_status,'unverified') s, regulatory_note n FROM market ORDER BY s, tier, name`)) {
    const mark = m.s === "verified" ? "✅" : m.s === "blocked" ? "⛔" : "⚠ ";
    console.log(`  ${mark} ${m.s.padEnd(11)} ${m.code}  ${m.name} (tier ${m.tier})${m.n ? " — " + m.n : ""}`);
  }
  const n = rows(`SELECT count(*) c FROM market WHERE COALESCE(regulatory_status,'unverified')<>'verified'`)[0].c;
  console.log(`\n  ${n} market(s) NOT cleared — content builds as preview-only, not deployed. Clear via set_regulatory.mjs (needs counsel sign-off).`);
}
// Ground-truth check: does a higher fit_score actually correlate with better outcomes? This is how the
// weights (0.45 quality + 0.40 whitespace + 0.15 proof) get VALIDATED instead of just asserted.
function calibration() {
  console.log("\n== FIT-vs-OUTCOME CALIBRATION (is the model right?) ==");
  const POS = ["replied", "meeting", "pilot", "signed"];
  const logged = rows(`SELECT count(*) c FROM partner WHERE outcome IS NOT NULL AND outcome<>'none'`)[0].c;
  const buckets = [["High (85+)", 85, 999], ["Med (68-84)", 68, 84], ["Low (<68)", 0, 67]];
  for (const [label, lo, hi] of buckets) {
    const ps = rows(`SELECT outcome FROM partner WHERE fit_score BETWEEN ? AND ?`, lo, hi);
    const withOutcome = ps.filter((p) => p.outcome && p.outcome !== "none");
    const pos = withOutcome.filter((p) => POS.includes(p.outcome)).length;
    const rate = withOutcome.length ? Math.round((pos / withOutcome.length) * 100) + "%" : "—";
    console.log(`  ${label.padEnd(14)} ${String(ps.length).padStart(2)} accounts · ${withOutcome.length} with outcome · positive rate ${rate}`);
  }
  console.log(`\n  ${logged} outcomes logged. Need ≥20 across buckets before re-weighting; until then fit_score is a PRIOR, not validated.`);
  console.log(`  Log outcomes: node --experimental-sqlite data-core/log_outcome.mjs <partner_id> <contacted|replied|meeting|pilot|signed|lost>`);
}
function leadAdd([mkt,cat,ch,urg,bud]) {
  if (!mkt||!cat) return console.log("usage: lead-add <market> <category> <channel> <urgency> <budget>");
  db.prepare(`INSERT INTO lead (market_code,category_id,channel,ref,urgency,budget_band,docs_ready,consent,status)
    VALUES (?,?,?,?,?,?,0,1,'qualified')`).run(mkt,cat,ch||"whatsapp","lead-"+Date.now(),urg||"planning",bud||"unknown");
  console.log(`  + qualified lead: ${cat} from ${mkt} via ${ch||"whatsapp"} (PII-minimized ref stored)`);
}

({ portfolio, partners:()=>partners(args[0]), candidates, units, pipeline, content, gaps, leads, calibration, regulatory,
   "lead-add":()=>leadAdd(args) }[cmd] || (()=>{
   console.log("cmds: portfolio | partners [cat] | candidates | units | pipeline | content | gaps | leads | calibration | regulatory | lead-add ...");
}))();
db.close();
