package com.creatorflow.analytics_service.repository;

import com.creatorflow.analytics_service.model.AnalyticsSnapshot;
import com.creatorflow.analytics_service.model.PlatformType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AnalyticsSnapshotRepository extends JpaRepository<AnalyticsSnapshot, UUID> {

    Optional<AnalyticsSnapshot> findByContentIdAndOwnerIdAndPlatformAndWindowHours(
            UUID contentId, UUID ownerId, PlatformType platform, int windowHours);

    /**
     * Summary: SUM views/likes/comments grouped by platform for owner, last 30 days.
     */
    @Query("""
            SELECT s.platform AS platform,
                   COALESCE(SUM(s.views), 0)    AS totalViews,
                   COALESCE(SUM(s.likes), 0)    AS totalLikes,
                   COALESCE(SUM(s.comments), 0) AS totalComments
            FROM AnalyticsSnapshot s
            WHERE s.ownerId = :ownerId
              AND s.fetchedAt >= :since
            GROUP BY s.platform
            """)
    List<PlatformSummaryProjection> summariseByOwnerSince(
            @Param("ownerId") UUID ownerId,
            @Param("since") Instant since);

    /**
     * Per-post: all snapshots for a content item, ordered by window_hours ASC.
     */
    List<AnalyticsSnapshot> findByContentIdOrderByWindowHoursAsc(UUID contentId);

    /**
     * Top posts: top 10 by engagement_rate DESC for owner.
     * Returns one row per contentId (the snapshot with the highest engagement_rate).
     */
    @Query("""
            SELECT s FROM AnalyticsSnapshot s
            WHERE s.ownerId = :ownerId
              AND s.engagementRate IS NOT NULL
            ORDER BY s.engagementRate DESC
            LIMIT 10
            """)
    List<AnalyticsSnapshot> findTop10ByOwnerIdOrderByEngagementRateDesc(@Param("ownerId") UUID ownerId);
}
