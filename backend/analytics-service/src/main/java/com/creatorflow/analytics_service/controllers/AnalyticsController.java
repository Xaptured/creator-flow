package com.creatorflow.analytics_service.controllers;

import com.creatorflow.analytics_service.dto.request.IngestRequest;
import com.creatorflow.analytics_service.dto.response.ContentSnapshotResponse;
import com.creatorflow.analytics_service.dto.response.PlatformSummaryResponse;
import com.creatorflow.analytics_service.dto.response.TopPostResponse;
import com.creatorflow.analytics_service.services.AnalyticsQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/analytics")
public class AnalyticsController {

    private final AnalyticsQueryService queryService;

    public AnalyticsController(AnalyticsQueryService queryService) {
        this.queryService = queryService;
    }

    /**
     * GET /api/analytics/summary/{ownerId}
     * 30-day aggregated metrics per platform for a creator.
     */
    @GetMapping("/summary/{ownerId}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<PlatformSummaryResponse>> getSummary(@PathVariable UUID ownerId) {
        return ResponseEntity.ok(queryService.getSummary(ownerId));
    }

    /**
     * GET /api/analytics/content/{contentId}
     * All 3 snapshot windows (1h, 24h, 168h) for a single post.
     */
    @GetMapping("/content/{contentId}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<ContentSnapshotResponse>> getContentHistory(@PathVariable UUID contentId) {
        return ResponseEntity.ok(queryService.getContentHistory(contentId));
    }

    /**
     * GET /api/analytics/top-posts/{ownerId}
     * Top 10 posts ranked by engagement_rate DESC.
     */
    @GetMapping("/top-posts/{ownerId}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<TopPostResponse>> getTopPosts(@PathVariable UUID ownerId) {
        return ResponseEntity.ok(queryService.getTopPosts(ownerId));
    }

    /**
     * POST /api/analytics/ingest
     * Fallback idempotent HTTP ingest for scheduler-service.
     */
    @PostMapping("/ingest")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Void> ingest(@RequestBody IngestRequest request) {
        queryService.ingest(request);
        return ResponseEntity.accepted().build();
    }
}
