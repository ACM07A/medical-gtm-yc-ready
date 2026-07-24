# Quickstart

Requires Node 22.5 or newer.

```bash
cp .env.example .env
npm ci
npm run demo
npm run dev
```

Open `http://localhost:5173/demo`.

One-command path:

```bash
npm run yc-demo
```

Docker:

```bash
docker compose up --build
```

Demo users all use `canopuscare-demo`. The demo uses synthetic data and disables live outbound actions.
