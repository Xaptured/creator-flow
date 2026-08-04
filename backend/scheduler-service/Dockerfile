# =============================================================================
# scheduler-service — follows the standard in docs/docker-standards.md.
# Canonical reference: backend/auth-service/Dockerfile. Change that first.
#
#   docker build -t scheduler-service:local backend/scheduler-service
#
# Service note: Quartz runs with the IN-MEMORY job store (Spring's default —
# there is no spring.quartz block). That means:
#   - jobs are NOT persisted; a task replacement loses the in-flight schedule
#   - there is NO cluster lock, so running more than one task/replica executes
#     every job N times
# Run exactly ONE task of this service until the JDBC job store lands.
# See docs/docker-standards.md § scheduler-service.
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

RUN mv target/scheduler-service-*.jar target/app.jar

# =============================================================================
# Stage 2 — runtime
# =============================================================================
FROM ${RUNTIME_IMAGE} AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="creatorflow-scheduler-service" \
      org.opencontainers.image.description="CreatorFlow scheduler-service (Quartz jobs, SNS publish, token refresh)" \
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
# SIGTERM on capacity reclaim and the JVM must receive it so Quartz can finish
# the running job. Pairs with server.shutdown=graceful in application.yaml.
STOPSIGNAL SIGTERM

# Health check path: /creator-flow/scheduler/actuator/health/readiness
# No HEALTHCHECK instruction — see docs/docker-standards.md § Health checks.
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "/app/app.jar"]
