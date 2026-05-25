# =============================================================================
# auth-service — Fargate-ready multi-stage Dockerfile
# Stage 1: build fat JAR with Maven
# Stage 2: lean runtime image (no JDK, no Maven)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — build
# ---------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Cache dependency layer — only re-runs when pom.xml changes
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn package -DskipTests -q

# ---------------------------------------------------------------------------
# Stage 2 — runtime
# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runtime

# Non-root user for security best practice (Fargate allows this)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

COPY --from=build /app/target/auth-service-*.jar app.jar

# Fargate reads PORT from task-definition env; Spring default is 8080
EXPOSE 8080

# JVM flags tuned for containers:
#   UseContainerSupport      — respect cgroup memory limits
#   MaxRAMPercentage=75      — use 75% of container RAM for heap
#   ExitOnOutOfMemoryError   — fail fast, let ECS restart the task
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "app.jar"]
