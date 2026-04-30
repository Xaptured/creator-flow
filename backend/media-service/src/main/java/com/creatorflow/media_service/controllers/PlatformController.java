package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.configuration.GoogleOAuthProperties;
import com.creatorflow.media_service.dto.request.YouTubeUploadRequest;
import com.creatorflow.media_service.dto.response.ErrorResponse;
import com.creatorflow.media_service.services.YouTubeOAuthService;
import com.creatorflow.media_service.services.YouTubeUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/platforms")
@Tag(name = "Platform Connections", description = "OAuth connect and video upload for social platforms")
public class PlatformController {

    private static final Logger log = LoggerFactory.getLogger(PlatformController.class);

    private static final String DASHBOARD_PATH         = "/dashboard";
    private static final String YOUTUBE_CONNECTED_PARAM = "?youtube=connected";
    private static final String YOUTUBE_ERROR_PARAM     = "?youtube=error&reason=";

    private final YouTubeOAuthService youTubeOAuthService;
    private final YouTubeUploadService youTubeUploadService;
    private final GoogleOAuthProperties googleOAuthProperties;

    public PlatformController(YouTubeOAuthService youTubeOAuthService,
                              YouTubeUploadService youTubeUploadService,
                              GoogleOAuthProperties googleOAuthProperties) {
        this.youTubeOAuthService = youTubeOAuthService;
        this.youTubeUploadService = youTubeUploadService;
        this.googleOAuthProperties = googleOAuthProperties;
    }

    @Operation(
            summary = "Initiate YouTube OAuth flow",
            description = "Redirects the user to Google OAuth consent screen. " +
                          "ownerId must be injected server-side from the session — never passed from the browser directly."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "Redirect to Google OAuth consent screen"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/youtube/connect")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Void> connectYouTube(
            @Parameter(description = "Owner UUID — injected from session by BFF, never from browser")
            @RequestParam("ownerId") UUID ownerId) {
        String authUrl = youTubeOAuthService.buildAuthorizationUrl(ownerId);
        log.info("YouTube OAuth URL for ownerId={}: {}", ownerId, authUrl);
        return ResponseEntity.status(302).location(URI.create(authUrl)).build();
    }

    @Operation(
            summary = "Google OAuth callback",
            description = "Public endpoint — Google redirects here after user grants/denies consent. " +
                          "Exchanges auth code for tokens, stores channel info, redirects to frontend dashboard."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "Redirect to frontend dashboard (success or error)"),
            @ApiResponse(responseCode = "400", description = "Missing or invalid code/state params")
    })
    @GetMapping("/youtube/callback")
    public ResponseEntity<Void> youTubeCallback(
            @Parameter(description = "Auth code from Google — present on success")
            @RequestParam(value = "code", required = false) String code,
            @Parameter(description = "ownerId UUID passed as state during connect")
            @RequestParam(value = "state", required = false) String state,
            @Parameter(description = "Error code from Google — present when user denies consent")
            @RequestParam(value = "error", required = false) String error) {

        String frontendBase = googleOAuthProperties.getFrontendBaseUrl();

        if (error != null) {
            log.warn("YouTube OAuth denied or failed: error={} state={}", error, state);
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBase + DASHBOARD_PATH + YOUTUBE_ERROR_PARAM + error))
                    .build();
        }

        if (code == null || state == null) {
            log.error("YouTube callback missing code or state: code={} state={}", code, state);
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBase + DASHBOARD_PATH + YOUTUBE_ERROR_PARAM + "missing_params"))
                    .build();
        }

        try {
            youTubeOAuthService.handleCallback(code, state);
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBase + DASHBOARD_PATH + YOUTUBE_CONNECTED_PARAM))
                    .build();
        } catch (IllegalArgumentException e) {
            log.error("Invalid OAuth state in callback: state={}", state, e);
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBase + DASHBOARD_PATH + YOUTUBE_ERROR_PARAM + "invalid_state"))
                    .build();
        } catch (Exception e) {
            log.error("YouTube callback failed: state={}", state, e);
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBase + DASHBOARD_PATH + YOUTUBE_ERROR_PARAM + "connection_failed"))
                    .build();
        }
    }

    @Operation(
            summary = "Upload media file to YouTube",
            description = "Streams an already-confirmed S3 media file to YouTube via videos.insert API. " +
                          "ownerId is injected server-side by the BFF — never supplied by the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Upload successful — returns YouTube video ID"),
            @ApiResponse(responseCode = "404", description = "Media file not found or YouTube not connected",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "Media file not yet uploaded to S3",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "502", description = "YouTube API error or token exchange failure",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/youtube/upload")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Map<String, String>> uploadToYouTube(
            @RequestBody YouTubeUploadRequest request) {
        String videoId = youTubeUploadService.uploadVideo(
                request.ownerId(),
                request.mediaFileId(),
                request.title(),
                request.description(),
                request.privacyStatus()
        );
        return ResponseEntity.ok(Map.of("youtubeVideoId", videoId));
    }
}
