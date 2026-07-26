# Canopus Care — AI Studio Build Brief (Sandbox Demo for YC)

**Paste this whole file into Google AI Studio's build prompt.** It specifies a single-page React app that is an *honest demo of what the Canopus Care agent engine actually does* — not a marketing fantasy. Every number, agent, and market below is drawn from the working sandbox. Do not invent data beyond what is given here.

---

## 0. What you are building — read first

A **demo landing page for a YC application**, explicitly framed as *hosted inside the Canopus Care agent sandbox*. The audience is **YC reviewers and investors first, prospective patients second**. So it must **show the machine working**, not just sell a service.

The single job of the page: *prove that an agentic, compliance-first medical-travel facilitator is really built and running* — by letting the visitor watch the agents run.

**It is a live client of the sandbox, not a static mock.** The page reads its data and runs its agents against the running Canopus Care sandbox server over HTTP (§8). Reseed a market, add a partner, or change the commission in the sandbox, and the landing page reflects it on next load. Local fixtures (§6) exist **only** as an offline fallback snapshot when the sandbox is unreachable — clearly labelled as such.

**Three hard rules that override everything else:**

1. **This is a facilitator, not a hospital or a doctor.** Canopus Care is a *non-clinical* medical-travel facilitator. It never diagnoses, never prescribes, never clears anyone to fly. It routes, coordinates, estimates, and relays — and every clinical decision belongs to the hospital.
2. **Nothing is live yet — say so.** Zero signed hospitals, zero patients, zero revenue. The demo must never imply otherwise. Its credibility *comes from* that honesty.
3. **No fabricated data.** No invented star ratings, no made-up patient counts, no fake testimonials, no fake wait-times. If a number isn't in this brief, don't render it.

A persistent banner (see §3) makes the sandbox framing unmissable on every screen.

---

## 1. Name, identity, one-liner

- **Name:** **Canopus Care** (never "Canopus Care" — that name is retired). Canopus is the guiding star ancient navigators steered by; the metaphor is *a fixed point to steer by through a frightening medical journey*. Use it lightly — no "AI"/"Rx" in the wordmark.
- **Tagline:** *"A guiding star for care across borders."*
- **One-liner (investor):** *"An agentic, compliance-first engine that turns a frightened patient's first WhatsApp message into a treatment-ready case file an Indian hospital can act on — and coordinates the entire journey around it."*
- **What we are:** India-inbound medical-travel facilitator. Patients in the Middle East, Africa, and Central Asia; treatment in India.

---

## 2. Design direction

Canopus is a star — lean into a **calm night-sky** identity, not the generic startup gradient.

- **Palette (define as CSS custom properties, support light + dark):**
  - Deep navy ground `#0c1b2e` / panel `#152232` (dark); off-white `#eef3f9` / panel `#fff` (light)
  - Ink `#0c1b2e` / `#e7eefb`; muted `#5a6b80` / `#8ba0ba`; hairline `#e2ecf7` / `#22364d`
  - Primary blue `#0b4a8b` → `#1f6fd6`
  - **Accent — "Canopus gold" `#e5b23a`** used sparingly (the star, the one bright point; never as large fills)
  - Semantic: green `#1c8b50` (pass), amber `#e5a13a` (needs review), red `#b3261e` (blocked/refused)
- **Type:** a characterful but sober serif or humanist-sans display for headlines (restrained), a clean sans for body, a monospace for the agent JSON/output panels. Inline fonts as data-URIs — do not hotlink a font CDN. Keep running text ~65 chars wide.
- **Motion:** minimal and purposeful. The one signature moment: on the live-journey demo, steps reveal **sequentially** as if the orchestrator is walking them. Respect `prefers-reduced-motion`.
- **Feel:** a quiet operations console that happens to be beautiful — think Linear/Stripe restraint, not a health-brand stock-photo hero. The hero's "wow" is the *live agent run*, not a picture of a smiling patient.
- Avoid the AI-generated defaults: no cream+terracotta, no purple→blue hero gradient, no emoji section markers, no rounded-card-with-accent-rail everywhere.

---

## 3. The persistent sandbox banner (required, every screen)

A thin fixed ribbon, Canopus-gold background, dark text:

