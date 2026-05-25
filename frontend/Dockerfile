# =============================================================================
# frontend (Next.js 14) — Fargate-ready multi-stage Dockerfile
#
# Requires next.config.mjs to have output: 'standalone'
# Build args (passed at docker build time or via ECS build pipeline):
#   NEXTAUTH_URL           — public URL of this service
#   NEXTAUTH_SECRET        — random secret for NextAuth session signing
#   NEXT_PUBLIC_API_URL    — public API gateway URL
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — dependency install
# Separate layer so node_modules is cached unless package-lock.json changes
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2 — build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Build-time env vars needed by Next.js at compile time.
# Runtime secrets (NEXTAUTH_SECRET etc.) are injected by ECS task definition.
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — runtime (standalone output only — smallest possible image)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Port can be overridden via ECS task-definition environment variables
ENV PORT=3000

# standalone folder is self-contained — no full node_modules needed
COPY --from=build --chown=appuser:appgroup /app/.next/standalone ./
# static assets must be copied alongside standalone server
COPY --from=build --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=build --chown=appuser:appgroup /app/public ./public

USER appuser

EXPOSE 3000

# standalone build outputs server.js at root
CMD ["node", "server.js"]
