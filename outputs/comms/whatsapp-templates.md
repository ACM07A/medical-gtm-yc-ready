# WhatsApp Sales Comms — approval-ready templates

> Body kept minimal & Utility-flavoured (what Meta scrutinizes); the value rides in the image header (infographic). Human submits to Meta & sends. Variables: {{1}} name · {{2}} treatment · {{3}} city.

## 1. acknowledge — `medyatra_acknowledge`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/welcome.png`
- **Body:** Hi {{1}}, thanks for reaching out to MedYatra about {{2}} in India. Your care coordinator will share accredited hospital options with you shortly.
- **Buttons:** [Talk to a coordinator] [Not now]

## 2. qualify — `medyatra_qualify`
- **Type:** session · **Category:** utility
- **Image header:** `outputs/comms/img/how-it-works.png`
- **Body:** To tailor your options, could you share your recent medical reports, your preferred timing, and the city you'll travel from?
- **Buttons:** [Send reports] [Ask a question]

## 3. estimate — `medyatra_estimate`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/estimate-cardiac.png`
- **Body:** Hi {{1}}, here's the indicative cost range for {{2}} you asked about — a package estimate, not a final quote. Your coordinator will confirm the details for your case.
- **Buttons:** [Discuss my estimate] [See hospitals]
- _Header image is per-treatment (estimate-<category>.png) — the cost comparison + savings live in the image, not the body._

## 4. hospital_options — `medyatra_hospital_options`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/welcome.png`
- **Body:** We've shortlisted accredited hospitals for your {{1}}. Tap below to see doctor profiles and what's included.
- **Buttons:** [See hospital options] [Talk to a coordinator]

## 5. logistics — `medyatra_logistics`
- **Type:** session · **Category:** utility
- **Image header:** `outputs/comms/img/how-it-works.png`
- **Body:** Here's how your medical trip works — visa invitation, travel, stay and support, step by step. Your coordinator arranges it all.
- **Buttons:** [Start planning] [Ask a question]

## 6. reengage — `medyatra_reengage`
- **Type:** template · **Category:** marketing
- **Image header:** `outputs/comms/img/welcome.png`
- **Body:** Hi {{1}}, still considering treatment in India? Your MedYatra coordinator is here whenever you're ready — no pressure. Reply STOP to opt out.
- **Buttons:** [I'm ready] [Not now]
- _Marketing category — requires prior opt-in; includes opt-out._


**Compliance:** consent required before outbound; no clinical claims/guarantees; prices indicative (shown in image, not body); facilitator voice; honor opt-out. See /build-os/09.