> **SANDBOX DEMO** — Every agent on this page runs live against the Canopus Care engine. No signed hospitals, no real patients, no revenue yet. Numbers are indicative and labelled. Built for our YC application.

This is non-negotiable and must never be dismissible in a way that hides it from a first-time viewer.

---

## 4. Page structure (sections, in order)

### 4.1 Hero — "watch the engine, don't read the pitch"
- Headline: **"The medical-travel facilitator that's actually built."**
- Sub: *"Canopus Care turns a patient's own words into a hospital-ready case file, then coordinates visas, video consults with the surgeon, travel, interpreters, billing and aftercare — through 13 purpose-built agents, every one compliance-gated."*
- Primary CTA scrolls to the **Live Journey** demo (§4.2). Secondary CTA: "Talk to the concierge" → the chat (§4.4).
- A compact honesty strip under the CTA: `13 agents` · `22 markets, 18 servable` · `GDPR data vault` · `0 hospitals signed (pre-launch)`.

### 4.2 ⭐ Live Journey Orchestrator — the centerpiece
This is the single most important section. It mirrors the sandbox's `/journey` page: **one patient walked through the entire post-booking sequence, in real chronological order.**

- Let the visitor pick a **sample patient** (pre-built fixtures — see §6). Default: *"Ethiopian cardiac patient (father, 61, needs a bypass)."*
- On "Run the journey," reveal the 14 steps sequentially, grouped by phase, each as a timeline card showing the agent's name, a compliance badge, and a faithful mock of its output (data in §6).
- **Phases and steps, in this exact order:**
  1. **Intake** → *Triage agent* — patient's words → structured case file (category guess, urgency, key facts, missing items). "The unit we actually sell."
  2. **Before travel** → *Document checklist (KYC)* — per-country doc list; one deterministic rule auto-runs (passport expiry), the rest sit in `needs_human_review`.
  3. **Before travel** → *Visa & travel documents* — orchestrates the hospital's Medical Invitation Letter (mandatory since 1 Apr 2025) + country-correct checklist. Patient applies themselves; we never touch the government portal.
  4. **Before travel** → *Payment routing* — self-pay / insured (GOP/pre-auth) / government-sponsored, each a different doc set (encodes real constraints, e.g. Kenya SHA's $3,900 cap).
  5. **Before travel** → *Patient–doctor video consult* — **gated on a finalized quote** (no quote → show the gate, that refusal is the point). Timezone-overlap math between the surgeon's IST hours and the patient's day; interpreter attached for non-English. Canopus *schedules* the call and is **not a party to it** — no joining, no recording, no storing the clinical conversation; scheduling metadata + a non-clinical outcome only (proceed / revise quote / not suitable).
  6. **Before travel** → *Accommodation* — pre-op vs post-op stays (12 nights cardiac, 4 fertility); curated near-hospital sample, nothing books for real without a provider key + human confirm.
  7. **Before travel** → *Ticketing* — flexible-date flight search around the pre-op arrival deadline, cheapest-first; curated fare estimate (dry-run).
  8. **Arrival** → *Ground logistics* — airport pickup timing + vehicle sizing from flight number + arrival time; real immigration/baggage buffer math.
  9. **During treatment** → *Interpreter scheduling* — matches consult time to language coverage on the roster; labelled mock (no vendor keyed).
  10. **During treatment** → *Family update* — the waiting family member is a *different* WhatsApp number with its own consent gate; status-only, never clinical.
  11. **After treatment** → *Discharge & medication relay* — relays the hospital's *own* discharge text, restructured/translated, adds nothing; **always requires human sign-off**; empty input → produces nothing.
  12. **After treatment** → *Billing reconciliation* — reads real quote vs actual bill; plain arithmetic; a variance past threshold is written back as a pending review.
  13. **After treatment** → *Return-travel readiness* — tracks *when* to raise return travel; **never itself clears a patient to fly** (that's the hospital's call).
  14. *(Family/interpreter appear in their treatment-phase slot above.)*
- Each card shows a **compliance badge**: `PASS` (green), `NEEDS REVIEW` (amber), `HUMAN SIGN-OFF` (amber), or `BLOCKED/REFUSED` (red). This is the safety gate made visible — see §5.
- Caption under the demo: *"Every step is the exact function the live engine calls — the same code, whether run here or headless. A step that fails doesn't stop the rest."*

### 4.3 The 13 agents — a grid
A card grid of all 13 agents (list + descriptions in §6), grouped by phase (Intake / Before travel / Arrival / During treatment / After treatment). Each card: name, one-line purpose, and a small tag showing whether it's **`LLM`** (model-generated, safety-gated) or **`DETERMINISTIC`** (never LLM — visa rules, dosages, sums of money, timezone math). Make the deterministic tag a point of pride: *"Where a wrong answer is worse than no answer, we don't use a language model."*

### 4.4 The concierge chat — non-clinical, safety-gated
A working chat widget backed by Gemini (server-side). Use the system prompt in §7 **verbatim** and the correct model id **`gemini-2.5-flash`**. It answers logistics/estimate questions only, defers all clinical questions to the hospital, and never quotes a hospital-side commission to a patient. If no API key is set, fall back to the honest canned response in §7 (which contains *no* fabricated hospitals/ratings).

### 4.5 Commission & unit economics — the investor panel
Show the model honestly (this is a YC demo — the economics *are* the pitch):
- **Incumbent agents charge hospitals 25–33%.** Canopus opens at **20%** (below their floor) and **steps up** across three tiers of cumulative annual routed revenue: **20% (₹0–20L) → 22.5% (₹20–50L) → 25% (₹50L+)** — never above the incumbent floor. Paid by the hospital, **never charged to the patient.**
- The pitch line: *we open below every incumbent to win the pilot, and rise only to their cheapest rate as volume proves out — so the hospital never pays more than its current cheapest agent.*
- Show the per-case value exchange (best-of-book rates, priority OT scheduling, a named coordinator, co-funded patient education) as *what we ask in return for the volume we bring*.
- Render a small funnel/unit-economics readout **labelled "indicative — only the package price is a measured number; every rate is an assumption pending a real cohort."**

### 4.6 Markets — the real footprint
A map or list of **22 markets across 5 regions**, with honest status flags (data in §6):
- **Servable now (18).** **Skipped on data-compliance (4): UAE, Uzbekistan, Kazakhstan, Zambia** — health-data localization we can't meet yet; shown greyed with the reason.
- **Telegram-first flag** on Central Asia (Uzbekistan, Kazakhstan, Tajikistan, Kyrgyzstan, Turkmenistan) + Cameroon — with the honest note *"our comms engine is WhatsApp-only today; these need Telegram before go-live."*
- Do **not** plot origin dots on the US, Canada, Europe-as-source, China, etc. The map shows *where our patients actually come from*, not a global-domination graphic.

### 4.7 Partners — honest pipeline, zero signed
Show the **pursuit-ranked** partner board (data in §6). Header must state: **"0 of these are signed — this is a pipeline, ranked by how fast we can realistically close, not a customer list."**
- **Warm (first partner set — Bangalore cluster):** Aster DM Healthcare (India), Manipal Hospitals, Fortis Bannerghatta Road, Aster GCC (future corridor). Show a `pursuit` score and the stage ("Warm intro pending" / "Intro expected") — *not* ratings or wait-times.
- Explain the ranking in one line: **pursuit = 0.45·access + 0.30·fit + 0.25·speed** — a warm intro plus an agreed fee closes faster than a better-fit cold account.

### 4.8 Compliance & the medical-data vault
This is a differentiator for the YC panel — show it:
- **GDPR is the backbone.** Clinical data (prescriptions, treatment methodologies, recommended tests, medical history) is **encrypted at rest (AES-256-GCM)**, with **purpose-limited decryption** and an **append-only access log**.
- **Canopus reads only four non-clinical fields:** *treatment name/protocol, treatment timelines, cost structure, surgeon details.* Nothing else. Everything clinical is a sealed payload it relays but does not read.
- **Per-market health-data law register**, strictest-first, with the skip-list (UAE in-country-only; Uzbekistan/Kazakhstan/Zambia localization) hard-refused at the vault.
- One honest caveat: *"Hosted on a sandbox/local GDPR-compliant backend today; production hosting plugs in at go-live."*

### 4.9 Footer — the honesty ledger
A plain table: **Built · Mock (labelled) · Not yet.** This is a feature, not fine print.
- **Built:** 13 agents on the real failover chain; safety gate; triage → case file; visa MIL orchestration; KYC state machine; billing reconciliation; commission/pricing model; medical-data vault; 22-market register with compliance gating.
- **Mock (clearly labelled):** interpreter/flight/hotel vendors (no provider keyed — dry-run bookings); curated near-hospital stays; fare estimates.
- **Not yet:** any signed hospital; live patients; revenue; WhatsApp Business verification; Telegram channel for Central Asia/Cameroon; production GDPR hosting.

---

## 5. The safety gate — make it visible
Every outbound agent action passes a mechanical safety gate before it's shown, producing one of four verdicts: **pass / needs-review / escalate / block**. Surface it as the badge on each agent card. Specifically demo these refusals (they're the most convincing thing on the page):
- Discharge relay with **empty hospital text** → produces nothing.
- Video-consult **outcome note containing clinical content** → refused (only non-clinical outcomes allowed).
- Video consult **without a finalized quote** → gated.
- A **skipped market** (e.g., UAE) → vault write hard-refused.
*"The gate refusing to do the wrong thing is the demo."*

