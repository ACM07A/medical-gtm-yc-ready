# Design artifacts

Self-contained HTML prototypes for the operator-facing surfaces. Open either file directly in a browser, or view the hosted versions.

| File | What it is | Hosted |
|---|---|---|
| [`studio.html`](./studio.html) | **MedYatra Studio** — the human approve-and-deploy console. Approvals inbox with inline full-document previews (content, campaign, WhatsApp comms, partner proposal, wellness bundle), automated-QA badges, and deploy buttons that stay physically disabled until the regulatory / contact gates are green. | [artifact](https://claude.ai/code/artifact/83604c3a-41c7-4750-9fa6-ba8a47987f56) |
| [`patient-journey-flow.html`](./patient-journey-flow.html) | **Sales-comms & patient-journey path map** — dual-mode intake (own acquisition + plugged-in lead DB), the diagnosis fork (knows the procedure vs. needs diagnosing), product selection, every hospital handoff, and all fallback loops. Paths only; comms copy is built later. | [artifact](https://claude.ai/code/artifact/9c7bd6aa-8c5e-4535-a2a7-872fcfb09c67) |

> Prototypes — previews are representative, not yet wired to the live DB. The next build serves Studio at `/studio` with real rows and approve actions that write status back.
