# YC Fall 2026 — Application Draft

**Deadline: Monday 27 July 2026, 8pm PT. Decisions by 28 August.**

Working draft. Answers marked **[NEEDS YOU]** cannot be written without you and Ajeya — they are about you,
and a reviewer can tell instantly when they aren't. Everything else uses real numbers from the model.

Paul Graham's guidance, which shapes the tone below: *be matter-of-fact, avoid marketing-speak, disclose
flaws rather than conceal them, show you understand the obstacles.* Every instinct to sound impressive here
makes the application worse.

---

## Describe what your company does in 50 characters or less

> **Medical travel to India, coordinated by AI agents**

*(49 characters — counted, not estimated.)* Alternatives:
- `AI agents run our medical travel service, not staff` (51 — one over, would need trimming)
- `We get patients from Africa and the Gulf treated in India` (56 — too long, but the clearest of the three;
  worth trimming to fit if you prefer stating the corridor over the method)

---

## What is your company going to make?

> Canopus Care is a medical travel facilitator. Patients in Africa, the Middle East and South East Asia who need
> surgery they can't get at home — or can't afford privately, or have been told to wait eleven months for —
> come to us. We work out what they need, collect and structure their medical reports so a consultant can
> review them in three minutes, get them a quote from an accredited Indian hospital, handle the visa
> documents, travel and accommodation, keep their family updated in their own language while they're being
> treated, and follow up afterwards. The hospital pays us a commission, usually 15–25% of the treatment
> package.
>
> That job is done today by agents and hospital international desks — people, working over WhatsApp, across
> time zones and six languages. We do it with AI agents and a small human team that approves anything
> consequential. Same service, roughly a fifth of the cost to deliver.
>
> India treated 507,244 foreign patients last year. Almost all of them arrived through an agent network that
> takes a cut large enough that hospitals build 25–35% padding into international quotes to fund it. The
> patient pays that padding and increasingly knows it.

*Why this works: it says what happens, in order, with no adjectives. A reviewer knows exactly what the
company is by sentence three. No mention of architecture, plugins, or models — those are the answer to a
question nobody asked yet.*

---

## Why did you pick this idea to work on? Do you have domain expertise?

**[NEEDS YOU]** — this is where the application is won or lost, and I can't write it.

What it must contain:
- Your hospital and GTM background, concretely. Not "experience in healthcare" — *what you did, where, and
  what it taught you about how international patients actually arrive.*
- Ajeya's technical background, equally concretely.
- The specific moment or observation that made this obvious to you. Reviewers remember stories, not claims.
- **Why you two can get hospital access that a stranger can't** — you have warm, group-level introductions
  to Aster and Manipal. Most applicants in this space would kill for one. Say so plainly.

Do not write "we are passionate about healthcare." Write what you know that others don't.

---

## What's new about what you're making? What substitutes do people resort to?

> The substitutes are agents and hospital international desks. Both are people-heavy, which sets a floor on
> what they can serve: below roughly a $5,000 treatment package the economics stop working, so most
> facilitators only chase high-ticket cases and everyone else gets a badly-run WhatsApp thread or nothing.
>
> What's new is that the coordination is now doable by software. Not the medicine — we never touch that —
> but the intake, qualification, quoting, document chasing, visa checklist, logistics and follow-up. That's
> most of the labour and none of the clinical risk.
>
> Two things fall out of that. We can serve mid-ticket treatments nobody currently serves profitably. And we
> can do things a human-staffed operation can't afford to: a daily update to the family back home, in their
> language, every day of the admission. That costs us almost nothing and it's the single most valuable thing
> in the entire journey to the people receiving it.

---

## Who are your competitors, and who might become competitors?

> Directly: Vaidam, MediGence, Bookimed and a long tail of agencies. All are comparison-and-referral models
> built on brochure data; none coordinate the journey end to end.
>
> The most likely serious competitor is a hospital group building this in-house — Apollo or Fortis deciding
> to run their own AI-native international desk. That's a real risk. Our answer is that a hospital can only
> build it for itself, and patients want to compare across hospitals; a facilitator that's trusted precisely
> because it isn't owned by one hospital is a different product.
>
> An AI-native competitor could copy the software in a few months. What they can't copy quickly is the
> hospital relationships, the corridor-specific regulatory work, and the operational data that only comes
> from actually moving patients.

---

## How far along are you? How long have you been working on it?

> No revenue, no patients treated, no signed hospital agreement. Being precise about that because everything
> else is easy to overstate.
>
> What exists: the full patient journey is built and running — a 22-stage WhatsApp comms engine with 21
> approval-ready templates covering every branch including visa denial and complications; a content engine
> producing multilingual cost guides with a price ladder that compares the patient's best local option first,
> then other destinations, then India; a partner pipeline; and a human approval console where nothing goes
> out without a person clicking.
>
> Also built, because in this business it's not optional: a clinical safety layer that blocks any agent
> message drifting into diagnosis, dosage, prognosis or fitness-to-fly, escalates anyone describing an
> emergency out of the funnel to local emergency services, and refuses to auto-send in languages where we
> haven't had a native clinical reviewer validate the guardrails. It's verified by an adversarial test suite
> that fails the build on regression. The first time we ran that suite it caught our own safety layer
> returning "pass" while holding blocking findings — detection working, enforcement silently dead.
>
> **[NEEDS YOU]** — how long you've actually been working on this, and what you built in what timeframe.
> Velocity is a scored signal.

