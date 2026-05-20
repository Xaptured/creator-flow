package com.creatorflow.media_service.repository;

import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.ContentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ContentRepository extends JpaRepository<Content, UUID>, JpaSpecificationExecutor<Content> {

    Optional<Content> findByIdAndOwnerId(UUID id, UUID ownerId);

    /**
     * Counts SCHEDULED content rows for an owner whose platform_targets JSONB array
     * contains the given platform name (e.g. "YOUTUBE").
     */
    @Query(value = """
            SELECT COUNT(*) FROM content
            WHERE owner_id = :ownerId
              AND status = CAST(:#{#status.name()} AS content_status)
              AND platform_targets::jsonb @> CAST((:platformTarget) AS jsonb)
            """, nativeQuery = true)
    long countByOwnerIdAndStatusAndPlatformTarget(
            @Param("ownerId") UUID ownerId,
            @Param("status") ContentStatus status,
            @Param("platformTarget") String platformTarget);

    /**
     * Deletes all content rows for an owner whose platform_targets JSONB array
     * contains the given platform name AND whose status matches.
     * Used to clean up SCHEDULED posts when a platform is disconnected.
     */
    @Modifying
    @Query(value = """
            DELETE FROM content
            WHERE owner_id = :ownerId
              AND status = CAST(:#{#status.name()} AS content_status)
              AND platform_targets::jsonb @> CAST((:platformTarget) AS jsonb)
            """, nativeQuery = true)
    void deleteByOwnerIdAndStatusAndPlatformTarget(
            @Param("ownerId") UUID ownerId,
            @Param("status") ContentStatus status,
            @Param("platformTarget") String platformTarget);
}
