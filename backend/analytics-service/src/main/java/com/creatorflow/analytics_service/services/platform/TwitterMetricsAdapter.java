package com.creatorflow.analytics_service.services.platform;

import com.creatorflow.analytics_service.configuration.TwitterProperties;
import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.services.PlatformAdapter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Fetches Twitter/X metrics via Twitter API v2 Tweet lookup endpoint.
 *
 * <p>Endpoint: {@code GET /2/tweets/{tweetId}?tweet.fields=public_metrics} with Bearer token
 * read from Redis ({@code oauth:{ownerId}:twitter:access_token}), written by
 * scheduler-service's TokenRefreshJob.</p>
 *
 * <p>Metrics fetched from {@code public_metrics}:
 * {@code impression_count, like_count, reply_count, retweet_count, quote_count}.</p>
 *
 * <p>Mapping:
 * <ul>
 *   <li>views = impression_count</li>
 *   <li>likes = like_count</li>
 *   <li>comments = reply_count</li>
 *   <li>impressions = impression_count</li>
 *   <li>engagementRate = (like_count + reply_count) / impression_count</li>
 * </ul>
 * </p>
 *
 * <p>Resilience contract: any API failure (token absent, 401, 429, network error)
 * returns zero-valued {@link PlatformMetrics} — no exception is propagated so the
 * analytics pipeline is never blocked by a single failed platform call.</p>
 */
@Component
public class TwitterMetricsAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(TwitterMetricsAdapter.class);

    private static final String TOKEN_KEY_PATTERN = "oauth:%s:twitter:access_token";
    private static final String TWEETS_PATH = "/2/tweets/";
    private static final String TWEET_FIELDS_PARAM = "?tweet.fields=public_metrics";

    private static final PlatformMetrics ZERO_METRICS = PlatformMetrics.of(0L, 0L, 0L, 0L);

    private final StringRedisTemplate redisTemplate;
    private final HttpClient httpClient;
    private final TwitterProperties twitterProperties;
    private final ObjectMapper objectMapper;

    public TwitterMetricsAdapter(
            StringRedisTemplate redisTemplate,
            @Qualifier("twitterHttpClient") HttpClient httpClient,
            TwitterProperties twitterProperties,
            ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.httpClient = httpClient;
        this.twitterProperties = twitterProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public PlatformType platform() {
        return PlatformType.TWITTER;
    }

    /**
     * Fetches public_metrics for {@code platformPostId} (the Twitter tweet ID).
     * Returns {@link #ZERO_METRICS} on any error.
     */
    @Override
    public PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId, String platformPostId) {
        String tokenKey = String.format(TOKEN_KEY_PATTERN, ownerId);
        String accessToken = redisTemplate.opsForValue().get(tokenKey);

        if (accessToken == null || accessToken.isBlank()) {
            log.warn("Twitter OAuth token missing for owner {} — returning zero metrics", ownerId);
            return ZERO_METRICS;
        }

        if (platformPostId == null || platformPostId.isBlank()) {
            log.warn("Twitter platformPostId (tweetId) missing for contentId {} — returning zero metrics", contentId);
            return ZERO_METRICS;
        }

        try {
            return callTwitterApi(accessToken, platformPostId, contentId, ownerId);
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.error("Twitter API v2 network error for contentId {}, ownerId {}: {}",
                    contentId, ownerId, e.getMessage());
            return ZERO_METRICS;
        }
    }

    private PlatformMetrics callTwitterApi(
            String accessToken, String tweetId, UUID contentId, UUID ownerId)
            throws IOException, InterruptedException {

        URI uri = buildTweetUri(tweetId);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();

        if (status == 401) {
            log.warn("Twitter token expired for owner {} (contentId: {}) — returning zero metrics. "
                    + "scheduler-service TokenRefreshJob will refresh the token.", ownerId, contentId);
            return ZERO_METRICS;
        }

        if (status == 429) {
            log.warn("Twitter API rate limit hit for owner {} (contentId: {}) — returning zero metrics.",
                    ownerId, contentId);
            return ZERO_METRICS;
        }

        if (status != 200) {
            log.error("Twitter API v2 returned unexpected status {} for contentId {}, ownerId {} — returning zero metrics",
                    status, contentId, ownerId);
            return ZERO_METRICS;
        }

        return parseMetrics(response.body(), contentId, ownerId);
    }

    /**
     * Builds the Twitter API v2 tweet lookup URI.
     *
     * <p>Example:
     * {@code GET /2/tweets/{tweetId}?tweet.fields=public_metrics}</p>
     */
    private URI buildTweetUri(String tweetId) {
        return URI.create(twitterProperties.getApiBaseUrl()
                + TWEETS_PATH
                + tweetId
                + TWEET_FIELDS_PARAM);
    }

    /**
     * Parses the Twitter API v2 tweet lookup response.
     *
     * <p>Response shape:
     * <pre>
     * {
     *   "data": {
     *     "id": "1234567890",
     *     "text": "...",
     *     "public_metrics": {
     *       "retweet_count": 10,
     *       "reply_count": 5,
     *       "like_count": 100,
     *       "quote_count": 3,
     *       "impression_count": 5000
     *     }
     *   }
     * }
     * </pre>
     * Mapping: views=impression_count, likes=like_count, comments=reply_count,
     * impressions=impression_count. engagementRate computed by {@link PlatformMetrics#of}.</p>
     */
    private PlatformMetrics parseMetrics(String responseBody, UUID contentId, UUID ownerId) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode publicMetrics = root.path("data").path("public_metrics");

            if (publicMetrics.isMissingNode()) {
                log.info("Twitter API: no public_metrics in response for contentId {}, ownerId {} — returning zero metrics",
                        contentId, ownerId);
                return ZERO_METRICS;
            }

            long impressionCount = publicMetrics.path("impression_count").asLong(0L);
            long likeCount       = publicMetrics.path("like_count").asLong(0L);
            long replyCount      = publicMetrics.path("reply_count").asLong(0L);

            log.info("Twitter metrics fetched for contentId {}: impressions={}, likes={}, replies={}",
                    contentId, impressionCount, likeCount, replyCount);

            // views = impression_count (total impressions served)
            // impressions = impression_count
            // comments = reply_count (closest equivalent to comment engagement)
            return PlatformMetrics.of(impressionCount, likeCount, replyCount, impressionCount);

        } catch (Exception e) {
            log.error("Failed to parse Twitter API v2 response for contentId {}, ownerId {}: {}",
                    contentId, ownerId, e.getMessage());
            return ZERO_METRICS;
        }
    }
}
