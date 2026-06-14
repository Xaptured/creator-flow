package com.creatorflow.analytics_service.controllers;

import com.creatorflow.analytics_service.dto.request.IngestRequest;
import com.creatorflow.analytics_service.dto.response.ContentSnapshotResponse;
import com.creatorflow.analytics_service.dto.response.ErrorResponse;
import com.creatorflow.analytics_service.dto.response.PlatformSummaryResponse;
import com.creatorflow.analytics_service.dto.response.TopPostResponse;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.services.AnalyticsQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/analytics")
@Tag(name = "Analytics", description = "Creator analytics — platform metrics summaries, per-post snapshot history, and top-post rankings")
public class AnalyticsController {

    private final AnalyticsQueryService queryService;

    public AnalyticsController(AnalyticsQueryService queryService) {
        this.queryService = queryService;
    }

    @Operation(
            summary = "Get platform summary",
            description = "Returns 30-day aggregated metrics (views, likes, comments) for the given creator. " +
                    "Without the optional 'platform' query param, returns one row per platform. " +
                    "With 'platform', returns only that platform's row (empty list if no data)."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Summary returned",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = PlatformSummaryResponse.class)))),
            @ApiResponse(responseCode = "401", description = "Missing or invalid Bearer token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Authenticated user does not have CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/summary/{ownerId}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<PlatformSummaryResponse>> getSummary(
            @Parameter(description = "UUID of the content owner", required = true)
            @PathVariable UUID ownerId,
            @Parameter(description = "Optional platform filter (e.g. YOUTUBE, INSTAGRAM, TWITTER). Omit for all platforms.")
            @RequestParam(required = false) PlatformType platform) {
        return ResponseEntity.ok(queryService.getSummary(ownerId, platform));
    }

    @Operation(
            summary = "Get content snapshot history",
            description = "Returns all analytics snapshots for a single post across all measurement windows (1h, 24h, 168h), " +
                    "scoped to the given owner. Returns an empty list if the contentId does not belong to the owner " +
                    "(avoids leaking resource existence)."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Snapshot history returned (empty list if contentId not owned by caller)",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = ContentSnapshotResponse.class)))),
            @ApiResponse(responseCode = "401", description = "Missing or invalid Bearer token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Authenticated user does not have CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/content/{contentId}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<ContentSnapshotResponse>> getContentHistory(
            @Parameter(description = "UUID of the content item (post)", required = true)
            @PathVariable UUID contentId,
            @Parameter(description = "UUID of the content owner", required = true)
            @RequestParam UUID ownerId) {
        return ResponseEntity.ok(queryService.getContentHistory(contentId, ownerId));
    }

    @Operation(
            summary = "Get top posts",
            description = "Returns the top 10 posts for the creator ranked by engagement rate (descending). " +
                    "Without the optional 'platform' query param, ranks across all platforms; " +
                    "with 'platform', ranks only that platform's posts."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Top posts returned",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = TopPostResponse.class)))),
            @ApiResponse(responseCode = "401", description = "Missing or invalid Bearer token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Authenticated user does not have CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/top-posts/{ownerId}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<TopPostResponse>> getTopPosts(
            @Parameter(description = "UUID of the content owner", required = true)
            @PathVariable UUID ownerId,
            @Parameter(description = "Optional platform filter (e.g. YOUTUBE, INSTAGRAM, TWITTER). Omit for all platforms.")
            @RequestParam(required = false) PlatformType platform) {
        return ResponseEntity.ok(queryService.getTopPosts(ownerId, platform));
    }

    @Operation(
            summary = "Ingest analytics snapshot (fallback)",
            description = "Fallback idempotent HTTP endpoint for scheduler-service to trigger a metrics fetch and record. " +
                    "Accepted (202) immediately — the fetch runs asynchronously via the Quartz job pipeline. " +
                    "Duplicate requests for the same contentId + windowHours are safe to retry. " +
                    "ownerId in the request body is validated against the JWT sub by OwnerIdValidationFilter."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Ingest accepted — metrics fetch scheduled"),
            @ApiResponse(responseCode = "400", description = "Invalid request body",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Missing or invalid Bearer token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "ownerId in body does not match authenticated user",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/ingest")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Void> ingest(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Ingest request specifying the content item, platform, and measurement window",
                    required = true,
                    content = @Content(schema = @Schema(implementation = IngestRequest.class))
            )
            @RequestBody IngestRequest request) {
        queryService.ingest(request);
        return ResponseEntity.accepted().build();
    }
}
