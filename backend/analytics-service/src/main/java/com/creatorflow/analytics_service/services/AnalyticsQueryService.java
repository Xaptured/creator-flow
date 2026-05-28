package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.dto.request.IngestRequest;
import com.creatorflow.analytics_service.dto.response.ContentSnapshotResponse;
import com.creatorflow.analytics_service.dto.response.PlatformSummaryResponse;
import com.creatorflow.analytics_service.dto.response.TopPostResponse;
import com.creatorflow.analytics_service.model.AnalyticsSnapshot;
import com.creatorflow.analytics_service.repository.AnalyticsSnapshotRepository;
import com.creatorflow.analytics_service.repository.PlatformSummaryProjection;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class AnalyticsQueryService {

    private final AnalyticsSnapshotRepository snapshotRepository;
    private final AnalyticsService analyticsService;

    public AnalyticsQueryService(AnalyticsSnapshotRepository snapshotRepository,
                                 AnalyticsService analyticsService) {
        this.snapshotRepository = snapshotRepository;
        this.analyticsService = analyticsService;
    }

    /**
     * Aggregated metrics per platform for the last 30 days.
     */
    @Transactional(readOnly = true)
    public List<PlatformSummaryResponse> getSummary(UUID ownerId) {
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);
        List<PlatformSummaryProjection> rows = snapshotRepository.summariseByOwnerSince(ownerId, since);
        return rows.stream()
                .map(p -> new PlatformSummaryResponse(
                        p.getPlatform(),
                        p.getTotalViews(),
                        p.getTotalLikes(),
                        p.getTotalComments()))
                .toList();
    }

    /**
     * All snapshots for a single content item owned by the caller, ordered by window_hours ASC.
     *
     * ownerId is extracted from the JWT in the controller — not trusted from the client.
     * Returns an empty list (not 404) when the content exists but belongs to another owner,
     * to avoid leaking the existence of other creators' posts.
     */
    @Transactional(readOnly = true)
    public List<ContentSnapshotResponse> getContentHistory(UUID contentId, UUID ownerId) {
        List<AnalyticsSnapshot> snapshots =
                snapshotRepository.findByContentIdAndOwnerIdOrderByWindowHoursAsc(contentId, ownerId);
        return snapshots.stream()
                .map(this::toContentSnapshotResponse)
                .toList();
    }

    /**
     * Top 10 posts ranked by engagement_rate DESC for the owner.
     */
    @Transactional(readOnly = true)
    public List<TopPostResponse> getTopPosts(UUID ownerId) {
        return snapshotRepository.findTop10ByOwnerIdOrderByEngagementRateDesc(ownerId)
                .stream()
                .map(s -> new TopPostResponse(
                        s.getContentId(),
                        s.getPlatform(),
                        s.getViews(),
                        s.getLikes(),
                        s.getComments(),
                        s.getEngagementRate()))
                .toList();
    }

    /**
     * Idempotent HTTP ingest — delegates to AnalyticsService.fetchAndRecord.
     * scheduler-service calls this as a fallback when SQS is unavailable.
     *
     * <p>If {@code windowLabel} is absent in the request, a fallback label is
     * derived from {@code windowHours} so existing callers are not broken.</p>
     */
    @Transactional
    public void ingest(IngestRequest request) {
        String label = (request.windowLabel() != null && !request.windowLabel().isBlank())
                ? request.windowLabel()
                : deriveFallbackLabel(request.windowHours());

        analyticsService.fetchAndRecord(
                request.contentId(),
                request.ownerId(),
                request.platform(),
                request.platformPostId(),
                request.windowHours(),
                label);
    }

    private ContentSnapshotResponse toContentSnapshotResponse(AnalyticsSnapshot s) {
        return new ContentSnapshotResponse(
                s.getId(),
                s.getContentId(),
                s.getPlatform(),
                s.getViews(),
                s.getLikes(),
                s.getComments(),
                s.getImpressions(),
                s.getEngagementRate(),
                s.getWindowHours(),
                s.getWindowLabel(),
                s.getFetchedAt());
    }

    /** Derives a display label from raw hours for legacy ingest requests that omit windowLabel. */
    private static String deriveFallbackLabel(int hours) {
        if (hours < 24)  return hours + (hours == 1 ? " hour"  : " hours");
        int days = hours / 24;
        return days + (days == 1 ? " day" : " days");
    }
}
