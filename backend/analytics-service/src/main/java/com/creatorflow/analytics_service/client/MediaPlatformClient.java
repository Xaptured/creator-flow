package com.creatorflow.analytics_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

/**
 * Service-to-service client from analytics-service to media-service.
 *
 * <p>Analytics reads OAuth tokens from the Redis cache written by media-service.
 * When that cache is empty or holds an expired token, analytics cannot refresh
 * it itself (media-service owns token lifecycle). This client calls media's
 * internal {@code POST /internal/platforms/refresh-and-warm} endpoint, which
 * refreshes the token if needed and re-populates the cache — after which
 * analytics re-reads the (now valid) token from Redis and retries the API call.</p>
 *
 * <p>Authenticated with the shared {@code X-Internal-Secret} header (same secret
 * as scheduler-service), not a user JWT.</p>
 */
@Component
public class MediaPlatformClient {

    private static final Logger log = LoggerFactory.getLogger(MediaPlatformClient.class);
    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";
    private static final String REFRESH_AND_WARM_PATH = "/internal/platforms/refresh-and-warm";

    private final RestClient restClient;
    private final String internalSecret;

    public MediaPlatformClient(
            @Value("${app.media-service.base-url}") String mediaServiceBaseUrl,
            @Value("${app.internal.secret}") String internalSecret) {
        this.restClient = RestClient.builder().baseUrl(mediaServiceBaseUrl).build();
        this.internalSecret = internalSecret;
    }

    /**
     * Ask media-service to refresh (if needed) and warm the Redis token cache for
     * the given owner + platform. Best-effort: returns {@code true} on 2xx, else
     * {@code false} (logged, never throws — the caller degrades gracefully).
     */
    public boolean refreshAndWarm(UUID ownerId, String platform) {
        try {
            restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path(REFRESH_AND_WARM_PATH)
                            .queryParam("ownerId", ownerId)
                            .queryParam("platform", platform)
                            .build())
                    .header(INTERNAL_SECRET_HEADER, internalSecret)
                    .retrieve()
                    .toBodilessEntity();
            log.info("MediaPlatformClient: refresh-and-warm OK — ownerId={} platform={}", ownerId, platform);
            return true;
        } catch (Exception e) {
            log.warn("MediaPlatformClient: refresh-and-warm failed — ownerId={} platform={} — {}",
                    ownerId, platform, e.getMessage());
            return false;
        }
    }
}
