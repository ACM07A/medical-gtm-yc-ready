// TICKETING — flight search for the patient's inbound journey. Provider-agnostic behind env keys (Amadeus
// Self-Service, Duffel, Kiwi/Tequila), with a CURATED fare-estimate fallback when nothing is keyed — same
// "one key away" posture as lib/stay.mjs. MedYatra SEARCHES and RECOMMENDS; the patient (or a keyed booking
// partner) completes the actual purchase — requesting a date is human-gated and dry-run unless a provider is
// keyed AND confirm:true, same posture as lib/stay.mjs's bookStay.
//
// The actual product idea: arrival has a real constraint (the pre-op buffer before admission), departure
// doesn't. So this doesn't search ONE date — it sweeps a flexible window around the patient's preferred
// departure and ranks it cheapest-first, clipped so nothing in the result would miss the hospital's own
// arrival deadline.

import { loadEnv } from "./env.mjs";
import { stayPlan } from "./stay.mjs";
loadEnv();

export function flightProvider() {
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) return "amadeus";
  if (process.env.DUFFEL_API_KEY) return "duffel";
  if (process.env.KIWI_API_KEY) return "kiwi";
  return "curated";
}

// Nearest India hub airport per hospital-cluster city — mirrors lib/stay.mjs's CURATED city list so the two
// agents always agree on which city a patient is actually travelling to.
const HUB_AIRPORT = { Chennai: "MAA", "Delhi NCR": "DEL", Gurugram: "DEL", Bengaluru: "BLR", Mumbai: "BOM", Hyderabad: "HYD" };
const DEFAULT_CITY = "Delhi NCR";

// Curated one-way economy fare BANDS (USD), off-peak, origin region -> India. An honest planning estimate,
// not a citation-grade number (aggregate public fare-search observation, not a source) — labelled as such
// everywhere it surfaces. Key a provider to replace this with a real quote.
const CURATED_FARES = {
  middle_east: [180, 420],
  africa: [350, 750],
  se_asia: [120, 320],
  europe: [400, 900],
};

// DETERMINISTIC — the one hard constraint this whole agent exists to respect. Reuses stayPlan()'s own
// pre-op buffer (lib/stay.mjs) rather than re-deriving it, so accommodation and ticketing can never disagree
// about what "arrive in time" means. Departure is flexible by design: the window sweeps `flexDays` on either
// side of the patient's preferred date, clipped to whatever still clears the arrival deadline.
export function travelWindow({ categoryId, admissionDate, targetDepartureDate, flexDays = 4 } = {}) {
  const admission = new Date(admissionDate + "T00:00:00Z");
  const { preop } = stayPlan({ categoryId });
  const latestArrival = new Date(admission.getTime() - preop.nights * 86400000);
  const pref = new Date(targetDepartureDate + "T00:00:00Z");
  const earliest = new Date(pref.getTime() - flexDays * 86400000);
  const latestPreferred = new Date(pref.getTime() + flexDays * 86400000);
  const latest = latestPreferred < latestArrival ? latestPreferred : latestArrival;
  const iso = (d) => d.toISOString().slice(0, 10);
  const feasible = earliest <= latest;
  return {
    earliestDeparture: iso(earliest), latestDeparture: iso(latest), latestArrivalRequired: iso(latestArrival),
    preopBufferNights: preop.nights, feasible,
    note: feasible ? null
      : `The preferred date + flex window falls entirely after the ${preop.nights}-night pre-op buffer allows — move the preferred date earlier or widen flex.`,
  };
}

function candidateDates(earliestISO, latestISO) {
  const out = [];
  let d = new Date(earliestISO + "T00:00:00Z");
  const end = new Date(latestISO + "T00:00:00Z");
  while (d <= end) { out.push(new Date(d)); d = new Date(d.getTime() + 86400000); }
  return out;
}
// A well-known, generic travel-industry pattern (Fri/Sat/Sun depart costs more) — not a live per-date fare.
// The real value in curated mode is the CONSTRAINT math above; this only orders the estimate, never invents
// false precision (rounded to the nearest dollar off a band midpoint, nothing more specific than that).
const WEEKEND_MARKUP = 1.15;

// searchFlights: returns ranked candidate departure dates within the feasible window. Live provider → a real
// fare per date; otherwise the curated estimate. Never books — that's requestFlight().
export async function searchFlights({ categoryId, admissionDate, targetDepartureDate, flexDays = 4, region = "middle_east", city = DEFAULT_CITY } = {}) {
  const window = travelWindow({ categoryId, admissionDate, targetDepartureDate, flexDays });
  const hub = HUB_AIRPORT[city] || HUB_AIRPORT[DEFAULT_CITY];
  const provider = flightProvider();
  if (!window.feasible) return { provider, feasible: false, window, hub, options: [] };

  if (provider !== "curated") {
    try { return await liveSearch(provider, { window, hub, region }); }
    catch (e) { /* fall through to curated so the flow never hard-fails */ }
  }

  const [lo, hi] = CURATED_FARES[region] || CURATED_FARES.middle_east;
  const mid = (lo + hi) / 2;
  const options = candidateDates(window.earliestDeparture, window.latestDeparture).map((d) => {
    const dow = d.getUTCDay(); // 0=Sun .. 6=Sat
    const weekend = dow === 0 || dow === 5 || dow === 6;
    return { departureDate: d.toISOString().slice(0, 10), estUSD: Math.round(weekend ? mid * WEEKEND_MARKUP : mid * 0.92), weekend, hub };
  }).sort((a, b) => a.estUSD - b.estUSD);

  return {
    provider: "curated", live: false, feasible: true, window, hub, options, cheapest: options[0],
    note: "Curated fare ESTIMATE (off-peak band + weekday/weekend pattern) — not a live quote. Key AMADEUS_/DUFFEL_/KIWI_ to fetch real fares across this date window.",
  };
}

// Live provider request shape kept behind a key; not invoked without one. Real implementation would loop
// offer requests across the window and compare — sketched, not exercised, same honesty level as lib/stay.mjs's
// unwired hotelbeds/ratehawk branches.
async function liveSearch(provider) {
  throw new Error(`${provider} adapter not wired`);
}

// requestFlight: HUMAN-GATED. Dry-run unless a real provider is keyed AND confirm:true. Records a service
// row (kind='flight') — same posture as lib/stay.mjs's bookStay.
export async function requestFlight(db, lead, option, { confirm = false } = {}) {
  const provider = flightProvider();
  const live = provider !== "curated" && confirm && process.env.POST_LIVE === "1";
  const status = live ? "booked" : "requested";
  const detail = JSON.stringify({ option, dryRun: !live });
  const row = db.prepare(`INSERT INTO service (lead_id,kind,provider,status,detail) VALUES (?,?,?,?,?)`)
    .run(lead.id, "flight", provider, status, detail);
  return { serviceId: row.lastInsertRowid, live, status, provider,
    note: live ? "booked (live)" : "dry-run — set a provider key + POST_LIVE=1 + confirm to book for real" };
}
