// Named decision-maker DISCOVERY.
//
// LEGAL POSTURE (read this): the COMPLIANT path is a licensed data provider (enrichment API — Hunter /
// Apollo / Proxycurl). It is used FIRST whenever a key is present. The browser fallback uses stealth to
// get past search-engine/LinkedIn bot detection — and **circumventing anti-bot measures can violate those
// services' Terms of Service even though the underlying name+role is public.** That is a real risk, not a
// "ToS-clean" activity. So the browser fallback is OFF by default and requires explicit opt-in
// (ALLOW_SCRAPE=1) acknowledging the risk. It runs at low volume, and a CAPTCHA circuit-breaker stops it
// the moment the IP looks flagged, falling back to the human research worklist. See /build-os/10.
//
//   node --experimental-sqlite data-core/discover_pocs.mjs [limit]           # enrichment path (needs a key)
//   ALLOW_SCRAPE=1 STEALTH=1 node ... discover_pocs.mjs                       # opt in to the browser fallback
//   FORCE=1 node ... discover_pocs.mjs                                       # ignore idempotency, re-attempt all
import { open, logRun, isFresh } from "./db.mjs";
import { session, stealthSession } from "../lib/browser.mjs";
import { available as enrichAvailable, enrichDomain } from "../lib/enrich.mjs";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);
const O = (s, ...p) => db.prepare(s).get(...p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIMIT = Number(process.argv[2]) || 6;
const STEALTH = process.env.STEALTH === "1";
const ALLOW_SCRAPE = process.env.ALLOW_SCRAPE === "1";
const FORCE = process.env.FORCE === "1";
const runner = STEALTH ? stealthSession : session;
const CAPTCHA_BREAK = 3;          // stop scraping after this many consecutive CAPTCHAs (IP likely flagged)
const MIN_DELAY = 1800;           // rate limit: min ms between accounts

const ROLE_HINT = "(international patient OR \"medical value travel\" OR international business OR international marketing)";
const BAD = /^(dr|prof)\b|(hospital|apollo|fortis|medanta|health|care|cancer|heart|centre|center|institute|limited|pvt|india|linkedin|profile|associate|senior|director|manager|head|officer|president|global|market|operations|general|assistant|executive|lead|chief|vice)/i;
const QUERIES = (name) => [
  `site:linkedin.com/in "${name}" ${ROLE_HINT}`,
  `"${name}" "international patient services" (head OR manager OR director) linkedin`,
  `"${name}" "medical value travel" (head OR GM OR manager) linkedin`,
  `"${name}" international business hospital linkedin`,
];
const ENGINES = ["https://www.google.com/search?q=", "https://www.bing.com/search?q="];
const cleanRole = (s) => s.replace(/\b\d+\s*comments?\b/gi, "").replace(/read more.*/i, "")
  .replace(/\blinkedin\b.*/i, "").replace(/\b(19|20)\d\d\b.*/, "").replace(/[·|].*/, "").replace(/\s+/g, " ").trim();
const looksLikeName = (n) => /^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2}$/.test(n) && !BAD.test(n) && n.split(/\s+/).length <= 3;
function extract(text) {
  const flat = text.replace(/\s+/g, " ");
  const out = [];
  const rx = /([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2})\s*[-–|]\s*([^-–|]{5,70}?(?:International Patient|Medical Value|International Business|International Marketing|IPD)[^-–|]{0,40})/g;
  for (const m of flat.matchAll(rx)) {
    const name = m[1].trim(), role = cleanRole(m[2].trim());
    if (!looksLikeName(name) || role.length < 4) continue;
    out.push({ name, role });
  }
  const url = (flat.match(/https?:\/\/[a-z]{2,3}\.linkedin\.com\/in\/[A-Za-z0-9\-%]+/) || [])[0] || null;
  const seen = new Set();
  return out.filter((c) => !seen.has(c.name) && seen.add(c.name)).map((c) => ({ ...c, url })).slice(0, 2);
}
const hasNamedPoc = (id) => O(`SELECT count(*) c FROM poc WHERE partner_id=? AND person_name IS NOT NULL AND person_name<>''`, id).c > 0;
const stampAttempt = (id) => db.prepare(`UPDATE partner SET last_discovery_at=datetime('now') WHERE id=?`).run(id);

