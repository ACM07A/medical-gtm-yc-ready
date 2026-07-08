// FREE research module — replaces paid search/enrichment APIs. Zero external deps (Node fetch).
// Uses DuckDuckGo's HTML endpoints (no key) + a plain page fetcher + public-contact extractor.
// Public data only; respects our compliance rules (/build-os/10). Rate-limit friendly.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&nbsp;|&#160;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

// Free web search -> [{title,url,snippet}]
export async function search(query, limit = 8) {
  const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
  const r = await fetch(url, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "q=" + encodeURIComponent(query) });
  const html = await r.text();
  const out = [];
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) && out.length < limit) {
    let href = m[1];
    const u = href.match(/uddg=([^&]+)/); if (u) href = decodeURIComponent(u[1]);
    out.push({ title: strip(m[2]), url: href });
  }
  return out;
}

// Fetch a page and return cleaned text (capped)
export async function fetchText(url, cap = 6000) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    return strip(await r.text()).slice(0, cap);
  } catch (e) { return ""; }
}

// Extract PUBLIC business contacts from page text (emails / intl phone). Public data only.
export function extractContacts(text) {
  const emails = [...new Set((text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []))]
    .filter(e => !/\.(png|jpg|gif|svg)$/i.test(e));
  const phones = [...new Set((text.match(/\+?\d[\d\s().-]{7,}\d/g) || []).map(s => s.trim()))].slice(0, 5);
  return { emails: emails.slice(0, 5), phones };
}
