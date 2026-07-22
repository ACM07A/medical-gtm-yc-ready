# 18 · Local Model R&D — the on-device, open-source specialist

**Status:** proposed R&D track — *not* on the critical path to a first treated patient; a parallel impact +
data-moat + Hub71-differentiator play. Working brand: **Canopus Care** (placeholder).
**One line:** a ~1.5–2B, Apache-2.0-based, QLoRA-fine-tuned model that runs on a phone, is open-sourceable, and
specialises in the **low-resource-language + on-device** slots of the value chain — *not* a replacement for the
Gemini/GLM orchestration chain.

---

## 1. Thesis — when a small model beats the big chain

The failover chain (GLM → Gemini) stays the brain. The 2B is a **specialist** that wins in exactly four
conditions, all real in our markets: **low-resource African languages, offline/edge, cheap high-volume
classification, on-device privacy.** Two of those are also strategic:

- **Privacy / residency.** On-device inference means patient data never leaves the device — a direct mitigation
  for the data-residency constraints (localization markets; the UAE in-country rule; see `build-os/17`).
- **Impact / moat.** An open-source, phone-sized, health-adjacent African/Arabic model is a credibility and
  goodwill asset, and the seed of a proprietary data flywheel no open dataset gives a competitor.

## 2. Scope — v1 does TWO things well (ship narrow)

Both are already-documented gaps:

- **A · Multilingual safety / intent classifier.** Native **Arabic · Swahili · Amharic · Hausa** detection of
  (i) emergency presentation, (ii) clinical-scope requests, (iii) intent/stage routing. Plugs the gap where
  `lib/safety.mjs` currently *fails closed* on those languages. Output: label + confidence, consumed by the
  safety gate and the comms state machine.
- **B · Low-resource intake + translation assistant.** Vernacular first-touch / qualification turns, and
  patient ↔ coordinator ↔ hospital translation for Swahili/Amharic/Hausa (where Google Translate is weak).
  **Extraction only** (procedure, reports, location, urgency-as-stated) — never diagnosis.

**Non-goals (v1), enforced:** no clinical advice / diagnosis / dosing (hard line); not the proposal or
long-form-English engine (stays on the chain); not a general chatbot.

## 3. Base model

- **Primary: Qwen2.5-1.5B-Instruct** — Apache-2.0 (clean for open-sourcing the derivative), strong multilingual
  incl. Arabic. **Alt:** SmolLM2-1.7B (Apache-2.0, built for on-device) or Qwen2.5-3B if quality demands it.
- **Avoid** Llama / Gemma bases if we want a *truly* OSI-open release (custom licenses).
- **Deploy:** 4-bit GGUF (~1.0–1.5 GB) via llama.cpp / MLC. Targets: mid-range phone (6–8 GB RAM), Raspberry
  Pi 5, cheap laptop. A **1B** fallback for the lowest-end hardware.

## 4. Data plan

Target **~80k–300k** instruction/conversation examples, deduped, PII-scrubbed, safety-filtered. **Quality > volume.**

1. **Synthetic from our own system (primary lever).** Turn the comms state machine, safety-gate rules, triage
   schema, price ladder, empathy voice module, and content grid into a **generator** → intake dialogues, triage
   extractions, translation pairs, empathetic rewrites, safety-classification labels, grounded in real states
   and rules. ⚠️ **License:** if we open-source, do **not** distill from a teacher whose ToS forbids training
   competing/open models (Gemini/Claude/OpenAI generally do) — use our own logic + an **open teacher (Qwen)**.
2. **Open datasets.** African: **Masakhane** (MasakhaNER/NEWS, MAFAND-MT, AfriQA), **Lelapa Inkuba-instruct**,
   **WURA**, **FLORES-200** (eval), **NLLB** bitext, Wikipedia (sw/am/ha/yo). Arabic: OSCAR-ar, Arabic
   Wikipedia, ArabicMMLU (eval). Web: OSCAR / mC4 / CC-100 African+Arabic subsets.
3. **Selective public scrape (flavour, not backbone).** WHO / Ministry-of-Health patient-education, hospital
   IPS/cost pages, medical-travel FAQs. Carry the existing discipline (scraping is opt-in *risk*, not
   "ToS-clean"): respect robots.txt/ToS, strip **all** PII, prefer open licenses, no verbatim reliance.
4. **Real logs (later flywheel).** Consented, PII-stripped WhatsApp/Telegram transcripts once live — the best
   data, the moat. Design the pipeline now; it fills after launch.

**Discipline across all four:** never train on real patient PII; **native-speaker QA on every low-resource
split** (the *same* hires who sign off the multilingual safety lexicon — one hire, two jobs); bake
"not medical advice" behaviour explicitly into the data.

## 5. Training

- **Method:** QLoRA (4-bit NF4; LoRA r=16–32, α=32, dropout 0.05; target attention + MLP projections) via
  Axolotl or TRL/torchtune.
