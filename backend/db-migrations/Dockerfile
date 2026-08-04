# =============================================================================
# db-migrations — one-shot Flyway runner, NOT a long-lived server.
# Follows the standard in docs/docker-standards.md; canonical reference is
# backend/auth-service/Dockerfile.
#
#   docker build -t db-migrations:local backend/db-migrations
#
# Has no spring-boot-starter-web, so the JVM exits once Flyway finishes. That
# exit code is what compose gates on (service_completed_successfully) and what
# ECS relies on when this runs as a standalone Task — not a Service — ahead of
# any other service rollout.
#
# No ExitOnOutOfMemoryError flag: this process is supposed to exit, and its
# exit status is meaningful. A migration must fail loudly with Flyway's own
# non-zero status rather than being masked by a JVM-level abort.
# =============================================================================

ARG BUILD_IMAGE=maven:3.9-eclipse-temurin-21
ARG RUNTIME_IMAGE=eclipse-temurin:21-jre-alpine

# =============================================================================
# Stage 1 — build
# =============================================================================
FROM ${BUILD_IMAGE} AS build

WORKDIR /build

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

RUN mv target/db-migrations-*.jar target/app.jar

# =============================================================================
# Stage 2 — runtime
# =============================================================================
FROM ${RUNTIME_IMAGE} AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="creatorflow-db-migrations" \
      org.opencontainers.image.description="CreatorFlow Flyway migration runner (one-shot task)" \
      org.opencontainers.image.source="https://github.com/xaptured/creator-flow" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

RUN addgroup -S -g 1001 appgroup \
 && adduser  -S -u 1001 -G appgroup appuser

WORKDIR /app

COPY --from=build --chown=appuser:appgroup /build/target/app.jar /app/app.jar

USER appuser:appgroup

STOPSIGNAL SIGTERM

# DB connection supplied via environment variables:
#   DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "/app/app.jar"]