---

## 6. Fallback snapshot data (offline only — the live sandbox is the source of truth)

> **These fixtures are the OFFLINE FALLBACK, not the primary data.** At runtime the page fetches everything below from the live sandbox (§8); use these only when the sandbox is unreachable, and render an "offline snapshot" badge when you do. They also define the exact shape each endpoint returns, so keep them in sync with §8's contract.

### 6.1 The 13 agents
```json
[
 {"id":"triage","title":"Triage","phase":"Intake","kind":"LLM","desc":"Patient's own words → the structured case file a hospital reviews in three minutes. Extracts only what was said; never infers a diagnosis."},
 {"id":"document-kyc","title":"Document checklist (KYC)","phase":"Before travel","kind":"DETERMINISTIC","desc":"State persists per lead. One deterministic rule (passport expiry) auto-runs; everything else lands in needs_human_review and stays there until a person clears it."},
 {"id":"visa-documents","title":"Visa & travel documents","phase":"Before travel","kind":"DETERMINISTIC","desc":"Orchestrates the hospital's Medical Invitation Letter (mandatory since 1 Apr 2025) + a country-correct checklist. The patient applies and books their own tickets."},
 {"id":"payment-routing","title":"Payment routing","phase":"Before travel","kind":"DETERMINISTIC","desc":"Self-pay, insured (GOP/pre-auth), or government-sponsored — each a different document set and timeline. Encodes real constraints (e.g. Kenya SHA's $3,900 cap)."},
 {"id":"video-consult","title":"Patient–doctor video consult","phase":"Before travel","kind":"DETERMINISTIC","desc":"Gated on a finalized quote. Timezone-overlap math between the surgeon's IST hours and the patient's day; interpreter attached for non-English. We schedule but are not a party — no joining, no recording, no storing the clinical conversation."},
 {"id":"accommodation","title":"Accommodation","phase":"Before travel","kind":"DETERMINISTIC","desc":"Pre-op (1–2 nights, walkable) vs post-op (category-sized: 12 nights cardiac, 4 fertility). Curated near-hospital sample; nothing books without a provider key + human confirm."},
 {"id":"ticketing","title":"Ticketing (flexible-date search)","phase":"Before travel","kind":"DETERMINISTIC","desc":"Sweeps a window around the pre-op arrival deadline, cheapest-first. Curated fare estimate; requesting a date is a human-gated dry-run."},
 {"id":"ground-logistics","title":"Ground logistics","phase":"Arrival","kind":"DETERMINISTIC","desc":"Airport pickup timing + vehicle sizing from a flight number and arrival time — real immigration/baggage buffer math."},
 {"id":"interpreter-scheduling","title":"Interpreter scheduling","phase":"During treatment","kind":"DETERMINISTIC","desc":"Matches a consult time to language coverage on the roster. No vendor wired yet — labelled mock."},
 {"id":"family-update","title":"Family update","phase":"During treatment","kind":"LLM","desc":"The waiting family member is a different WhatsApp number with its own consent gate. Status only, never clinical."},
 {"id":"discharge-relay","title":"Discharge & medication relay","phase":"After treatment","kind":"LLM","desc":"Relays the hospital's own discharge instructions — restructured, translated — and adds nothing. Empty input → nothing. Always requires human sign-off."},
 {"id":"billing-reconciliation","title":"Billing reconciliation","phase":"After treatment","kind":"DETERMINISTIC","desc":"Reads a real quote and a real actual bill; plain arithmetic; a variance past threshold is written back as a pending review."},
 {"id":"travel-readiness","title":"Return-travel readiness","phase":"After treatment","kind":"DETERMINISTIC","desc":"Tracks when to raise return travel. Never itself clears a patient to fly — that's the hospital's call."}
]
```

