package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.creatorflow.analytics_service.model.AnalyticsSnapshot;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.repository.AnalyticsSnapshotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Handles the transactional write of a single {@link AnalyticsSnapshot} row.
 *
 * <p>This is a dedicated bean so that {@link AnalyticsService#fetchAndRecord} can
 * call it as an external Spring-proxied method.  If the save and the downstream
 * SNS publish shared the same {@code @Transactional} boundary, a SNS failure would
 * roll back the already-persisted snapshot row — losing analytics data silently.
 * Keeping the DB write in its own committed transaction prevents that.</p>
 */
@Service
public class AnalyticsSnapshotWriter {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsSnapshotWriter.class);

    private final AnalyticsSnapshotRepository snapshotRepository;

    public AnalyticsSnapshotWriter(AnalyticsSnapshotRepository snapshotRepository) {
        this.snapshotRepository = snapshotRepository;
    }

    /**
     * Builds and persists a snapshot row in its own committed transaction.
     * Returns the saved entity so the caller can use its generated ID if needed.
     */
    @Transactional
    public AnalyticsSnapshot save(UUID contentId, UUID ownerId, PlatformType platform,
                                  int windowHours, String windowLabel, PlatformMetrics metrics, String title) {
        AnalyticsSnapshot snapshot = new AnalyticsSnapshot();
        snapshot.setContentId(contentId);
        snapshot.setOwnerId(ownerId);
        snapshot.setPlatform(platform);
        snapshot.setWindowHours(windowHours);
        snapshot.setWindowLabel(windowLabel);
        snapshot.setTitle(title);
        snapshot.setViews(metrics.views());
        snapshot.setLikes(metrics.likes());
        snapshot.setComments(metrics.comments());
        snapshot.setImpressions(metrics.impressions());
        snapshot.setEngagementRate(metrics.engagementRate());
        snapshot.setFetchedAt(Instant.now());

        AnalyticsSnapshot saved = snapshotRepository.save(snapshot);
        log.info("Analytics snapshot saved — contentId: {}, platform: {}, window: {}h ({})",
                contentId, platform, windowHours, windowLabel);
        return saved;
    }
}