- **Mix:** ~60% synthetic task data · ~25% open multilingual · ~15% safety/refusal + "not medical advice".
- ~3 epochs, seq len 2–4k, effective batch via grad-accum on **1× A100-80GB (or H100)**. **Runtime: hours per
  run**; expect 2–4 iterations (fix data between).

## 6. Evaluation — define BEFORE training

Held-out sets **per language × task**:

- **Safety classifier:** precision/recall on emergency + clinical-scope, per language. **Emergency recall is
  the number that matters** (a false negative is the dangerous error) — target ≥ the English gate's bar, and
  beat the "fail-closed" baseline on *usefulness* without dropping recall.
- **Intake / translation:** FLORES/Masakhane **BLEU/chrF**; field-extraction accuracy vs a labelled set;
  native-speaker adequacy/fluency rating; empathy/tone pass rate (per the voice module).
- **Safety behaviour:** extend the `eval_safety.mjs` adversarial cases into the target languages — must refuse
  clinical advice, escalate emergencies, never diagnose.
- **On-device:** tokens/sec + memory on the target phone/Pi; latency budget for the intake loop.

**v1 acceptance:** (a) emergency recall ≥ bar in **all four** languages; (b) **zero** clinical-advice leakage in
the adversarial suite; (c) translation adequacy ≥ Google Translate baseline on Amharic + Hausa; (d) ≥ ~8 tok/s
on a mid-range phone.

## 7. Deployment & integration

Ship the GGUF; it runs behind the **same safety gate** (the model never sends unchecked output). **Shadow-mode
first:** run alongside the big-model baseline in the sandbox, compare, then cut over the one narrow slot.
Document the on-device privacy property as a **residency mitigation** for localization markets.

## 8. Timeline — ~6 weeks (gated on data + native QA, not GPU)

| Week | Track | Output |
|---|---|---|
| **0–1** | Scope + setup | Pick base (Qwen2.5-1.5B); lock the 2 use cases; build per-language held-out evals; rent 1 GPU |
| **1–3** | **Data build (long pole)** | Synthetic-gen from our own system + open datasets + selective scrape → PII-scrub, dedup, safety-filter, native spot-check |
| **3–4** | Train + iterate | Several QLoRA runs (hours each), eval, fix data, repeat |
| **4–5** | Quantize + on-device | 4-bit GGUF (~1.2 GB); benchmark on phone / Pi 5; wire behind the safety gate |
| **5–6** | Pilot | Drop into ONE slot (start: multilingual safety classifier *or* Swahili intake) in the sandbox, shadow-mode vs baseline |
| **6+** | Iterate | Expand languages/tasks; stand up the live-log flywheel |

## 9. Cost

- **Compute:** ~$100–$2,000 (1 GPU, hours of training × a few iterations + eval).
- **People:** 1 ML/eng (Fable 5 drives most) + native-speaker annotators (Ar/Sw/Am/Ha) — the safety-lexicon hires.
- **Ongoing:** negligible — on-device / cheap self-host inference.

## 10. Roles — Fable 5 vs humans

- **Fable 5 drives:** the synthetic-data factory (from the existing generators), scrapers + clean/PII/dedup,
  QLoRA train + eval harness, GGUF quantization, on-device demo, model card + license, safety-gate integration.
- **Humans required:** GPU budget approval; **native-speaker QA**; the **legal calls** (scraping ToS +
  distillation license).

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Clinical-advice liability | Hard scope + refusal data + adversarial eval + safety gate + "not medical advice" model card |
| Distillation license (open-sourcing) | Don't distill from restricted teachers; use our own logic + Qwen (open) |
| Scraping ToS / copyright | Selective, open-licensed-first, PII-stripped, flavour-not-backbone |
| Low-resource eval is hard | Native speakers + FLORES/Masakhane; **don't ship a language we can't evaluate** |
| PII exposure | Never train on real patient data; on-device keeps it local |
| Scope creep → from-scratch | v1 is **fine-tune only**; a from-scratch 2B is a separate, funded decision (see `§ Path D`, chat) |

## 12. Open-source & positioning

- **License:** Apache-2.0 or **OpenRAIL-M** (use-restriction for medical safety) on the derivative; a model card
  with intended use, limitations, **"NOT medical advice"**, eval numbers, and data provenance.
- **Collaborate, don't reinvent:** the **Masakhane** community + **Lelapa AI (InkubaLM)** for African-language
  depth and credibility.
- **Story:** *"Canopus Care open-sources a phone-sized, health-adjacent multilingual assistant for African and
  Arabic patients"* — impact + data moat + a concrete AI-substance differentiator for Hub71/YC.

## 13. Definition of done (v1)

A **4-bit GGUF (~1.2 GB)** that runs **≥ 8 tok/s on a mid-range phone**, passes the **multilingual safety +
no-clinical-advice** eval, **beats the translation baseline** on two low-resource languages, is wired **behind
the safety gate in the sandbox in shadow mode**, and ships with an **Apache/OpenRAIL model card** — built for
**~$100–$2k in ~6 weeks**.
