FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production APP_MODE=demo POST_LIVE=0 PORT=5173 DATABASE_PATH=/app/runtime/medyatra.db
RUN useradd --create-home --shell /usr/sbin/nologin medyatra
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p outputs/backups runtime && chown -R medyatra:medyatra /app
USER medyatra
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://localhost:'+(process.env.PORT||5173)+'/api/readiness').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--experimental-sqlite", "server/server.mjs"]