### 6.2 Sample patient fixtures (for the Live Journey)
```json
[
 {"id":"et-cardiac","label":"Ethiopian cardiac patient","market":"Ethiopia","language":"Amharic","category":"cardiac",
  "message":"My father has been told he needs a bypass. He's 61, blood pressure controlled, from Ethiopia. We don't have his angiogram report digitised yet.",
  "triage":{"category_guess":"cardiac","urgency":"routine","action":"collect reports","key_facts":["61-year-old male","bypass (CABG) advised","BP controlled","angiogram not yet digitised"],"missing":["digitised angiogram / cath report","current medication list","recent bloodwork"]}},
 {"id":"ng-ortho","label":"Nigerian knee replacement","market":"Nigeria","language":"English","category":"ortho",
  "message":"I need a knee replacement, I'm 58, from Nigeria, no reports yet, my local doctor said it's not urgent but it's painful.",
  "triage":{"category_guess":"ortho","urgency":"routine","action":"collect reports","key_facts":["58 years old","knee replacement sought","not urgent per local doctor","painful"],"missing":["X-ray / MRI","reports"]}},
 {"id":"uz-fertility","label":"(Uzbekistan — blocked demo)","market":"Uzbekistan","language":"Russian","category":"fertility",
  "message":"We've done two IVF cycles at home, both failed. Looking at other countries now.",
  "blocked":true,"blockReason":"Uzbekistan is on the data-residency skip list (localization law). The vault hard-refuses a clinical write — this is the compliance gate working, shown deliberately."}
]
```
Use `et-cardiac` as the default. The `uz-fertility` fixture exists to demonstrate the **compliance refusal** — when picked, the journey stops at the vault with a red BLOCKED card, not a normal run.

