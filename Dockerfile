# syntax=docker/dockerfile:1

ARG NODE_VERSION=24.12.0

FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders for modules that validate configuration on import; the real values are provided at runtime
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-placeholder-not-used-at-runtime-0000
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
    # Not needed at runtime: TypeScript (traced by Next.js for next.config.ts) and sharp's musl binaries
    && rm -rf .next/standalone/node_modules/typescript \
              .next/standalone/node_modules/@img/*linuxmusl*

FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# The runtime filesystem may be read-only except /tmp
RUN ln -s /tmp /app/.next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
