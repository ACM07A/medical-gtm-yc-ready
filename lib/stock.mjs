// Free STOCK PHOTO adapter — real photos for the human element (patients, doctors, hospitals) so we avoid
// uncanny AI faces. Pexels (free key, high quality) when keyed; Openverse (Creative Commons, NO key) as the
// free default. Returns a local file + the attribution/credit to display. Keep AI gen for graphics/abstract,
// infographics (lib/infographic.mjs) for data, and this for photography.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function provider() { return process.env.PEXELS_API_KEY ? "pexels" : "openverse"; }
export function available() { return true; }   // Openverse needs no key

function saveImg(outPath, buf, label, credit) {
  const ext = (buf[0] === 0xff && buf[1] === 0xd8) ? "jpg" : (buf[0] === 0x89) ? "png" : "jpg";
  const finalPath = outPath.replace(/\.[a-z0-9]+$/i, `.${ext}`);
  mkdirSync(dirname(finalPath), { recursive: true });
  writeFileSync(finalPath, buf);
  return { path: finalPath, source: label, credit };
}

// Find + download one stock photo for a query. Returns { path, source, credit } or throws.
export async function fetchStock(query, outPath, { orientation = "square" } = {}) {
  const P = provider();
  if (P === "pexels") {
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=${orientation}`, {
      headers: { Authorization: process.env.PEXELS_API_KEY }, signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`pexels ${r.status}`);
    const ph = (await r.json()).photos?.[0];
    if (!ph) throw new Error("pexels: no result");
    const img = await fetch(ph.src.large2x || ph.src.large);
    return saveImg(outPath, Buffer.from(await img.arrayBuffer()), "pexels", `Photo by ${ph.photographer} on Pexels`);
  }
  // Openverse — Creative Commons, commercial-use filter, no key.
  const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&page_size=1`, {
    headers: { "User-Agent": "Canopus Care/1.0" }, signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`openverse ${r.status}`);
  const it = (await r.json()).results?.[0];
  if (!it) throw new Error("openverse: no result");
  const img = await fetch(it.url, { signal: AbortSignal.timeout(20000) });
  if (!img.ok) throw new Error(`openverse image ${img.status}`);
  return saveImg(outPath, Buffer.from(await img.arrayBuffer()), "openverse", `${it.title || "image"} — ${it.creator || "unknown"} (${it.license?.toUpperCase() || "CC"})`);
}
