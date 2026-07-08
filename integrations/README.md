# Integrations — setup & handoff

Wires the MedYatra engine's model tiers and external endpoints. Keys live in `.env` (gitignored), never in code or chat.

## Status (2026-07-03)

| Endpoint | State | Notes |
|---|---|---|
| **GLM-5.2 (tier-2, NVIDIA NIM)** | ✅ **validated** | Live test returned `MEDYATRA_OK` (21 tok). OpenAI-compatible at `https://integrate.api.nvidia.com/v1`, model `z-ai/glm-5.2`. |
| Anthropic Claude (tier-1) | ⬜ needs `ANTHROPIC_API_KEY` | Strategy / proposals / clinical claims / final QA |
| WhatsApp, Meta, YouTube, ESP, CRM, DB | ⬜ not wired | See `.env.example` + the integration map. Phase them per `/build-os` MVP list. |

## Model tiers → endpoints
Defined in `litellm.config.yaml`, mapping `/agent-os/07_MODEL_ROUTING.md`:
- `tier1-strategist` → Claude (decisions, clinical/price claims, compliance, final QA)
- `tier2-builder` → **GLM-5.2** (bulk NON-clinical drafting + enrichment)
- `tier3-patch` → GLM-5.2, low budget (formatting, meta copy)
- Fallbacks + escalation-to-tier-1 configured; tier-2 failures or any clinical/PII decision escalate up.

## Run
```bash
cp integrations/.env.example integrations/.env   # then fill keys
# option A: LiteLLM gateway (OpenAI-compatible, one URL for all agents)
litellm --config integrations/litellm.config.yaml        # -> http://localhost:4000
# option B: direct Node helper for tier-2 bulk drafts (no Python needed here)
export NVIDIA_API_KEY=...      # from .env
node integrations/glm_generate.mjs "Draft a 100-word FAQ answer about medical visas to India"
```

## Guardrails (enforced in agent code, not the gateway)
- **Never** send patient PII / medical records to tier-2/tier-3 (GLM) or any third-party model without consent + redaction.
- **Never** publish a clinical/price claim drafted by tier-2 without tier-1 review + human sign-off + a citation (`/build-os/08`).
- GLM tier-2 is for volume text where accuracy is easy to verify (guides, FAQs, meta descriptions), not for medical assertions.

## Handoff — what a human/dev still needs to do
1. Add `ANTHROPIC_API_KEY` for tier-1.
2. **Rotate the NVIDIA key** if it was ever pasted into a chat/log (this one was) and put the fresh key only in `.env`.
3. Wire the phase-1 endpoints (WhatsApp, ESP, CRM, publishing target) — see root integration map.
4. Add `.env` and `integrations/.env` to `.gitignore` before any commit.
