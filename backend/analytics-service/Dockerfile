# =============================================================================
# analytics-service — follows the standard in docs/docker-standards.md.
# Canonical reference: backend/auth-service/Dockerfile. Change that first.
#
#   docker build -t analytics-service:local backend/analytics-service
#
# Service note: consumes SQS (analytics-queue) and runs periodic metric-fetch
# jobs on an in-memory Quartz store. Graceful shutdown matters most here —
# an in-flight SQS message that is neither acked nor returned on SIGTERM waits
# out the queue visibility timeout before redelivery.
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

RUN mv target/analytics-service-*.jar target/app.jar

# =============================================================================
# Stage 2 — runtime
# =============================================================================
FROM ${RUNTIME_IMAGE} AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="creatorflow-analytics-service" \
      org.opencontainers.image.description="CreatorFlow analytics-service (SQS consumer, platform metric fetch, snapshots)" \
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
# SIGTERM on capacity reclaim and the JVM must receive it to finish the SQS
# message currently in flight. Pairs with server.shutdown=graceful.
STOPSIGNAL SIGTERM

# Health check path: /creator-flow/analytics/actuator/health/readiness
# No HEALTHCHECK instruction — see docs/docker-standards.md § Health checks.
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "/app/app.jar"]
