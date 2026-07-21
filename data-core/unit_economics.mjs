// UNIT ECONOMICS — cost to acquire and fulfil one treated patient, agent-led vs the traditional agency.
//
// This is the model the whole company rests on: if an AI-native facilitator cannot serve a patient for
// materially less than a coordinator-staffed agency, there is no business, only a nicer UI.
//
// HONESTY CONTRACT: package prices are pulled LIVE from the data core (real, cited). Everything else is an
// ASSUMPTION, is labelled as one, and carries a `source` naming who must confirm it. Assumptions marked
// ASK are the exact questions to put to Aster / Manipal / Fortis — this file doubles as that question list.
// Do not quote any ASK figure externally until it has been replaced with a real one.
//
//   npm run economics              · npm run economics -- --commission 0.18 --conv 0.04
import { open } from "./db.mjs";

const db = open();
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };

// ── Grounded input: what a treated patient is actually worth ─────────────────────────────────────────
// Package value drives everything. Taken from the cited category_price rows, not invented.
const cats = db.prepare(
  `SELECT c.id, c.name, AVG((p.india_low + p.india_high) / 2.0) AS pkg
     FROM category c JOIN category_price p ON p.category_id = c.id
    GROUP BY c.id ORDER BY pkg DESC`).all();

// ── Assumptions (every one needs a real number before this leaves the building) ──────────────────────
const A = {
  commission:   { v: arg("commission", 0.15), unit: "of package", source: "ASK — the actual facilitator rate Aster/Manipal pay today" },
  agentPadding: { v: 0.30, unit: "of package", source: "REPORTED — 25–35% padding built into international quotes to fund agent commissions (Todd, industry analysis)" },

  // Funnel — inquiry to treated. The single most important number and the one most often guessed.
  leadToQualified: { v: arg("q", 0.35), unit: "rate", source: "ASK — what share of international inquiries are clinically/financially viable" },
  qualifiedToQuoted:{ v: 0.70, unit: "rate", source: "ASSUMED — hospital returns an opinion + estimate" },
  quotedToTreated: { v: arg("conv", 0.12), unit: "rate", source: "ASK — the conversion that actually matters; agencies rarely publish it" },

  // Traditional agency cost structure
  coordinatorSalary:{ v: 700,  unit: "$/month", source: "ASSUMED — India international-patient coordinator, fully loaded" },
  leadsPerCoord:   { v: 60,   unit: "leads/month", source: "ASSUMED — a coordinator working WhatsApp across time zones and languages" },
  subAgentCut:     { v: 0.40, unit: "of commission", source: "REPORTED — source-market sub-agents take a large share of the facilitator fee" },
  agencyPaidMedia: { v: 45,   unit: "$/lead", source: "ASSUMED — paid search on high-intent medical-travel terms" },

  // Agent-led cost structure
  llmPerLead:      { v: 0.12, unit: "$/lead", source: "MEASURED-ish — multi-turn WhatsApp conversation on the Gemini-flash tier; free tier today" },
  humanOversight:  { v: 0.25, unit: "hours/qualified lead", source: "ASSUMED — approval clicks in Studio + exception handling" },
  oversightRate:   { v: 12,   unit: "$/hour", source: "ASSUMED — a clinically-literate reviewer, not a coordinator" },
  organicShare:    { v: 0.60, unit: "of leads", source: "ASSUMED — content engine share; the rest paid" },
  agentPaidMedia:  { v: 45,   unit: "$/lead", source: "same as agency — no advantage claimed on media cost" },
  concierge:       { v: 40,   unit: "$/treated patient", source: "ASSUMED — logistics APIs, interpreter minutes, comms at fulfilment" },
};

// ── The model ────────────────────────────────────────────────────────────────────────────────────────
const funnel = A.leadToQualified.v * A.qualifiedToQuoted.v * A.quotedToTreated.v;   // lead → treated
const leadsPerPatient = 1 / funnel;

