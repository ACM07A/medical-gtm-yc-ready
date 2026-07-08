// Human research worklist — the reliable FREE bridge to named decision-makers. For each star account
// it emits ready-to-click, multi-combination search URLs (Google + LinkedIn + Bing) targeting the roles
// that route facilitator deals, plus the inferred email pattern. An operator opens each, reads the public
// LinkedIn result, and captures the confirmed name with:  node capture_poc.mjs <id> "Name" "Role" "<email|url>"
// 100% ToS-clean (a human clicks), and closes the last inch the automated CAPTCHA wall blocks.
//   node --experimental-sqlite data-core/research_worklist.mjs
import { open, logRun } from "./db.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ROLES = ["head international patient services", "GM international business", "medical value travel head", "international marketing manager"];
const g = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
const li = (q) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`;

const accounts = A(`SELECT * FROM partner WHERE opportunity='High' OR mvt_presence IN ('latent','emerging') ORDER BY fit_score DESC`);
// Real public hospital domains (for the inferred-email pattern). Public info; still verify before send.
const DOMAINS = {
  "ganga-ram": "sgrh.com", "hinduja": "hindujahospital.com", "frontier-lifeline": "frontierlifeline.com",
  "cytecare": "cytecare.com", "lv-prasad-eye": "lvpei.org", "artemis": "artemishospitals.com",
  "marengo": "marengoasia.com", "sakra-world": "sakraworldhospital.com", "sankara-nethralaya": "sankaranethralaya.org",
  "cloudnine": "cloudninecare.com",
};
const domainOf = (p) => DOMAINS[p.id] || (p.ips_channel_public || "").match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1] || `${p.id}.com (verify domain)`;

let md = `# Partner Research Worklist — named decision-makers\n\n`;
md += `> Free, ToS-clean bridge past the search-CAPTCHA wall. Open the links, read the **public** LinkedIn\n`;
md += `> result (name + business role — no login, no personal data), then capture:\n`;
md += `> \`node --experimental-sqlite data-core/capture_poc.mjs <partner_id> "Full Name" "Role" "<email or linkedin url>"\`\n`;
md += `> Target roles (in priority order): ${ROLES.map((r) => "**" + r + "**").join(" · ")}\n\n`;
md += `Ranked by fit (does this partner *need* us). ${accounts.length} accounts.\n\n---\n\n`;

for (const p of accounts) {
  const dom = domainOf(p);
  md += `## ${p.name}  \n`;
  md += `\`id: ${p.id}\` · fit **${p.fit_score}** · ${p.mvt_presence} · ${p.city || "—"} · email domain \`${dom}\`  \n`;
  md += `_${p.fit_reason || ""}_\n\n`;
  md += `**Searches** (open, read the LinkedIn result):\n`;
  md += `- LinkedIn people: [${p.name} international patient](${li(`${p.name} international patient services`)}) · [${p.name} medical value travel](${li(`${p.name} medical value travel`)})\n`;
  md += `- Google: [site:linkedin.com "${p.name}" intl patient](${g(`site:linkedin.com/in "${p.name}" (international patient OR "medical value travel" OR international business)`)})\n`;
  md += `- Google: ["${p.name}" head international patient](${g(`"${p.name}" "international patient services" (head OR manager OR director)`)})\n`;
  md += `- Google: ["${p.name}" GM international business](${g(`"${p.name}" (GM OR "general manager" OR VP) international business hospital`)})\n`;
  md += `- **Inferred email** once you have the name: \`first.last@${dom}\` (label INFERRED; verify)\n`;
  md += `- Capture → \`node --experimental-sqlite data-core/capture_poc.mjs ${p.id} "First Last" "Head – Intl Patient Services" "first.last@${dom}"\`\n\n`;
}

mkdirSync(join(ROOT, "outputs"), { recursive: true });
const out = join(ROOT, "outputs", "partner-research-worklist.md");
writeFileSync(out, md);
logRun(db, "Partner Sourcing", "Research worklist generated", `${accounts.length} star accounts · multi-combination search URLs + capture command`, "/worklist", "ok");
console.log(`Worklist → outputs/partner-research-worklist.md (${accounts.length} accounts). View at /worklist on the console.`);
db.close();
