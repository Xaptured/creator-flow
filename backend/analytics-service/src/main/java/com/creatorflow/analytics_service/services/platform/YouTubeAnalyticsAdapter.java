package com.creatorflow.analytics_service.services.platform;

import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.services.PlatformAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Fetches YouTube Analytics metrics for published content.
 *
 * <p>OAuth access token is read from Redis at key
 * {@code oauth:{ownerId}:youtube:access_token} — written by scheduler-service's
 * TokenRefreshJob. Returns zero-valued metrics when the token is absent or the
 * API call fails, so the snapshot row is still persisted and the analytics
 * pipeline is not blocked.</p>
 *
 * <p><strong>TODO (CF-99):</strong> Replace stub with real YouTube Analytics Data API v2 call
 * once API credentials are provisioned.</p>
 */
@Component
public class YouTubeAnalyticsAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(YouTubeAnalyticsAdapter.class);
    private static final String TOKEN_KEY_PATTERN = "oauth:%s:youtube:access_token";

    private final StringRedisTemplate redisTemplate;

    public YouTubeAnalyticsAdapter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public PlatformType platform() {
        return PlatformType.YOUTUBE;
    }

    @Override
    public PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId) {
        String tokenKey = String.format(TOKEN_KEY_PATTERN, ownerId);
        String accessToken = redisTemplate.opsForValue().get(tokenKey);

        if (accessToken == null || accessToken.isBlank()) {
            log.warn("YouTube OAuth token missing for owner {} — returning zero metrics", ownerId);
            return PlatformMetrics.of(0L, 0L, 0L, 0L);
        }

        // TODO: call YouTube Analytics Data API v2 using accessToken
        // For now return stub zeros so the pipeline keeps running
        log.info("YouTube metrics fetch stub — contentId: {}, ownerId: {}", contentId, ownerId);
        return PlatformMetrics.of(0L, 0L, 0L, 0L);
    }
}
