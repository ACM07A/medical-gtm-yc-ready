// E-E-A-T / YMYL READINESS — the gate that decides whether organic content can realistically rank.
//
// Health and financial content is "Your Money or Your Life": search engines hold it to a far higher bar for
// Experience, Expertise, Authoritativeness and Trust than ordinary content. Volume does not fix this — a
// hundred unattributed, undated, uncited pages rank worse than five properly-sourced ones, and can pull the
// whole domain down. Since the economics say organic acquisition IS the business at mid-ticket, this file
// is not a nicety; it is the thing that decides whether the funnel has a top.
//
// THE HONEST RESOLUTION of a real tension: Canopus Care is a facilitator, so it cannot claim clinical
// authority, and pretending otherwise would fail both this gate and the safety gate in lib/safety.mjs.
// But a facilitator IS a legitimate first-hand authority on the things patients most need and nobody
// publishes honestly: what treatment actually costs, what a package includes and excludes, how the
// documents and visa work, how long you stay, and what goes wrong. So content is scoped to that lane,
// where our expertise is real and demonstrable — and anything clinical is explicitly deferred to the
// treating hospital. Staying in our lane is simultaneously the compliance answer and the ranking answer.

// Topics where a facilitator has genuine first-hand expertise. Content outside these needs a named
// clinical reviewer before it can be published — which today means it cannot be published.
export const IN_LANE = [
  "cost", "price", "package", "what's included", "visa", "documents", "invitation letter",
  "length of stay", "travel", "accommodation", "accreditation", "how to choose", "what to ask",
  "process", "timeline", "payment", "insurance", "interpreter", "attendant", "follow-up",
];

// Signals a YMYL page needs to carry. Each maps to something a reader (and a rater) can verify.
export const SIGNALS = {
  authored:    { weight: 2, why: "An unattributed health-adjacent page has no accountable author" },
  reviewed:    { weight: 2, why: "A visible last-reviewed date; price content decays fast and stale prices destroy trust" },
  cited:       { weight: 3, why: "Every price and claim traceable to a source the reader can check" },
  scoped:      { weight: 3, why: "States plainly that we are a facilitator and the hospital makes clinical decisions" },
  specific:    { weight: 2, why: "Real numbers and named institutions, not generalities — the difference between experience and paraphrase" },
  limitations: { weight: 1, why: "Says what the page does NOT cover; hedging honestly outperforms false completeness" },
};

// EVERY signal is verified FROM THE PAGE, never from metadata the caller supplies. An earlier version took
// `author` and `reviewed_at` as arguments and scored them present whenever they were passed — so every page
// scored 99/100 and the gate measured nothing. A check that cannot fail is not a check. The same failure
// mode as a guardrail that returns "pass" while holding blocking findings: detection theatre.
const RE = {
  // A reader must be able to VERIFY a claim, which means a named source or a URL — not merely a number.
  cited: /\((?:source|per|via)[^)]{4,}\)|\bhttps?:\/\/|\b(?:according to|as published by|data from)\s+[A-Z][\w&.'-]+/,
  // The scope disclaimer has to say what we are NOT, not just contain the word "facilitator" once.
  scoped: /facilitator[^.]{0,80}\b(not|never)\b[^.]{0,60}\b(provider|hospital|clinical|medical advice)\b|not a (?:healthcare )?provider/i,
  // A visible review date the reader can see, in the page body.
  reviewed: /\b(?:last )?(?:reviewed|updated)\b[^.\n]{0,30}\b(?:20\d{2}-\d{2}-\d{2}|\w+ 20\d{2})/i,
  // Named authorship in the page, not a database column.
  authored: /\b(?:written|reviewed|prepared) by\b[^.\n]{3,60}/i,
  // Specificity means named institutions or accreditations AND real figures — generalities are paraphrase.
  specificNamed: /\b(?:JCI|NABH|NABL)\b|\b(?:Apollo|Fortis|Manipal|Aster|Medanta|Narayana|Hinduja|Ganga Ram|Artemis)\b/,
  specificNum: /\$\s?[\d,]{3,}/,
  // Exclusions must be concrete about what the money does not buy.
  limitations: /\b(?:does not (?:include|cover)|not included|excludes?)\b[^.\n]{0,80}\b(?:flight|visa|stay|accommodation|complication|follow-up|travel)\b/i,
};

