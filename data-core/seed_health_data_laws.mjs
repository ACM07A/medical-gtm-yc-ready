// HEALTH DATA LAW REGISTER — per-target-market medical-data law, for all 22 source markets + India as the
// destination. This is the legal layer under lib/vault.mjs (residencyCheck reads it before any clinical
// record is stored) and the answer to "for each target market, identify medical data laws".
//
// HONESTY DISCIPLINE: every entry is researched knowledge, recorded so counsel can verify it — status is
// 'unverified' on every row, deliberately, and NOTHING goes live on an unverified row (same pattern as the
// market regulatory gate). Where a market has no comprehensive law, the entry says so and the GDPR standard
// applies as our floor anyway — GDPR is the backbone of the architecture, not the minimum we can get away with.
//   node --experimental-sqlite data-core/seed_health_data_laws.mjs
import { open, logRun } from "./db.mjs";
const db = open();
const RETRIEVED = "2026-07-22";
const SRC = "assistant research — VERIFY WITH LOCAL COUNSEL before any live processing";

// [code, law, regulator, transfer_rule, key_constraints, consent_basis]
const LAWS = [
  // ── Middle East ──
  ["IQ", "No comprehensive data-protection law (constitutional privacy Art. 17; draft law pending)", "—",
   "no_comprehensive_law", "No dedicated health-data regime. Apply the GDPR standard as our floor.", "explicit consent (our standard, not local law)"],
  ["OM", "Personal Data Protection Law, Royal Decree 6/2022", "Ministry of Transport, Communications & IT",
   "adequacy_or_sccs", "Health data is sensitive — processing requires a MTCIT permit. Transfers restricted where prejudicial.", "explicit consent + ministry permit for health data"],
  ["YE", "No comprehensive data-protection law", "—",
   "no_comprehensive_law", "No dedicated regime. GDPR floor applies.", "explicit consent (our standard)"],
  ["AE", "Federal Law No. 2/2019 (ICT in Health Fields) + PDPL 45/2021", "MoHAP / UAE Data Office",
   "in_country_only", "Health data relating to UAE-provided services may NOT be stored or transferred outside the UAE absent a case-by-case authority exception — a model prompt is a transfer too. In-country hosting required.", "explicit consent AND authority exception for any transfer"],
  ["SA", "Personal Data Protection Law (M/19 2021, amended 2023; enforced 2024)", "SDAIA",
   "adequacy_or_sccs", "Health data is sensitive; transfers need a lawful basis + SDAIA conditions. Historic health-sector localization practice — verify current scope.", "explicit consent for sensitive data"],
  // ── Africa ──
  ["NG", "Nigeria Data Protection Act 2023", "NDPC",
   "adequacy_or_sccs", "Health data is sensitive; cross-border transfer needs adequacy or safeguards + recorded consent.", "explicit, purpose-specific consent"],
  ["KE", "Data Protection Act 2019", "ODPC",
   "adequacy_or_sccs", "Health data is sensitive; transfer needs proof of safeguards; ODPC registration for controllers.", "explicit consent, recorded and purpose-specific"],
  ["ET", "Personal Data Protection Proclamation No. 1321/2024", "Ethiopian Communications Authority",
   "adequacy_or_sccs", "New (2024) — health data sensitive; transfer conditions still maturing in practice. Verify implementing directives.", "explicit consent"],
  ["SD", "No comprehensive data-protection law", "—",
   "no_comprehensive_law", "No dedicated regime. GDPR floor applies.", "explicit consent (our standard)"],
  ["TZ", "Personal Data Protection Act, No. 11 of 2022", "PDPC Tanzania",
   "adequacy_or_sccs", "Controller registration required; health data sensitive; transfers restricted without adequacy/consent.", "explicit consent"],
  ["ZM", "Data Protection Act, No. 3 of 2021", "Office of the Data Protection Commissioner",
   "localization_copy", "Sensitive personal data (incl. health) subject to localization provisions — verify current commencement + scope of the server-in-Zambia requirement.", "explicit consent"],
  ["ZW", "Cyber and Data Protection Act 2021", "POTRAZ",
   "adequacy_or_sccs", "Health data sensitive; transfers need adequacy or consent.", "explicit consent"],
  ["NA", "No comprehensive law in force (Data Protection Bill pending)", "—",
   "no_comprehensive_law", "Bill pending — track it. GDPR floor applies meanwhile.", "explicit consent (our standard)"],
  ["CM", "Law No. 2024/017 on Personal Data Protection (Dec 2024)", "ANTIC (verify designated authority)",
   "adequacy_or_sccs", "Very new — implementing decrees may still be pending. Verify health-data specifics and transfer mechanics.", "explicit consent"],
  // ── Central Asia ──
  ["UZ", "Law on Personal Data ZRU-547 (2019, amended 2021)", "Personal Data Protection Center (Uzkomnazorat)",
   "localization_copy", "LOCALIZATION: personal data of Uzbek citizens must be processed/stored on servers physically in Uzbekistan — an in-country replica is required before going live.", "written/explicit consent"],
  ["KZ", "Law on Personal Data and its Protection, No. 94-V (2013, amended)", "Ministry of Digital Development",
   "localization_copy", "LOCALIZATION: personal-data databases on Kazakh citizens must be stored in Kazakhstan. Cross-border transfer needs consent + destination protection.", "explicit consent"],
  ["TJ", "Law on Personal Data Protection (2018)", "Communications Service under the Government",
   "consent_based", "Consent-based transfers; health data sensitive. Enforcement practice limited — apply GDPR floor.", "explicit consent"],
  ["KG", "Law on Personal Information, No. 58 (2008, amended)", "State Agency for Personal Data Protection",
   "consent_based", "Consent-based; 2021+ amendments touch localization for some processing — verify current scope.", "explicit consent"],
  ["TM", "Law on Personal Data (2017)", "—",
   "consent_based", "Consent-based on paper; restrictive information environment in practice. GDPR floor applies.", "explicit consent"],
  // ── SE Asia + Europe ──
  ["MM", "No comprehensive data-protection law (Cybersecurity Law 2025 touches data — verify scope)", "—",
   "no_comprehensive_law", "No dedicated health-data regime. GDPR floor applies.", "explicit consent (our standard)"],
  ["GB", "UK GDPR + Data Protection Act 2018", "ICO",
   "adequacy_or_sccs", "Health data = special category (Art. 9). Transfer out of the UK needs adequacy (India has none) → SCCs/IDTA + transfer risk assessment.", "explicit consent (Art. 9(2)(a))"],
  ["IE", "EU GDPR + Data Protection Act 2018 (IE)", "DPC Ireland",
   "adequacy_or_sccs", "Health data = special category. EU→India transfer needs SCCs + TIA; the vault's EU-hosted backend keeps storage inside the EU.", "explicit consent (Art. 9(2)(a))"],
  // ── Destination ──
  ["IN", "Digital Personal Data Protection Act 2023 (destination-side)", "Data Protection Board of India",
   "consent_based", "Applies to our processing IN India. Consent-manager framework; transfers allowed except to blacklisted countries. Health data handling by the hospital is additionally governed by clinical-establishment rules.", "verifiable consent, purpose-limited"],
];

