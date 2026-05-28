package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.dto.AnalyticsEventMessage;
import com.creatorflow.analytics_service.dto.AnalyticsUpdatedPayload;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final AnalyticsSnapshotWriter snapshotWriter;
    private final AnalyticsSnsPublisher snsPublisher;
    private final Map<PlatformType, PlatformAdapter> adapters;
    private final ObjectMapper objectMapper;

    public AnalyticsService(
            AnalyticsSnapshotWriter snapshotWriter,
            AnalyticsSnsPublisher snsPublisher,
            List<PlatformAdapter> platformAdapters) {
        this.snapshotWriter = snapshotWriter;
        this.snsPublisher = snsPublisher;
        this.adapters = platformAdapters.stream()
                .collect(Collectors.toMap(PlatformAdapter::platform, Function.identity()));
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    /**
     * Fetch metrics from the platform, persist a snapshot row, then publish
     * {@code analytics.updated} event to SNS.
     *
     * <p>The DB save and SNS publish are intentionally <em>not</em> in the same
     * transaction.  {@link #saveSnapshot} commits first; only then is the SNS
     * event published.  This guarantees the snapshot row survives even if the
     * SNS call fails — the data is never silently rolled back by a downstream
     * infrastructure error.</p>
     *
     * @param contentId      UUID of the content
     * @param ownerId        UUID of the content owner
     * @param platform       target platform
     * @param platformPostId platform-native post ID (e.g. YouTube videoId, tweet ID, IG media ID); may be null
     * @param windowHours    hours after content live time at which this snapshot is taken
     * @param windowLabel    human-readable label, e.g. "1 hour", "3 days", "30 days"
     */
    public void fetchAndRecord(UUID contentId, UUID ownerId, PlatformType platform,
                               String platformPostId, int windowHours, String windowLabel) {
        PlatformAdapter adapter = adapters.get(platform);
        if (adapter == null) {
            log.error("No adapter registered for platform: {}", platform);
            return;
        }

        PlatformMetrics metrics = adapter.fetchMetrics(contentId, ownerId, platformPostId);

        // Commit the snapshot row before touching SNS — a downstream SNS failure must
        // never roll back persisted analytics data. AnalyticsSnapshotWriter is a
        // separate Spring bean so its @Transactional boundary is honoured correctly.
        snapshotWriter.save(contentId, ownerId, platform, windowHours, windowLabel, metrics);

        publishAnalyticsUpdatedEvent(ownerId, contentId, platform, metrics, windowHours);
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
