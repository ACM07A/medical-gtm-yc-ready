// Content DISTRIBUTION agent (/build-os/05). Repurposes each published cornerstone page into platform-
// native posts — LinkedIn, Instagram (carousel + image briefs), Reddit, WhatsApp, X — using the Tier-2
// FAILOVER chain (GLM-5.2 -> llama). FACTS ARE INJECTED from the source page (price band, comparator,
// disclaimer) so the model never invents a number. Human-gated: writes status='draft', nothing auto-posts.
// This is the GLM-driven work the scheduled loop does when Claude is offline.
//   node --experimental-sqlite data-core/repurpose_content.mjs [limitPages]
import { open, logRun } from "./db.mjs";
import { generateWithModel } from "../integrations/glm_generate.mjs";
import { renderMedia, costComparisonHtml, renderInfographic } from "../lib/media.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);
const O = (s, ...p) => db.prepare(s).get(...p);

// Cited Western private-care references per category (from /build-os/08 data sources) for the cost-
// comparison infographic. Real, sourced ranges — not invented.
const WEST_REF = {
  cardiac: [90000, 120000], ortho: [35000, 50000], oncology: [150000, 400000],
  fertility: [12000, 25000], cosmetic: [20000, 30000], dental: [3000, 6000],
};
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = Number(process.argv[2]) || 2;

