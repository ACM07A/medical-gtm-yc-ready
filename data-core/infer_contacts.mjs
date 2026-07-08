// Email-pattern INFERENCE (FREE). For a named person at a partner whose email domain + pattern we can
// observe, construct the likely direct address, MX-verify the domain, and store it as INFERRED (never
// "verified"). This is standard SDR tradecraft: it is a best-guess, human-confirmed before any send.
// It does NOT invent people — it only acts on names already logged (public/enriched) + observed patterns.
//   node --experimental-sqlite data-core/infer_contacts.mjs
import { open, logRun, PARTNER_DOMAINS } from "./db.mjs";
import { resolveMx } from "node:dns/promises";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);

// Observed email patterns per domain (learned from real samples already in the DB). Fortis proof:
// ajey.maharaj@ / rishu.singh@fortishealthcare.com  => {first}.{last}.  Extend as we verify more.
const OBSERVED = { "fortishealthcare.com": "first.last" };
// When a domain is unknown, these are the industry-common patterns, ranked. All INFERRED (low conf).
const COMMON = ["first.last", "firstlast", "flast", "first"];

const build = (pattern, first, last) => ({
  "first.last": `${first}.${last}`, "firstlast": `${first}${last}`,
  "flast": `${first[0]}${last}`, "first": first,
}[pattern]);

// Derive the email domain for a partner from any @-address already on file (desk or named).
function domainFor(partnerId) {
  const row = A(`SELECT channel_public, contact_value FROM poc WHERE partner_id=?`, partnerId)
    .flatMap(r => [r.channel_public, r.contact_value])
    .map(s => (s || "").match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]).find(Boolean);
  return (row || PARTNER_DOMAINS[partnerId] || "").toLowerCase() || null;   // known real domain fallback
}

const mxCache = new Map();
async function mxOk(domain) {
  if (mxCache.has(domain)) return mxCache.get(domain);
  let ok = false; try { ok = (await resolveMx(domain)).length > 0; } catch {}
  mxCache.set(domain, ok); return ok;
}

// Every named POC that has no email-shaped contact_value yet.
const named = A(`SELECT p.*, pt.name partner FROM poc p JOIN partner pt ON pt.id=p.partner_id
  WHERE p.person_name IS NOT NULL AND p.person_name<>'' AND (p.contact_value IS NULL OR p.contact_value NOT LIKE '%@%')`);

let inferred = 0;
for (const r of named) {
  const parts = r.person_name.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (parts.length < 2) continue;
  const first = parts[0], last = parts[parts.length - 1];
  const domain = domainFor(r.partner_id);
  if (!domain) { console.log(` · ${r.partner}: no domain on file for ${r.person_name} — skip`); continue; }
  const ok = await mxOk(domain);
  const pattern = OBSERVED[domain] || COMMON[0];
  const guess = `${build(pattern, first, last)}@${domain}`;
  const alts = (OBSERVED[domain] ? [] : COMMON.slice(1, 3)).map(p => `${build(p, first, last)}@${domain}`);
  const conf = (OBSERVED[domain] ? 55 : 35) - (ok ? 0 : 20);   // known-pattern + live MX = higher, still <60
  db.prepare(`UPDATE poc SET contact_value=?, contact_type='inferred', confidence=?,
    source=COALESCE(source,'')||' | INFERRED email ('||?||' pattern, MX '||?||')'||CASE WHEN ?<>'' THEN ' alts: '||? ELSE '' END WHERE id=?`)
    .run(guess, conf, pattern, ok ? "ok" : "none", alts.join(", "), alts.join(", "), r.id);
  inferred++;
  console.log(` ✎ ${r.partner}: ${r.person_name} → ${guess}  [INFERRED · ${pattern} · MX ${ok ? "✓" : "✗"} · conf ${conf}]${alts.length ? "  alts: " + alts.join(", ") : ""}`);
}
logRun(db, "Partner Sourcing", "Email-pattern inference", `${inferred} inferred direct addresses (INFERRED, human-confirm before send)`, null, inferred ? "ok" : "pending");
console.log(`\nInferred ${inferred} address(es). All labelled INFERRED — verify before any send (deliverability/reputation).`);
db.close();
