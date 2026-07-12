// Downscale the WhatsApp infographic headers (2160² source) to compact JPEG data-URIs so the SHAREABLE
// sandbox artifact can embed them inline (the CSP blocks external hosts, and the raw PNGs are ~750KB each).
// Writes outputs/comms/img/header-datauris.json. If no local browser is found, exits cleanly (the artifact
// falls back to branded placeholder bands). Run: node --experimental-sqlite data-core/gen_header_datauris.mjs
import puppeteer from "puppeteer-core";
import { browserPath } from "../lib/browser.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NAMES = ["welcome", "how-it-works", "estimate-cardiac"];
const exe = browserPath();
if (!exe) { console.log("no local Edge/Chrome — skipping (artifact will use placeholder bands)"); process.exit(0); }

const browser = await puppeteer.launch({ executablePath: exe, headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const page = await browser.newPage();
  const out = {};
  for (const name of NAMES) {
    const src = "data:image/png;base64," + readFileSync(join(ROOT, "outputs/comms/img", name + ".png")).toString("base64");
    const uri = await page.evaluate(async (s) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = s; });
      const W = 680, scale = W / img.width, H = Math.round(img.height * scale);
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      c.getContext("2d").drawImage(img, 0, 0, W, H);
      return c.toDataURL("image/jpeg", 0.82);
    }, src);
    out["outputs/comms/img/" + name + ".png"] = uri;
    console.log(`  ${name}: ${Math.round(uri.length / 1024)}KB data-URI`);
  }
  writeFileSync(join(ROOT, "outputs/comms/img/header-datauris.json"), JSON.stringify(out));
  console.log(`✓ wrote outputs/comms/img/header-datauris.json (${Object.keys(out).length} headers)`);
} finally { await browser.close(); }
