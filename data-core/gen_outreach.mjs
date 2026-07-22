// Partner Sourcing agent — drafts first-touch outreach per priority partner, on GLM-5.2.
// ESTABLISHED anchors get a scale/pre-qualified-demand pitch; LATENT/emerging brands get the
// MARGIN pitch ("you have the quality + brand, not yet the MVT presence — we're the demand engine").
// Human-gated at SEND (/agent-os/13). Fed by the data core so nothing is invented.
//   NVIDIA_API_KEY=... node --experimental-sqlite data-core/gen_outreach.mjs
import { generate } from "../integrations/glm_generate.mjs";
import { open, logRun } from "./db.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = open();
mkdirSync(join(ROOT, "outputs", "outreach"), { recursive: true });
// idempotent: clear prior outreach + its run rows so re-runs don't duplicate
db.exec(`DELETE FROM outreach; DELETE FROM sqlite_sequence WHERE name='outreach';
         DELETE FROM run WHERE action LIKE 'outreach %' OR action='Outreach batch complete'`);
// strip internal annotations like "(verify JCI)" / "(est — verify)" from anything customer-facing
const clean = (s) => (s || "").replace(/\s*\((?:verify|est)[^)]*\)/gi, "").replace(/\s*—\s*est.*/i, "").trim();

// priority set: 3 established first-wave (cardiac × Iraq) + 2 high-opp latent (the margin play)
const TARGETS = [
  { id: "apollo",    cat: "cardiac", mk: "IQ" },
  { id: "fortis",    cat: "cardiac", mk: "IQ" },
  { id: "medanta",   cat: "cardiac", mk: "IQ" },
  { id: "ganga-ram", cat: "cardiac", mk: "IQ" },
  { id: "hinduja",   cat: "cardiac", mk: "IQ" },
];

const SYSTEM = "You write concise, credible B2B partnership outreach for a medical-value-travel FACILITATOR. " +
  "Never invent clinical claims, prices, or accreditations. Professional, respectful, no hype, no guarantees. " +
  "Output Markdown: a Subject line, then the email body. ~150-200 words.";

for (const t of TARGETS) {
  const p = db.prepare(`SELECT * FROM partner WHERE id=?`).get(t.id);
  const cat = db.prepare(`SELECT * FROM category WHERE id=?`).get(t.cat);
  const market = db.prepare(`SELECT * FROM market WHERE code=?`).get(t.mk);
  const poc = db.prepare(`SELECT person_name FROM poc WHERE partner_id=? AND person_name IS NOT NULL LIMIT 1`).get(t.id);
  const latent = ["latent", "emerging"].includes(p.mvt_presence);
  const angle = latent ? "latent" : "established";

  const pitch = latent
    ? `This hospital has strong quality/brand but LOW current medical-value-travel presence (${p.mvt_presence}). Lead with: they have the clinical quality and reputation but are under-represented in international patients; we are the demand engine (Arabic + English content, WhatsApp funnel) that brings them pre-qualified ${cat.name} patients from ${market.name} and the Gulf. Emphasise favourable, flexible pilot terms and that we do the demand generation they aren't yet doing.`
    : `This is an ESTABLISHED, well-known chain. Lead with: we bring incremental, pre-qualified ${cat.name} patients from ${market.name}/Gulf (Arabic + English demand engine), reducing their acquisition effort; propose a non-exclusive pilot.`;

  const prompt = `Draft a first-touch partnership outreach email to ${p.name}${poc ? ` (attn: ${poc.person_name}, public business contact)` : " (International Patient Services desk)"}.
We are MedYatra, a medical-value-travel facilitator (NOT a provider). Target: ${cat.name} patients from ${market.name} and the Gulf.
${pitch}
Include: who we are (facilitator), the specific value we bring, a transparent commercial note (facilitation fee from 20% — below the 25-33% incumbent agents charge — rising in revenue tiers to a 25% cap, so never more than their cheapest current agent, non-exclusive, patient never double-charged), and a soft ask for a 20-30 min intro call. You may reference their accreditation as "${clean(p.accreditation)}" only if natural; never include any parenthetical notes. Do NOT state any prices or outcomes. End with a professional sign-off from "MedYatra Partnerships".
First line must be: Subject: ...`;

  process.stdout.write(`GLM-5.2 outreach → ${p.name} (${angle}) … `);
  let md; try { md = await generate(prompt, { system: SYSTEM, maxTokens: 700, temperature: 0.5 }); }
  catch (e) { console.log("FAIL:", String(e.message || e).slice(0, 50)); logRun(db, "Partner Sourcing", `outreach ${t.id}`, `gen error: ${String(e.message || e).slice(0, 150)}`, null, "fail"); continue; }

  const subject = (md.match(/Subject:\s*(.+)/i) || [, `${cat.name} partnership — MedYatra`])[1].trim();
  const file = join("outputs", "outreach", `${t.id}-${t.cat}-${t.mk.toLowerCase()}.md`);
  const header = `<!-- Outreach DRAFT · GLM-5.2 · ${angle} angle · partner ${t.id} · NOT sent (human-gated /agent-os/13) · ${new Date().toISOString().slice(0,10)} -->\n\n`;
  writeFileSync(join(ROOT, file), header + md.trim() + "\n");

  const info = db.prepare(`INSERT INTO outreach (partner_id,category_id,market_code,channel,angle,subject,file_ref,status)
    VALUES (?,?,?,?,?,?,?, 'draft')`).run(t.id, t.cat, t.mk, "email", angle, subject, file);
  db.prepare(`UPDATE partner SET stage='Outreach drafted' WHERE id=? AND stage IN ('Enriched','POC found')`).run(t.id);
  logRun(db, "Partner Sourcing", `outreach ${p.name}`, `${angle} angle · ${cat.name}×${market.code} · draft (human send gate)`, `/outreach/${info.lastInsertRowid}`, "ok");
  console.log(`ok -> ${file}`);
}
logRun(db, "Partner Sourcing", "Outreach batch complete", `${TARGETS.length} drafts — awaiting human review + send`);
console.log("done.");
db.close();
