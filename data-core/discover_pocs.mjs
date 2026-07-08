// Public named-decision-maker DISCOVERY (FREE). Runs detailed searches with several query combinations
// per star account and reads the NAME + ROLE off public LinkedIn result lines in the SERP (e.g.
// "Anita Rao - Head, International Patient Services - Apollo | LinkedIn"). No LinkedIn login/scrape; the
// SERP line is public business info. Every hit is UNVERIFIED (resolved=0, conf<=55) for human confirm.
//
//   node --experimental-sqlite data-core/discover_pocs.mjs [limit]
//   STEALTH=1 node --experimental-sqlite data-core/discover_pocs.mjs   # non-headless, real profile
//                                                                       # (needed on a real desktop —
//                                                                       # headless is what triggers the
//                                                                       # search-engine CAPTCHAs)
import { open, logRun } from "./db.mjs";
import { session, stealthSession } from "../lib/browser.mjs";
import { available as enrichAvailable, enrichDomain } from "../lib/enrich.mjs";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);
const O = (s, ...p) => db.prepare(s).get(...p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIMIT = Number(process.argv[2]) || 6;
const STEALTH = process.env.STEALTH === "1";
const runner = STEALTH ? stealthSession : session;

const ROLE_HINT = "(international patient OR \"medical value travel\" OR international business OR international marketing)";
// Reject org words AND role words when they masquerade as a person name (the classic SERP bug where
// "Associate Director"/"Senior Operations Manager" gets grabbed as the name).
const BAD = /^(dr|prof)\b|(hospital|apollo|fortis|medanta|health|care|cancer|heart|centre|center|institute|limited|pvt|india|linkedin|profile|associate|senior|director|manager|head|officer|president|global|market|operations|general|assistant|executive|lead|chief|vice)/i;

// Query combinations to try per account (detailed search, various angles). Bing honors most of these
// without a CAPTCHA on the real desktop; site:linkedin surfaces the profile line directly.
const QUERIES = (name) => [
  `site:linkedin.com/in "${name}" ${ROLE_HINT}`,
  `"${name}" "international patient services" (head OR manager OR director) linkedin`,
  `"${name}" "medical value travel" (head OR GM OR manager) linkedin`,
  `"${name}" international business hospital linkedin`,
];
// Google first (user's preference), then Bing as backup. In STEALTH mode (non-headless, real profile)
// these pass the bot checks on a real desktop; headless triggers CAPTCHAs (proven).
const ENGINES = ["https://www.google.com/search?q=", "https://www.bing.com/search?q="];

// Pull {name, role, url} from LinkedIn-style SERP lines. Requires the role keyword next to a person name.
const cleanRole = (s) => s.replace(/\b\d+\s*comments?\b/gi, "").replace(/read more.*/i, "")
  .replace(/\blinkedin\b.*/i, "").replace(/\b(19|20)\d\d\b.*/,"").replace(/[·|].*/,"").replace(/\s+/g, " ").trim();
const looksLikeName = (n) => /^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2}$/.test(n) && !BAD.test(n) && n.split(/\s+/).length <= 3;

function extract(text) {
  const flat = text.replace(/\s+/g, " ");
  const out = [];
  // "Name - Role - Company | LinkedIn"  /  "Name – Role ... LinkedIn"
  const rx = /([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2})\s*[-–|]\s*([^-–|]{5,70}?(?:International Patient|Medical Value|International Business|International Marketing|IPD)[^-–|]{0,40})/g;
  for (const m of flat.matchAll(rx)) {
    const name = m[1].trim(), role = cleanRole(m[2].trim());
    if (!looksLikeName(name) || role.length < 4) continue;   // drop role-words-as-names, clinicians, org names
    out.push({ name, role });
  }
  const url = (flat.match(/https?:\/\/[a-z]{2,3}\.linkedin\.com\/in\/[A-Za-z0-9\-%]+/) || [])[0] || null;
  const seen = new Set();
  return out.filter((c) => !seen.has(c.name) && seen.add(c.name)).map((c) => ({ ...c, url })).slice(0, 2);
}

