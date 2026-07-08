// Category Intelligence sub-task (FREE, browser-driven) — scan live competitor/aggregator pages for
// each launch category's market price band, compare to our anchors. Uses one Edge session (Bing search
// + render) because the free HTML-scraper search gets throttled at batch scale.
//   node --experimental-sqlite data-core/competitor_scan.mjs
import { open, logRun } from "./db.mjs";
import { session } from "../lib/browser.mjs";
const db = open();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRIEVED = new Date().toISOString().slice(0, 10);
db.exec(`DELETE FROM competitor_price`);
const cats = db.prepare(`SELECT * FROM category WHERE status='launch' ORDER BY rank`).all();

// Curated live competitor/aggregator pages (browser-rendered). Free-search discovery is throttled,
// so we hit known pages directly; extend this map to broaden coverage.
const URLS = {
  cardiac: ["https://www.vaidam.com/search/heart-bypass-surgery-cabg/india", "https://www.medigence.com/procedure/coronary-artery-bypass-grafting-cabg"],
  ortho: ["https://www.vaidam.com/search/total-knee-replacement/india", "https://www.vaidam.com/search/knee-replacement/india"],
  oncology: ["https://www.vaidam.com/search/bone-marrow-transplant/india", "https://www.vaidam.com/search/cancer-treatment/india"],
  fertility: ["https://www.vaidam.com/search/ivf-treatment/india", "https://www.vaidam.com/search/ivf/india"],
  cosmetic: ["https://www.vaidam.com/search/bariatric-surgery-for-weight-loss/india"],
  dental: ["https://www.vaidam.com/search/dental-implants/india", "https://www.vaidam.com/search/dental-treatment/india"],
};

const extract = (t) => [...t.matchAll(/\$\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,6})|USD\s?([0-9,]{4,7})/gi)]
  .map((m) => Number((m[1] || m[2]).replace(/,/g, ""))).filter((n) => n >= 800 && n <= 200000);

await session(async ({ nav }) => {
  for (const c of cats) {
    const proc = db.prepare(`SELECT procedure FROM category_price WHERE category_id=? ORDER BY india_high DESC LIMIT 1`).get(c.id)?.procedure || c.name;
    const prices = [], sources = [];
    for (const u of (URLS[c.id] || [])) {
      const found = extract((await nav(u)).slice(0, 9000));
      if (found.length) { prices.push(...found); sources.push(u); }
      await sleep(500);
    }
    if (prices.length >= 3) {
      prices.sort((a, b) => a - b);
      const low = prices[Math.floor(prices.length * 0.1)], high = prices[Math.floor(prices.length * 0.9)];
      db.prepare(`INSERT INTO competitor_price (category_id,procedure,low,high,samples,sources,retrieved) VALUES (?,?,?,?,?,?,?)`)
        .run(c.id, proc, low, high, prices.length, sources.slice(0, 3).join(" ; "), RETRIEVED);
      const ours = db.prepare(`SELECT min(india_low) lo, max(india_high) hi FROM category_price WHERE category_id=?`).get(c.id);
      const verdict = ours.hi <= high ? "our anchor ≤ market (competitive)" : "our anchor at market top — review";
      logRun(db, "Category Intel", `market price · ${c.id}`, `${proc}: market $${low.toLocaleString()}–${high.toLocaleString()} (n=${prices.length}) vs ours $${ours.lo.toLocaleString()}–${ours.hi.toLocaleString()} — ${verdict}`, null, "ok");
    } else {
      logRun(db, "Category Intel", `market price · ${c.id}`, `insufficient data (n=${prices.length})`, null, "pending");
    }
    await sleep(800);
  }
});
logRun(db, "Category Intel", "Competitor price scan complete", `${cats.length} categories (browser)`);
console.log("competitor scan done.");
db.close();
