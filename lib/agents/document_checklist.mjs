// DOCUMENT CHECKLIST AGENT — the per-patient version of lib/visa.mjs's static facts: what THIS patient,
// travelling from THIS country, with THESE attendants, needs to assemble before they can travel.
//
// Deliberately deterministic, not LLM-generated. Visa document requirements are exactly the kind of fact
// where a model's fluent confidence is a liability — a plausible-sounding but wrong requirement is worse
// than no answer. So this agent is data-driven from lib/visa.mjs (MED_VISA_FACTS, attendantsAllowed), and
// its only "intelligence" is knowing which of the static facts apply to this specific case.
import { visaChecklist, visaSteps, attendantsAllowed, MED_VISA_FACTS } from "../visa.mjs";

export function documentChecklist({ countryCode, attendants = 1, category = null, hasInvitationLetter = false } = {}) {
  const allowed = attendantsAllowed(countryCode);
  const vc = visaChecklist(countryCode);   // { country, attendantsAllowed, documents[], facts }
  const items = vc.documents.map((d) => ({
    done: hasInvitationLetter && /invitation letter/i.test(d), item: d,
  }));

  if (attendants > allowed) {
    items.push({ done: false, item: `⚠ You've asked for ${attendants} attendant(s); ${countryCode || "your country"} is normally granted ${allowed}. Extra attendants need a separate justification — flag this to us before applying.` });
  } else if (attendants > 0) {
    items.push({ done: false, item: `Attendant visa documents × ${attendants} (same invitation letter covers this, separate application each)` });
  }

  items.push({ done: false, item: `FRRO registration: ${MED_VISA_FACTS.frro}` });

  return {
    countryCode, attendants, attendantsAllowed: allowed, category,
    items, steps: visaSteps(), facts: MED_VISA_FACTS,
  };
}