---

## How will you make money? How much could you make?

> Commission from the hospital, 15–25% of the treatment package.
>
> We model it as a funnel with cost accumulating down it. The unit we actually sell a hospital isn't a
> treated patient, it's a **pre-triaged case file**: treatment need confirmed, timeline and funding route
> captured, reports collected and structured into something a consultant reviews in three minutes, and an
> indicative price already accepted. Roughly one in five of those go on to book.
>
> The number that decided our strategy: on paid acquisition, a mid-ticket case contributes **−$558** — worse
> than the agency we're replacing, because Google charges us exactly what it charges them and our advantage
> is downstream of the click. On organic acquisition the same case contributes **+$1,027**. So organic isn't
> a marketing channel for us, it's the business, and oncology — where the fee is $4,300 — is the only
> category that survives paid acquisition while organic compounds.
>
> India's medical travel market is $8.71bn in 2025, growing to $16.21bn by 2030. We don't need a large share
> of that to matter; we need one corridor working.

*Note: this answer deliberately shows a negative number. Disclosing the flaw is PG's explicit advice, and an
applicant who has found the number that kills the naive version of their plan reads as someone who's
actually done the work.*

---

## What obstacles do you expect, and how will you get past them?

> Three, in order of how much they worry us.
>
> **Hospital agreements take longer than software.** We have warm group-level introductions to Aster and
> Manipal and expect one to Fortis Bangalore, but nothing is signed. We're not asking for exclusivity — just
> permission to send three to five pre-triaged cases as a test, which is a much easier yes and is what
> generates the agreement.
>
> **Organic acquisition compounds over 6–12 months.** That's a runway requirement, not a detail. Oncology on
> paid acquisition is what funds the wait.
>
> **Data residency.** UAE law prohibits health data relating to UAE-provided services from leaving the
> country without a case-by-case authority exception — including into an AI prompt, which is a transfer.
> Most operators running a Bangalore-hosted WhatsApp funnel into the Gulf are non-compliant and don't know
> it. We've built the constraint into the system and it blocks by default. Solving it properly needs
> in-country presence, which we'd rather treat as a moat than a problem.

---

## Please tell us about something impressive each founder has built or achieved

**[NEEDS YOU]** — PG calls this the most important question on the application. It is not about relevance to
the startup. It's about magnitude. Specific, verifiable, one or two sentences each. Do not hedge.

## How long have the founders known one another and how did you meet?

**[NEEDS YOU]**

## Who writes code? Was any of it done by a non-founder?

**[NEEDS YOU]** — answer honestly, including AI-assisted development. Everyone is using it; concealing it
is the only thing that would look bad.

## Where do you live now, and where would the company be based after YC?

**[NEEDS YOU]** — and worth deciding deliberately, because you're also applying to Hub71, which requires a
founder to relocate to Abu Dhabi. Those two answers need to be consistent with each other and with the
data-residency argument above, which actually makes an Abu Dhabi base *strategically* coherent rather than
opportunistic.

## What other ideas did you consider?

**[NEEDS YOU]** — YC sometimes funds teams for an alternate idea on this list. Worth answering properly.

## Tell us about the time you most successfully hacked a non-computer system

**[NEEDS YOU]** — the wildcard. PG says a good answer here has rescued otherwise unpromising applications.

---

## The one-minute video

Statistically the highest-leverage minute of the whole application. Both of you on camera, unpolished, no
slides, no script read aloud.

Suggested shape:
1. **(0:00–0:10)** Names, and what Canopus Care does in one plain sentence.
2. **(0:10–0:30)** Why you two — hospital/GTM plus technical, and the Aster/Manipal access.
3. **(0:30–0:50)** The number: what a treated patient costs an agency versus us, and why organic changes it.
4. **(0:50–1:00)** What you'll have done by the time the batch starts.

Record it badly and on time rather than well and late.

## A second video worth making

90 seconds of the patient journey sandbox actually playing — a real conversation moving from first WhatsApp
message to treated, with a template edited live. Not a localhost link; a recording. It's the most convincing
artefact you have and it takes an hour.

---

## Before you submit — checklist

- [ ] Every **[NEEDS YOU]** answered in your own voice, not polished into blandness
- [ ] The word "platform" appears nowhere
- [ ] No mention of model routing, failover chains, or plugin architecture
- [ ] At least one real conversation with a patient or facilitator quoted with a number
- [ ] The demo-regulatory-clearance caveat removed from anything you link to
- [ ] Video uploaded as **unlisted**, not private — a private video is a rejected application
- [ ] Submitted before Monday 27 July, 8pm PT

---

*Sources for figures used above: India inbound volume and market size (Future Market Insights, Mordor
Intelligence); agent commission padding (Maria Todd, industry analysis); healthcare CPC and medical-travel
cost-per-lead benchmarks; UAE Federal Law No. 2/2019. Unit-economics figures are from our own model —
`npm run economics` — where two of fifteen inputs are measured and the rest are labelled assumptions.*
