// CLINICAL SAFETY GUARDRAIL — the pre-send gate every patient-facing agent output must clear.
//
// WHY THIS EXISTS, PRECISELY: Canopus Care is a facilitator, not a provider. That is not a marketing position,
// it is the legal basis on which the company can operate at all without being a licensed healthcare entity
// in every source market. An agent that drifts one sentence into diagnosis, dosage, or prognosis converts
// the company into an unlicensed medical practice — in the patient's jurisdiction, where we have no
// standing, no indemnity, and no defence. So scope is enforced mechanically, not by prompt instruction.
//
// The design follows the pattern established by clinical LLM safety platforms (RagaAI Catalyst and the
// CareGuardAI multi-agent guardrail work): deterministic checks OUTSIDE the model, run on the output rather
// than trusted to the system prompt, with adversarial verification as a first-class test suite
// (see data-core/eval_safety.mjs). A guardrail a model can be talked out of is not a guardrail.
//
// Verdicts, in descending severity:
//   block     — must never reach a patient. Fails the gate outright.
//   escalate  — a human or the hospital's clinical team must handle this turn, not an agent.
//   review    — may send, but only after human approval (the existing Studio gate).
//   pass      — within facilitation scope.

// ── Scope violations ────────────────────────────────────────────────────────────────────────────────
// Language that only a treating clinician may use. Matched on OUR outbound text, not the patient's input.
const DIAGNOSIS = /\b(you (?:have|likely have|probably have|are suffering from)|this (?:is|sounds like|indicates|suggests)\s+(?:a|an)?\s*(?:cancer|tumou?r|infection|fracture|blockage|condition)|diagnos(?:is|ed|e) (?:is|as)|your (?:condition|diagnosis) is)\b/i;
const TREATMENT_ADVICE = /\b(you should (?:take|start|stop|undergo|have|get)|I (?:recommend|suggest|advise) (?:you )?(?:take|start|stop|undergo|surgery|the)|the best treatment for you|you (?:need|require) (?:surgery|an operation|chemotherapy|radiation))\b/i;
const DOSAGE = /\b\d+\s?(?:mg|mcg|ml|g|iu|units?)\b|\b(?:twice|thrice|once)\s+(?:a|per)\s+day\b|\bevery\s+\d+\s+hours?\b/i;
const PROGNOSIS = /\b(survival rate|success rate of|you will (?:recover|be fine|be cured|walk again)|(?:guaranteed|assured) (?:recovery|outcome|success|cure)|life expectancy|chances of survival|\d+\s?% (?:success|cure|survival))\b/i;
const FITNESS_CALL = /\b(you (?:are|'re) (?:fit|safe|cleared) to (?:fly|travel|undergo)|safe for you to (?:fly|travel)|no risk (?:in|of) (?:flying|travelling|traveling))\b/i;

// ── Emergency detection (on the PATIENT's message) ───────────────────────────────────────────────────
// If someone is describing an emergency, the only safe behaviour is to stop the funnel and point at local
// emergency care. An agent that responds to "crushing chest pain" with a treatment quote is indefensible.
const EMERGENCY = /\b(chest pain|crushing pain|can'?t breathe|cannot breathe|struggling to breathe|unconscious|not responding|severe bleeding|bleeding heavily|stroke|slurred speech|face drooping|suicid|kill myself|overdose|seizure|convulsion|blue lips|no pulse)\b/i;

// ── Language coverage — the fail-closed rule ─────────────────────────────────────────────────────────
// The checks above are English patterns. The funnel is Arabic, Amharic, Burmese and Swahili, where they
// match NOTHING — an Arabic message stating a diagnosis sailed straight through the "100% passing" suite.
// Adding a few translated keywords would be worse than useless: it produces the *appearance* of coverage.
//
// So coverage is declared per language and the gate FAILS CLOSED. A language whose lexicon has not been
// validated by a native clinical reviewer cannot auto-send at all — it is forced to human review, every
// time, regardless of content. Coverage is earned by review, not asserted by writing regexes.
//
// `verified` flips to true only when a native speaker with clinical-language competence has signed off the
// patterns AND the adversarial suite has native-authored cases for that language (see 12_EVIDENCE_LOG).
const LEXICON = {
  en: { verified: true, reviewer: "internal — English patterns above", emergency: EMERGENCY },
  // Draft patterns: present so the gate can catch the obvious cases, but explicitly NOT trusted as coverage.
  ar: { verified: false, reviewer: null,
        emergency: /(ألم في الصدر|لا أستطيع التنفس|صعوبة في التنفس|نزيف شديد|فاقد الوعي|جلطة|انتحار|أريد أن أموت)/,
        clinical:  /(التشخيص هو|لديك سرطان|يجب أن تخضع|نضمن|معدل النجاح)/ },
  sw: { verified: false, reviewer: null,
        emergency: /(maumivu ya kifua|siwezi kupumua|kutokwa damu sana|amepoteza fahamu|kujiua)/i,
        clinical:  /(una saratani|unapaswa kufanyiwa upasuaji|tunahakikisha)/i },
  am: { verified: false, reviewer: null, emergency: /(የደረት ህመም|መተንፈስ አልችልም|ከባድ ደም መፍሰስ)/, clinical: null },
  my: { verified: false, reviewer: null, emergency: /(ရင်ဘတ်နာ|အသက်ရှူမရ|သွေးများစွာထွက)/, clinical: null },
};

// Script-based language detection. Crude on purpose: it only needs to answer "is this a language whose
// guardrails I can trust?", and the answer for anything unrecognised must be no.
export function detectLang(text = "") {
  if (/[؀-ۿ]/.test(text)) return "ar";
  if (/[ሀ-፿]/.test(text)) return "am";
  if (/[က-႟]/.test(text)) return "my";
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  // Swahili is Latin-script — detect by high-signal function words rather than script.
  if (/\b(?:naomba|asante|daktari|hospitali|matibabu|ninahitaji|tafadhali)\b/i.test(text)) return "sw";
  return /[A-Za-z]/.test(text) ? "en" : "unknown";
}

// What guardrail coverage do we actually have? Used by the eval suite and the readiness board.
export function languageCoverage() {
  return Object.entries(LEXICON).map(([code, l]) => ({ code, verified: l.verified, reviewer: l.reviewer }));
}

// ── Fabrication / commercial-honesty checks ──────────────────────────────────────────────────────────
const GUARANTEE = /\b(guarantee(?:d|s)?|promise(?:d)?|assured|100%\s*(?:safe|success)|risk[- ]free|no complications?)\b/i;
const FIRM_QUOTE = /\b(?:final|fixed|firm|confirmed)\s+(?:price|quote|cost)\b/i;

// ── PII ──────────────────────────────────────────────────────────────────────────────────────────────
// Direct identifiers that must never appear in text leaving our perimeter (a proposal, a social post, a
// benchmark, a model prompt). Patient-facing messages TO that patient are exempt — see `outbound` opt.
const PII = [
  [/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g, "email"],
  [/\b(?:\+?\d[\d\s-]{7,}\d)\b/g, "phone"],
  [/\b[A-Z]{1,2}\d{6,8}\b/g, "passport-like"],
  [/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "aadhaar-like"],
  [/\b(?:MRN|UHID|patient id)\s*[:#]?\s*\w+/gi, "medical-record-number"],
];

// ── Data residency ───────────────────────────────────────────────────────────────────────────────────
// Health data is governed where the CARE happened / the patient is, not where our server runs. The UAE is
// the sharp edge: Federal Law No. 2 of 2019 prohibits health data relating to services provided in the UAE
// from being transferred or generated outside it, except under a case-by-case exception granted by the
// emirate health authority (Ministerial Resolution 51 of 2021). A UAE-corridor patient therefore cannot
// have their records pulled into an Indian or US-hosted pipeline by default — including into a model
// prompt, which is a transfer. This table is a COMPLIANCE PROMPT, not legal advice; every 'restricted'
// market needs counsel sign-off recorded in market.regulatory_note before it goes live.
export const RESIDENCY = {
  AE: { rule: "restricted", basis: "UAE Federal Law No. 2/2019 + Ministerial Resolution 51/2021 — health data may not leave the UAE absent a case-by-case authority exception" },
  SA: { rule: "restricted", basis: "Saudi PDPL — transfer restrictions on sensitive/health data; verify current implementing regulations" },
  QA: { rule: "verify", basis: "Qatar data protection law — health data treated as special category; confirm transfer basis" },
  KW: { rule: "verify", basis: "Kuwait CITRA data privacy regulation — confirm transfer basis" },
  OM: { rule: "verify", basis: "Oman Personal Data Protection Law (2022) — confirm health-data transfer basis and MoH sponsorship terms" },
  GB: { rule: "adequacy", basis: "UK GDPR — India has no adequacy decision; requires IDTA/SCC + transfer risk assessment" },
  IE: { rule: "adequacy", basis: "EU GDPR Art.44-49 — India is not adequate; requires SCCs + TIA, Art.9 basis for health data" },
  KE: { rule: "consent", basis: "Kenya Data Protection Act 2019 — health data is sensitive; transfer needs consent or proof of safeguards" },
  NG: { rule: "consent", basis: "Nigeria Data Protection Act 2023 — transfer needs an adequacy/consent/contract basis" },
  IN: { rule: "permitted", basis: "India DPDP Act 2023 — transfers permitted by default, subject to the Government's negative list; sectoral rules override" },
};

// Is it lawful, on the face of it, to process this patient's health data in `destination`?
// Returns { allowed, rule, basis, requires } — 'requires' is the paperwork that must exist first.
export function residencyCheck(sourceMarket, destination = "IN") {
  const r = RESIDENCY[String(sourceMarket || "").toUpperCase()];
  if (!r) return { allowed: false, rule: "unknown", basis: `No residency rule recorded for ${sourceMarket}`, requires: "counsel review before any processing" };
  if (destination.toUpperCase() === String(sourceMarket).toUpperCase()) return { allowed: true, rule: "domestic", basis: "processed in the source jurisdiction", requires: null };
  const requires = {
    restricted: "an authority-granted exception, recorded, BEFORE any record leaves the country",
    adequacy: "SCCs/IDTA + a transfer risk assessment + an Art.9-equivalent basis for health data",
    consent:  "explicit, recorded, purpose-specific patient consent naming the destination",
    verify:   "counsel confirmation of the transfer basis",
    permitted: null,
  }[r.rule];
  return { allowed: r.rule === "permitted", rule: r.rule, basis: r.basis, requires };
}

// ── The gate ─────────────────────────────────────────────────────────────────────────────────────────
// Check one outbound agent message. `patientText` is what the patient last said (for emergency detection).
// `outbound` = true means it is going TO the patient (their own PII is fine); false means it is leaving our
// perimeter (a proposal, a post, a benchmark, a model prompt) and any direct identifier is a leak.
export function checkMessage(text, { patientText = "", outbound = true, sourceMarket = null, destination = "IN" } = {}) {
  const findings = [];
  const add = (severity, code, detail) => findings.push({ severity, code, detail });

  // Emergency detection runs in the PATIENT's language, not ours — someone in distress writes in their own.
  const patientLang = patientText ? detectLang(patientText) : "en";
  const pl = LEXICON[patientLang];
  if (patientText && ((pl?.emergency && pl.emergency.test(patientText)) || EMERGENCY.test(patientText)))
    add("escalate", "emergency-presentation", "Patient is describing a possible emergency — stop the funnel, direct to local emergency services, notify a human immediately.");

  // FAIL CLOSED on unverified languages. Our checks are English patterns; in Arabic, Amharic, Burmese or
  // Swahili they match nothing, so a clean "pass" would be an artefact of not looking. Force human review.
  const lang = detectLang(text);
  const cov = LEXICON[lang];
  if (!cov?.verified) {
    add("review", "unverified-language-coverage",
      `Message is ${lang === "unknown" ? "in an unrecognised language" : `in '${lang}'`}, which has no native-validated guardrail coverage. Automated scope checks cannot be trusted here — a human who reads ${lang} must approve before send.`);
    if (cov?.clinical && cov.clinical.test(text))
      add("block", "clinical-scope-nonenglish", `Draft ${lang} patterns matched clinical-scope language. Blocked pending native review.`);
  }

  if (DIAGNOSIS.test(text))        add("block", "diagnosis", "Text states or implies a diagnosis. Only the treating hospital may do this.");
  if (TREATMENT_ADVICE.test(text)) add("block", "treatment-advice", "Text recommends a treatment or procedure. Route to the hospital's clinical team.");
  if (DOSAGE.test(text))           add("block", "dosage", "Text contains a dose or medication schedule.");
  if (PROGNOSIS.test(text))        add("block", "prognosis", "Text asserts an outcome, survival or success rate.");
  if (FITNESS_CALL.test(text))     add("block", "fitness-to-fly", "Fitness to fly or to undergo treatment is a clinical determination, not ours.");
  if (GUARANTEE.test(text))        add("block", "guarantee", "Text guarantees a result. No outcome may ever be guaranteed.");
  if (FIRM_QUOTE.test(text))       add("review", "firm-quote", "Prices are indicative pending hospital assessment — 'final/fixed' overstates them.");

  if (!outbound) {
    for (const [re, kind] of PII) { const m = text.match(re); if (m) add("block", `pii-${kind}`, `${m.length} ${kind} identifier(s) in text leaving the patient perimeter.`); }
  }

  if (sourceMarket) {
    const r = residencyCheck(sourceMarket, destination);
    if (!r.allowed) add(r.rule === "restricted" || r.rule === "unknown" ? "block" : "review",
      `residency-${r.rule}`, `${sourceMarket}→${destination}: ${r.basis}. Requires: ${r.requires}`);
  }

  // `pass` MUST have a rank. Without it, `rank[w]` is undefined, every `>` comparison is false, and the
  // gate returns "pass" while holding a list of blocking findings — detection intact, enforcement silently
  // dead. This exact bug shipped for one commit and is why eval_safety.mjs asserts verdicts, not findings.
  const rank = { pass: 0, review: 1, escalate: 2, block: 3 };
  const verdict = findings.reduce((w, f) => (rank[f.severity] > rank[w] ? f.severity : w), "pass");
  return { verdict, pass: verdict === "pass", findings };
}

// The single line an operator sees. Deliberately blunt — a soft warning gets clicked through.
export function explain(result) {
  if (result.pass) return "✓ within facilitation scope";
  return result.findings.map((f) => `${f.severity.toUpperCase()} · ${f.code} — ${f.detail}`).join("\n");
}
