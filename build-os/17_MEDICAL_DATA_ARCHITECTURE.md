# 17 · Medical Data Architecture — GDPR as the backbone

**Directive (2026-07-22):** whatever medical information we collect from a client is collected and hosted on
a fully GDPR-compliant server; everything clinical moving between patient and hospital — prescriptions,
treatment methodologies, recommended tests, medical history — is encrypted and safeguarded from unauthorised
access; and **MedYatra's own interaction with it is limited to what a non-clinical facilitator needs:
treatment name/protocol, treatment timelines, cost structures, and surgeon details.**

This document describes how that is implemented — as code, not policy. The implementation is
[`lib/vault.mjs`](../lib/vault.mjs); the mechanical proof is `npm run smoke-vault` (11 checks); the live
status page is `/vault`.

---

## 1. The two-surface design

The single load-bearing idea: a clinical record has **two surfaces**, split at write time.

| Surface | Contents | Storage | Who reads it |
|---|---|---|---|
| **Clinical payload** | Prescriptions, treatment methodologies, recommended tests, medical history, discharge notes, patient reports | **AES-256-GCM encrypted** blob | Patient and hospital only — via named relay purposes |
| **Facilitator envelope** | Treatment name/protocol · treatment timelines · cost structure · surgeon details · hospital ref | Plaintext metadata, separate table | MedYatra — this is our *entire* read surface |

Every agent, report, and console in this repo that wants to know about a patient's treatment reads the
**envelope**. There is no API that "just reads" a clinical payload — decryption happens only through
`relayRecord()`, which requires one of three named purposes:

- `relay_to_patient` — forward the hospital's own clinical words to the patient (human-gated send)
- `forward_to_hospital` — forward the patient's reports/history to the treating hospital
- `patient_own_copy` — give the patient a copy of their own record (data portability)

Anything else — any other purpose string, any direction mismatch — is **refused, and the refusal is logged**.

## 2. GDPR article → code mapping

| GDPR | Requirement | Where it lives |
|---|---|---|
| Art. 5(1)(c) | Data minimization | Envelope-only read surface (`getEnvelopes`) |
| Art. 5(1)(b) | Purpose limitation | `RELAY_PURPOSES` allow-list on every decrypt |
| Art. 30 | Records of processing | `vault_access_log` — append-only, includes refusals |
| Art. 17 | Right to erasure | `eraseLead()` — ciphertext + envelopes deleted, tombstone retained |
| Art. 32 | Security of processing | AES-256-GCM at rest; GCM auth tag = tamper detection on every decrypt |
| Art. 20 | Data portability | `patient_own_copy` relay purpose |
| Ch. V | Cross-border transfers | `residencyCheck()` against the per-market law register (§4) |

GDPR is applied as the **floor in every market**, including source markets with no data-protection law of
their own (Iraq, Yemen, Sudan, Namibia, Myanmar) — "no local law" lowers nothing.

## 3. Hosting: sandbox now, GDPR host at go-live

The vault backend is pluggable (`VAULT_BACKEND`), the same wired-but-off pattern as every integration:

- **`local` (current default)** — the sandbox: an encrypted SQLite file on this machine
  (`data-core/vault.db`, gitignored like every DB). No clinical data crosses any border at rest. The
  sandbox encryption key is generated into a gitignored file and labelled as a non-production key story.
- **`remote` (the live product)** — a fully GDPR-compliant EU-hosted server: set `VAULT_BACKEND=remote`,
  `VAULT_URL`, `VAULT_TOKEN`, and `VAULT_KEY` from the host's secret store. **Hosting access to be provided
  at go-live** (per the 2026-07-22 directive); until then the adapter refuses to pretend it's live and falls
  back to the sandbox with a visible note.

Separation discipline: the vault is a **separate database file** from the GTM data core. Partner CRM,
content, and pricing never share a file with clinical data, and pointing the vault at different hosting
never touches the rest of the engine.

## 4. The per-market health-data law register

`data-core/seed_health_data_laws.mjs` (`npm run health-laws`) maintains one row per jurisdiction — all 22
source markets plus India as destination — with the governing law, regulator, transfer rule, key
constraints, and consent basis. **Every row is `unverified` until counsel signs it off** (the same gate
pattern as market regulatory status); the entries are researched, not verified, and nothing goes live on an
unverified row.

The strictest findings, which shape the go-live plan:

| Rule | Markets | Consequence |
|---|---|---|
| ⛔ In-country only | **UAE** (Federal Law 2/2019) | Health data may not leave the UAE — the live vault for UAE patients must be hosted *in* the UAE; an EU host is not sufficient. Also the argument for the Abu Dhabi base. |
| ⚠ Localization | **Uzbekistan, Kazakhstan, Zambia** | An in-country copy/replica is required before those markets go live. |
| SCCs/adequacy | UK, Ireland, Nigeria, Kenya, Oman, Saudi, Tanzania, Zimbabwe, Ethiopia, Cameroon | Standard contractual clauses + transfer assessment, counsel-signed. |
| No comprehensive law | Iraq, Yemen, Sudan, Namibia, Myanmar | GDPR floor applies by our own rule. |

`residencyCheck()` consults this register on every vault write. In the sandbox (local storage), hard rules
surface as **warnings**; at the live-backend swap they become **blocking** — because that's the moment data
would actually move.

## 5. What this architecture deliberately does NOT do

- **MedYatra never joins, records, or summarises the patient–doctor clinical conversation** (video consult
  included — see `lib/agents/video_consult.mjs`: scheduling metadata and a non-clinical outcome only).
- **No clinical payload ever enters a model prompt.** The safety gate (`lib/safety.mjs`) already blocks
  PII-to-model; the vault's envelope design makes the clinical version of that mistake structurally hard.
- **No analytics on clinical content.** The cross-tenant benchmark layer (build-os/11) runs on de-identified
  operational aggregates, never on vault contents.

## 6. Verification

- `npm run smoke-vault` — 11 mechanical checks: encryption at rest (ciphertext contains no plaintext),
  envelope scope (no clinical content in any envelope field), purpose refusal, direction refusal, legitimate
  relay, GCM tamper detection, erasure + tombstone, audit completeness.
- `/vault` — live status: backend, the full law register (strictest first), access-log tail.
- The access log is itself the Art. 30 record — export it for a DPIA appendix when counsel asks.

## 7. Open items (honest)

- The **remote backend is an adapter contract, not a deployed server** — activating it is a hosting
  decision + keys, expected at go-live.
- **Counsel verification of all 23 register rows** — the single highest-leverage compliance action, same
  tier as the multilingual safety-lexicon sign-off.
- **UAE in-country hosting** and **UZ/KZ/ZM replicas** are unresolved infrastructure decisions, correctly
  blocking those markets, not silently waived.
- Key rotation and HSM/KMS custody are go-live-host concerns, deliberately not simulated in the sandbox.
