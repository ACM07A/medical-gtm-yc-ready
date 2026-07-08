// Minimal, dependency-free Markdown -> HTML (enough for our cornerstone drafts:
// headings, bold/italic/code, links, hr, pipe tables, lists, paragraphs). Strips HTML comments.
export function mdToHtml(md) {
  const lines = md.replace(/\r/g, "").replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  let html = "", i = 0;
  const cells = (r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { i++; continue; }
    const h = l.match(/^(#{1,6})\s+(.*)/);
    if (h) { const n = h[1].length; html += `<h${n}>${inline(h[2])}</h${n}>`; i++; continue; }
    if (/^---+\s*$/.test(l)) { html += "<hr>"; i++; continue; }
    if (/^\s*\|/.test(l) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1])) {
      const rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const head = cells(rows[0]), body = rows.slice(2).map(cells);
      html += "<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>" +
        body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      html += "<ul>"; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ""))}</li>`;
      html += "</ul>"; continue;
    }
    if (/^\s*\d+\.\s+/.test(l)) {
      html += "<ol>"; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) html += `<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ""))}</li>`;
      html += "</ol>"; continue;
    }
    let para = l; i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*([-*#|]|\d+\.)/.test(lines[i])) para += " " + lines[i++];
    html += `<p>${inline(para)}</p>`;
  }
  return html;
}
