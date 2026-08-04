package com.creatorflow.scheduler_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Instant;

/**
 * HTTP client for service-to-service calls from scheduler-service to media-service.
 *
 * Calls the internal endpoint POST /internal/platforms/refresh-expiring.
 * Authenticates using the shared X-Internal-Secret header — not a user JWT.
 *
 * The media-service base URL and internal secret are injected from application config,
 * which reads from environment variables (MEDIA_SERVICE_BASE_URL, INTERNAL_SERVICE_SECRET).
 */
@Component
public class MediaServiceClient {

    private static final Logger log = LoggerFactory.getLogger(MediaServiceClient.class);
    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final RestClient restClient;
    private final String internalSecret;
    private final String refreshExpiringPath;

    public MediaServiceClient(
            @Value("${app.media-service.base-url}") String mediaServiceBaseUrl,
            @Value("${app.media-service.refresh-expiring-path}") String refreshExpiringPath,
            @Value("${app.internal.secret}") String internalSecret) {
        this.restClient = RestClient.builder()
                .baseUrl(mediaServiceBaseUrl)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.refreshExpiringPath = refreshExpiringPath;
        this.internalSecret = internalSecret;
    }

    /**
     * Trigger a proactive token refresh run on media-service.
     * Media-service will find all near-expiry accounts and refresh them.
     *
     * @return the refresh summary from media-service, or null if the call failed
     */
    public TokenRefreshResult refreshExpiringTokens() {
        try {
            return restClient.post()
                    .uri(refreshExpiringPath)
                    .header(INTERNAL_SECRET_HEADER, internalSecret)
                    .retrieve()
                    .body(TokenRefreshResult.class);
        } catch (RestClientException e) {
            log.error("MediaServiceClient: failed to call refresh-expiring endpoint — {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Mirrors the TokenRefreshResponse from media-service.
     * Kept as a record here to avoid a cross-service dependency on media-service DTOs.
     */
    public record TokenRefreshResult(int attempted, int succeeded, int failed, Instant refreshedAt) {}
}
