# =============================================================================
# db-migrations — one-shot Fargate task Dockerfile
#
# Does NOT run a long-lived server. Runs Flyway migrations then exits.
# In ECS: deploy as a standalone Task (not a Service) before rolling out
# any other service update.
# =============================================================================

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
WORKDIR /app
COPY --from=build /app/target/db-migrations-*.jar app.jar

# Runs migrations via Spring Boot's Flyway auto-run on startup, then exits.
# DB connection supplied via ECS task-definition environment variables:
#   DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
