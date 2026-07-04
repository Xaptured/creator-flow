package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.response.ErrorResponse;
import com.creatorflow.media_service.dto.response.TokenRefreshResponse;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.services.PlatformRefreshService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Internal-only endpoints called by sibling services (scheduler-service).
 * <p>
 * Security model: protected by a shared secret header (X-Internal-Secret)
 * rather than a user JWT. This avoids scheduler-service needing a Keycloak
 * service account while keeping the endpoint inaccessible to external clients.
 * <p>
 * The secret is injected from ${app.internal.secret} and must be set identically
 * in both media-service and scheduler-service environments.
 * <p>
 * These endpoints are NOT exposed in the public Swagger UI (operationId hidden).
 * They are excluded from the public security filter chain and protected only by
 * the shared secret check in this controller.
 */
@RestController
@RequestMapping("/internal/platforms")
@Tag(name = "Internal", description = "Service-to-service endpoints — not for public consumption")
public class InternalPlatformController {

    private static final Logger log = LoggerFactory.getLogger(InternalPlatformController.class);
    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final PlatformRefreshService platformRefreshService;

    @Value("${app.internal.secret}")
    private String internalSecret;

    public InternalPlatformController(PlatformRefreshService platformRefreshService) {
        this.platformRefreshService = platformRefreshService;
    }

    @Operation(
            summary = "Refresh expiring platform OAuth tokens",
            description = "Called by scheduler-service on a fixed interval. " +
                    "Finds all platform accounts expiring within the configured refresh-ahead window " +
                    "and proactively refreshes their tokens. " +
                    "Protected by X-Internal-Secret header — not a public endpoint."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Refresh run complete — see body for counts"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid internal secret")
    })
    @PostMapping("/refresh-expiring")
    public ResponseEntity<?> refreshExpiringTokens(
            @RequestHeader(value = INTERNAL_SECRET_HEADER, required = false) String secret) {

        if (!internalSecret.equals(secret)) {
            log.warn("InternalPlatformController: rejected request with invalid or missing internal secret");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorResponse.of("UNAUTHORIZED", 401, "Invalid or missing internal secret"));
        }

        log.info("InternalPlatformController: token refresh run triggered by scheduler-service");
        PlatformRefreshService.RefreshSummary summary = platformRefreshService.refreshExpiringTokens();

        TokenRefreshResponse response = TokenRefreshResponse.of(
                summary.attempted(), summary.succeeded(), summary.failed());

        log.info("InternalPlatformController: refresh run finished — attempted={} succeeded={} failed={}",
                summary.attempted(), summary.succeeded(), summary.failed());

        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Refresh + warm one owner's platform token",
            description = "Called on-demand by analytics-service when a token is missing/expired in the " +
                    "Redis cache. Refreshes the token if needed and re-populates the cache so the next read " +
                    "succeeds. Protected by X-Internal-Secret header — not a public endpoint."
    )
    @PostMapping("/refresh-and-warm")
    public ResponseEntity<?> refreshAndWarm(
            @RequestHeader(value = INTERNAL_SECRET_HEADER, required = false) String secret,
            @RequestParam UUID ownerId,
            @RequestParam String platform) {

        if (!internalSecret.equals(secret)) {
            log.warn("InternalPlatformController: rejected refresh-and-warm with invalid or missing internal secret");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorResponse.of("UNAUTHORIZED", 401, "Invalid or missing internal secret"));
        }

        try {
            PlatformType platformType = PlatformType.valueOf(platform.toUpperCase());
            platformRefreshService.refreshAndWarm(ownerId, platformType);
            log.info("InternalPlatformController: refresh-and-warm OK — ownerId={} platform={}", ownerId, platformType);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ErrorResponse.of("BAD_REQUEST", 400, "Unknown platform: " + platform));
        } catch (Exception e) {
            log.error("InternalPlatformController: refresh-and-warm failed — ownerId={} platform={}", ownerId, platform, e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ErrorResponse.of("REFRESH_FAILED", 502, "Could not refresh/warm token"));
        }
    }
}
