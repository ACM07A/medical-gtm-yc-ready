// Image-generation adapter — turns the Instagram carousel IMAGE BRIEFS into real images. Provider-agnostic.
// FREE-FIRST: defaults to Pollinations (no key, runs Flux/SD) so image gen works out of the box; a paid
// provider (OpenAI / Stability / NVIDIA) is a quality upgrade that's "just add the key".
//
//   IMAGE_PROVIDER=gemini     GEMINI_API_KEY=...     (Gemini 2.5 Flash Image / "Nano Banana" — best quality)
//   IMAGE_PROVIDER=openai     OPENAI_API_KEY=...     (gpt-image-1 / dall-e-3)
//   IMAGE_PROVIDER=stability  STABILITY_API_KEY=...  (stable-image core)
//   IMAGE_PROVIDER=nvidia     NVIDIA_API_KEY=...     (genai flux/sdxl — needs model access on the account)
//   (fallback)                Pollinations — free, no key (best-effort; can be rate-limited)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const KEYS = { gemini: "GEMINI_API_KEY", openai: "OPENAI_API_KEY", stability: "STABILITY_API_KEY", nvidia: "NVIDIA_API_KEY" };
function provider() {
  if (process.env.IMAGE_PROVIDER) return process.env.IMAGE_PROVIDER;
  if (process.env.GEMINI_API_KEY) return "gemini";        // Nano Banana — preferred when present
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.STABILITY_API_KEY) return "stability";
  return "pollinations";                                  // free fallback (best-effort)
}
const PROVIDER = provider();

// Pollinations needs no key; paid providers need theirs.
export function available() { return PROVIDER === "pollinations" || !!process.env[KEYS[PROVIDER]]; }
export function providerName() { return PROVIDER === "pollinations" ? "pollinations (free)" : PROVIDER; }

// Generate one image from a prompt; writes a PNG/JPEG to outPath. Returns { path, provider } or throws.
export async function generate(prompt, outPath, { size = "1024x1024" } = {}) {
  if (!available()) throw new Error("image gen not configured (set IMAGE_PROVIDER + key)");
  mkdirSync(dirname(outPath), { recursive: true });
  const [w, h] = size.split("x").map(Number);
  let bytes;

  if (PROVIDER === "pollinations") {
    // 'turbo' model is reliable (the default 'flux' 500s under load). Retry once on failure.
    const model = process.env.POLLINATIONS_MODEL || "turbo";
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=${model}&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`;
        const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
        if (!r.ok) throw new Error(`pollinations ${r.status}`);
        bytes = Buffer.from(await r.arrayBuffer());
        if (bytes.length < 2000 || !(r.headers.get("content-type") || "").startsWith("image")) throw new Error("pollinations returned no image");
        writeFileSync(outPath, bytes);
        return { path: outPath, provider: `${PROVIDER}/${model}` };
      } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 2500)); }
    }
    throw lastErr;
  }

  const key = process.env[KEYS[PROVIDER]];
  let b64;
  if (PROVIDER === "gemini") {
    // Gemini 2.5 Flash Image ("Nano Banana"). Returns image bytes as inlineData in the response parts.
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    });
    if (!r.ok) throw new Error(`gemini image ${r.status}: ${(await r.text()).slice(0, 140)}`);
    const parts = (await r.json()).candidates?.[0]?.content?.parts || [];
    b64 = parts.find((p) => p.inlineData?.data || p.inline_data?.data)?.inlineData?.data
       || parts.find((p) => p.inline_data?.data)?.inline_data?.data;
  } else if (PROVIDER === "openai") {
    const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const body = { model, prompt, size, n: 1 };
    if (model.startsWith("dall-e")) body.response_format = "b64_json";   // gpt-image-1 rejects this param; dall-e needs it
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`openai image ${r.status}: ${(await r.text()).slice(0, 120)}`);
    b64 = (await r.json()).data?.[0]?.b64_json;
  } else if (PROVIDER === "stability") {
    const form = new FormData();
    form.set("prompt", prompt); form.set("output_format", "png");
    const r = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, body: form,
    });
    if (!r.ok) throw new Error(`stability ${r.status}: ${(await r.text()).slice(0, 120)}`);
    b64 = (await r.json()).image;
  } else if (PROVIDER === "nvidia") {
    const model = process.env.NVIDIA_IMAGE_MODEL || "black-forest-labs/flux.1-schnell";
    const r = await fetch(`https://ai.api.nvidia.com/v1/genai/${model}`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ prompt, width: w, height: h, steps: 4, seed: 0 }),
    });
    if (!r.ok) throw new Error(`nvidia image ${r.status}: ${(await r.text()).slice(0, 120)}`);
    const j = await r.json();
    b64 = j.artifacts?.[0]?.base64 || j.image || j.b64_json;
  }
  if (!b64) throw new Error(`${PROVIDER} returned no image data`);
  writeFileSync(outPath, Buffer.from(b64, "base64"));
  return { path: outPath, provider: PROVIDER };
}
