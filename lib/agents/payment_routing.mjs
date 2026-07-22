// PAYMENT ROUTING AGENT — routes a patient down the right payment path, per the three real channels this
// session's research found (see BUSINESS_STATUS.md §3 / the GOP research): self-pay, insured (GOP/TPA
// pre-authorisation), or government-sponsored (Oman MoH-style, or Kenya SHA's narrow overseas programme).
// Each has a genuinely different document set and timeline, and getting a patient onto the wrong path
// wastes weeks — this agent's only job is picking the right one and stating what happens next in it.
//
// Deterministic on purpose: this is a lookup + a plain-language next step, not something requiring
// generation. Where the source research found hard constraints (SHA's ~$3,900 cap, 36-procedure list,
// 3-hospital list), they're encoded so this agent doesn't route someone toward a dead end.
import { checkMessage } from "../safety.mjs";

// Encodes what BUSINESS_STATUS.md §3 established: SHA's public programme is narrow enough to usually not
// apply; most Kenyan (and comparable) insured volume actually runs through private carriers.
const SHA_CAP_USD = 3900;
const SHA_HOSPITALS = ["Wockhardt Hospital", "Apollo Cancer Centre", "KIMS Hospital"];

// Other real institutional/GOP-payer corridors, named specifically (Sachin Rai interview, 2026-07-22 — one
// desk's real volume, not an exhaustive list). Each is a genuinely different process from SHA's, so this
// stays a lookup, not a merge into "sponsored_other": routing someone toward the wrong corridor wastes the
// same weeks a wrong self-pay/insured call would.
const NAMED_CORRIDORS = {
  UZ: "A government-backed corridor already moves meaningful volume into Indian hospitals (reported by one desk at roughly ₹12-13cr/month of a ~₹32-33cr total) — route through the Uzbekistan government's own referral process, not a direct-to-hospital approach.",
  ZM: "Embassy-referral corridor reported for compassionate/urgent cases — route through the Zambian embassy in Delhi, not a direct application.",
  TZ: "Embassy-referral corridor reported for compassionate/urgent cases — route through the Tanzanian embassy in Delhi, not a direct application.",
  IQ: "NGO-mediated referral corridor reported for Iraqi patients — route through the referring NGO, not a direct application.",
  NG: "NNPC (Nigeria National Petroleum Corporation) reported to sponsor employee/dependent treatment directly — confirm current employer sponsorship before assuming self-pay for an NNPC-linked patient.",
};

export function routePayment({ method, countryCode, packageEstimateLow = null, insurer = null, hasGOP = false, ourPartnerHospital = null }) {
  if (!method) return { error: "method is required: self_pay | insured | sponsored" };
  const cc = (countryCode || "").toUpperCase();

  if (method === "self_pay") {
    return { path: "self_pay", nextStep: "Deposit instructions go out once the hospital confirms the estimate. Full payment is made directly to the hospital — MedYatra never holds patient funds.",
      docsNeeded: ["Proof of funds (bank statement) for the deposit"] };
  }

  if (method === "insured") {
    if (hasGOP) return { path: "insured_gop_confirmed", nextStep: `A Guarantee of Payment is already on file with ${insurer || "the insurer"} — the hospital bills them directly; you're responsible only for any deductible/co-pay stated on the GOP.`,
      docsNeeded: ["The GOP letter itself, shared with the hospital's billing desk"] };
    return { path: "insured_needs_preauth", nextStep: `Before travel: we help you request pre-authorisation from ${insurer || "your insurer/TPA"} — this typically takes days to a few weeks and should start as early as possible, not after arrival.`,
      docsNeeded: ["Policy number + insurer/TPA contact", "The hospital's treatment estimate (needed to request pre-auth)"],
      warning: "Insurer settlement to the hospital typically runs 30–90 days after treatment, which affects hospital working capital — this is a real thing to ask your hospital partner about, not assume they want." };
  }

  if (method === "sponsored") {
    if (cc === "KE") {
      const fits = packageEstimateLow != null && packageEstimateLow <= SHA_CAP_USD;
      return { path: "sponsored_sha_kenya", eligible: fits,
        nextStep: fits
          ? `Kenya's SHA overseas programme caps at ~$${SHA_CAP_USD.toLocaleString()}/patient/year and only covers 36 listed procedures at 3 named Indian hospitals (${SHA_HOSPITALS.join(", ")}) — confirm this procedure and hospital are both on the current list before relying on this path.`
          : `The package estimate is above SHA's ~$${SHA_CAP_USD.toLocaleString()} cap — SHA sponsorship will not cover the full cost even if approved. Treat this as a partial-funding source at best, and check the private-insurer path too.`,
        docsNeeded: ["Referral from a Level 6 national referral hospital (KNH, MTRH, or similar)", "SHA approval — reported to take 7–14 working days once submitted, and reported approval volume is very low"] };
    }
    if (NAMED_CORRIDORS[cc]) {
      return { path: "sponsored_named_corridor", nextStep: NAMED_CORRIDORS[cc],
        docsNeeded: ["Referral/sponsorship letter from the named channel (embassy, NGO, employer, or government office)", "Confirm current terms directly before relying on them — one desk's reported experience, not a published policy"] };
    }
    return { path: "sponsored_other", nextStep: `${cc || "This market"}'s government-sponsorship route (e.g. Oman MoH funding treatment unavailable domestically) needs to be confirmed directly with the relevant ministry — the process and cap vary by country and we have not yet mapped this one.`,
      docsNeeded: ["Referral letter from the domestic treating physician confirming the treatment is unavailable locally"] };
  }

  return { error: `unknown method '${method}' — expected self_pay | insured | sponsored` };
}
