# Deployment

## Local Docker

```bash
cp .env.example .env
docker compose up --build
```

Open `http://localhost:5173/demo`.

## Render

Use `render.yaml`. The service defaults to `APP_MODE=demo`, `POST_LIVE=0`, a persistent disk mounted at `/var/data`, and `DATABASE_PATH=/var/data/medyatra.db`.

Set:

- `APP_BASE_URL`
- `CONSOLE_TOKEN`
- production-only secrets before changing `APP_MODE=production`

## Generic Docker

```bash
docker build -t canopuscare-demo .
docker run -p 5173:5173 -e APP_MODE=demo -e POST_LIVE=0 -v canopuscare-runtime:/app/runtime canopuscare-demo
```

Production must use HTTPS, a persistent database volume, strong console/auth credentials, managed secrets and real provider credentials before any outbound action is armed.

The Render blueprint is a demo deployment, not a production vendor configuration. Complete every gate in `docs/VENDOR_DEPLOYMENT_READINESS.md` before processing real vendor or patient data.
