// Patient-facing marketing landing page (Nuvica-inspired) — served at "/" from the live data core.
// Clinical blue + trust green, glassmorphic cards, big display type, organ-motif treatment cards.
import { basename } from "node:path";
import { range } from "../lib/money.mjs";

const ICON = {
  cardiac: '<path d="M12 20s-6.5-4-6.5-9A3.4 3.4 0 0 1 12 8a3.4 3.4 0 0 1 6.5 3c0 5-6.5 9-6.5 9Z"/><path d="M4.5 12.5H8l1.4-3 2.2 5.2L13 12h6.5"/>',
  ortho: '<path d="M8 4a2 2 0 1 0-2.2 3.3l8.9 8.9A2 2 0 1 0 17 18.2 2 2 0 1 0 18.3 15L9.3 6A2 2 0 1 0 8 4Z"/>',
  oncology: '<path d="M12 13 8 4M12 13l4-9M12 13l-3.5 7L12 18l3.5 2Z"/>',
  fertility: '<path d="M8.5 3c7 4-7 9 0 18M15.5 3c7 4-7 9 0 18M9 8h6M9 12h6M9 16h6"/>',
  cosmetic: '<path d="M12 3l1.7 5L19 9.7l-5.3 1.7L12 17l-1.7-5.6L5 9.7 10.3 8Z"/>',
  dental: '<path d="M8 3c-2 0-3.2 1.6-3.2 4.2 0 2 .5 3 1 6C6.3 19.7 6.5 22 8 22c1.3 0 1.1-2.6 1.6-4.7.2-.9.7-.9.9 0C11 19.4 10.8 22 12.2 22c1.5 0 1.7-2.7 2.2-6 .5-3 1-4.2 1-6.2C15.4 4.6 14.2 3 12.2 3c-1.2 0-1.6.6-2.1.6S9.2 3 8 3Z"/>',
};
const band = (c) => c.lo ? range(c.lo, c.hi) : "";

