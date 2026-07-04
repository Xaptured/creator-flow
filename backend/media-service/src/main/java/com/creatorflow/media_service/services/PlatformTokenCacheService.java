package com.creatorflow.media_service.services;

import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PlatformTokenCacheService {

    private static final String TOKEN_CACHE = "platformTokens";

    private final PlatformAccountRepository platformAccountRepository;
    private final CacheManager cacheManager;

    public PlatformTokenCacheService(PlatformAccountRepository platformAccountRepository,
                                     CacheManager cacheManager) {
        this.platformAccountRepository = platformAccountRepository;
        this.cacheManager = cacheManager;
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
     * Puts an already-loaded {@link PlatformAccount} into the token cache directly.
     *
     * <p>Used by OAuth {@code handleCallback} at connect: the caller passes the
     * account it just saved, so we do NOT re-read the DB. This avoids the
     * transaction-visibility trap — the caller's save is not yet committed, so a
     * fresh DB read (especially in a new transaction) would not see the row.</p>
     *
     * <p>Uses the same key format as {@code @Cacheable} (ownerId + "::" + platform).
     * We call {@code cacheManager} directly rather than a {@code @Cacheable}
     * method because Spring AOP does not intercept self-invocation.</p>
     */
    public void putInCache(UUID ownerId, String platform, PlatformAccount account) {
        Cache cache = cacheManager.getCache(TOKEN_CACHE);
        if (cache != null) {
            cache.put(ownerId + "::" + platform, account);
        }
    }

    /**
     * Reads the account from the DB and populates the cache. Safe only when the
     * account is already committed — used by the on-demand refresh+warm path
     * (analytics fallback), where the refresh transaction has committed first.
     * For connect, use {@link #putInCache} with the freshly saved account instead.
     */
    @Transactional(readOnly = true)
    public void warmCache(UUID ownerId, String platform) {
        PlatformType platformType = PlatformType.valueOf(platform.toUpperCase());
        PlatformAccount account = platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, platformType)
                .orElseThrow(() -> new PlatformNotConnectedException(
                        platform + " not connected for user: " + ownerId));
        putInCache(ownerId, platform, account);
    }
}
