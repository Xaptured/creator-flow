# =============================================================================
# ai-service — AWS Lambda container image (NestJS + @codegenie/serverless-express)
#
#   docker build -t ai-service:local ai-service
#
# Jira: CF-111. Design notes and the local RIE procedure live in
# docs/ai-service-lambda-packaging.md.
#
# This is the first non-JVM, non-ECS image in the repo, so it deviates from
# docs/docker-standards.md in four documented ways (§13 of that file requires
# deviations be explained):
#
#   1. Base image is public.ecr.aws/lambda/nodejs:22, not maven/temurin. The
#      runtime stage MUST be the AWS base image — it ships the Runtime Interface
#      Client and the Runtime Interface Emulator. Using it for the build stage
#      too keeps the toolchain and glibc identical across stages, which is the
#      whole point of building inside the image.
#   2. No USER instruction. Lambda ignores it and runs the image under its own
#      sandbox uid. Adding one breaks local RIE runs, which expect the base
#      image's user to own /tmp, and buys nothing in the real runtime.
#   3. CMD, not ENTRYPOINT. The base image's ENTRYPOINT is the Runtime Interface
#      Client; CMD is the handler reference, not a command. Overriding
#      ENTRYPOINT breaks the runtime contract.
#   4. Size budget is < 700MB, not < 250MB. Node base + node_modules will not
#      reach the JRE image's 180MB. Hard ceiling is Lambda's 10GB.
#
# Kept unchanged from the standard: multi-stage build, dependency layer before
# source layer, no tests in the image build, no secrets in any layer, and the
# :local / :<git-sha> tagging convention.
# =============================================================================

# Node 22, not 20. Node 20 is past EOL, and AWS SDK v3 requires >= 22 for
# versions published after Jan 2027 — the deprecation warning shows on every
# run under Node 20. Independent of the ESM issue below; bumping the base image
# did NOT fix that.
#
# Keep this in step with `engines` in package.json and the node-version in
# .github/workflows/ci.yml (build-ai-service). Testing on one major while
# shipping another is how the ESM problem stayed hidden.
ARG BUILD_IMAGE=public.ecr.aws/lambda/nodejs:22
ARG RUNTIME_IMAGE=public.ecr.aws/lambda/nodejs:22

# ---------------------------------------------------------------------------
# The Runtime Interface Client cannot require() an ES module.
#
# jwks-rsa@4.0.1 does `require('jose')` at the top of src/utils.js, and
# jose@6 is pure ESM ("type": "module", no CJS build). Under `node` inside this
# very image that resolves fine — Node 22 supports require(esm) — but the RIC's
# handler loader throws ERR_REQUIRE_ESM and the function dies at INIT:
#
#   Init failed error=Runtime exited with error: exit status 129
#
# Verified by contrast, in the same image:
#   docker run --entrypoint node img -e "require('jose')"              -> OK
#   docker run --entrypoint node img -e "require('/var/task/dist/lambda.js')" -> OK
#   ...but the identical module graph loaded via the RIC              -> ERR_REQUIRE_ESM
#
# Fix is to remove the ESM boundary rather than depend on a Node feature the
# RIC does not honour: jwks-rsa pinned to ^3.2.0, which depends on jose@^4
# (dual CJS/ESM). `passportJwtSecret` has an identical signature in 3.x and 4.x,
# so src/common/auth/jwt.strategy.ts is unchanged.
#
# STANDING CONSTRAINT: ai-service compiles to CommonJS, so no ESM-only package
# can enter the dependency tree while it is packaged this way. Such a package
# will pass local dev and `npm test` and fail only at Lambda INIT.
# ---------------------------------------------------------------------------

# =============================================================================
# Stage 1 — build
# =============================================================================
FROM ${BUILD_IMAGE} AS build

WORKDIR /build

# Dependencies first: they change rarely, source changes constantly. Copying
# src/ before npm ci would re-resolve the whole tree on every one-line change.
# npm ci (not npm install) — reproducible, and package-lock.json is committed.
COPY package.json package-lock.json ./
RUN npm ci

# Compiler config in its own layer; it changes far less often than src/.
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Prune runs AFTER the build, not before: typescript and @nestjs/cli are
# devDependencies and are needed *during* compilation. `npm ci --omit=dev` up
# front would fail the build outright.
RUN npm run build \
 && npm prune --omit=dev

# =============================================================================
# Stage 2 — runtime
# =============================================================================
FROM ${RUNTIME_IMAGE} AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="creatorflow-ai-service" \
      org.opencontainers.image.description="CreatorFlow ai-service on Lambda (insights, captions, embeddings, trending, vision)" \
      org.opencontainers.image.source="https://github.com/xaptured/creator-flow" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

# LAMBDA_TASK_ROOT is /var/task on the AWS base image.
COPY --from=build /build/dist         ${LAMBDA_TASK_ROOT}/dist
COPY --from=build /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules

# package.json gives /var/task a package scope. Harmless today (nest build emits
# CommonJS — tsconfig module: node16 with no "type" field), but load-bearing the
# moment "type" or "imports" is added. Cheap insurance against a confusing
# future failure.
COPY --from=build /build/package.json ${LAMBDA_TASK_ROOT}/package.json

# No secrets in any layer. ANTHROPIC_API_KEY, OPENAI_API_KEY, DB_PASSWORD,
# INTERNAL_API_KEY, META_APP_SECRET, IG_APP_ACCESS_TOKEN and X_API_BEARER_TOKEN
# all arrive from the Lambda function environment, sourced from Secrets Manager
# by CF-117. Never COPY .env* here.
#
# Lambda-mode environment (set on the function, not baked in — see CF-117):
#   DISABLE_SQS_POLLING=true    long-poll loop would burn billed duration
#   DISABLE_TRENDING_CRON=true  in-process timers do not fire on a frozen env

# No HEALTHCHECK: Lambda has no container health check. Same conclusion as
# docs/docker-standards.md § Health checks, different reason.
#
# dist/lambda.handler — nest build emits a flat dist/, so this path is exact.
CMD ["dist/lambda.handler"]
