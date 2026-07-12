# Design artifacts

Self-contained HTML prototypes for the operator-facing surfaces. Open either file directly in a browser, or view the hosted versions.

| File | What it is | Hosted |
|---|---|---|
| [`studio.html`](./studio.html) | **MedYatra Studio** — the human approve-and-deploy console. Approvals inbox with inline full-document previews (content, campaign, WhatsApp comms, partner proposal, wellness bundle), automated-QA badges, and deploy buttons that stay physically disabled until the regulatory / contact gates are green. | [artifact](https://claude.ai/code/artifact/83604c3a-41c7-4750-9fa6-ba8a47987f56) |
| [`patient-journey-flow.html`](./patient-journey-flow.html) | **Sales-comms & patient-journey path map** — dual-mode intake (own acquisition + plugged-in lead DB), the diagnosis fork (knows the procedure vs. needs diagnosing), product selection, every hospital handoff, and all fallback loops. Paths only; comms copy is built later. | [artifact](https://claude.ai/code/artifact/9c7bd6aa-8c5e-4535-a2a7-872fcfb09c67) |
| [`trudoc-pitch.html`](./trudoc-pitch.html) | **Operator-front partnership pitch** — founder-facing one-pager positioning MedYatra as the white-labelled acquisition + coordination engine for a licensed ME operator (TruDoc): the opportunity, the five plug-in parts, tenant data isolation, proof it's built, who-does-what, commercial, and a 90-day pilot ask. | [artifact](https://claude.ai/code/artifact/609b6789-1ac7-4a7c-ad35-94c6d1aab43f) |

> `studio.html` is the design prototype. The **live** version is now served at **`/studio`** (see `server/studio.mjs`) — it reads the real approval queue (content, proposals, social posts, comms drafts), enforces the same gates (regulatory · verified contact · consent), and its Approve button writes back: publishes a page, marks a proposal sent, approves a post, or releases a comms draft and advances the lead's journey stage.
