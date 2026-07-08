// Zero-dependency .env loader. When a script runs OUTSIDE Claude (e.g. the scheduled factory loop),
// nothing has exported NVIDIA_API_KEY into the environment — so load it from the gitignored .env files.
// Only fills vars that aren't already set (a real env var always wins). No dotenv dependency.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv(files = ["integrations/.env", ".env"]) {
  for (const f of files) {
    let text;
    try { text = readFileSync(join(ROOT, f), "utf8"); } catch { continue; }
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      const key = m[1], val = m[2].replace(/^['"]|['"]$/g, "");
      if (!(key in process.env) || !process.env[key]) process.env[key] = val;
    }
  }
}
