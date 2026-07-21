# Minimal image — the app has ONE dependency (puppeteer-core) and needs nothing else. No build step: it's
# plain Node ESM, run with --experimental-sqlite. Multi-stage only to keep the final image lean (no npm
# cache, no dev tooling).
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Litestream: one static binary, no runtime dependency of its own. Pinned version — bump deliberately.
FROM node:22-slim
ARG LITESTREAM_VERSION=0.3.13
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && curl -fsSL -o /tmp/litestream.deb "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-amd64.deb" \
  && dpkg -i /tmp/litestream.deb \
  && rm /tmp/litestream.deb && apt-get purge -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY deploy/entrypoint.sh /entrypoint.sh
COPY deploy/litestream.yml /etc/litestream.yml
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
EXPOSE 5173
ENTRYPOINT ["/entrypoint.sh"]
