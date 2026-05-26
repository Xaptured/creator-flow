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
 * Fetches Instagram Insights metrics for published content.
 *
 * <p>OAuth access token is read from Redis at key
 * {@code oauth:{ownerId}:instagram:access_token} — written by scheduler-service's
 * TokenRefreshJob.</p>
 *
 * <p><strong>TODO (CF-100):</strong> Replace stub with real Instagram Graph API Insights call
 * once API credentials are provisioned.</p>
 */
@Component
public class InstagramInsightsAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(InstagramInsightsAdapter.class);
    private static final String TOKEN_KEY_PATTERN = "oauth:%s:instagram:access_token";

    private final StringRedisTemplate redisTemplate;

    public InstagramInsightsAdapter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public PlatformType platform() {
        return PlatformType.INSTAGRAM;
    }

    @Override
    public PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId) {
        String tokenKey = String.format(TOKEN_KEY_PATTERN, ownerId);
        String accessToken = redisTemplate.opsForValue().get(tokenKey);

        if (accessToken == null || accessToken.isBlank()) {
            log.warn("Instagram OAuth token missing for owner {} — returning zero metrics", ownerId);
            return PlatformMetrics.of(0L, 0L, 0L, 0L);
        }

        // TODO: call Instagram Graph API /media/{id}/insights
        log.info("Instagram metrics fetch stub — contentId: {}, ownerId: {}", contentId, ownerId);
        return PlatformMetrics.of(0L, 0L, 0L, 0L);
    }
}
