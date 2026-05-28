package com.creatorflow.media_service.services;

import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PlatformTokenCacheService {

    private final PlatformAccountRepository platformAccountRepository;

    public PlatformTokenCacheService(PlatformAccountRepository platformAccountRepository) {
        this.platformAccountRepository = platformAccountRepository;
    }

    /**
     * Fetches the platform account (including OAuth access token) for a given
     * owner + platform combination.
     *
     * Cache key format: platformTokens::<ownerId>::YOUTUBE
     *                   platformTokens::<ownerId>::INSTAGRAM
     *                   platformTokens::<ownerId>::TWITTER
     *
     * TTL: 55 minutes (configured in RedisConfig).
     * Cache HIT: returns from Redis — no DB call.
     * Cache MISS: hits DB, stores result in Redis.
     *
     * Called by: post dispatcher, media upload handlers, platform status checks.
     */
    @Cacheable(value = "platformTokens", key = "#ownerId + '::' + #platform")
    public PlatformAccount getPlatformAccount(UUID ownerId, String platform) {
        PlatformType platformType = PlatformType.valueOf(platform.toUpperCase());
        return platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, platformType)
                .orElseThrow(() -> new PlatformNotConnectedException(
                        platform + " not connected for user: " + ownerId));
    }

    /**
     * Evicts the cached token immediately so stale data is never served.
     * Call when a creator disconnects a platform or after a token refresh.
     *
     * Cache key evicted: platformTokens::<ownerId>::<platform>
     */
    @CacheEvict(value = "platformTokens", key = "#ownerId + '::' + #platform")
    public void evictPlatformToken(UUID ownerId, String platform) {
        // Annotation handles the eviction — no DB operation needed
    }

    /**
     * Evicts then immediately re-populates the cache from the DB.
     *
     * <p>Must be called AFTER the caller's transaction has committed — hence
     * {@code REQUIRES_NEW}: this opens a fresh transaction that is guaranteed to
     * see the row written by the caller. Calling {@link #getPlatformAccount} from
     * inside the caller's own {@code @Transactional} method would read an
     * uncommitted row and potentially cache stale or absent data.</p>
     *
     * <p>Called by OAuth {@code handleCallback} implementations for all three
     * platforms immediately after connect, so that analytics-service can read the
     * token from Redis without waiting for a media-service publish call to warm it.</p>
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void warmCache(UUID ownerId, String platform) {
        evictPlatformToken(ownerId, platform);
        getPlatformAccount(ownerId, platform);
    }
}
