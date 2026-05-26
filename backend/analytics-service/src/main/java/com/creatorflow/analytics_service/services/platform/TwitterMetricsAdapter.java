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
 * Fetches Twitter/X metrics for published content.
 *
 * <p>OAuth access token is read from Redis at key
 * {@code oauth:{ownerId}:twitter:access_token} — written by scheduler-service's
 * TokenRefreshJob.</p>
 *
 * <p><strong>TODO (CF-101):</strong> Replace stub with real Twitter API v2 Tweet Metrics call
 * once API credentials are provisioned.</p>
 */
@Component
public class TwitterMetricsAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(TwitterMetricsAdapter.class);
    private static final String TOKEN_KEY_PATTERN = "oauth:%s:twitter:access_token";

    private final StringRedisTemplate redisTemplate;

    public TwitterMetricsAdapter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public PlatformType platform() {
        return PlatformType.TWITTER;
    }

    @Override
    public PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId, String platformPostId) {
        String tokenKey = String.format(TOKEN_KEY_PATTERN, ownerId);
        String accessToken = redisTemplate.opsForValue().get(tokenKey);

        if (accessToken == null || accessToken.isBlank()) {
            log.warn("Twitter OAuth token missing for owner {} — returning zero metrics", ownerId);
            return PlatformMetrics.of(0L, 0L, 0L, 0L);
        }

        // TODO (CF-101): call Twitter API v2 GET /2/tweets/{platformPostId}?tweet.fields=public_metrics using accessToken
        log.info("Twitter metrics fetch stub — contentId: {}, ownerId: {}, tweetId: {}", contentId, ownerId, platformPostId);
        return PlatformMetrics.of(0L, 0L, 0L, 0L);
    }
}
