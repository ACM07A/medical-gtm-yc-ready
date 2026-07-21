# 13 · Minimal-Cost Deployment Strategy

**Companion to [`12_GO_LIVE.md`](./12_GO_LIVE.md).** That file answers *"which features need which keys."*
This one answers a different question: *"where does the process actually run, and what does that cost."*
Reference files are in [`deploy/`](../deploy/) — a Dockerfile, an entrypoint script, a `litestream.yml`, and
a `fly.toml`. Nothing here has been deployed; these are ready-to-use, not yet used (public deployment is
deliberately deferred — see §6).

---

## 0. The one architectural fact everything else follows from

The data core is a **single SQLite file, single writer** (`data-core/db.mjs` — a deliberate zero-dependency
choice, see `PROJECT_CONTEXT.md` §10). That rules out serverless functions (Vercel/Netlify-style) outright —
their filesystem is ephemeral or read-only, and a SQLite file needs to persist and be written to by one
process. It also means there is **no horizontal scaling story to build**, because at this stage there's
nothing to scale: one small, always-on process, with a persistent disk under it, is not a limitation to
engineer around — it's the correct shape for the current load.

That single fact is why "instead of Supabase" is the right instinct, not a cost hack. Supabase (managed
Postgres + auth + storage) solves problems this app doesn't have: many concurrent writers, a large team
needing row-level security, a need to scale reads independently of writes. Paying for that infrastructure
now would be paying to solve problems that don't exist yet.

---

## 1. The stack — SQLite + Litestream instead of Supabase

**Litestream** (`deploy/litestream.yml`) continuously streams the SQLite file's write-ahead log to
S3-compatible object storage. It's what makes "just a SQLite file" production-safe: the file lives on the
server's disk for speed, and a running, restorable copy lives in cheap storage in near-real-time (sync
interval 10s below). If the machine dies, `litestream restore` rebuilds the DB from object storage in
seconds — that's the durability Supabase would otherwise be selling.

