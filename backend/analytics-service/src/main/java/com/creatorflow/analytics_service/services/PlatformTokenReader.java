package com.creatorflow.analytics_service.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Reads OAuth access tokens written by media-service's {@code PlatformTokenCacheService}.
 *
 * <p>media-service uses Spring's {@code @Cacheable(value = "platformTokens")} with key
 * {@code #ownerId + '::' + #platform}, which Spring RedisCacheManager stores under the
 * Redis key: {@code platformTokens::<ownerId>::<PLATFORM>}.</p>
 *
 * <p>The value is a JSON string containing a serialised {@code PlatformAccount} with a
 * {@code @class} type hint. We use {@link StringRedisTemplate} to read the raw JSON string
 * and extract only the {@code accessToken} field with a plain {@link ObjectMapper} —
 * deliberately bypassing type resolution so analytics-service never needs
 * {@code com.creatorflow.media_service.model.PlatformAccount} on its classpath.</p>
 *
 * <p>Key format examples:
 * <pre>
 *   platformTokens::0ecd8f51-7751-49b5-9162-0cf960cdb0c5::TWITTER
 *   platformTokens::0ecd8f51-7751-49b5-9162-0cf960cdb0c5::INSTAGRAM
 *   platformTokens::0ecd8f51-7751-49b5-9162-0cf960cdb0c5::YOUTUBE
 * </pre>
 * </p>
 */
@Service
public class PlatformTokenReader {

    private static final Logger log = LoggerFactory.getLogger(PlatformTokenReader.class);

    private static final String KEY_PATTERN = "platformTokens::%s::%s";

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public PlatformTokenReader(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Returns the OAuth access token for the given owner + platform, or {@code null}
     * if the cache entry is absent or cannot be parsed.
     *
     * @param ownerId  UUID of the content owner
     * @param platform platform name in uppercase, e.g. {@code "TWITTER"}
     */
    public String getAccessToken(UUID ownerId, String platform) {
        String key = String.format(KEY_PATTERN, ownerId, platform.toUpperCase());
        try {
            String raw = stringRedisTemplate.opsForValue().get(key);
            if (raw == null) {
                log.debug("platformTokens cache miss — key: {}", key);
                return null;
            }

            JsonNode node = objectMapper.readTree(raw);

            JsonNode tokenNode = node.path("accessToken");
            if (tokenNode.isMissingNode() || tokenNode.isNull()) {
                log.warn("accessToken field missing in cached PlatformAccount — key: {}", key);
                return null;
            }

            return tokenNode.asText();
        } catch (Exception e) {
            log.error("Failed to read/parse platform token from Redis — key: {}, error: {}", key, e.getMessage());
            return null;
        }
    }
}
