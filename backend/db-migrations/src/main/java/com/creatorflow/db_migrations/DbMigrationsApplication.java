package com.creatorflow.db_migrations;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Standalone Spring Boot application whose sole responsibility is running
 * Flyway migrations against the shared CreatorFlow PostgreSQL database.
 *
 * Run this service before starting any other backend service.
 * It applies all pending migrations and exits (or stays up for health checks).
 */
@SpringBootApplication
public class DbMigrationsApplication {

    public static void main(String[] args) {
        SpringApplication.run(DbMigrationsApplication.class, args);
    }
}
