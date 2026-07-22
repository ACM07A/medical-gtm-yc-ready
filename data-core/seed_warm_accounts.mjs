// WARM ACCOUNTS — the three groups where an introduction actually exists.
//
// Until now the account board held only cold, model-ranked targets and none of the groups we can actually
// reach. That made the console a simulation of a pipeline rather than a picture of one, and anyone opening
// it during diligence would have seen fixtures.
//
// These three deliberately CONTRADICT the fit score, and the contradiction is the point. The score
// (0.45·quality + 0.40·whitespace + 0.15·proof) optimises for commercial LEVERAGE — who needs us enough to
// give good terms — which is the right model for ranking a cold funnel. It is the wrong model here, for two
// reasons. Warm group-level access is scarcer than good terms. And if the product automates the coordinator
// function, the customer with the problem TODAY is the chain whose international desk is already drowning,
// not a latent brand with no international flow to automate yet.
//
// So these carry a real fit_score AND an explicit note that access, not score, is why they rank first.
//   node --experimental-sqlite data-core/seed_warm_accounts.mjs
import { open, logRun } from "./db.mjs";

const db = open();

const ACCOUNTS = [
  {
    id: "aster-india", name: "Aster DM Healthcare (India)", network: "Aster", city: "Bengaluru / Kochi",
    accreditation: "NABH (Aster CMI); JCI at selected units — VERIFY per unit",
    ips_channel_public: "asterhospitals.in — international patient services desk",
    ips_source: "asterhospitals.in", fit: "High", stage: "Warm intro pending", priority: 1, type: "chain",
    mvt_presence: "established", opportunity: "High", fit_score: 74,
    fit_reason: "WARM GROUP-LEVEL INTRODUCTION via the owning family — access, not fit score, is why this ranks first. " +
      "Established international desk means the coordination pain we automate exists today at volume.",
    next_action: "Confirm which entity the introduction reaches (India, GCC, or both). Book the discovery call; ask the five priority questions. Bangalore first-approach unit: Aster Hebbal/Whitefield.",
    notes: "FIRST PARTNER SET (Bangalore cluster, 2026-07-22) — the specific unit to pilot is Aster Hebbal. " +
      "India and GCC separated April 2024 into two companies. Moopen family holds 41.88% of the India entity " +
      "and 35% of Aster GCC with operational rights — so a family introduction may reach BOTH ends of a corridor. " +
      "Highest-value thread we have. GCC side is governed by UAE Federal Law 2/2019 (health data may not leave the UAE).",
  },
  {
    id: "aster-gcc", name: "Aster DM Healthcare GCC (Medcare / Aster Clinics)", network: "Aster", city: "Dubai / Abu Dhabi",
    accreditation: "VERIFY — JCI/DoH per facility", ips_channel_public: "asterdmhealthcare.com (GCC entity)",
    ips_source: "asterdmhealthcare.com", fit: "High", stage: "Warm intro pending", priority: 1, type: "chain",
    mvt_presence: "established", opportunity: "High", fit_score: 70,
    fit_reason: "DEMAND-SIDE, not supply-side: a GCC clinic network sits at the TOP of our funnel, in a target market. " +
      "Same corporate family as Aster India — a patient seen in Dubai treated in Bengaluru inside one brand removes the trust gap.",
    next_action: "Establish whether the family introduction extends to the GCC entity (65% held by a Fajr Capital consortium since 2024).",
    notes: "REGULATORY: UAE health data cannot be transferred or generated outside the UAE absent a case-by-case " +
      "emirate-authority exception (Federal Law 2/2019, Ministerial Resolution 51/2021). Any corridor here needs " +
      "in-country processing FIRST. That constraint is also the moat, and the argument for an Abu Dhabi base.",
  },
  {
    id: "manipal", name: "Manipal Hospitals (group)", network: "Manipal", city: "Bengaluru (Old Airport Rd flagship)",
    accreditation: "NABH; JCI at selected units — VERIFY per unit",
    ips_channel_public: "manipalhospitals.com — international patient services",
    ips_source: "manipalhospitals.com", fit: "High", stage: "Warm intro pending", priority: 1, type: "chain",
    mvt_presence: "established", opportunity: "High", fit_score: 74,
    fit_reason: "WARM GROUP-LEVEL INTRODUCTION via the former group legal head — a route that understands exactly how the " +
      "existing facilitator agreements are written and where the commercial friction sits.",
    next_action: "Discovery call. Priority questions: inquiry→treated conversion, agent commission as a share of case, where they lose people.",
    notes: "FIRST PARTNER SET (Bangalore cluster, 2026-07-22). " +
      "Strengths align with our top categories: oncology, cardiac surgery, orthopaedics, neuro, nephrology. " +
      "Transplant programme of 2,000+ procedures — the highest-ticket category in medical travel and one we do not " +
      "yet model. Transplant for foreign nationals runs under THOTA (near-relative donor, authorisation committee) — " +
      "genuine regulatory weight, and a moat precisely because it is hard.",
  },
  {
    id: "fortis-bangalore", name: "Fortis Hospital, Bannerghatta Road (Bangalore)", network: "Fortis",
    city: "Bengaluru", accreditation: "JCI + NABH + NABL",
    ips_channel_public: "fortishealthcare.com — international patient desk", ips_source: "fortishealthcare.com",
    fit: "High", stage: "Intro expected", priority: 2, type: "unit", parent_id: "fortis",
    mvt_presence: "established", opportunity: "Med", fit_score: 70,
    fit_reason: "Unit-level rather than group-level, but JCI + NABH + NABL with strong oncology and cardiac programmes " +
      "and an existing medical-travel reputation. A single unit is an easier pilot than a group.",
    next_action: "Chase the introduction, but do not let it hold up the two group conversations.",
    notes: "FIRST PARTNER SET (Bangalore cluster, 2026-07-22) — Sachin Rai's own desk, the warmest intro path we have. " +
      "Parent chain already on the board at fit 68 (established presence, thinner terms). The Bangalore unit is the " +
      "specific opportunity, not Fortis nationally.",
  },
];

