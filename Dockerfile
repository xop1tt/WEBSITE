# Образ закреплён по digest: сборка не подхватит молча другой образ под тем
# же тегом. Обновление — осознанно: docker buildx imagetools inspect <тег>.
FROM node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* variables are inlined into the client bundle at build time,
# so this one must be supplied as a build ARG (see compose.yaml's
# frontend.build.args).
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ENV NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
# API_BASE_URL is read twice: server-side fetch (src/lib/*) reads it at
# request time from the container environment, but the rewrites() destination
# in next.config.ts is evaluated during `next build` and baked into
# .next/routes-manifest.json. Without this ARG the browser-facing /api/*
# proxy (Telegram login) would point at http://127.0.0.1:8000 inside the
# container. The ARG is visible to `npm run build` as an env variable.
ARG API_BASE_URL=http://api:8000
RUN npm run build

FROM node:24-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# output: "standalone" (next.config.ts) traces only the files this app
# needs, so the runtime image doesn't carry the full node_modules tree.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R 10001:10001 /app
USER 10001:10001

EXPOSE 3000
CMD ["node", "server.js"]