// IDEMPOTENCY: only work accounts that don't already have a named POC and weren't attempted recently.
const all = A(`SELECT * FROM partner WHERE (opportunity='High' OR mvt_presence IN ('latent','emerging')) ORDER BY fit_score DESC`);
const targets = all.filter((p) => FORCE || (!hasNamedPoc(p.id) && !isFresh(p.last_discovery_at, 7))).slice(0, LIMIT);
const skipped = all.length - targets.length;

if (!targets.length) { console.log(`Nothing to discover — all star accounts have a named POC or were attempted <7d ago (use FORCE=1 to override).`); db.close(); process.exit(0); }

// Choose the path. Enrichment (licensed) is primary. Browser scraping is opt-in + risk-acknowledged.
const useEnrich = enrichAvailable();
if (!useEnrich && !ALLOW_SCRAPE) {
  console.log(`\n⚠ No enrichment key set, and the browser fallback is OFF.\n` +
    `  • COMPLIANT: add HUNTER_API_KEY/ENRICH_API_KEY (licensed data) and re-run.\n` +
    `  • Or work the human worklist: npm run worklist → /worklist (ToS-safe, a person searches).\n` +
    `  • To opt into the browser fallback anyway (accepting the ToS/legal risk of anti-bot circumvention),\n` +
    `    set ALLOW_SCRAPE=1 (and STEALTH=1 on a real desktop). See /build-os/10.\n`);
  logRun(db, "Partner Sourcing", "Discovery skipped (no compliant path)", `${targets.length} targets — needs enrichment key or explicit ALLOW_SCRAPE opt-in`, "/worklist", "pending");
  db.close(); process.exit(0);
}

let found = 0, scanned = 0, blocked = 0, consecutive = 0, brokeCircuit = false;
console.log(`Discovery over ${targets.length} accounts (${skipped} skipped by idempotency) · path=${useEnrich ? "enrichment (licensed)" : "browser fallback (ALLOW_SCRAPE, risk-accepted)"} · mode=${STEALTH ? "stealth" : "headless"}`);

