// Media router — picks the RIGHT visual source per brief, so we stop leaning on uncanny AI humans:
//   • data/cost/stats  → infographic (real numbers, crisp text)   lib/infographic.mjs
//   • people/photos    → free stock photo (real faces)            lib/stock.mjs
//   • abstract/graphic → AI image gen (fine, no faces/text)       lib/image.mjs
import * as image from "./image.mjs";
import { fetchStock } from "./stock.mjs";

const HUMAN = /\b(patient|doctor|nurse|surgeon|physician|family|person|people|smil|portrait|greet|staff|team|handshake|consult|caregiver|elderly|man|woman|child)\b/i;

// Turn a verbose image brief into a short stock-search query: drop stopwords + style words, keep nouns.
const STOP = /\b(a|an|the|of|in|on|at|to|and|or|with|for|by|is|are|this|that|their|his|her|friendly|international|modern|bright|warm|clean|professional|photo|image|graphic|illustration|editorial|photorealistic|realistic|clinical|blue|teal|green|palette|soft|natural|light|high|detail|scene|representation|abstract|geometric|no|text|watermark|faces|style|flat|vector)\b/gi;
function toQuery(brief) {
  const q = brief.replace(/[.,].*$/, "").replace(STOP, "").replace(/\s+/g, " ").trim().split(/\s+/).slice(0, 5).join(" ");
  return q.length > 2 ? q : "hospital healthcare doctor";
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

export { costComparisonHtml, renderInfographic } from "./infographic.mjs";
