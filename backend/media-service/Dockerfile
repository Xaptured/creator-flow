# =============================================================================
# media-service — follows the standard in docs/docker-standards.md.
# Canonical reference: backend/auth-service/Dockerfile. Change that first.
#
#   docker build -t media-service:local backend/media-service
#
# Service note: media-service handles S3 presigned upload/serve only. It shells
# out to no native media tooling (no ffmpeg, no ImageIO frame extraction), so
# the runtime stage stays JRE-only. If a thumbnail/transcode pipeline is added
# later, the binaries go in the runtime stage and the image size note in
# docs/docker-standards.md must be updated.
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

RUN mv target/media-service-*.jar target/app.jar

# =============================================================================
# Stage 2 — runtime
# =============================================================================
FROM ${RUNTIME_IMAGE} AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="creatorflow-media-service" \
      org.opencontainers.image.description="CreatorFlow media-service (S3 presigned upload, platform OAuth, SQS dispatch)" \
      org.opencontainers.image.source="https://github.com/xaptured/creator-flow" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

RUN addgroup -S -g 1001 appgroup \
 && adduser  -S -u 1001 -G appgroup appuser

WORKDIR /app

COPY --from=build --chown=appuser:appgroup /build/target/app.jar /app/app.jar

USER appuser:appgroup

EXPOSE 8080

# Explicit even though SIGTERM is the Docker default: Fargate Spot sends
# SIGTERM on capacity reclaim and the JVM must receive it to drain in-flight
# SQS messages. Pairs with server.shutdown=graceful in application.yml.
STOPSIGNAL SIGTERM

# Health check path: /creator-flow/media/actuator/health/readiness
# No HEALTHCHECK instruction — see docs/docker-standards.md § Health checks.
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "/app/app.jar"]