await runner(async ({ nav }) => {
  for (const p of targets) {
    scanned++;
    stampAttempt(p.id);
    // PRIMARY: licensed enrichment.
    if (useEnrich) {
      const domain = (p.ips_channel_public || "").match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1];
      const e = domain && await enrichDomain(domain);
      const c = e && e.contacts && e.contacts[0];
      if (c) {
        const slot = O(`SELECT id FROM poc WHERE partner_id=? AND (person_name IS NULL OR person_name='') ORDER BY id LIMIT 1`, p.id);
        const q = `UPDATE poc SET person_name=?,role=?,contact_type='named-verified',contact_value=?,confidence=?,source='enrichment API',resolved=1 WHERE id=?`;
        if (slot) db.prepare(q).run(c.name, c.role, c.email, c.confidence, slot.id);
        else db.prepare(`INSERT INTO poc (partner_id,title_target,person_name,role,contact_type,contact_value,confidence,source,resolved) VALUES (?,?,?,?,'named-verified',?,?,'enrichment API',1)`).run(p.id, c.role, c.name, c.role, c.email, c.confidence);
        found++; logRun(db, "Partner Sourcing", `POC verified · ${p.id}`, `${c.name} — ${c.role} <${c.email}>`, null, "ok");
        console.log(` ✓✓ ${p.name.slice(0, 26).padEnd(26)} → ${c.name} <${c.email}> [VERIFIED]`);
      } else {
        console.log(` · ${p.name.slice(0, 26).padEnd(26)} → no enrichment result (queue for worklist)`);
      }
      await sleep(400); continue;
    }
    // FALLBACK (opt-in, risk-accepted): stealth browser SERP read, with a CAPTCHA circuit-breaker.
    let hit = null, src = null, sawChallenge = false;
    outer: for (const q of QUERIES(p.name)) {
      for (const eng of ENGINES) {
        const txt = (await nav(eng + encodeURIComponent(q))).slice(0, 14000);
        if (/unusual traffic|solve the challenge|are you a robot|bots use/i.test(txt)) { sawChallenge = true; await sleep(1500); continue; }
        const cs = extract(txt);
        if (cs.length) { hit = cs[0]; src = cs[0].url || `SERP: ${eng.split("/search")[0]}`; break outer; }
        await sleep(800);
      }
    }
    if (hit && hit.url) {
      const prof = (await nav(hit.url)).replace(/\s+/g, " ");
      if (!/join linkedin|sign in to|log in to continue/i.test(prof.slice(0, 400))) {
        const m = prof.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2})\s*[-–|]\s*([^-–|]{5,80}?(?:International|Patient|Medical Value|Business|Marketing)[^-–|]{0,30})/);
        if (m && !BAD.test(m[1])) { hit.name = m[1].trim(); hit.role = m[2].trim().slice(0, 60); hit.confirmed = true; }
      }
      await sleep(700);
    }
    if (hit) {
      consecutive = 0;
      const conf = hit.confirmed ? 58 : 52;
      const slot = O(`SELECT id FROM poc WHERE partner_id=? AND (person_name IS NULL OR person_name='') ORDER BY id LIMIT 1`, p.id);
      const q2 = `UPDATE poc SET person_name=?,role=?,contact_type='named-public',confidence=?,source=?,channel_public=?,resolved=0 WHERE id=?`;
      if (slot) db.prepare(q2).run(hit.name, hit.role, conf, src, hit.url || "", slot.id);
      else db.prepare(`INSERT INTO poc (partner_id,title_target,person_name,role,contact_type,confidence,source,channel_public,resolved) VALUES (?,?,?,?,'named-public',?,?,?,0)`).run(p.id, hit.role, hit.name, hit.role, conf, src, hit.url || "");
      found++;
      logRun(db, "Partner Sourcing", `POC candidate · ${p.id}`, `${hit.name} — ${hit.role} (UNVERIFIED public, human-confirm)`, null, "pending");
      console.log(` ✓ ${p.name.slice(0, 26).padEnd(26)} → ${hit.name} · ${hit.role.slice(0, 38)}`);
    } else {
      if (sawChallenge) { blocked++; consecutive++; } else consecutive = 0;
      console.log(` ${sawChallenge ? "⊘" : "·"} ${p.name.slice(0, 26).padEnd(26)} → ${sawChallenge ? "CAPTCHA" : "no clean public named-DM"}`);
    }
    // CIRCUIT BREAKER: too many CAPTCHAs in a row → IP likely flagged → stop, don't hammer.
    if (consecutive >= CAPTCHA_BREAK) {
      brokeCircuit = true;
      console.log(`\n⛔ Circuit broken: ${consecutive} CAPTCHAs in a row — IP likely flagged. Stopping scrape; remaining accounts → human worklist.`);
      logRun(db, "Partner Sourcing", "Discovery circuit-broken", `${consecutive} consecutive CAPTCHAs — backed off to protect IP; use enrichment or /worklist`, "/worklist", "fail");
      break;
    }
    await sleep(MIN_DELAY);
  }
});
const note = brokeCircuit ? " · CIRCUIT-BROKEN (IP flagged, backed off)" : blocked ? ` · ${blocked} CAPTCHA` : "";
logRun(db, "Partner Sourcing", "Named-DM discovery", `${found}/${scanned} got a candidate${note}${useEnrich ? " (enrichment)" : " (browser fallback)"}`, null, found ? "ok" : "pending");
console.log(`\nDiscovery: ${found}/${scanned}${note}. Non-enrichment candidates are UNVERIFIED — human confirms before outreach.`);
db.close();
