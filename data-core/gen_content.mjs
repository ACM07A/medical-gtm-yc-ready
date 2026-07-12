// Content Engine orchestrator — generation runs on GLM-5.2 (tier-2), fed by the data core.
// Opus orchestrates; GLM drafts. Prices are INJECTED from the data core (cited) so GLM never
// invents them. Output stays DRAFT + human-gated (/build-os/10). Fills gap cells (query gaps).
//   NVIDIA_API_KEY=... node --experimental-sqlite data-core/gen_content.mjs
import { generate } from "../integrations/glm_generate.mjs";
import { open, logRun } from "./db.mjs";
import { lintClaims } from "../lib/claims.mjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = open();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fill ALL remaining gap cells (query gaps), each in the market's primary language.
// Non-English drafts are flagged for native QA (T007) before publish.
const LANGNAME = { en:"English", ar:"Arabic", am:"Amharic", my:"Burmese", sw:"Swahili" };
const BATCH = db.prepare(`
  SELECT cm.category_id catId, cm.market_code mk FROM category_market cm
  JOIN category c ON c.id=cm.category_id JOIN market m ON m.code=cm.market_code
  WHERE c.status='launch'
    AND NOT EXISTS (SELECT 1 FROM content_asset ca WHERE ca.category_id=cm.category_id AND ca.market_code=cm.market_code)
  ORDER BY m.tier, cm.category_id`).all().map(r => [r.catId, r.mk]);

const SYSTEM = "You are a DIRECTOR OF COPYWRITING producing public, consumer-facing content for people weighing medical treatment abroad — anxious, intelligent, doing real research. You write for a medical-travel FACILITATOR (not a hospital). " +
  "Aim for genuinely excellent long-form: the page a top-1% editor would rate 9/10. Human, calm, specific, credible — never a sales note, never keyword-stuffed. " +
  "Write TO the reader about their care and their decision — NEVER about the business, its funnel, margins, or strategy. Words like 'product', 'sell', 'basket size', 'conversion', 'lead', 'first sale', 'up-sell', 'seeds the relationship' must never appear; that is internal-memo language and it is banned. " +
  "Voice: plain, warm, authoritative. Vary sentence length. Use concrete specifics and real numbers. Explain trade-offs honestly — including what can go wrong and what a price does NOT include. Earn trust by being useful and candid, not with adjectives. " +
  "BANNED filler and AI tells: 'world-class', 'seamless', 'state-of-the-art', 'peace of mind', 'rest assured', 'in today's world', 'when it comes to', 'look no further', 'in conclusion', 'nestled', 'unlock', rhetorical questions, and exclamation marks. Do not open with a preamble — open with the most useful sentence. " +
  "Hold this exact standard in EVERY language you are asked to write in — Arabic, Amharic, Burmese, Swahili — not only English; write like a native professional copywriter in that language, not a translation. " +
  "Absolute rules: never invent prices/outcomes/accreditations; use ONLY the prices provided, as indicative package ranges (not quotes); no cure or outcome guarantees. Be clear MedYatra is a facilitator that coordinates and provides supporting documents, while the patient books their own travel and applies for their own visa. Output GitHub-flavoured Markdown only.";

const slug = (c, mk, lang) => `${c}-cost-india-${mk.toLowerCase()}${lang !== "en" ? "-" + lang : ""}.md`;

