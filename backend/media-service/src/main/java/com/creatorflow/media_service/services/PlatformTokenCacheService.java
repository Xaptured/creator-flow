package com.creatorflow.media_service.services;

import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

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
     * Call this when a creator disconnects a platform.
     * Evicts the cached token immediately so stale data is never served.
     *
     * Cache key evicted: platformTokens::<ownerId>::<platform>
     */
    @CacheEvict(value = "platformTokens", key = "#ownerId + '::' + #platform")
    public void evictPlatformToken(UUID ownerId, String platform) {
        // Annotation handles the eviction — no DB operation needed
    }
}
