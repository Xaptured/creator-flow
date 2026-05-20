package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.response.DisconnectCheckResponse;
import com.creatorflow.media_service.dto.response.ErrorResponse;
import com.creatorflow.media_service.dto.response.PlatformStatusResponse;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.services.PlatformAdapter;
import com.creatorflow.media_service.services.PlatformAdapterRegistry;
import com.creatorflow.media_service.services.PlatformStatusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * Generic OAuth connect/callback controller for all platforms.
 *
 * Dispatches to the correct PlatformAdapter via PlatformAdapterRegistry.
 * No platform-specific logic lives here — adding a new platform = add an adapter bean only.
 *
 * Endpoints:
 *   GET /api/platforms/{platform}/connect   — initiate OAuth flow (authenticated)
 *   GET /api/platforms/{platform}/callback  — OAuth callback (public — called by provider)
 *
 * Content publishing is handled by PublishController (/api/publish/{platform}).
 */
@RestController
@RequestMapping("/api/platforms")
@Tag(name = "Platform Connections", description = "OAuth connect and callback for social platforms")
public class PlatformController {

    private static final Logger log = LoggerFactory.getLogger(PlatformController.class);

    private static final String DASHBOARD_PATH  = "/dashboard";
    private static final String CONNECTED_PARAM = "?platform=%s&status=connected";
    private static final String ERROR_PARAM     = "?platform=%s&status=error&reason=";

    private final PlatformAdapterRegistry registry;
    private final PlatformStatusService platformStatusService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    public PlatformController(PlatformAdapterRegistry registry, PlatformStatusService platformStatusService) {
        this.registry = registry;
        this.platformStatusService = platformStatusService;
    }

    @Operation(
            summary = "Get platform connection status for the owner",
            description = "Returns one entry per known platform (YOUTUBE, INSTAGRAM, TWITTER). " +
                    "Connected platforms include tokenExpiry if available. " +
                    "ownerId is always injected server-side by the BFF — never from the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status list returned successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/status")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<PlatformStatusResponse>> getStatus(
            @Parameter(description = "Owner UUID — injected server-side by BFF, never from browser")
            @RequestParam("ownerId") UUID ownerId) {
        return ResponseEntity.ok(platformStatusService.getStatusForOwner(ownerId));
    }

    @Operation(
            summary = "Initiate OAuth flow for a platform",
            description = "Redirects user to the platform's OAuth consent screen. " +
                          "ownerId must be injected server-side from the session by the BFF — never from the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "Redirect to OAuth consent screen"),
            @ApiResponse(responseCode = "400", description = "Unknown platform",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{platform}/connect")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Void> connect(
            @Parameter(description = "Platform name: youtube | instagram | twitter")
            @PathVariable String platform,
            @Parameter(description = "Owner UUID — injected from session by BFF, never from browser")
            @RequestParam("ownerId") UUID ownerId) {

        PlatformType platformType = parsePlatform(platform);
        PlatformAdapter adapter = registry.getAdapter(platformType);
        String authUrl = adapter.buildAuthorizationUrl(ownerId);
        log.info("OAuth connect: platform={} ownerId={}", platformType, ownerId);
        return ResponseEntity.status(302).location(URI.create(authUrl)).build();
    }

    @Operation(
            summary = "OAuth callback for a platform",
            description = "Public endpoint — the OAuth provider redirects here after user grants/denies consent. " +
                          "Exchanges auth code for tokens, persists PlatformAccount, redirects to frontend dashboard."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "Redirect to frontend dashboard (success or error)"),
            @ApiResponse(responseCode = "400", description = "Missing or invalid params")
    })
    @GetMapping("/{platform}/callback")
    public ResponseEntity<Void> callback(
            @Parameter(description = "Platform name: youtube | instagram | twitter")
            @PathVariable String platform,
            @Parameter(description = "Auth code — present on success")
            @RequestParam(value = "code", required = false) String code,
            @Parameter(description = "State param — encodes ownerId (and PKCE verifier key for Twitter)")
            @RequestParam(value = "state", required = false) String state,
            @Parameter(description = "Error — present when user denies consent")
            @RequestParam(value = "error", required = false) String error) {

        PlatformType platformType;
        try {
            platformType = parsePlatform(platform);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBaseUrl + DASHBOARD_PATH + "?status=error&reason=unknown_platform"))
                    .build();
        }

        String connectedRedirect = frontendBaseUrl + DASHBOARD_PATH +
                String.format(CONNECTED_PARAM, platform);
        String errorRedirect = frontendBaseUrl + DASHBOARD_PATH +
                String.format(ERROR_PARAM, platform);

        if (error != null) {
            log.warn("OAuth denied: platform={} error={} state={}", platformType, error, state);
            return ResponseEntity.status(302)
                    .location(URI.create(errorRedirect + error))
                    .build();
        }

        if (code == null || state == null) {
            log.error("OAuth callback missing code or state: platform={}", platformType);
            return ResponseEntity.status(302)
                    .location(URI.create(errorRedirect + "missing_params"))
                    .build();
        }

        try {
            PlatformAdapter adapter = registry.getAdapter(platformType);
            adapter.handleCallback(code, state);
            log.info("OAuth connected: platform={}", platformType);
            return ResponseEntity.status(302)
                    .location(URI.create(connectedRedirect))
                    .build();
        } catch (IllegalArgumentException e) {
            log.error("Invalid OAuth state: platform={} state={}", platformType, state, e);
            return ResponseEntity.status(302)
                    .location(URI.create(errorRedirect + "invalid_state"))
                    .build();
        } catch (Exception e) {
            log.error("OAuth callback failed: platform={}", platformType, e);
            return ResponseEntity.status(302)
                    .location(URI.create(errorRedirect + "server_error"))
                    .build();
        }
    }

    @Operation(
            summary = "Check whether disconnecting a platform will affect scheduled content",
            description = "Returns the count of SCHEDULED content rows that target this platform for the owner. " +
                          "A count > 0 means the frontend should show a confirmation dialog before disconnecting. " +
                          "ownerId is injected from session by the BFF — never from the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Check result returned"),
            @ApiResponse(responseCode = "400", description = "Unknown platform",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{platform}/disconnect-check")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<DisconnectCheckResponse> disconnectCheck(
            @Parameter(description = "Platform name: youtube | instagram | twitter")
            @PathVariable String platform,
            @Parameter(description = "Owner UUID — injected from session by BFF, never from browser")
            @RequestParam("ownerId") UUID ownerId) {

        PlatformType platformType = parsePlatform(platform);
        return ResponseEntity.ok(platformStatusService.checkDisconnect(ownerId, platformType));
    }

    @Operation(
            summary = "Disconnect a platform",
            description = "Deletes the stored OAuth tokens for the given platform and owner. " +
                          "ownerId is injected from session by the BFF — never from the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Platform disconnected"),
            @ApiResponse(responseCode = "400", description = "Unknown platform",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{platform}/disconnect")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Void> disconnect(
            @Parameter(description = "Platform name: youtube | instagram | twitter")
            @PathVariable String platform,
            @Parameter(description = "Owner UUID — injected from session by BFF, never from browser")
            @RequestParam("ownerId") UUID ownerId) {

        PlatformType platformType = parsePlatform(platform);
        platformStatusService.disconnect(ownerId, platformType);
        log.info("Platform disconnected: platform={} ownerId={}", platformType, ownerId);
        return ResponseEntity.noContent().build();
    }

    private PlatformType parsePlatform(String platform) {
        try {
            return PlatformType.valueOf(platform.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown platform: " + platform);
        }
    }
}