export function renderHome({ cats, guides }) {
  const guideHref = (g) => "/site/" + basename(g.file_ref).replace(/\.md$/, ".html");
  const firstGuide = (id) => guides.find((g) => g.category_id === id);
  const catCard = (c) => {
    const g = firstGuide(c.id);
    const href = g ? guideHref(g) : "#treatments";
    return `<a class="tcard" href="${href}">
      <div class="ticon"><svg viewBox="0 0 24 24" fill="none" stroke="url(#og)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[c.id] || ICON.cardiac}</svg></div>
      <div class="tmeta"><div class="tname">${c.name}</div><div class="tsub">from ${band(c)} · India</div></div>
      <span class="tarrow"><svg viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>`;
  };
  const guideItem = (g) => `<a class="glink" href="${guideHref(g)}"><span>${g.cat}</span> cost in India — ${g.mname} <em>→</em></a>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CanopusCare — World-class treatment in India, honest prices</title>
<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f6fd6"/><stop offset="1" stop-color="#33d17a"/></linearGradient></defs></svg>
<style>
:root{--blue-900:#072a52;--blue-700:#0b4a8b;--blue-500:#1f6fd6;--green:#25a862;--green-br:#33d17a;
 --ink:#0b1f38;--mut:#51657e;--hair:#d9e5f2;--bg:#e9f1fb;--bg2:#f6faff;--glass:rgba(255,255,255,.7);--card:#fff;
 --shadow:0 22px 55px -26px rgba(11,74,139,.5);--sans:"Segoe UI",Roboto,Helvetica,Arial,system-ui,sans-serif}
@media(prefers-color-scheme:dark){:root{--ink:#e9f1fb;--mut:#9db2cc;--hair:#1d3350;--bg:#061321;--bg2:#0a1c30;--glass:rgba(18,38,62,.6);--card:#0f2338;--shadow:0 26px 60px -28px #000}}
:root[data-theme="dark"]{--ink:#e9f1fb;--mut:#9db2cc;--hair:#1d3350;--bg:#061321;--bg2:#0a1c30;--glass:rgba(18,38,62,.6);--card:#0f2338}
:root[data-theme="light"]{--ink:#0b1f38;--mut:#51657e;--hair:#d9e5f2;--bg:#e9f1fb;--bg2:#f6faff;--glass:rgba(255,255,255,.7);--card:#fff}
*{box-sizing:border-box}body{margin:0;font-family:var(--sans);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;
 background:radial-gradient(1100px 600px at 82% -6%,rgba(51,209,122,.16),transparent 60%),radial-gradient(1200px 700px at 8% -4%,rgba(31,111,214,.20),transparent 58%),linear-gradient(180deg,var(--bg),var(--bg2))}
.wrap{max-width:1160px;margin:0 auto;padding:0 22px}
a{color:inherit;text-decoration:none}
/* nav */
.nav{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
.brand{display:flex;align-items:center;gap:11px;font-weight:800;font-size:21px;letter-spacing:-.02em}
.mark{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(150deg,var(--blue-700),var(--blue-500));box-shadow:var(--shadow)}
.mark svg{width:21px;height:21px}
.navlinks{display:flex;gap:6px;background:var(--glass);border:1px solid rgba(255,255,255,.7);backdrop-filter:blur(12px);border-radius:999px;padding:6px}
.navlinks a{padding:8px 15px;border-radius:999px;font-size:14px;color:var(--mut)}.navlinks a.on{background:var(--blue-700);color:#fff}
@media(max-width:820px){.navlinks{display:none}}
.contact{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--hair);border-radius:999px;padding:6px 6px 6px 18px;font-weight:600;font-size:14px;box-shadow:var(--shadow)}
.contact .go{width:30px;height:30px;border-radius:50%;background:var(--green-br);display:grid;place-items:center;color:#04210f}
/* hero */
.hero{position:relative;margin-top:8px;display:grid;grid-template-columns:1.15fr .85fr;gap:30px;align-items:center;padding:24px 0 10px}
@media(max-width:900px){.hero{grid-template-columns:1fr}}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--blue-700);background:rgba(37,168,98,.12);border:1px solid rgba(37,168,98,.3);padding:7px 13px;border-radius:999px}
h1{font-size:clamp(40px,6.4vw,68px);line-height:.98;letter-spacing:-.035em;margin:18px 0 16px;font-weight:800;text-wrap:balance}
h1 .g{background:linear-gradient(100deg,var(--blue-500),var(--green-br));-webkit-background-clip:text;background-clip:text;color:transparent}
.lede{font-size:clamp(16px,2vw,18px);color:var(--mut);max-width:52ch;margin:0}
.cta{display:flex;gap:12px;margin-top:26px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 24px;border-radius:999px;font-weight:700;font-size:15px;border:1px solid transparent;cursor:pointer}
.btn.pri{background:var(--blue-700);color:#fff;box-shadow:var(--shadow)}.btn.pri .go{width:22px;height:22px;border-radius:50%;background:var(--green-br);display:grid;place-items:center;color:#04210f}
.btn.sec{background:transparent;border-color:var(--hair);color:var(--ink)}
/* hero visual */
.hviz{position:relative;height:100%;min-height:340px;border-radius:26px;background:var(--glass);border:1px solid rgba(255,255,255,.75);backdrop-filter:blur(14px);box-shadow:var(--shadow);display:grid;place-items:center;overflow:hidden}
.pulse{width:78%;stroke:url(#og);fill:none;stroke-width:2.6;stroke-linecap:round;filter:drop-shadow(0 0 8px rgba(51,209,122,.5))}
.pulse path{stroke-dasharray:1200;stroke-dashoffset:1200;animation:draw 4s ease-in-out infinite}
@keyframes draw{55%{stroke-dashoffset:0}100%{stroke-dashoffset:-1200}}
@media(prefers-reduced-motion:reduce){.pulse path{animation:none;stroke-dashoffset:0}}
.chip{position:absolute;background:var(--card);border:1px solid var(--hair);border-radius:14px;padding:10px 14px;box-shadow:var(--shadow);font-size:12px;color:var(--mut)}
.chip b{display:block;font-size:19px;color:var(--blue-700);letter-spacing:-.02em}
.chip.c1{top:22px;left:22px}.chip.c2{bottom:22px;right:22px}.chip.c3{bottom:26px;left:26px}
/* section */
section{margin-top:60px}.shead{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:22px}
.shead h2{font-size:clamp(26px,3.6vw,38px);letter-spacing:-.03em;margin:0;font-weight:800;text-wrap:balance}
.shead p{margin:6px 0 0;color:var(--mut);max-width:48ch}
.tag{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--green)}
/* treatment cards */
.tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:820px){.tgrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.tgrid{grid-template-columns:1fr}}
.tcard{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--hair);border-radius:20px;padding:18px;box-shadow:var(--shadow);transition:transform .15s,box-shadow .15s}
.tcard:hover{transform:translateY(-3px)}
.ticon{width:56px;height:56px;flex:none;border-radius:16px;display:grid;place-items:center;background:linear-gradient(150deg,rgba(31,111,214,.12),rgba(51,209,122,.14))}.ticon svg{width:30px;height:30px}
.tmeta{flex:1}.tname{font-weight:800;font-size:17px;letter-spacing:-.01em}.tsub{color:var(--mut);font-size:12.5px;margin-top:2px}
.tarrow{width:36px;height:36px;border-radius:50%;background:rgba(37,168,98,.12);display:grid;place-items:center;color:var(--green)}
/* stats */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:14px}
@media(max-width:720px){.stats{grid-template-columns:repeat(2,1fr)}}
.stat{background:var(--glass);border:1px solid rgba(255,255,255,.7);backdrop-filter:blur(10px);border-radius:18px;padding:20px}
.stat .n{font-size:clamp(26px,3.4vw,36px);font-weight:800;letter-spacing:-.03em;color:var(--blue-700);font-variant-numeric:tabular-nums}
:root[data-theme="dark"] .stat .n{color:#5aa2ee}.stat .l{font-size:12.5px;color:var(--mut);margin-top:3px}
/* about pillars */
.pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:820px){.pillars{grid-template-columns:1fr}}
.pill{background:var(--card);border:1px solid var(--hair);border-radius:20px;padding:22px;box-shadow:var(--shadow)}
.pill .pi{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(31,111,214,.1);color:var(--blue-700);margin-bottom:12px}
.pill h3{margin:0 0 6px;font-size:18px;letter-spacing:-.01em}.pill p{margin:0;color:var(--mut);font-size:14px}
/* guides */
.glist{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}@media(max-width:720px){.glist{grid-template-columns:1fr}}
.glink{background:var(--card);border:1px solid var(--hair);border-radius:12px;padding:13px 16px;font-size:14px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 10px 30px -24px rgba(11,74,139,.5)}
.glink span{font-weight:700}.glink em{color:var(--green);font-style:normal}
/* cta band */
.ctaband{margin-top:64px;background:linear-gradient(120deg,var(--blue-900),var(--blue-700));color:#eaf3ff;border-radius:26px;padding:40px clamp(24px,5vw,54px);box-shadow:var(--shadow);text-align:center}
.ctaband h2{font-size:clamp(24px,3.4vw,34px);margin:0 0 8px;color:#fff;letter-spacing:-.02em}
.ctaband p{color:#bcd6f5;margin:0 auto 20px;max-width:52ch}
.wa{display:inline-flex;align-items:center;gap:10px;background:var(--green-br);color:#04210f;font-weight:800;padding:14px 26px;border-radius:999px}
footer{margin:36px 0 48px;color:var(--mut);font-size:12.5px;text-align:center;line-height:1.8}
footer a{color:var(--blue-500);font-weight:600}
</style></head><body>
<div class="wrap">
  <nav class="nav">
    <div class="brand"><span class="mark"><svg viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-6 4 12 2-6h6" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>CanopusCare</div>
    <div class="navlinks"><a class="on" href="/">Home</a><a href="#treatments">Treatments</a><a href="#guides">Cost guides</a><a href="#about">About</a><a href="/console">Console</a></div>
    <a class="contact" href="#contact">Contact Us <span class="go"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>
  </nav>

  <header class="hero">
    <div>
      <span class="eyebrow">✚ Accredited care · fast treatment</span>
      <h1>World-class care.<br><span class="g">Honest prices.</span></h1>
      <p class="lede">CanopusCare connects you to India's JCI &amp; NABH-accredited hospitals for treatment at <b>60–90% less</b> than the US or UK — with a coordinator, interpreter, and a hand to hold the whole way.</p>
      <div class="cta"><a class="btn pri" href="#treatments">Explore treatments <span class="go"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a><a class="btn sec" href="#guides">See real costs</a></div>
    </div>
    <div class="hviz">
      <svg class="pulse" viewBox="0 0 480 220" preserveAspectRatio="xMidYMid meet"><path d="M0 120 H150 l14 0 8 -58 12 118 14 -150 12 150 12 -60 10 0 H480"/></svg>
      <div class="chip c1"><b>60–90%</b>lower cost</div>
      <div class="chip c2"><b>JCI · NABH</b>accredited partners</div>
      <div class="chip c3"><b>${cats.length}</b>specialties</div>
    </div>
  </header>

  <section id="treatments">
    <div class="shead"><div><h2>Treatments we specialise in</h2><p>Accredited hospitals, transparent package pricing, coordinated end to end.</p></div><span class="tag">Specialties</span></div>
    <div class="tgrid">${cats.map(catCard).join("")}</div>
  </section>

  <section>
    <div class="stats">
      <div class="stat"><div class="n">60–90%</div><div class="l">Savings vs US / UK</div></div>
      <div class="stat"><div class="n">${cats.length}</div><div class="l">Core specialties</div></div>
      <div class="stat"><div class="n">12</div><div class="l">Source markets served</div></div>
      <div class="stat"><div class="n">100%</div><div class="l">Accredited hospitals only</div></div>
    </div>
  </section>

  <section id="about">
    <div class="shead"><div><h2>Your medical journey, handled</h2><p>We are a facilitator — not a hospital. We make the whole trip simple, safe, and clear.</p></div><span class="tag">Why CanopusCare</span></div>
    <div class="pillars">
      <div class="pill"><div class="pi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6Z" stroke="currentColor" stroke-width="1.8"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h3>Quality</h3><p>Only JCI/NABH-accredited hospitals and verified, experienced surgeons.</p></div>
      <div class="pill"><div class="pi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19V9m5 10V5m5 14v-8m5 8V4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></div><h3>Transparency</h3><p>Real, cited package prices up front. No hidden fees — you pay the hospital directly.</p></div>
      <div class="pill"><div class="pi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.4-7-10a7 7 0 0 1 14 0c0 5.6-7 10-7 10Z" stroke="currentColor" stroke-width="1.8"/></svg></div><h3>Care</h3><p>Visa help, interpreter, airport pickup, accommodation, and follow-up after you return.</p></div>
    </div>
  </section>

  ${guides.length ? `<section id="guides">
    <div class="shead"><div><h2>Real treatment cost guides</h2><p>Published, sourced pricing for your country and procedure.</p></div><span class="tag">${guides.length} live</span></div>
    <div class="glist">${guides.map(guideItem).join("")}</div></section>` : ""}

  <div class="ctaband" id="contact">
    <h2>Get a free, no-obligation quote</h2>
    <p>Send your medical reports on WhatsApp. We'll arrange a free teleconsult and a written quote from accredited hospitals — usually within 48 hours.</p>
    <a class="wa" href="#">Message us on WhatsApp →</a>
  </div>

  <footer>
    CanopusCare is a medical-value-travel <b>facilitator</b>, not a healthcare provider. No medical advice; prices indicative pending assessment. Consent-based, DPDP/GDPR-aware.<br>
    Operators: <a href="/console">open the console →</a>
  </footer>
</div></body></html>`;
}