function model(kind, pkg) {
  const revenue = pkg * A.commission.v;
  let acquisition, fulfilment, note;
  if (kind === "agency") {
    const perLead = A.agencyPaidMedia.v + (A.coordinatorSalary.v / A.leadsPerCoord.v);
    acquisition = perLead * leadsPerPatient;
    fulfilment  = revenue * A.subAgentCut.v;                    // the sub-agent takes a cut of the fee itself
    note = "coordinator time scales linearly with leads; sub-agent takes a cut of the fee";
  } else {
    const media = A.agentPaidMedia.v * (1 - A.organicShare.v);  // organic content carries the majority
    const perLead = media + A.llmPerLead.v;
    const oversight = A.humanOversight.v * A.oversightRate.v * (leadsPerPatient * A.leadToQualified.v);
    acquisition = perLead * leadsPerPatient + oversight;
    fulfilment  = A.concierge.v;
    note = "LLM cost is ~flat per lead; humans touch only qualified leads and exceptions";
  }
  const contribution = revenue - acquisition - fulfilment;
  return { revenue, acquisition, fulfilment, contribution, margin: contribution / revenue, note };
}

// ── Output ───────────────────────────────────────────────────────────────────────────────────────────
const $ = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString();
const pct = (n) => `${Math.round(n * 100)}%`;

console.log(`\n  UNIT ECONOMICS — cost to acquire and fulfil one treated patient`);
console.log(`  Funnel: lead → qualified ${pct(A.leadToQualified.v)} → quoted ${pct(A.qualifiedToQuoted.v)} → treated ${pct(A.quotedToTreated.v)}`);
console.log(`  ⇒ ${pct(funnel)} of leads become patients — ${leadsPerPatient.toFixed(1)} leads per treated patient`);
console.log(`  Commission: ${pct(A.commission.v)} of package\n`);

console.log(`  ${"Category".padEnd(14)}${"Package".padStart(9)}${"Fee".padStart(9)}${"  │"}${"CAC".padStart(9)}${"Fulfil".padStart(9)}${"Contrib".padStart(9)}${"Margin".padStart(8)}`);
console.log(`  ${"─".repeat(14)}${"─".repeat(27)}${"─".repeat(35)}`);
for (const c of cats) {
  for (const kind of ["agency", "agent"]) {
    const m = model(kind, c.pkg);
    const label = kind === "agency" ? "  ├ agency" : "  └ MedYatra";
    if (kind === "agency") console.log(`  ${c.name.slice(0, 13).padEnd(14)}${$(c.pkg).padStart(9)}${$(m.revenue).padStart(9)}  │`);
    console.log(`  ${label.padEnd(14)}${"".padStart(9)}${"".padStart(9)}  │${$(m.acquisition).padStart(9)}${$(m.fulfilment).padStart(9)}${$(m.contribution).padStart(9)}${pct(m.margin).padStart(8)}`);
  }
}

// The headline comparison on the flagship category.
const flagship = cats.find((c) => /cardiac|heart/i.test(c.name)) || cats[0];
const ag = model("agency", flagship.pkg), me = model("agent", flagship.pkg);
console.log(`\n  ON ${flagship.name.toUpperCase()} (package ${$(flagship.pkg)}):`);
console.log(`    Agency   — CAC ${$(ag.acquisition)}, contribution ${$(ag.contribution)} (${pct(ag.margin)} of fee)`);
console.log(`    MedYatra — CAC ${$(me.acquisition)}, contribution ${$(me.contribution)} (${pct(me.margin)} of fee)`);
console.log(`    Δ contribution per patient: ${$(me.contribution - ag.contribution)}`);

// The patient-price argument: the padding that exists purely to fund the agent chain.
const padding = flagship.pkg * A.agentPadding.v;
console.log(`\n  THE PATIENT-SIDE ARGUMENT`);
console.log(`    Reported padding in international quotes (${pct(A.agentPadding.v)}): ~${$(padding)} on this package.`);
console.log(`    That padding exists to fund the agent chain. Removing the chain is what funds either a`);
console.log(`    lower patient price, restored hospital margin, or our take — the three-way split is the pitch.`);

console.log(`\n  ⚠ ASSUMPTIONS NEEDING A REAL NUMBER (ask Aster / Manipal / Fortis):`);
for (const [k, a] of Object.entries(A)) if (a.source.startsWith("ASK")) console.log(`    • ${k.padEnd(18)} currently ${a.v} ${a.unit.padEnd(14)} — ${a.source.slice(5)}`);
console.log(`\n  Sensitivity: npm run economics -- --conv 0.08   (the conversion rate dominates everything)\n`);
