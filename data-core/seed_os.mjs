import { open } from "./db.mjs";
import { seedDemoOs } from "./os_core.mjs";

const db = open();
seedDemoOs(db);
const cases = db.prepare(`SELECT count(*) c FROM patient_case`).get().c;
const agents = db.prepare(`SELECT count(*) c FROM agent_definition`).get().c;
const vendors = db.prepare(`SELECT count(*) c FROM vendor`).get().c;
console.log(`✓ MedYatra OS demo seeded: ${cases} cases, ${agents} agents, ${vendors} vendors`);
db.close();
