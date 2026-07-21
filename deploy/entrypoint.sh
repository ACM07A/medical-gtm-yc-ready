#!/bin/sh
# WHY THIS EXISTS: data-core/db.mjs hard-codes DB_PATH next to itself (data-core/medyatra.db) — deliberately,
# it's a zero-dependency single-file design (PROJECT_CONTEXT.md §10) that shouldn't grow an env-configurable
# path just to satisfy a deployment concern. So instead of touching app code, the container's persistent
# volume mounts at /data, and this entrypoint symlinks the DB path onto it before the app ever opens it.
# Standard pattern for "SQLite in a container with a volume" — no source change required.
set -e

VOLUME=/data
DB_LINK=/app/data-core/medyatra.db

mkdir -p "$VOLUME"

# First boot: nothing on the volume yet, and no local DB either → let db.mjs create + seed it fresh, then
# move the resulting file onto the volume. Subsequent boots: the volume already has it, just re-point the
# symlink (covers redeploys where the image is rebuilt but the volume persists).
if [ ! -f "$VOLUME/medyatra.db" ]; then
  if [ -f "$DB_LINK" ] && [ ! -L "$DB_LINK" ]; then
    mv "$DB_LINK" "$VOLUME/medyatra.db"
  else
    echo "[entrypoint] no existing DB — seeding fresh onto the volume"
    node --experimental-sqlite data-core/seed.mjs
    mv "$DB_LINK" "$VOLUME/medyatra.db"
  fi
fi

ln -sf "$VOLUME/medyatra.db" "$DB_LINK"

# Litestream runs as a sidecar/co-process if configured (LITESTREAM_BUCKET set) — see deploy/litestream.yml.
# Absent that env var, this is a no-op and the app just runs directly against the volume.
if [ -n "$LITESTREAM_BUCKET" ] && command -v litestream >/dev/null 2>&1; then
  echo "[entrypoint] starting under litestream replication -> $LITESTREAM_BUCKET"
  exec litestream replicate -exec "node --experimental-sqlite server/server.mjs"
else
  echo "[entrypoint] LITESTREAM_BUCKET not set — running WITHOUT continuous backup. Fine for local/staging, not for real patient data."
  exec node --experimental-sqlite server/server.mjs
fi