### 6.3 Markets (22 — code, name, region, tier, status, flags)
```json
[
 {"c":"IQ","name":"Iraq","region":"Middle East","tier":"A","status":"servable"},
 {"c":"OM","name":"Oman","region":"Middle East","tier":"A","status":"servable"},
 {"c":"YE","name":"Yemen","region":"Middle East","tier":"A","status":"servable"},
 {"c":"AE","name":"United Arab Emirates","region":"Middle East","tier":"B","status":"skipped","reason":"Health data must stay in-country (Federal Law 2/2019); no UAE hosting yet."},
 {"c":"SA","name":"Saudi Arabia","region":"Middle East","tier":"B","status":"servable"},
 {"c":"ET","name":"Ethiopia","region":"Africa","tier":"B","status":"servable","note":"Sachin ranking #1 of top 5"},
 {"c":"NG","name":"Nigeria","region":"Africa","tier":"B","status":"servable","note":"Sachin ranking #2"},
 {"c":"KE","name":"Kenya","region":"Africa","tier":"B","status":"servable","note":"Sachin ranking #3"},
 {"c":"TZ","name":"Tanzania","region":"Africa","tier":"B","status":"servable","note":"Sachin ranking #4"},
 {"c":"ZM","name":"Zambia","region":"Africa","tier":"B","status":"skipped","reason":"DPA 2021 localization for sensitive data can't be met yet.","note":"Sachin #5 cluster"},
 {"c":"ZW","name":"Zimbabwe","region":"Africa","tier":"B","status":"servable","note":"Sachin #5 cluster"},
 {"c":"NA","name":"Namibia","region":"Africa","tier":"B","status":"servable","note":"Sachin #5 cluster"},
 {"c":"SD","name":"Sudan","region":"Africa","tier":"B","status":"servable"},
 {"c":"CM","name":"Cameroon","region":"Africa","tier":"C","status":"servable","telegramFirst":true},
 {"c":"MM","name":"Myanmar","region":"SE Asia","tier":"C","status":"servable"},
 {"c":"UZ","name":"Uzbekistan","region":"Central Asia","tier":"B","status":"skipped","reason":"Localization (ZRU-547) needs in-country servers we don't have.","telegramFirst":true},
 {"c":"KZ","name":"Kazakhstan","region":"Central Asia","tier":"B","status":"skipped","reason":"Localization (Law 94-V) needs in-country storage we don't have.","telegramFirst":true},
 {"c":"TJ","name":"Tajikistan","region":"Central Asia","tier":"C","status":"servable","telegramFirst":true},
 {"c":"KG","name":"Kyrgyzstan","region":"Central Asia","tier":"C","status":"servable","telegramFirst":true},
 {"c":"TM","name":"Turkmenistan","region":"Central Asia","tier":"C","status":"servable","telegramFirst":true},
 {"c":"GB","name":"United Kingdom","region":"Europe","tier":"D","status":"servable"},
 {"c":"IE","name":"Ireland","region":"Europe","tier":"D","status":"servable"}
]
```
Totals to render: **22 markets · 5 regions · 18 servable · 4 skipped · 6 Telegram-first.**