// Pull the hard facts from the source markdown so posts are grounded, not invented.
function facts(md) {
  const priceRow = md.match(/\*\*(US )?\$[0-9,]+[–-][0-9,]+\*\*/) || md.match(/\$[0-9,]+[–-][0-9,]+/);
  const compare = md.match(/US \$[0-9,]+[–-][0-9,]+/g) || [];
  const title = (md.match(/^#\s+(.+)$/m) || [])[1] || "";
  return {
    title: title.replace(/\s*—.*$/, "").trim(),
    india: (priceRow ? priceRow[0].replace(/\*/g, "") : "").trim(),
    western: compare.length ? compare[compare.length - 1] : "",
  };
}

const DISCLAIMER = "MedYatra is a medical-travel facilitator, not a hospital; prices are indicative package ranges.";

// Platform prompt builders. Each enforces facilitator voice + injected facts + no cure claims.
function prompt(channel, f, market, category) {
  const base = `You write for MedYatra, a medical-travel FACILITATOR (not a hospital) helping patients from ${market} reach accredited Indian hospitals for ${category}.
STRICT RULES: facilitator voice only; NO cure/outcome guarantees; NO fear-mongering; use ONLY these facts — India price ${f.india || "(see page)"}, Western reference ${f.western || "(varies)"}; prices are indicative; disclose we are a facilitator; end with a soft WhatsApp CTA. Topic: "${f.title}".`;
  const specs = {
    linkedin: `Write a LinkedIn post (B2B / thought-leadership angle for the medical-value-travel space, ~120 words). Professional, credible, no hashtag spam (3-4 max).`,
    instagram: `Write an INSTAGRAM CAROUSEL: 5 slides. For EACH slide give: (a) on-slide text (<=12 words, punchy), and (b) an IMAGE BRIEF (one line describing the visual for a designer/image model — clinical blue #0B4A8B + green, clean, human, no text-in-image). Then a caption (<=125 words) + 8-10 relevant hashtags. Label sections clearly.`,
    reddit: `Write a Reddit post for a relevant subreddit (e.g. r/medicaltourism): value-first, genuine, NON-promotional tone (Reddit hates ads). Title + body (~120 words). Mention MedYatra only once, softly, as a disclosure.`,
    whatsapp: `Write a WhatsApp broadcast message (<=90 words, warm, 1-2 emoji max, clear next step). This is the conversion channel.`,
    x: `Write an X/Twitter thread (4 tweets, each <=270 chars, numbered). Hook first, facts middle, soft CTA last.`,
  };
  return `${base}\n\n${specs[channel]}\n\nEnd every asset with this exact line: "${DISCLAIMER}"`;
}

const CHANNELS = [["linkedin", "post"], ["instagram", "carousel"], ["reddit", "post"], ["whatsapp", "broadcast"], ["x", "thread"]];

const pages = A(`SELECT ca.*, c.name cat, mk.name mname FROM content_asset ca
  JOIN category c ON c.id=ca.category_id JOIN market mk ON mk.code=ca.market_code
  WHERE ca.status='published' AND ca.language='en' ORDER BY c.rank, mk.name LIMIT ?`, LIMIT);

mkdirSync(join(ROOT, "outputs", "social"), { recursive: true });
let made = 0;
console.log(`Repurposing ${pages.length} published page(s) → ${CHANNELS.length} channels each (human-gated drafts)`);

for (const p of pages) {
  let md = ""; try { md = readFileSync(join(ROOT, p.file_ref), "utf8"); } catch { continue; }
  const f = facts(md);
  db.prepare(`DELETE FROM channel_post WHERE content_asset_id=?`).run(p.id);   // idempotent
  for (const [channel, format] of CHANNELS) {
    try {
      const r = await generateWithModel(prompt(channel, f, p.mname, p.cat), { maxTokens: 700, temperature: 0.7 });
      const stub = `${p.category_id}-${p.market_code}-${channel}`;
      const file = join("outputs", "social", `${stub}.md`);
      writeFileSync(join(ROOT, file), `# ${channel.toUpperCase()} · ${p.cat} × ${p.mname}\n<!-- DRAFT — human review before posting. model:${r.model} -->\n\n${r.text}\n`);
      db.prepare(`INSERT INTO channel_post (content_asset_id,category_id,market_code,channel,format,body,model,file_ref,status)
        VALUES (?,?,?,?,?,?,?,?,'draft')`).run(p.id, p.category_id, p.market_code, channel, format, r.text, r.model, file);
      made++;
      let imgNote = "";
      // Build the carousel visuals with the RIGHT source per slide: a data infographic (real numbers,
      // crisp text) + stock photos for the human element + AI only for abstract graphics (no faces/text).
      if (channel === "instagram") {
        const imgDir = join(ROOT, "outputs", "social", "img");
        const stub = `${p.category_id}-${p.market_code}`;
        let kinds = [];
        // 1) cost-comparison infographic from the data core (deterministic, cited)
        const pr = O(`SELECT min(india_low) lo, max(india_high) hi FROM category_price WHERE category_id=?`, p.category_id);
        const west = WEST_REF[p.category_id];
        if (pr && pr.lo && west) {
          try {
            await renderInfographic(costComparisonHtml({ treatment: p.cat, market: p.mname, india_low: pr.lo, india_high: pr.hi, west_low: west[0], west_high: west[1] }), join(imgDir, `${stub}-infographic.png`));
            kinds.push("infographic");
          } catch {}
        }
        // 2) route the LLM image briefs: human → stock photo, abstract → AI graphic
        const briefs = [...r.text.matchAll(/IMAGE BRIEF:?\s*(.+)/gi)].map((m) => m[1].trim()).slice(0, 4);
        for (let i = 0; i < briefs.length; i++) {
          try { const m = await renderMedia(briefs[i], join(imgDir, `${stub}-slide${i + 1}.png`)); kinds.push(m.kind); } catch {}
        }
        imgNote = kinds.length ? ` · visuals: ${kinds.join("+")}` : " · visuals skipped";
      }
      console.log(`  ✓ ${p.cat} × ${p.market_code} · ${channel.padEnd(9)} (${r.model}${r.failedOver ? " failover" : ""})${imgNote}`);
    } catch (e) {
      console.log(`  ✗ ${p.cat} × ${p.market_code} · ${channel}: ${String(e.message || e).slice(0, 60)}`);
    }
  }
}
logRun(db, "Content Engine", "Repurposed cornerstone → social", `${made} platform posts drafted (LinkedIn/IG/Reddit/WhatsApp/X) — human-gated`, "/distribution", made ? "ok" : "pending");
console.log(`\n${made} posts drafted → outputs/social/ and channel_post table. View at /distribution. NONE posted (human gate).`);
db.close();
