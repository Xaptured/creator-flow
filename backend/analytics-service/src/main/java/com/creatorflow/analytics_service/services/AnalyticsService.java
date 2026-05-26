package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.dto.AnalyticsEventMessage;
import com.creatorflow.analytics_service.dto.AnalyticsUpdatedPayload;
import com.creatorflow.analytics_service.model.AnalyticsSnapshot;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.repository.AnalyticsSnapshotRepository;
import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final AnalyticsSnapshotRepository snapshotRepository;
    private final AnalyticsSnsPublisher snsPublisher;
    private final Map<PlatformType, PlatformAdapter> adapters;
    private final ObjectMapper objectMapper;

    public AnalyticsService(
            AnalyticsSnapshotRepository snapshotRepository,
            AnalyticsSnsPublisher snsPublisher,
            List<PlatformAdapter> platformAdapters) {
        this.snapshotRepository = snapshotRepository;
        this.snsPublisher = snsPublisher;
        this.adapters = platformAdapters.stream()
                .collect(Collectors.toMap(PlatformAdapter::platform, Function.identity()));
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    /**
     * Fetch metrics from the platform, persist a snapshot row, then publish
     * {@code analytics.updated} event to SNS.
     *
     * @param contentId      UUID of the content
     * @param ownerId        UUID of the content owner
     * @param platform       target platform
     * @param platformPostId platform-native post ID (e.g. YouTube videoId, tweet ID, IG media ID); may be null
     * @param windowHours    1, 24, or 168
     */
    @Transactional
    public void fetchAndRecord(UUID contentId, UUID ownerId, PlatformType platform,
                               String platformPostId, int windowHours) {
        PlatformAdapter adapter = adapters.get(platform);
        if (adapter == null) {
            log.error("No adapter registered for platform: {}", platform);
            return;
        }

        PlatformMetrics metrics = adapter.fetchMetrics(contentId, ownerId, platformPostId);

        AnalyticsSnapshot snapshot = buildSnapshot(contentId, ownerId, platform, windowHours, metrics);
        snapshotRepository.save(snapshot);
        log.info("Analytics snapshot saved — contentId: {}, platform: {}, window: {}h", contentId, platform, windowHours);

        publishAnalyticsUpdatedEvent(ownerId, contentId, platform, metrics, windowHours);
    }

    private AnalyticsSnapshot buildSnapshot(
            UUID contentId, UUID ownerId, PlatformType platform, int windowHours, PlatformMetrics metrics) {
        AnalyticsSnapshot snapshot = new AnalyticsSnapshot();
        snapshot.setContentId(contentId);
        snapshot.setOwnerId(ownerId);
        snapshot.setPlatform(platform);
        snapshot.setWindowHours(windowHours);
        snapshot.setViews(metrics.views());
        snapshot.setLikes(metrics.likes());
        snapshot.setComments(metrics.comments());
        snapshot.setImpressions(metrics.impressions());
        snapshot.setEngagementRate(metrics.engagementRate());
        snapshot.setFetchedAt(Instant.now());
        return snapshot;
    }

    private void publishAnalyticsUpdatedEvent(
            UUID ownerId, UUID contentId, PlatformType platform, PlatformMetrics metrics, int windowHours) {
        try {
            AnalyticsUpdatedPayload payload = new AnalyticsUpdatedPayload(
                    ownerId,
                    contentId,
                    platform.name(),
                    new AnalyticsUpdatedPayload.MetricsSnapshot(
                            metrics.views(),
                            metrics.likes(),
                            metrics.comments(),
                            metrics.impressions(),
                            metrics.engagementRate(),
                            windowHours
                    )
            );
            String payloadJson = objectMapper.writeValueAsString(payload);
            AnalyticsEventMessage event = AnalyticsEventMessage.of("analytics.updated", payloadJson);
            snsPublisher.publishAnalyticsUpdated(event);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialise analytics.updated payload — contentId: {}", contentId, e);
        }
    }
}