### 6.4 Partner board (pursuit-ranked; 0 signed)
```json
[
 {"name":"Aster DM Healthcare (India)","city":"Bengaluru / Kochi","connection":"Warm group intro (owning family)","stage":"Warm intro pending","pursuit":"high","set":"First partner set — Bangalore cluster"},
 {"name":"Manipal Hospitals","city":"Bengaluru","connection":"Warm group intro (former group legal head)","stage":"Warm intro pending","pursuit":"high","set":"First partner set — Bangalore cluster"},
 {"name":"Fortis Hospital, Bannerghatta Road","city":"Bengaluru","connection":"Adviser desk (Sachin Rai's own)","stage":"Intro expected","pursuit":"high","set":"First partner set — Bangalore cluster"},
 {"name":"Aster GCC (Medcare / Aster Clinics)","city":"Dubai / Abu Dhabi","connection":"Same family, GCC entity","stage":"Future corridor","pursuit":"medium","set":"Demand-side (UAE data-residency dependent)"},
 {"name":"SPARSH Hospitals","city":"Bengaluru","connection":"Cold","stage":"Cold outreach","pursuit":"medium","set":"First partner set — Bangalore cluster"},
 {"name":"KIMS Hospitals","city":"Bengaluru","connection":"Cold","stage":"Cold outreach","pursuit":"medium","set":"First partner set — Bangalore cluster"}
]
```
Render `pursuit` as a qualitative chip (high/medium), **not** a fake precise score, and **never** a star rating or wait-time. Add the standing note that the wider cold board holds ~24 more chains (Apollo, Max, etc.), all unsigned.

### 6.5 Indicative price bands (label indicative, cite nothing as fact)
```json
{
 "note":"Indicative only — reconcile against a real hospital rate card before any patient-facing use. US comparators for context, not a promise.",
 "bands":[
  {"procedure":"CABG (bypass)","indiaIndicative":"$5,000–9,000","usReference":"$90,000–120,000"},
  {"procedure":"Heart valve replacement","indiaIndicative":"$4,500–7,000","usReference":"—"},
  {"procedure":"Angioplasty (1 stent)","indiaIndicative":"$3,500–5,000","usReference":"—"}
 ]
}
```
If you show a savings figure, phrase it as *"often a large fraction of Western private-pay cost — indicative, not guaranteed,"* in a calm tone. **No "60–85% savings!" hype over someone's illness.**

