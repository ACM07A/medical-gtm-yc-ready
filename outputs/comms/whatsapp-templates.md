# WhatsApp Sales Comms — approval-ready templates

> Body kept minimal & Utility-flavoured (what Meta scrutinizes); the value rides in the image header (infographic). Human submits to Meta & sends. Variables: {{1}} name · {{2}} treatment · {{3}} city.

## 1. first_touch — `medyatra_first_touch`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/welcome.png`
- **Body:** Hi {{1}}, thank you for reaching out to Canopus Care about {{2}} — we know looking into this isn't easy. A real care coordinator will personally help you find the right accredited hospital. Reply YES whenever you're ready and we'll take it from there.
- **Buttons:** [Yes, tell me more] [Not now]

## 2. nudge — `medyatra_nudge`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/estimate-cardiac.png`
- **Body:** Hi {{1}}, still exploring {{2}} in India? Accredited hospitals, no waiting list, English-speaking care. Options whenever you're ready.
- **Buttons:** [Show me options] [Not now]

## 3. channel_fallback — `medyatra_channel_fallback`
- **Type:** template · **Category:** utility
- **Image header:** `null`
- **Body:** Hi {{1}}, we tried reaching you about {{2}}. If it's easier, reply here or email us — no pressure, we're here when you need us.
- **Buttons:** [I'm ready] [Stop messages]

## 4. qualify — `medyatra_qualify`
- **Type:** session · **Category:** utility
- **Image header:** `outputs/comms/img/how-it-works.png`
- **Body:** To tailor your options, could you share your recent medical reports, your preferred timing, and the city you'll travel from?
- **Buttons:** [Send reports] [Ask a question]

## 5. collect_reports — `medyatra_collect_reports`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Thank you, {{1}}. Whenever you're ready, share your latest reports, scans, or even a doctor's summary — a clear photo is enough to start. An accredited hospital's specialist will review it and recommend the right path. No rush; send what you have.
- **Buttons:** [Uploaded] [Need help]

## 6. opinion_pending — `medyatra_opinion_pending`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Your reports are with the hospital's specialist now — the waiting is often the hardest part, and we understand that. You'll have their opinion and options within {{1}}, and we'll message you the moment it's back. Anything on your mind meanwhile, just ask.
- **Buttons:** [Okay] [Ask a question]

## 7. off_ramp — `medyatra_off_ramp`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Hi {{1}}, we know this may not be the answer you were hoping for. Based on the doctor's review, travelling for surgery isn't the right step right now — this is better cared for closer to home. We've written up their guidance for you to keep, at no charge, and we're here if anything changes.
- **Buttons:** [Thank you]

## 8. estimate — `medyatra_estimate`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/estimate-cardiac.png`
- **Body:** Hi {{1}}, here's the indicative cost range for {{2}} — a package estimate, not a final quote. Your coordinator will confirm details for your case.
- **Buttons:** [Discuss my estimate] [See hospitals]
- _Header is the per-treatment cost infographic — savings live in the image, not the body._

## 9. doc_reminder — `medyatra_doc_reminder`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Hi {{1}}, we're ready to firm up your quote — we just need {{2}} to complete it. Whenever you can.
- **Buttons:** [Sending now] [Need help]

## 10. objection — `medyatra_objection`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Great questions, {{1}} — happy to help. Whether it's cost, choosing the hospital, or safety, I can share accreditation, a free second opinion, or a call with the doctor. What matters most?
- **Buttons:** [Cost & payment] [Hospital & safety] [Talk to a doctor]

## 11. booking — `medyatra_booking`
- **Type:** template · **Category:** utility
- **Image header:** `null`
- **Body:** Good news {{1}} — the hospital can offer an admission slot around {{2}}. Shall we hold it and start your visa invitation letter?
- **Buttons:** [Hold my slot] [Discuss dates]

## 12. visa_start — `medyatra_visa_start`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/how-it-works.png`
- **Body:** For your India medical visa, the hospital issues your official invitation letter (a required supporting document) and we send you the full checklist. You apply on the government portal yourself — it's straightforward. Up to {{1}} attendant(s) may travel with you.
- **Buttons:** [See my checklist] [Ask about visa]
- _SUPPORTING DOCS ONLY — hospital letter (system-generated, mandatory since Apr-2025) + checklist. The patient applies themselves; we don't submit for them. See lib/visa.mjs._

## 13. stay_options — `medyatra_stay_options`
- **Type:** template · **Category:** utility
- **Image header:** `outputs/comms/img/how-it-works.png`
- **Body:** Here are near-hospital stay options via our partners, for you and your family before and after treatment. You book your own flights and visa; we help with the stay and the paperwork. Want these options?
- **Buttons:** [See stays] [Ask a question]
- _Partner-provided stay (lib/stay.mjs). Flights + visa are the patient's own; Canopus Care keeps coordination light._

## 14. pre_op — `medyatra_pre_op`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Hi {{1}}, your pre-op instructions from the hospital are ready (fasting, medicines, what to bring). Safe travels — message us anytime if you need anything.
- **Buttons:** [Got it] [Ask a question]

## 15. in_treatment — `medyatra_in_treatment`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Wishing you a smooth procedure, {{1}}. Your coordinator is on hand for anything non-medical; the hospital team is with you for care. We'll keep your family updated.
- **Buttons:** [Thank you]

## 16. post_op — `medyatra_post_op`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Hi {{1}}, glad you're through it. Your discharge summary and follow-up plan are saved for you. How are you feeling today?
- **Buttons:** [Doing okay] [Need help]

## 17. recovery_bundle — `medyatra_recovery_bundle`
- **Type:** template · **Category:** marketing
- **Image header:** `outputs/comms/img/how-it-works.png`
- **Body:** Hi {{1}}, many patients add a short naturopathy recovery stay before flying home — restful, supervised, well-priced. Want options? Reply STOP to opt out.
- **Buttons:** [Show recovery stays] [No thanks]
- _Marketing — the wellness bundleable product. Requires opt-in; includes opt-out._

## 18. review_referral — `medyatra_review_referral`
- **Type:** template · **Category:** marketing
- **Image header:** `null`
- **Body:** Hi {{1}}, we hope your treatment and recovery went well. If we helped, a short review means a lot — and if a friend or relative ever needs care in India, we're here. Reply STOP to opt out.
- **Buttons:** [Leave a review] [Refer someone]

## 19. reengage — `medyatra_reengage`
- **Type:** template · **Category:** marketing
- **Image header:** `outputs/comms/img/welcome.png`
- **Body:** Hi {{1}}, still considering treatment in India? Your Canopus Care coordinator is here whenever you're ready — no pressure. Reply STOP to opt out.
- **Buttons:** [I'm ready] [Not now]
- _Marketing category — requires prior opt-in; includes opt-out._

## 20. cant_travel — `medyatra_cant_travel`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Hi {{1}}, we're sorry the visa or travel didn't come through this time — we know how disheartening that is after all your preparation. Nothing is lost: we'll hold everything exactly as it is and pick up the moment you're ready to try again. We're not going anywhere.
- **Buttons:** [Try again later] [Ask a question]
- _Reached when a visa is denied or the patient isn't fit to fly — honest hold, not a loss._

## 21. complication — `medyatra_complication`
- **Type:** session · **Category:** utility
- **Image header:** `null`
- **Body:** Hi {{1}}, we know this is frightening. Your care is fully in the hands of the hospital's medical team and they are on it. We're staying close, keeping your family updated, and here for anything you need that isn't medical. Please follow the doctors' guidance — you are not alone in this.
- **Buttons:** [Thank you]
- _Clinical escalation — hospital-led. Canopus Care never advises clinically; family-comms + logistics only._


**Compliance:** consent required before outbound; no clinical claims/guarantees; prices indicative (shown in image, not body); facilitator voice; honor opt-out. See /build-os/09.