for (const [catId, mk] of BATCH) {
  const cat = db.prepare(`SELECT * FROM category WHERE id=?`).get(catId);
  const market = db.prepare(`SELECT * FROM market WHERE code=?`).get(mk);
  const lang = JSON.parse(market.languages)[0];
  const langName = LANGNAME[lang] || "English";
  const prices = db.prepare(`SELECT * FROM category_price WHERE category_id=? ORDER BY india_low`).all(catId);
  const priceLines = prices.map(p =>
    `- ${p.procedure}: $${p.india_low.toLocaleString()}–${p.india_high.toLocaleString()} (vs ${p.comparator})`).join("\n");
  const langLine = lang === "en"
    ? "Language: English."
    : `Write the ENTIRE page in ${langName} (${lang})${lang === "ar" ? ", right-to-left" : ""}. Keep the price figures as USD numerals. This draft will get native-speaker QA before publish.`;

  const prompt = `Write an in-depth, genuinely useful guide titled around: "${cat.name} in India — what it costs for patients from ${market.name}, and how it works". ${langLine}
Audience: a patient or their family in ${market.name} seriously researching ${cat.name} in India, making a hard, frightening decision. Write for that real person.
Use EXACTLY these indicative India package prices (do not change or add others; present as ranges, never as firm quotes):
${priceLines}

Cover the following in a natural order under clear ## subheadings — NOT a rigid template, and NOT bullet-point padding (write real paragraphs, use a table only for the price comparison):
- What the treatment involves and who it is for — briefly, accurately, without scaring or overselling.
- What it actually costs in India versus ${market.name} / typical Western private care, using the numbers above. Be explicit about what a package usually INCLUDES and, just as important, what it does NOT (flights, visa, extended stay, managing complications).
- How to judge a hospital from abroad: JCI/NABH accreditation, surgeon credentials, and exactly what to ask for in writing.
- How the process really works: you send reports on WhatsApp; an accredited hospital reviews them and gives an opinion plus an indicative quote; the hospital issues an invitation letter (a required supporting document); YOU apply for the e-Medical Visa yourself and book your own flights and stay; you travel, have the procedure, recover before flying home; tele-follow-up afterwards.
- Honest answers to the real worries: is cheaper worse (no — explain the actual reasons), safety and what happens if something goes wrong, language, how payment works (you pay the hospital directly), and length of stay.
Length ~900-1300 words. Open with the single most useful sentence, not a preamble. State plainly, somewhere it fits, that MedYatra is a facilitator (not a provider) that handles demand and coordination plus supporting documents while the patient arranges their own travel and visa, and that prices are indicative pending assessment. End with one low-pressure line to message on WhatsApp — no hard sell.
Start the file with this exact HTML comment: <!-- DRAFT · tier-2 · cell ${catId}×${mk} (${lang}) · needs ${lang !== "en" ? "native QA + " : ""}clinical sign-off -->`;

  process.stdout.write(`tier-2 drafting ${catId}×${mk} (${lang}) … `);
  // Retry with exponential backoff on rate limits (429): both providers throttle a fast batch. Also throttle
  // between cells so we don't burst past the per-minute cap in the first place.
  let md, lastErr;
  for (let attempt = 1; attempt <= 4 && !md; attempt++) {
    try {
      md = await generate(prompt, { system: SYSTEM, maxTokens: 4096, temperature: 0.7 });
      // Guard against truncated/near-empty output (gemini-2.5-flash occasionally returns a stub, esp. for
      // non-Latin scripts). A real ~900-1300-word page is thousands of chars; anything tiny is a failure.
      if (md.trim().length < 1500) { const n = md.trim().length; md = null; throw new Error(`output too short (${n} chars) — likely truncated`); }
    }
    catch (e) {
      lastErr = e;
      const rate = /429|too many|resource.?exhausted/i.test(String(e));
      const short = /too short/.test(String(e));
      if (attempt < 4 && (rate || short)) { const wait = rate ? attempt * 20000 : 8000; process.stdout.write(`retry (${short ? "short" : "429"})… `); await sleep(wait); }
      else break;
    }
  }
  if (!md) { console.log("FAILED:", String(lastErr).slice(0, 120)); logRun(db, "Content Engine", `draft ${catId}×${mk} (${lang})`, "gen error: " + String(lastErr).slice(0, 80), null, "fail"); await sleep(5000); continue; }

  // QA the prose (same linter as proposals): tag vague magnitude claims [VERIFY] + flag AI-filler to cut.
  const lint = lintClaims(md.trim());
  const file = join("outputs", "content", slug(catId, mk, lang));
  const qaNote = lang !== "en" ? " NEEDS NATIVE-SPEAKER QA (non-English)." : "";
  const fillerNote = lint.filler.length ? ` · filler to cut: ${lint.filler.slice(0, 6).join(", ")}` : "";
  const header = `<!-- Content Engine · tier-2 (GLM→Gemini) · fed by data core · ${new Date().toISOString().slice(0, 10)}\n` +
    `     Prices injected from data core (cited /build-os/08). Prose is model-generated → DRAFT, needs human+clinical sign-off.${qaNote}${lint.vague.length ? ` · ${lint.vague.length} vague-claim(s) tagged [VERIFY]` : ""}${fillerNote} -->\n\n`;
  writeFileSync(join(ROOT, file), header + lint.text.trim() + "\n");
  if (lint.vague.length || lint.filler.length) logRun(db, "QA", `Content lint · ${catId}×${mk}`, `${lint.vague.length} vague→[VERIFY], filler: ${lint.filler.slice(0, 5).join(", ") || "none"}`, null, "pending");

  const info = db.prepare(`INSERT INTO content_asset (category_id,market_code,language,title,file_ref,status,cta_wired,citations_ok)
    VALUES (?,?,?,?,?, 'draft', 0, 0)`)
    .run(catId, mk, lang, `${cat.name} Cost in India — ${market.name} Guide (tier-2 draft, ${lang})`, file);
  logRun(db, "Content Engine", `draft ${catId}×${mk} (${lang})`, `${md.length} chars${qaNote}`, `/draft/${info.lastInsertRowid}`, "ok");
  console.log(`ok -> ${file} (${md.length} chars)${qaNote}`);
  await sleep(6000);   // throttle between cells so we stay under the per-minute rate cap
}

const n = db.prepare(`SELECT count(*) c FROM content_asset`).get().c;
console.log(`\nContent assets now: ${n}. New drafts are status=draft, citations_ok=0 (verify prose + wire CTA before publish).`);
db.close();
