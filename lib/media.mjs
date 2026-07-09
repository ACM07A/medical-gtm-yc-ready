// Media router — picks the RIGHT visual source per brief, so we stop leaning on uncanny AI humans:
//   • data/cost/stats  → infographic (real numbers, crisp text)   lib/infographic.mjs
//   • people/photos    → free stock photo (real faces)            lib/stock.mjs
//   • abstract/graphic → AI image gen (fine, no faces/text)       lib/image.mjs
import * as image from "./image.mjs";
import { fetchStock } from "./stock.mjs";

const HUMAN = /\b(patient|doctor|nurse|surgeon|physician|family|person|people|smil|portrait|greet|staff|team|handshake|consult|caregiver|elderly|man|woman|child)\b/i;

// Turn a verbose image brief into a short stock-search query. Strip grammar + AI-render style words, but
// KEEP mood words (warm/friendly/smiling/bright) — they steer stock search toward the right feel. Bias to
// a positive, welcoming tone so results aren't dark/procedural.
const STOP = /\b(a|an|the|of|in|on|at|to|and|or|with|for|by|is|are|this|that|their|his|her|photo|image|graphic|illustration|editorial|photorealistic|realistic|palette|teal|render|rendering|scene|representation|abstract|geometric|no|text|watermark|faces|style|flat|vector|high|detail)\b/gi;
function toQuery(brief) {
  let q = brief.replace(/[.,].*$/, "").replace(STOP, "").replace(/\s+/g, " ").trim().split(/\s+/).slice(0, 6).join(" ");
  if (q.length < 3) q = "hospital healthcare doctor";
  if (!/\b(smil|happy|warm|bright|friendly|hopeful|caring)\b/i.test(q)) q += " smiling bright";  // positive tone
  return q;
}

// Render one brief to an image file, choosing the best source. Returns { path, kind, source?, credit? }.
export async function renderMedia(brief, outPath, { preferStockForHumans = true } = {}) {
  if (preferStockForHumans && HUMAN.test(brief)) {
    try { const r = await fetchStock(toQuery(brief), outPath); return { ...r, kind: "stock" }; }
    catch { /* fall through to AI if stock fails */ }
  }
  const q = `${brief}. Clean modern graphic, teal and clinical-blue (#0B4A8B) palette, flat vector/editorial style, no text, no watermark, no faces.`;
  const r = await image.generate(q, outPath, { size: "1024x1024" });
  return { ...r, kind: "ai" };
}

export { costComparisonHtml, renderInfographic, renderCostComparison } from "./infographic.mjs";