const stmt = db.prepare(`INSERT INTO health_data_law (market_code, law_name, regulator, transfer_rule, key_constraints, consent_basis, status, source, retrieved)
  VALUES (?,?,?,?,?,?, 'unverified', ?, ?)
  ON CONFLICT(market_code) DO UPDATE SET law_name=excluded.law_name, regulator=excluded.regulator,
    transfer_rule=excluded.transfer_rule, key_constraints=excluded.key_constraints, consent_basis=excluded.consent_basis,
    source=excluded.source, retrieved=excluded.retrieved`);
for (const [code, law, reg, rule, constraints, consent] of LAWS) stmt.run(code, law, reg, rule, constraints, consent, SRC, RETRIEVED);

logRun(db, "Compliance", "Health-data-law register seeded", `${LAWS.length} jurisdictions (all UNVERIFIED — counsel must sign off before live)`, null, "pending");

// report
const RULE_ORDER = { in_country_only: 0, localization_copy: 1, adequacy_or_sccs: 2, consent_based: 3, no_comprehensive_law: 4 };
const rows = db.prepare(`SELECT * FROM health_data_law ORDER BY market_code`).all()
  .sort((a, b) => (RULE_ORDER[a.transfer_rule] ?? 9) - (RULE_ORDER[b.transfer_rule] ?? 9));
console.log(`\nHEALTH DATA LAW REGISTER — ${rows.length} jurisdictions, strictest first (ALL unverified until counsel signs off):\n`);
for (const r of rows) {
  const flag = r.transfer_rule === "in_country_only" ? "⛔ in-country only " :
               r.transfer_rule === "localization_copy" ? "⚠ localization    " :
               r.transfer_rule === "adequacy_or_sccs" ? "· SCCs/adequacy   " :
               r.transfer_rule === "consent_based" ? "· consent-based   " : "○ no law (GDPR floor)";
  console.log(`  ${r.market_code}  ${flag}  ${r.law_name.slice(0, 78)}`);
}
console.log(`\n  ⛔ = live vault must be hosted IN that country (UAE).  ⚠ = in-country replica needed (UZ/KZ/ZM).`);
console.log(`  GDPR is the architecture's floor everywhere, including markets with no law of their own.`);
db.close();
