# =============================================================================
# auth-service — reference multi-stage Dockerfile for CreatorFlow Spring Boot
# services. This file is the CANONICAL pattern; every other backend service
# copies it. See docs/docker-standards.md before changing anything here.
#
# Build context is the service directory itself:
#   docker build -t auth-service:local backend/auth-service
#
# Stage 1 (build)   — JDK + Maven, compiles the fat JAR. Discarded.
# Stage 2 (runtime) — JRE only. No Maven, no JDK, no source, no secrets.
# =============================================================================

# --- Base images -------------------------------------------------------------
# Pinned as ARGs so CI can override with a digest-pinned image without editing
# this file. eclipse-temurin JRE Alpine is chosen over distroless so a shell is
# available for early debugging (revisit post-v1.0).
ARG BUILD_IMAGE=maven:3.9-eclipse-temurin-21
ARG RUNTIME_IMAGE=eclipse-temurin:21-jre-alpine

# =============================================================================
# Stage 1 — build
# =============================================================================
FROM ${BUILD_IMAGE} AS build

WORKDIR /build

# Dependency layer first: pom.xml changes far less often than src/, so this RUN
# stays cached across source-only commits. Copying src/ before this would
# invalidate the (slow) dependency download on every code change.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Source layer. Tests deliberately skipped — they run in CI (Week 23), not in
# the image build, so build time stays proportional to compile only.
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# Normalise the artifact name so the runtime stage needs no version glob and
# the final COPY layer is deterministic.
RUN mv target/auth-service-*.jar target/app.jar

# =============================================================================
# Stage 2 — runtime
# =============================================================================
FROM ${RUNTIME_IMAGE} AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="creatorflow-auth-service" \
      org.opencontainers.image.description="CreatorFlow auth-service (Spring Boot, Keycloak resource server)" \
      org.opencontainers.image.source="https://github.com/xaptured/creator-flow" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

# Non-root user. Fixed uid/gid 1001 so ECS task definitions and any future
# volume permissions reference a stable id rather than a resolved name.
RUN addgroup -S -g 1001 appgroup \
 && adduser  -S -u 1001 -G appgroup appuser

WORKDIR /app

# --chown at COPY time: the JAR is owned by appuser, so no root-owned files
# remain in the final layer and no extra `chown -R` layer is needed.
COPY --from=build --chown=appuser:appgroup /build/target/app.jar /app/app.jar

USER appuser:appgroup

# Matches the server.port default in application.yml (AUTH_SERVER_PORT:8080).
# Documentation only — ECS/Fargate takes the port from the task definition.
EXPOSE 8080

# No HEALTHCHECK instruction by design:
#   - ECS/Fargate ignores Dockerfile HEALTHCHECK; it uses the task definition
#     healthCheck block and the ALB target-group health check.
#   - Adding one here means installing curl/wget into the runtime image purely
#     for local convenience, which widens the attack surface.
# Health check path (ALB target group and ECS task definition alike):
#   /creator-flow/auth/actuator/health/readiness
# See docs/docker-standards.md § Health checks.

# Baseline JVM flags live in the ENTRYPOINT so an env-var override cannot drop
# them. Extra flags go in JAVA_TOOL_OPTIONS from the ECS task definition; the
# JVM picks those up automatically.
#   UseContainerSupport    — read cgroup limits, not host limits
#   MaxRAMPercentage=75    — heap capped at 75% of the task memory limit
#   ExitOnOutOfMemoryError — die immediately so ECS replaces the task instead
#                            of leaving a wedged JVM in the target group
# Exec form (no shell) keeps the JVM as PID 1, so SIGTERM from ECS reaches it
# and Spring's graceful shutdown runs.
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "/app/app.jar"]
