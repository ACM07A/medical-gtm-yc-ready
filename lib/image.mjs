// Image-generation adapter — turns the Instagram carousel IMAGE BRIEFS into real images. Provider-agnostic.
// FREE-FIRST: defaults to Pollinations (no key, runs Flux/SD) so image gen works out of the box; a paid
// provider (OpenAI / Stability / NVIDIA) is a quality upgrade that's "just add the key".
//
//   IMAGE_PROVIDER=gemini      GEMINI_API_KEY=...              (Nano Banana — top quality; image tier needs billing)
//   IMAGE_PROVIDER=cloudflare  CF_ACCOUNT_ID + CF_API_TOKEN   (FLUX.1-schnell — FREE daily allotment, no card)
//   IMAGE_PROVIDER=huggingface HF_API_TOKEN=...               (FLUX.1-schnell — free monthly credit)
//   IMAGE_PROVIDER=together    TOGETHER_API_KEY=...           (FLUX; NOTE: now requires a paid deposit)
//   IMAGE_PROVIDER=openai      OPENAI_API_KEY=...             (gpt-image-1 / dall-e-3)
//   IMAGE_PROVIDER=stability   STABILITY_API_KEY=...          (stable-image core / SD3.5)
//   (fallback)                 Pollinations — free, no key (decent 'flux'; best-effort)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const KEYS = { gemini: "GEMINI_API_KEY", together: "TOGETHER_API_KEY", huggingface: "HF_API_TOKEN", openai: "OPENAI_API_KEY", stability: "STABILITY_API_KEY", nvidia: "NVIDIA_API_KEY" };
function provider() {
  if (process.env.IMAGE_PROVIDER) return process.env.IMAGE_PROVIDER;
  if (process.env.GEMINI_API_KEY) return "gemini";                                  // top quality
  if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) return "cloudflare";   // best FREE (FLUX)
  if (process.env.HF_API_TOKEN) return "huggingface";                               // free (FLUX)
  if (process.env.TOGETHER_API_KEY) return "together";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.STABILITY_API_KEY) return "stability";
  return "pollinations";                                                            // free, no key
}
const PROVIDER = provider();

// Pollinations needs no key; Cloudflare needs two vars; the rest need their one key.
export function available() {
  if (PROVIDER === "pollinations") return true;
  if (PROVIDER === "cloudflare") return !!(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN);
  return !!process.env[KEYS[PROVIDER]];
}
export function providerName() { return PROVIDER === "pollinations" ? "pollinations (free)" : PROVIDER; }

// Generate one image from a prompt; writes a PNG/JPEG to outPath. Returns { path, provider } or throws.
export async function generate(prompt, outPath, { size = "1024x1024" } = {}) {
  if (!available()) throw new Error("image gen not configured (set IMAGE_PROVIDER + key)");
  mkdirSync(dirname(outPath), { recursive: true });
  const [w, h] = size.split("x").map(Number);
  let bytes;

  if (PROVIDER === "pollinations") {
    // 'flux' is far better quality; 'turbo' is the reliable fallback if flux 500s under load.
    const models = process.env.POLLINATIONS_MODEL ? [process.env.POLLINATIONS_MODEL] : ["flux", "turbo"];
    let lastErr;
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=${model}&nologo=true&enhance=true&seed=${Math.floor(Math.random() * 1e6)}`;
          const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
          if (!r.ok) throw new Error(`pollinations ${r.status}`);
          const ct = r.headers.get("content-type") || "";
          bytes = Buffer.from(await r.arrayBuffer());
          if (bytes.length < 2000 || !ct.startsWith("image")) throw new Error("pollinations returned no image");
          // write with the REAL extension (Pollinations returns JPEG) so viewers/GitHub render it
          const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
          const finalPath = outPath.replace(/\.[a-z0-9]+$/i, `.${ext}`);
          writeFileSync(finalPath, bytes);
          return { path: finalPath, provider: `${PROVIDER}/${model}` };
        } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 2000)); }
      }
    }
    throw lastErr;
  }

  // --- FREE, FLUX-quality providers (free key, no deposit) ---
  if (PROVIDER === "cloudflare") {
    const acct = process.env.CF_ACCOUNT_ID, tok = process.env.CF_API_TOKEN;
    const model = process.env.CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model}`, {
      method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, steps: Number(process.env.CF_STEPS) || 6 }),
    });
    if (!r.ok) throw new Error(`cloudflare ${r.status}: ${(await r.text()).slice(0, 140)}`);
    const j = await r.json();
    const b = j.result?.image;                       // base64 jpeg
    if (!b) throw new Error("cloudflare returned no image");
    writeFileSync(outPath, Buffer.from(b, "base64"));
    return { path: outPath, provider: "cloudflare/flux-schnell" };
  }
  if (PROVIDER === "huggingface") {
    const model = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.HF_API_TOKEN}`, "Content-Type": "application/json", Accept: "image/png" },
      body: JSON.stringify({ inputs: prompt }),
    });
    if (!r.ok) throw new Error(`huggingface ${r.status}: ${(await r.text()).slice(0, 140)}`);
    const buf = Buffer.from(await r.arrayBuffer());  // HF returns raw image bytes
    if (buf.length < 2000) throw new Error("huggingface returned no image");
    writeFileSync(outPath, buf);
    return { path: outPath, provider: `huggingface/${model.split("/").pop()}` };
  }

  const key = process.env[KEYS[PROVIDER]];
  let b64;
  if (PROVIDER === "together") {
    // FLUX via Together AI. Free tier: black-forest-labs/FLUX.1-schnell-Free. Quality: FLUX.1-dev / FLUX.1.1-pro.
    const model = process.env.TOGETHER_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell-Free";
    const r = await fetch("https://api.together.xyz/v1/images/generations", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, width: w, height: h, steps: Number(process.env.TOGETHER_STEPS) || 4, n: 1, response_format: "b64_json" }),
    });
    if (!r.ok) throw new Error(`together ${r.status}: ${(await r.text()).slice(0, 140)}`);
    const j = await r.json();
    b64 = j.data?.[0]?.b64_json;
    if (!b64 && j.data?.[0]?.url) { const ir = await fetch(j.data[0].url); writeFileSync(outPath, Buffer.from(await ir.arrayBuffer())); return { path: outPath, provider: `together/${model.split("/").pop()}` }; }
  } else if (PROVIDER === "gemini") {
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