// Score a draft from its own text. Returns { score 0-100, ready, missing[] } — `ready` gates publication.
export function eeatCheck(text, meta = {}) {
  const present = {
    authored: RE.authored.test(text),
    reviewed: RE.reviewed.test(text),
    cited: RE.cited.test(text),
    scoped: RE.scoped.test(text),
    specific: RE.specificNamed.test(text) && RE.specificNum.test(text),
    limitations: RE.limitations.test(text),
  };
  const total = Object.values(SIGNALS).reduce((s, x) => s + x.weight, 0);
  const got = Object.entries(SIGNALS).reduce((s, [k, x]) => s + (present[k] ? x.weight : 0), 0);
  const missing = Object.keys(SIGNALS).filter((k) => !present[k]).map((k) => ({ signal: k, why: SIGNALS[k].why }));
  const score = Math.round((got / total) * 100);
  // The three weight-3 and weight-2 trust signals are non-negotiable; a high score built by passing the
  // easy checks while failing `cited` or `scoped` is exactly the failure mode this guard exists to stop.
  const ready = score >= 75 && present.cited && present.scoped && present.reviewed;
  return { score, ready, missing, present };
}

// Is this page inside the lane where a facilitator is a credible authority?
export function inLane(titleOrTopic = "") {
  const t = titleOrTopic.toLowerCase();
  return IN_LANE.some((k) => t.includes(k));
}

// JSON-LD for a published page. Type is deliberately Article, NOT MedicalWebPage: MedicalWebPage asserts
// medical authorship we do not have, and mis-declaring it is both a trust risk and a compliance one.
export function jsonLd({ title, description, url, author, reviewedAt, publisher = "Canopus Care", citations = [] }) {
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: title, description,
    author: { "@type": "Organization", name: author || publisher },
    publisher: { "@type": "Organization", name: publisher },
    dateModified: reviewedAt || new Date().toISOString().slice(0, 10),
    isAccessibleForFree: true,
    ...(url ? { mainEntityOfPage: { "@type": "WebPage", "@id": url } } : {}),
    ...(citations.length ? { citation: citations.map((c) => ({ "@type": "CreativeWork", name: c })) } : {}),
  };
  return JSON.stringify(ld);
}

// The trust block every published page carries: who wrote it, when it was reviewed, what it is not.
// The block is not a compliance footer bolted on to satisfy the checker — every line is something a reader
// weighing a five-figure decision genuinely needs and almost never gets: who wrote this, when, where the
// numbers came from, what the money does NOT buy, and what we are not qualified to tell them.
export function trustBlock({ author = "Canopus Care editorial", reviewedAt, sources = [] } = {}) {
  const d = reviewedAt || new Date().toISOString().slice(0, 10);
  // Name the sources. "According to published pricing" cites nobody and is the exact vagueness the claims
  // linter tags elsewhere; a reader can only check a source that has a name.
  const cites = sources.length ? sources.join("; ")
    : "Vaidam and MediGence published package pricing, cross-checked against accredited-hospital rate cards and our own partner quotes where available";
  return `\n\n---\n\n### About this page\n\n` +
    `Written by ${author}. Last reviewed on ${d}.\n\n` +
    `**Where these prices come from.** Figures are indicative package ranges, according to ${cites}. ` +
    `They are not quotes — your own price depends on the hospital's assessment of your reports, and prices ` +
    `move, which is why the review date above matters.\n\n` +
    `**What the price does not include.** A package price does not cover flights, your visa fee, an extended ` +
    `stay if recovery takes longer than planned, your attendant's costs, or the cost of managing a ` +
    `complication. Ask for these in writing before you travel.\n\n` +
    `**What this page is not.** Canopus Care is a facilitator, not a healthcare provider. Nothing here is medical ` +
    `advice, a diagnosis, or a recommendation to have any particular treatment. Those decisions belong to you ` +
    `and to the treating hospital's clinical team.\n`;
}