*(The similarly-named **libSQL/Turso** is a different tool — a SQLite fork with built-in multi-region read
replicas, positioned as a fuller Supabase alternative. It solves a problem — serving reads from multiple
regions — this app doesn't have yet, at the cost of a hosted service and a schema-migration story. Litestream
is the right choice here specifically because there's one writer and one region to serve for now.)*

| Piece | Choice | Why |
|---|---|---|
| Compute | One small VM, always on | The single-writer constraint (§0) — see §2 for provider options |
| Database | SQLite file on a persistent volume | Already the app's design; zero migration |
| Durability | Litestream → Cloudflare R2 (or Backblaze B2) | Continuous, near-zero cost, standard pattern |
| TLS + DNS | Fly.io's built-in TLS, or Cloudflare in front of a bare VPS | Free either way |
| CI | GitHub Actions, free tier | Runs `npm run eval-safety` + `npm run smoke-agents` before deploy |
| Monitoring | `/api/health` (already built) + a free uptime pinger | No new code |
| Backup (secondary) | `data-core/backup.mjs` (already built) on a cron | Belt-and-suspenders on top of Litestream |

---

## 2. Compute: two real options, both cheap

**Option A — Fly.io** (`deploy/fly.toml`, `deploy/Dockerfile`). Persistent volumes, free TLS, a health-check
supervisor, one command to redeploy. Recommended for less ops overhead.

**Option B — a bare VPS** (Hetzner CX22 or a DigitalOcean droplet, ~$4–6/mo). More manual (you own the
`systemd` unit, the TLS cert via Certbot or Cloudflare), but nothing hidden and nothing to migrate away from
later. Equally valid; pick this if avoiding platform lock-in matters more than convenience right now.

Either way: the process needs `node --experimental-sqlite server/server.mjs` running continuously, a
persistent disk under `data-core/medyatra.db`, and `CONSOLE_TOKEN` set before it's reachable beyond
localhost (already built — `build-os/12_GO_LIVE.md` §6).

---

## 3. What this actually costs per month

| Item | Cost | Notes |
|---|---|---|
| Compute (Fly.io shared-cpu-1x, 256MB, or Hetzner CX22) | **$0–6** | Fly's free allowance likely covers this at current load; budget $6 to be safe |
| Persistent volume (1–3GB — the DB is currently well under 100MB) | **~$0.15/GB/mo** | Rounds to ~$0–1 |
| Litestream → Cloudflare R2 | **$0** | R2 free tier: 10GB storage, **zero egress fees** — the DB will not come close |
| Domain | **~$10–12/yr** | Optional at first — a Fly.io subdomain works for the application/demo period |
| TLS | **$0** | Fly.io or Cloudflare, both free |
| CI (GitHub Actions) | **$0** | Free tier is generous at this volume |
| Uptime monitoring | **$0** | UptimeRobot / Better Stack free tier |
| **Total infra** | **≈ $5–10/month** | Genuinely this low until real patient volume changes the shape of the problem |

**The real recurring cost is WhatsApp, not hosting** — see §4. Infra is a rounding error next to it.

**LLM generation stays free-tier** (Gemini + NVIDIA NIM, already the design — see `PROJECT_CONTEXT.md` §4.2).
At real volume the binding constraint becomes rate limits, not dollars; the next cheapest upgrade if that
happens is still Gemini Flash at its paid per-token rate, an order of magnitude below a frontier model, long
before self-hosting a model is worth considering.

---

## 4. The cost that actually matters: WhatsApp

Once `POST_LIVE=1` is real (`build-os/12_GO_LIVE.md` §1), Meta bills per conversation (varies by category —
utility vs. marketing — and by country), typically single-digit cents each. Two paths:

- **Meta Cloud API direct** — no BSP markup, just Meta's own per-conversation rate. Cheapest.
- **A BSP** (360dialog, Twilio, Gupshup, Wati) — usually a monthly platform fee on top of Meta's rate, in
  exchange for a nicer console and support. Worth it once volume justifies it; not before.

At the funnel sizes in `BUSINESS_STATUS.md` §3 (single-digit treated patients before real traction), this
cost is trivially small in absolute terms — a few dollars a month, not a line item that changes the plan.

---

## 5. Deploy mechanics (the parts already scripted, reused as-is)

- **Health**: `/api/health` is already wired (`server/server.mjs`) — point the uptime pinger at it, no new code.
- **Backup**: `data-core/backup.mjs` already snapshots the DB with pruning. Litestream is the primary
  durability layer (continuous, restorable to any point); running `backup.mjs` on a daily cron on top of it
  costs nothing and is a second, simpler recovery path if Litestream's config is ever wrong.
- **CI gate**: a GitHub Actions workflow running `npm run eval-safety` and `npm run smoke-agents` on every
  push, blocking a deploy if either fails. Both scripts already exist and both already caught real bugs this
  session (the safety-verdict reducer, the KYC key-truncation issue) — that's exactly the class of thing a
  CI gate is for.
- **Entrypoint** (`deploy/entrypoint.sh`): the one piece of new plumbing. `db.mjs` hard-codes the DB path
  next to itself — a deliberate zero-dependency design choice, not something to complicate with an
  env-configurable path just to suit a container. So the entrypoint symlinks `data-core/medyatra.db` onto
  the mounted volume before the app ever opens it. No application code changes.

---

## 6. What's deliberately NOT done here

This ships reference files, not a live deployment. `fly launch`, buying a domain, creating a Cloudflare R2
bucket, and Meta Business verification are all real-world actions needing your identity/accounts — none of
that belongs happening silently on your behalf, and it was explicitly deferred ("public deployment for
later, do everything in sandbox"). This is the plan for when that changes, not a change that already happened.

---

## 7. "How do we skip the concierge?" — the honest, tiered answer

Worth separating two things this question can mean, because the answer is very different for each.

**If it means "how much of the coordinator LABOR can be engineered away" — most of it, and it's already
built.** The nine agents at `/agents` (`lib/agents/*.mjs`) are exactly this: intake, family updates, document
tracking, billing math, discharge relay, logistics, interpreter scheduling, travel timing, payment routing.
This is the entire thesis behind the unit-economics finding in `BUSINESS_STATUS.md` §3 — a human-staffed
agency's cost scales with lead volume; an agent-run one mostly doesn't. That gap is the business.

**If it means "remove the human approval step entirely" — that's not a cost decision, it's a liability one,
and the answer here is no.** The gates that remain (`checkMessage` blocking auto-send, Studio's approve
click, `doc_item.status = 'needs_human_review'`, discharge-relay's forced review) are not friction left over
from an unfinished build — they're the specific thing that keeps MedYatra a *facilitator* rather than an
unlicensed, uninsured autonomous medical-adjacent operator making its own clinical, financial, and consent
decisions (`PROJECT_CONTEXT.md` §7; the whole of `lib/safety.mjs`). Removing that isn't "skipping the
concierge," it's removing the reason the company can legally operate at all.

**What the gate actually costs, in practice, is small — and that's the real answer to the question.** At
MVP volume, the human side of "approve the drafted messages, clear the items flagged `needs_human_review`,
review a billing variance over threshold, handle an emergency escalation" is a few hours a week, not a
concierge team. The founders can plausibly *be* that role at this stage — meaning the honest, complete answer
to "how do we skip the concierge" is: **the labor is already ~$0 incremental cost until patient volume
requires hiring; what doesn't get removed is one person spending a few minutes a day clicking Approve, and
that's a feature of the compliance posture, not a cost to optimize away.**

---

*Read alongside `12_GO_LIVE.md` (features/keys) and `BUSINESS_STATUS.md` §6 (the compliance posture this
whole file is careful not to undermine).*
