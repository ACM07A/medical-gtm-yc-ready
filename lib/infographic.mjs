// Infographic engine — on-brand social visuals built from REAL data-core numbers, rendered to PNG via the
// browser (crisp real text, no AI gibberish, no uncanny faces). This is the preferred visual for data-driven
// slides (cost comparison, savings, stats). Free. Human element → free stock photos (lib/stock.mjs).
import { shotHtml } from "./browser.mjs";

const BRAND = { blue: "#0B4A8B", blue2: "#1f6fd6", green: "#25a862", teal: "#0f9e8e", ink: "#0c1b2e", mut: "#5a6b80" };
const k = (n) => `$${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`;

// Shared page shell (square, 1080). Inline everything (CSP-safe, self-contained).
function shell(inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif}
  body{width:1080px;height:1080px;overflow:hidden;color:${BRAND.ink};
    background:radial-gradient(1200px 700px at 80% -10%,rgba(37,168,98,.14),transparent 60%),
    radial-gradient(1200px 800px at 0% 110%,rgba(31,111,214,.16),transparent 55%),linear-gradient(160deg,#f4f9ff,#eaf3fb)}
  .pad{padding:70px 72px;height:100%;display:flex;flex-direction:column}
  .brand{display:flex;align-items:center;gap:14px;font-weight:800;font-size:30px;letter-spacing:-.02em;color:${BRAND.blue}}
  .mark{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(150deg,${BRAND.blue},${BRAND.blue2});color:#fff}
  .mark svg{width:30px;height:30px}
  .eyebrow{margin-top:34px;font-size:22px;font-weight:700;color:${BRAND.teal};text-transform:uppercase;letter-spacing:.14em}
  h1{font-size:64px;line-height:1.05;letter-spacing:-.03em;margin:10px 0 4px}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
  .disc{font-size:18px;color:${BRAND.mut};max-width:640px;line-height:1.4}
  .cta{background:${BRAND.green};color:#fff;font-weight:800;font-size:22px;padding:16px 26px;border-radius:999px;white-space:nowrap}
  </style></head><body><div class="pad">
  <div class="brand"><span class="mark"><svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>MedYatra</div>
  ${inner}
  <div class="foot"><div class="disc">Indicative package ranges, cited &amp; not a quote. MedYatra is a medical-travel facilitator, not a hospital.</div><div class="cta">WhatsApp us →</div></div>
  </div></body></html>`;
}

// Cost-comparison card: India vs a Western reference, with the savings headline.
export function costComparisonHtml({ treatment, market, india_low, india_high, west_low, west_high }) {
  const savings = west_low && india_high ? Math.round((1 - india_high / west_low) * 100) : null;
  const bar = (label, lo, hi, color, pct) => `
    <div style="flex:1">
      <div style="font-size:24px;font-weight:700;color:${BRAND.mut};margin-bottom:10px">${label}</div>
      <div style="height:${pct}%;min-height:96px;border-radius:20px 20px 8px 8px;background:${color};display:flex;align-items:flex-start;justify-content:center;padding-top:22px;box-shadow:0 20px 40px -20px ${color}">
        <span style="color:#fff;font-size:46px;font-weight:800;letter-spacing:-.02em">${k(lo)}–${k(hi)}</span>
      </div>
    </div>`;
  return shell(`
    <div class="eyebrow">Cost of care · ${market}</div>
    <h1>${treatment}<br>in India</h1>
    ${savings ? `<div style="display:inline-flex;align-self:flex-start;align-items:baseline;gap:16px;margin-top:26px;color:#1c8b50;font-weight:800"><span style="font-size:120px;line-height:1;letter-spacing:-.04em">${savings}%</span><span style="font-size:34px">lower than Western private care</span></div>` : ""}
    <div style="display:flex;gap:34px;align-items:flex-end;flex:1;margin:auto 0 8px">
      ${bar("In India", india_low, india_high, `linear-gradient(180deg,${BRAND.green},#1c8b50)`, 32)}
      ${bar("Western private", west_low, west_high, `linear-gradient(180deg,#6b7c93,#4a5c72)`, 100)}
    </div>
  `);
}

// Render any infographic HTML to a PNG.
export async function renderInfographic(html, outPath) {
  return shotHtml(html, outPath, { width: 1080, height: 1080 });
}