const cols = ["id","name","network","city","accreditation","ips_channel_public","ips_source","fit","stage",
  "priority","type","parent_id","mvt_presence","opportunity","notes","next_action","owner","fit_reason","fit_score"];
const stmt = db.prepare(
  `INSERT INTO partner (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})
   ON CONFLICT(id) DO UPDATE SET stage=excluded.stage, next_action=excluded.next_action,
     fit_reason=excluded.fit_reason, fit_score=excluded.fit_score, notes=excluded.notes, priority=excluded.priority`);

for (const a of ACCOUNTS) {
  stmt.run(...cols.map((c) => (c === "owner" ? "Founders" : a[c] ?? null)));
  // Link them to the categories they are actually strong in, so they surface on the right boards.
  const cats = a.id === "fortis-bangalore" ? ["oncology", "cardiac"] : ["oncology", "cardiac", "ortho"];
  for (const c of cats) {
    try { db.prepare(`INSERT OR IGNORE INTO partner_category (partner_id, category_id) VALUES (?,?)`).run(a.id, c); } catch {}
  }
}

logRun(db, "Partner Sourcing", "seed-warm-accounts", `${ACCOUNTS.length} warm accounts — access-ranked, not score-ranked`);
console.log(`\n✓ ${ACCOUNTS.length} warm accounts on the board:`);
for (const a of ACCOUNTS) console.log(`   ${a.fit_score}  ${a.stage.padEnd(20)} ${a.name}`);
console.log(`\n  These rank on ACCESS, not fit score. The score ranks a cold funnel; a warm group-level`);
console.log(`  introduction is scarcer than good terms — and an established desk has the pain today.\n`);
