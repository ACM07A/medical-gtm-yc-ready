FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production APP_MODE=demo POST_LIVE=0 PORT=5173 DATABASE_PATH=/app/data/canopus-care-demo.db
RUN useradd --create-home --shell /usr/sbin/nologin canopus
COPY . .
RUN mkdir -p data/uploads data/backups outputs/backups && chown -R canopus:canopus /app
USER canopus
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=10 CMD ["node", "scripts/healthcheck.mjs"]
CMD ["node", "--experimental-sqlite", "scripts/start-app.mjs"]