### 6.6 Commission model (investor panel)
```json
{
 "incumbentRange":"25–33% (charged by traditional agents to hospitals)",
 "canopusTiers":[
  {"tier":"₹0–20L routed","pct":"20%"},
  {"tier":"₹20–50L routed","pct":"22.5%"},
  {"tier":"₹50L+ routed","pct":"25%"}
 ],
 "paidBy":"the hospital, never the patient",
 "valueAsk":"best-of-book package rates, priority admission/OT scheduling, a named international coordinator, co-funded patient-education content",
 "line":"We open below every incumbent to win the pilot, and rise only to their cheapest rate as volume proves out — so the hospital never pays more than its current cheapest agent."
}
```

---

## 7. Concierge chat — system prompt + fallback (use verbatim)

**Model:** `gemini-2.5-flash` (server-side; the previous `gemini-3.6-flash` is not a real model id — it silently 404s).

**System prompt:**
```
You are the Canopus Care concierge — a NON-CLINICAL medical-travel LOGISTICS & ESTIMATES assistant only.

Canopus Care is a facilitator, not a hospital and not a doctor. You help patients in the Middle East, Africa,
and Central Asia understand the logistics of getting non-emergency treatment in India: what documents they
need, how the visa invitation works, roughly what a procedure costs, how the journey is coordinated, and what
Canopus Care does at each step.

HARD RULES:
- You do NOT diagnose, interpret symptoms, recommend treatments, prescribe, or give any medical opinion. If
  asked anything clinical, say clearly that only the treating hospital's doctors can answer, and offer to help
  gather the reports the hospital will need.
- If a message suggests a medical emergency, stop and tell the person to seek immediate local emergency care —
  Canopus Care coordinates planned, non-emergency travel and cannot handle emergencies.
- Cost figures are INDICATIVE ranges only, never quotes, and always tied to "the hospital confirms the final
  price." Never promise a specific saving.
- Never invent hospital names, ratings, wait-times, or success rates. Canopus Care has no signed hospitals yet
  and you must not imply otherwise. Speak about "our accredited-hospital network in India" in general terms.
- The facilitation fee is paid by the hospital, never by the patient. Do not quote a commission percentage to a
  patient. If asked how Canopus makes money: "hospitals pay us a facilitation fee — you pay the hospital's own
  package price, with no markup and no hidden charge from us."
- Be warm, plain, and calm. These are frightened people making a hard decision. No hype, no pressure.

Keep answers short. When useful, offer the next concrete logistics step (e.g. "I can list the documents Ethiopia
needs for a medical visa").
```

**Fallback (when no API key is set) — contains no fabricated data:**
```json
{
 "reply":"I'm the Canopus Care concierge — I help with the logistics and rough costs of planned treatment in India, not medical advice. Tell me the country you're travelling from and the treatment you're considering, and I'll walk you through documents, the medical-visa invitation, an indicative cost range (the hospital confirms the final price), and how we coordinate the journey. Anything clinical is answered by the treating hospital's doctors — I can help you gather the reports they'll need.",
 "note":"Demo fallback — the live concierge runs on gemini-2.5-flash when GEMINI_API_KEY is set."
}
```

---

## 8. Live sandbox link — the page is a client of the running engine

The whole point: **the landing page renders live sandbox data and runs live sandbox agents.** It never re-implements engine logic; it calls the sandbox's HTTP API. Change the data in the sandbox → the page changes.

### 8.1 Architecture — proxy through your own Express server
The sandbox listens on `http://localhost:5173` and sets **no CORS headers** (and may sit behind a Basic-auth `CONSOLE_TOKEN`). So **do not call it directly from the browser.** Instead, the AI Studio app's Express server **proxies** `/api/*` to the sandbox:

```
Browser (React)  ──/api/state──►  AI Studio Express  ──►  SANDBOX_URL/api/state
                                   (adds Basic auth,       (node --experimental-sqlite
                                    injects nothing else)   server/server.mjs on :5173)
```

- Env: `SANDBOX_URL` (default `http://localhost:5173`), optional `SANDBOX_TOKEN` (→ `Authorization: Basic base64("x:"+token)` if the sandbox has `CONSOLE_TOKEN` set), and `GEMINI_API_KEY` for the concierge.
- The Express proxy forwards method, path, and JSON body verbatim for the routes in §8.2 and returns the JSON untouched.
- **Fallback:** if a proxied call fails (sandbox down, timeout), the server responds with the matching §6 fixture and a header `x-canopus-source: offline-snapshot`; the React app shows an "offline snapshot" badge. The page must never white-screen because the sandbox is off.
- Keep a **`GET /api/health`** passthrough; show a small live/offline dot in the header driven by it.

