package com.creatorflow.media_service.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Tracks the async Instagram media container lifecycle for a single piece of content.
 *
 * <p>One row per Instagram publish attempt. Created by
 * {@link com.creatorflow.media_service.services.instagram.InstagramPublishService} after
 * Step 1 (container creation), and updated by
 * {@link com.creatorflow.media_service.jobs.IgContainerPollingJob} as it polls and
 * eventually publishes via Step 2.
 *
 * <p>Kept in a dedicated table so the shared {@code content} table stays platform-agnostic —
 * YouTube and Twitter rows are completely unaffected.
 */
@Entity
@Table(name = "ig_container_tracking")
@Getter
@Setter
@NoArgsConstructor
public class IgContainerTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** FK to the content row this container belongs to. One-to-one — unique constraint in DB. */
    @Column(name = "content_id", nullable = false, unique = true)
    private UUID contentId;

    /** Denormalised for fast polling queries without a join to content. */
    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    /** The Instagram media container ID returned by POST /{ig-user-id}/media. */
    @Column(name = "container_id", nullable = false, length = 255)
    private String containerId;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false, columnDefinition = "ig_container_status")
    private IgContainerStatus status;

    /** Raw error detail from Instagram or internal timeout message, for debugging. */
    @Column(columnDefinition = "TEXT")
    private String error;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = IgContainerStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
