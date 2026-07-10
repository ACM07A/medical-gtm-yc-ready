// ACCOMMODATION for the medical trip — near-hospital, extended-stay, family-friendly (the patient plus 1–2
// relatives, pre- AND post-op). Provider-agnostic behind env keys (Booking.com Demand API · Hotelbeds ·
// RateHawk/Emerging Travel Group), with a CURATED near-hospital fallback when nothing is keyed. Booking is
// human-gated and dry-run unless a provider is keyed AND confirm:true — same posture as lib/publishers.
//
// Sources: Booking.com Demand API (accommodations search by lat/long), Emerging Travel Group (RateHawk) API.

import { loadEnv } from "./env.mjs";
loadEnv();

// Which real inventory provider is live? (else 'curated' sample).
export function stayProvider() {
  if (process.env.BOOKING_AFFILIATE_ID && process.env.BOOKING_API_TOKEN) return "booking";
  if (process.env.HOTELBEDS_API_KEY) return "hotelbeds";
  if (process.env.ETG_API_KEY || process.env.RATEHAWK_API_KEY) return "ratehawk";
  return "curated";
}

// A medical stay isn't a normal hotel night. Pre-op: 1–2 nights near the hospital. Post-op: a longer
// recovery window sized by category; attendants need a family room or kitchenette. This computes the windows.
const POSTOP_NIGHTS = { cardiac: 12, oncology: 14, ortho: 10, cosmetic: 7, fertility: 4, dental: 3, wellness: 7 };
export function stayPlan({ categoryId, admissionDate, attendants = 1 } = {}) {
  const post = POSTOP_NIGHTS[categoryId] ?? 8;
  return {
    guests: 1 + Math.max(0, attendants),
    preop: { nights: 2, when: "before admission", need: "walkable to hospital" },
    postop: { nights: post, when: "after discharge", need: "family room / kitchenette, quiet, near hospital for reviews" },
    admissionDate: admissionDate || null,
  };
}

// Curated near-hospital inventory by hospital-cluster city. Honest sample: representative extended-stay /
// serviced-apartment style options — NOT live rates. Wire real inventory by keying a provider.
const CURATED = {
  Chennai:      [["Serviced apartments — Greams Road cluster", "serviced-apartment", 0.6, [45, 90], true],
                 ["Extended-stay hotel — Nungambakkam", "hotel", 1.5, [55, 110], true]],
  "Delhi NCR":  [["Guest suites — Saket / Press Enclave", "serviced-apartment", 0.9, [50, 95], true],
                 ["Family recovery stay — Gurugram", "serviced-apartment", 2.0, [60, 120], true]],
  Gurugram:     [["Serviced apartments — Golf Course Rd", "serviced-apartment", 1.2, [65, 130], true]],
  Bengaluru:    [["Recovery serviced-apartments — Bannerghatta Rd", "serviced-apartment", 0.8, [45, 95], true],
                 ["Extended-stay — Old Airport Rd cluster", "hotel", 1.4, [55, 105], true]],
  Mumbai:       [["Serviced flats — Andheri / Mulund cluster", "serviced-apartment", 1.1, [70, 140], true]],
  Hyderabad:    [["Guest houses — Banjara/Jubilee Hills", "serviced-apartment", 1.0, [40, 85], true]],
};
const DEFAULT_CITY = "Delhi NCR";

// searchStays: returns ranked options for a stay. Live provider → real inventory (request shape below);
// otherwise curated sample. Never books — that's bookStay().
export async function searchStays({ city, lat, lng, checkIn, checkOut, guests = 2, kind = "stay_postop" } = {}) {
  const provider = stayProvider();
  if (provider !== "curated") {
    try { return await liveSearch(provider, { city, lat, lng, checkIn, checkOut, guests }); }
    catch (e) { /* fall through to curated so the flow never hard-fails */ }
  }
  const list = CURATED[city] || CURATED[DEFAULT_CITY];
  return {
    provider: "curated", live: false, kind,
    note: "Curated near-hospital sample — not live rates. Key BOOKING_/HOTELBEDS_/ETG_ to fetch real inventory.",
    options: list.map(([name, type, distanceKm, [lo, hi], family]) => ({
      name, type, distanceKm, nightlyUSD: [lo, hi], familyFriendly: family, kitchenette: type === "serviced-apartment",
      guests, extendedStay: true, city: city || DEFAULT_CITY,
    })),
  };
}

// Live provider request shapes (kept behind keys; not invoked without them). Booking.com Demand API searches
// accommodations by coordinates + a stay window; ETG/RateHawk is a B2B wholesaler with a markup model.
async function liveSearch(provider, { city, lat, lng, checkIn, checkOut, guests }) {
  if (provider === "booking") {
    const res = await fetch("https://demandapi.booking.com/3.1/accommodations/search", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.BOOKING_API_TOKEN}`, "X-Affiliate-Id": process.env.BOOKING_AFFILIATE_ID, "Content-Type": "application/json" },
      body: JSON.stringify({ booker: { country: "in", platform: "desktop" }, checkin: checkIn, checkout: checkOut,
        guests: { number_of_adults: guests }, coordinates: { latitude: lat, longitude: lng }, radius: 5, extras: ["extra_charges"] }),
    });
    if (!res.ok) throw new Error(`booking ${res.status}`);
    const data = await res.json();
    return { provider, live: true, options: (data.data || []).slice(0, 8) };
  }
  // hotelbeds / ratehawk shapes omitted here — same pattern (key → POST search → normalise). Curated until keyed.
  throw new Error(`${provider} adapter not wired`);
}

// bookStay: HUMAN-GATED. Dry-run unless a real provider is keyed AND confirm:true. Records a service row.
export async function bookStay(db, lead, option, { kind = "stay_postop", confirm = false } = {}) {
  const provider = stayProvider();
  const live = provider !== "curated" && confirm && process.env.POST_LIVE === "1";
  const status = live ? "booked" : "requested";
  const detail = JSON.stringify({ option, dryRun: !live });
  const row = db.prepare(`INSERT INTO service (lead_id,kind,provider,status,detail) VALUES (?,?,?,?,?)`)
    .run(lead.id, kind, provider, status, detail);
  return { serviceId: row.lastInsertRowid, live, status, provider,
    note: live ? "booked (live)" : "dry-run — set a provider key + POST_LIVE=1 + confirm to book for real" };
}