### 8.2 Endpoint contract (what the page calls)

**Already live in the sandbox — consume as-is:**
| Page section | Method + path | Returns |
|---|---|---|
| Live Journey (§4.2) | `POST /api/journey/run` body `{leadId, ...}` | `{leadId, category, market, admissionDate, steps:[{phase,id,action,title,ok,data,ms}]}` — render each step's `data` with logic mirroring the sandbox's per-action renderer |
| Single agents (§4.3) | `POST /api/agents/{kind}` | the agent's result object incl. `safety.verdict` for the badge. `kind` ∈ triage, kyc-init, visa-start, payment-routing, video-consult-schedule/-outcome, stay-plan, stay-search, flight-search, ground-logistics, interpreter-scheduling, family-update-send, discharge-relay, billing-lead, travel-readiness |
| Partners (§4.7) | `GET /api/state` → `.accounts` | pursuit-ranked partner rows `{name, city, connection, commission, stage, pursuit, access, speed, fit, valueAsk, ...}` |
| Economics/markets counts (§4.5/4.6) | `GET /api/state` → `.kpi`, `.markets` | KPI counts; `markets:[{code,tier}]` |
| Activity ticker (optional) | `GET /api/runs` | recent run log — nice "the engine is alive" touch in the footer |

**Two small read-only JSON endpoints to be ADDED to the sandbox** (they back §4.6 markets and §4.8 vault faithfully; the sandbox owner is adding these — the page should call them and fall back to §6 if 404):
| Page section | Method + path | Returns |
|---|---|---|
| Markets footprint (§4.6) | `GET /api/markets` | `[{code,name,region,tier,status,reason,telegramFirst}]` where `status` = `servable`/`skipped` from `regulatory_status` |
| Data vault (§4.8) | `GET /api/vault` | `{backend, laws:[{market_code,transfer_rule,law_name,status,blocked}], skipped:[{code,name,note}], accessLog:[...]}` |
| Economics panel (§4.5) | `GET /api/economics` | `{incumbent:{low,high}, usdInr, tiers:[{uptoINR,pct,label}], entryPct, capPct, paidBy, example:{category,packageUSD,ourFeeUSD,hospitalNetUSD,netUpliftVsIncumbentFloorUSD}, line}` |

### 8.3 What "reflects changes" means in practice
- Reseed markets (`npm run seed`) or flip a market's `regulatory_status` → `/api/markets` changes → the map's servable/skipped/Telegram flags change.
- Run `npm run warm-accounts` / edit a partner → `/api/state.accounts` reorders → the partner board reorders (it's pursuit-ranked server-side).
- Change `COMMISSION_TIERS` in the sandbox → `GET /api/economics` returns the new tier ladder and re-computed worked example → the economics panel updates. (§6.6 is just the offline-fallback copy.)
- Every agent run and journey walk is executed by the real engine through its real safety gate — not re-simulated in React.

### 8.4 Technical notes
- **Stack:** React 19 + Vite + a small Express server that does (a) the Gemini concierge endpoint `POST /api/concierge` (model `gemini-2.5-flash`, key from `GEMINI_API_KEY`, else the §7 fallback), and (b) the sandbox proxy (§8.1).
- **No external data hosts** beyond the Gemini call and the sandbox proxy. Inline fonts as data-URIs; don't hotlink font/CDN stylesheets.
- Keep all fixtures in one `data.ts` used only as the offline fallback (§6).
- **Accessibility:** visible keyboard focus, semantic headings, `prefers-reduced-motion`, light/dark parity.
- **Metadata:** title *"Canopus Care — Cross-Border Care Facilitation (Sandbox Demo)"*. Description: *"A compliance-first agentic engine for India-inbound medical travel. Sandbox demo for our YC application — no live patients."* Drop any "and worldwide" language.

---

## 9. The one-sentence test for every element you render
> *If a YC reviewer clicked it and then asked "is that real?", would the honest answer be yes — or "it's a labelled mock" — and does the page already say which?*

If neither, cut it.
