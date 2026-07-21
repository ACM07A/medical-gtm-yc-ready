// SEED THE PRICE LADDER — builds the rung STRUCTURE for every (market × category), so the comparison runs
// in the order the patient actually thinks in: best local option → other international options → India.
//
// HONESTY RULE (the reason this script looks half-empty on purpose): it seeds the *questions*, not invented
// answers. Only rungs with a real citation get a price; everything else lands as status='needs_research'
// with NULL prices, which the ladder renders as an explicit gap and the QA gate refuses to publish. That
// turns "we don't know Muscat's cardiac pricing" from a silent fabrication risk into a visible research task
// (see `npm run price-gaps`). Fill them with capture_reference_price.mjs as real quotes come in.
//
//   node --experimental-sqlite data-core/seed_reference_prices.mjs
import { open, logRun, CATEGORY_COMPARATOR } from "./db.mjs";

const db = open();

// The realistic consideration set per region — who a patient in that region actually weighs against India.
// Ordering within the tier is by price at render time, not here.
const LOCAL = {
  OM: "Private hospital, Muscat", AE: "Private hospital, Dubai/Abu Dhabi", SA: "Private hospital, Riyadh/Jeddah",
  KW: "Private hospital, Kuwait City", QA: "Private hospital, Doha", IQ: "Private hospital, Baghdad/Erbil",
  KE: "Private hospital, Nairobi", NG: "Private hospital, Lagos/Abuja", ET: "Private hospital, Addis Ababa",
  GB: "NHS private / UK private hospital", IE: "Private hospital, Dublin", MM: "Private hospital, Yangon",
};
const INTL_BY_REGION = {
  middle_east: [["AE", "Dubai (UAE)"], ["TH", "Bangkok (Thailand)"], ["TR", "Istanbul (Türkiye)"], ["DE", "Germany"], ["GB", "UK private"]],
  africa:      [["IN_PEER", null], ["AE", "Dubai (UAE)"], ["TR", "Istanbul (Türkiye)"], ["ZA", "South Africa"], ["GB", "UK private"]],
  europe:      [["TR", "Istanbul (Türkiye)"], ["PL", "Poland"], ["ES", "Spain"], ["US", "US private"]],
  se_asia:     [["TH", "Bangkok (Thailand)"], ["SG", "Singapore"], ["MY", "Malaysia"], ["GB", "UK private"]],
};
// The ONLY prices we can cite today (/build-os/08). Western references already underpin the infographics.
const CITED = {
  US: { src: "aggregated US private payer/self-pay references — /build-os/08_DATA_SOURCES.md" },
  GB: { src: "aggregated UK private (self-pay) references — /build-os/08_DATA_SOURCES.md" },
};
const WESTERN = { US: 0, GB: 1 };   // index into CATEGORY_COMPARATOR.west [low, high] — US anchors the pair

const markets = db.prepare(`SELECT code, region FROM market`).all();
const ins = db.prepare(
  `INSERT OR IGNORE INTO reference_price (category_id,procedure_key,tier,market_code,dest_code,dest_label,low,high,status,source_cite,retrieved)
   VALUES (?,?,?,?,?,?,?,?,?,?,date('now'))`);

let cited = 0, gaps = 0;
for (const m of markets) {
  const intl = INTL_BY_REGION[m.region] || INTL_BY_REGION.middle_east;
  for (const [catId, c] of Object.entries(CATEGORY_COMPARATOR)) {
    // Rung 1 — their best local option. Never guessed: nobody publishes reliable Muscat/Lagos self-pay rates.
    ins.run(catId, c.match, "local", m.code, m.code, LOCAL[m.code] || `Private hospital, ${m.code}`,
      null, null, "needs_research", null);
    gaps++;

    // Rung 2..n — the other destinations they'd weigh. Western refs are cited; the rest are research tasks.
    for (const [dest, label] of intl) {
      if (dest === "IN_PEER") continue;                      // placeholder slot, not a destination
      const west = WESTERN[dest] !== undefined ? c.west : null;
      if (west && CITED[dest]) {
        // The cited Western band is a PAIR (low, high) for the whole Western reference, not per-country.
        // Attributing it to one country would be a fabrication, so it is labelled as the Western reference.
        ins.run(catId, c.match, "international", m.code, dest, `${label} (Western reference band)`,
          west[0], west[1], "cited", CITED[dest].src);
        cited++;
      } else {
        ins.run(catId, c.match, "international", m.code, dest, label, null, null, "needs_research", null);
        gaps++;
      }
    }
  }
}

logRun(db, "pricing", "seed-price-ladder", `${cited} cited rungs, ${gaps} rungs awaiting research`);
console.log(`✓ Price ladder seeded across ${markets.length} markets × ${Object.keys(CATEGORY_COMPARATOR).length} categories`);
console.log(`  ${cited} rungs carry a cited price · ${gaps} rungs are explicit research gaps (NULL, never guessed)`);
console.log(`  Next: npm run price-gaps   →   the prioritised list of prices to actually go get`);
