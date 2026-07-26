# opencode + MiniMax — local browser-automation worker

Hand the pipeline's **browser sub-tasks** to a local [opencode](https://opencode.ai) instance running on **MiniMax**, so it works alongside Opus (orchestrator) and GLM-5.2 (content). Config lives at repo root: [`opencode.json`](../../opencode.json); the worker brief is [`BROWSER_WORKER.md`](./BROWSER_WORKER.md).

## 1. Install opencode
```bash
npm i -g opencode-ai        # or: curl -fsSL https://opencode.ai/install | bash
opencode --version
```

## 2. Set the MiniMax key (never commit it)
```bash
# Windows PowerShell:  $env:MINIMAX_API_KEY="sk-..."
export MINIMAX_API_KEY="sk-..."         # Git Bash
```
`opencode.json` reads it via `{env:MINIMAX_API_KEY}`.

> ⚠️ **Verify before first run** (I couldn't confirm these against your MiniMax account):
> - **Base URL**: `https://api.minimax.io/v1` (intl) or `https://api.minimaxi.chat/v1` — set the one your key belongs to.
> - **Model id**: `opencode.json` uses `MiniMax-M3` as a placeholder. Set it to your real model id (e.g. `MiniMax-Text-01` / `MiniMax-M1` / your `M3`) per MiniMax docs.
> - MiniMax must expose an **OpenAI-compatible** `/chat/completions` endpoint (it does).

## 3. Launch from the repo root (so it can see the code)
```bash
cd "c:/Projects/Canopus Care"
opencode            # opencode.json auto-loads MiniMax + the worker brief
```
First prompt to give it:
> Read handoff/opencode/BROWSER_WORKER.md. Run the `enrich` and `screenshot` sub-tasks, then build sub-task #3 (SERP rank check). Log every run to the data core and keep everything human-gated.

## 4. Watch it work
Keep the console open — **http://localhost:5173/console**. Every `logRun("Browser Worker", …)` the opencode agent makes appears live in the runs feed (with `view` links). That's your window into the delegated worker.

## Division of labour (the multi-model factory)
| Worker | Model | Owns |
|---|---|---|
| Orchestrator | Claude Opus (Claude Code) | strategy, QA, gates |
| Content | GLM-5.2 (NVIDIA) | drafting content/outreach |
| **Browser worker** | **MiniMax (opencode)** | **browser sub-tasks: enrichment, screenshots, SERP, competitor scrape** |

## Notes
- opencode runs on **your machine**; it edits files + runs the same Node scripts. Same data core, same console.
- Cost: MiniMax tokens for the worker's reasoning; the browser automation itself (Edge) is free (`build-os/25_COST_CONTROL.md`).
- Keep `MINIMAX_API_KEY` in env / a gitignored `.env`, never in `opencode.json` or chat.