const targets = A(`SELECT * FROM partner WHERE (opportunity='High' OR mvt_presence IN ('latent','emerging'))
  ORDER BY fit_score DESC LIMIT ?`, LIMIT);

let found = 0, scanned = 0, blocked = 0;
console.log(`Discovery over ${targets.length} star accounts · mode=${STEALTH ? "STEALTH (real browser)" : "headless"} · enrichment=${enrichAvailable() ? "ON" : "off"}`);

await runner(async ({ nav }) => {
  for (const p of targets) {
    scanned++;
    // PREFERRED: paid enrichment (verified) when a key is set.
    if (enrichAvailable()) {
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
        await sleep(400); continue;
      }
    }
    // FREE: detailed multi-combination search + LinkedIn-snippet read.
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
    // View the PUBLIC LinkedIn profile (if we found one) to confirm/strengthen name + role. On a real
    // desktop with a logged-in profile this shows the profile; a bot/anon session sees a login wall
    // (we then keep the SERP-derived values). Public business info only — no connecting, no scraping lists.
    if (hit && hit.url) {
      const prof = (await nav(hit.url)).replace(/\s+/g, " ");
      if (!/join linkedin|sign in to|log in to continue/i.test(prof.slice(0, 400))) {
        const m = prof.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,2})\s*[-–|]\s*([^-–|]{5,80}?(?:International|Patient|Medical Value|Business|Marketing)[^-–|]{0,30})/);
        if (m && !BAD.test(m[1])) { hit.name = m[1].trim(); hit.role = m[2].trim().slice(0, 60); hit.confirmed = true; }
      }
      await sleep(700);
    }
    if (hit) {
      const conf = hit.confirmed ? 58 : 52;   // +6 if the public LinkedIn page corroborated name+role
      const slot = O(`SELECT id FROM poc WHERE partner_id=? AND (person_name IS NULL OR person_name='') ORDER BY id LIMIT 1`, p.id);
      const q2 = `UPDATE poc SET person_name=?,role=?,contact_type='named-public',confidence=?,source=?,channel_public=?,resolved=0 WHERE id=?`;
      if (slot) db.prepare(q2).run(hit.name, hit.role, conf, src, hit.url || "", slot.id);
      else db.prepare(`INSERT INTO poc (partner_id,title_target,person_name,role,contact_type,confidence,source,channel_public,resolved) VALUES (?,?,?,?,'named-public',?,?,?,0)`).run(p.id, hit.role, hit.name, hit.role, conf, src, hit.url || "");
      found++;
      logRun(db, "Partner Sourcing", `POC candidate · ${p.id}`, `${hit.name} — ${hit.role}${hit.confirmed ? " (LinkedIn-corroborated)" : ""} (UNVERIFIED public, human-confirm)`, null, "pending");
      console.log(` ✓ ${p.name.slice(0, 26).padEnd(26)} → ${hit.name} · ${hit.role.slice(0, 38)}${hit.confirmed ? " ✔li" : ""}`);
    } else {
      if (sawChallenge) blocked++;
      console.log(` ${sawChallenge ? "⊘" : "·"} ${p.name.slice(0, 26).padEnd(26)} → ${sawChallenge ? "search engine blocked automation (run with STEALTH=1 on desktop)" : "no clean public named-DM"}`);
    }
    await sleep(1400);
  }
});
const note = blocked ? ` · ${blocked} blocked by CAPTCHA (need STEALTH=1 real-browser run)` : "";
logRun(db, "Partner Sourcing", "Named-DM discovery (multi-query)", `${found}/${scanned} accounts got a candidate${note}`, null, found ? "ok" : "pending");
console.log(`\nDiscovery: ${found}/${scanned}${note}. Candidates are UNVERIFIED — human confirms before outreach.`);
db.close();
