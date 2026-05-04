package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.request.PublishRequest;
import com.creatorflow.media_service.dto.response.ErrorResponse;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.services.PlatformAdapter;
import com.creatorflow.media_service.services.PlatformAdapterRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Handles user-triggered content publishing to social platforms.
 *
 * A single generic endpoint covers all platforms — the correct PlatformAdapter
 * is resolved from the {platform} path variable via PlatformAdapterRegistry.
 * Adding a new platform requires only a new adapter bean, not a new endpoint.
 *
 * This endpoint is for the frontend "Post Now" / instant publish flow only.
 * Scheduled publish is fully event-driven: scheduler-service publishes a
 * CONTENT_READY_TO_PUBLISH SNS event → post-dispatcher-queue SQS →
 * PublishDispatcherListener (media-service) → PlatformAdapter.publish().
 * No HTTP call is made between services for scheduled publish.
 *
 * Endpoints:
 *   POST /api/publish/{platform}  — publish content to a platform (authenticated)
 *
 * Controller responsibilities (thin — no business logic):
 *   - Parse and validate the platform path variable
 *   - Resolve the correct PlatformAdapter from the registry
 *   - Build a transient Content object from the request
 *   - Delegate to adapter.publish()
 */
@RestController
@RequestMapping("/api/publish")
@Tag(name = "Content Publishing", description = "Publish content to connected social platforms")
public class PublishController {

    private static final Logger log = LoggerFactory.getLogger(PublishController.class);

    private final PlatformAdapterRegistry registry;

    public PublishController(PlatformAdapterRegistry registry) {
        this.registry = registry;
    }

    @Operation(
            summary = "Publish content to a platform",
            description = "Publishes the specified media file to the creator's connected platform account. " +
                          "ownerId must be injected server-side from the JWT session by the BFF — never from the browser. " +
                          "The mediaFileId must reference a MediaFile in UPLOADED status owned by ownerId."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Published successfully — returns platform-specific result ID"),
            @ApiResponse(responseCode = "400", description = "Unknown platform or missing mediaFileId",
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Media file not found or platform not connected",
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Media file not yet confirmed as uploaded",
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "502", description = "Platform API error",
                    content = @io.swagger.v3.oas.annotations.media.Content(
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/{platform}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Map<String, String>> publish(
            @Parameter(description = "Platform name: youtube | instagram | twitter")
            @PathVariable String platform,
            @RequestBody PublishRequest request) {

        PlatformType platformType = parsePlatform(platform);
        PlatformAdapter adapter = registry.getAdapter(platformType);

        Content content = buildContent(request);

        log.info("Publishing: platform={} ownerId={} mediaFileId={}",
                platformType, request.ownerId(), request.mediaFileId());

        adapter.publish(request.ownerId(), content);

        return ResponseEntity.ok(Map.of(
                "platform", platform,
                "status", "published"));
    }

    /**
     * Build a transient Content object from the publish request.
     *
     * Not persisted — lightweight carrier for fields the adapter needs.
     * For scheduled publish, PublishDispatcherProcessor loads the real
     * Content entity from the DB and calls adapter.publish() directly.
     */
    private Content buildContent(PublishRequest request) {
        Content content = new Content();
        content.setId(UUID.randomUUID());
        content.setOwnerId(request.ownerId());
        content.setMediaFileId(request.mediaFileId());
        content.setTitle(request.title());
        content.setDescription(request.description());
        return content;
    }

    private PlatformType parsePlatform(String platform) {
        try {
            return PlatformType.valueOf(platform.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown platform: " + platform);
        }
    }
}
