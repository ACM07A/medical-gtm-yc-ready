// GROUND LOGISTICS AGENT — airport pickup and hospital transfer, deterministic scheduling over a plan.
// No real transport vendor is wired (that's a plugin, one API key away — see lib/plugins.mjs for the
// pattern); this computes the PLAN correctly — timing, vehicle sizing, what the driver needs to know — and
// drafts the confirmation message a human sends once a real vendor confirms.
import { checkMessage } from "../safety.mjs";

const BUFFER_MIN = { immigration: 45, baggage: 20, exit: 10 };   // realistic arrivals-hall buffer, not a guess dressed as one

export function planPickup({ flightNo, arrivalTime, terminal = null, city = "Bengaluru", attendants = 1, patientMobility = "walking" }) {
  if (!flightNo || !arrivalTime) return { error: "flightNo and arrivalTime are required" };
  const arrive = new Date(arrivalTime);
  if (isNaN(arrive.getTime())) return { error: "arrivalTime must be a parseable date/time" };
  const bufferMin = BUFFER_MIN.immigration + BUFFER_MIN.baggage + BUFFER_MIN.exit + (patientMobility === "wheelchair" ? 20 : 0);
  const meetTime = new Date(arrive.getTime() + bufferMin * 60000);
  const vehicle = attendants + 1 > 3 ? "van (4+ pax with luggage)" : patientMobility === "wheelchair" ? "wheelchair-accessible sedan" : "sedan";

  const plan = {
    flightNo, arrivalTime: arrive.toISOString(), terminal, city,
    driverMeetTime: meetTime.toISOString(), bufferMin, vehicle, attendants, patientMobility,
    instructions: [
      `Meet at arrivals, ${terminal ? `Terminal ${terminal}, ` : ""}holding a Canopus Care sign with the patient's name`,
      patientMobility === "wheelchair" ? "Arrange airport wheelchair assistance in advance via the airline — do this before the flight lands, not after" : null,
      `Confirm the driver has the hospital's exact address and the patient's phone number before departure`,
      `Text the patient's WhatsApp when the driver is 10 minutes out`,
    ].filter(Boolean),
  };

  const confirmText = `Pickup confirmed: ${flightNo} landing ${arrive.toLocaleString()}. Your driver (${vehicle}) will meet you at arrivals ` +
    `around ${meetTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, allowing time for immigration and baggage. ` +
    `They'll have your name on a sign and your hospital's address. We'll text you when they're 10 minutes away.`;
  const safe = checkMessage(confirmText, { outbound: true });
  return { plan, confirmText, safety: { verdict: safe.verdict, findings: safe.findings } };
}
