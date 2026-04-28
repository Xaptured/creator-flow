package com.creatorflow.media_service.services;

import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Validates that @Cacheable / @CacheEvict on PlatformTokenCacheService work correctly.
 *
 * Uses spring.cache.type=simple (see test/resources/application.yml) so no
 * Redis instance is required. The repository is mocked with Mockito so no
 * database is required either.
 *
 * Cache key format under test: platformTokens::<ownerId>::<platform>
 *
 * What we verify:
 *  - First getPlatformAccount call hits repository (cache MISS)
 *  - Second call does NOT hit repository (cache HIT)
 *  - refreshAndCacheToken() evicts the stale entry
 *  - evictPlatformToken() evicts without a DB operation
 *  - Different owner+platform combos are cached independently
 */
@SpringBootTest
class PlatformTokenCacheServiceTest {

    @Autowired
    private PlatformTokenCacheService platformTokenCacheService;

    @Autowired
    private CacheManager cacheManager;

    @MockitoBean
    private PlatformAccountRepository platformAccountRepository;

    private UUID ownerId;
    private PlatformAccount youtubeAccount;

    @BeforeEach
    void setUp() {
        Cache cache = cacheManager.getCache("platformTokens");
        if (cache != null) {
            cache.clear();
        }

        ownerId = UUID.randomUUID();

        youtubeAccount = new PlatformAccount();
        youtubeAccount.setId(UUID.randomUUID());
        youtubeAccount.setOwnerId(ownerId);
        youtubeAccount.setPlatform(PlatformType.YOUTUBE);
        youtubeAccount.setAccessToken("ya29.initial-token");
    }

    // -------------------------------------------------------------------------
    // getPlatformAccount — @Cacheable
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getPlatformAccount: first call hits repository (cache MISS)")
    void getPlatformAccount_firstCall_hitsRepository() {
        when(platformAccountRepository.findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE))
                .thenReturn(Optional.of(youtubeAccount));

        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE");

        verify(platformAccountRepository, times(1))
                .findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE);
    }

    @Test
    @DisplayName("getPlatformAccount: second call skips repository (cache HIT)")
    void getPlatformAccount_secondCall_doesNotHitRepository() {
        when(platformAccountRepository.findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE))
                .thenReturn(Optional.of(youtubeAccount));

        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE"); // MISS
        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE"); // HIT

        verify(platformAccountRepository, times(1))
                .findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE);
    }

    @Test
    @DisplayName("getPlatformAccount: result is present in cache after first call")
    void getPlatformAccount_firstCall_populatesCache() {
        when(platformAccountRepository.findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE))
                .thenReturn(Optional.of(youtubeAccount));

        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE");

        String expectedKey = ownerId + "::YOUTUBE";
        Cache cache = cacheManager.getCache("platformTokens");
        assertThat(cache).isNotNull();
        assertThat(cache.get(expectedKey)).isNotNull();
    }

    @Test
    @DisplayName("getPlatformAccount: different owner+platform pairs cached independently")
    void getPlatformAccount_differentKeys_cachedIndependently() {
        UUID otherOwnerId = UUID.randomUUID();
        PlatformAccount instagramAccount = new PlatformAccount();
        instagramAccount.setId(UUID.randomUUID());
        instagramAccount.setOwnerId(otherOwnerId);
        instagramAccount.setPlatform(PlatformType.INSTAGRAM);
        instagramAccount.setAccessToken("ig-token");

        when(platformAccountRepository.findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE))
                .thenReturn(Optional.of(youtubeAccount));
        when(platformAccountRepository.findByOwnerIdAndPlatform(otherOwnerId, PlatformType.INSTAGRAM))
                .thenReturn(Optional.of(instagramAccount));

        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE");
        platformTokenCacheService.getPlatformAccount(otherOwnerId, "INSTAGRAM");

        // Each unique owner+platform combo calls the repository once
        verify(platformAccountRepository, times(1))
                .findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE);
        verify(platformAccountRepository, times(1))
                .findByOwnerIdAndPlatform(otherOwnerId, PlatformType.INSTAGRAM);

        // Repeated calls for each hit cache
        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE");
        platformTokenCacheService.getPlatformAccount(otherOwnerId, "INSTAGRAM");

        verify(platformAccountRepository, times(1))
                .findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE);
        verify(platformAccountRepository, times(1))
                .findByOwnerIdAndPlatform(otherOwnerId, PlatformType.INSTAGRAM);
    }

    // -------------------------------------------------------------------------
    // refreshAndCacheToken — @CacheEvict
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("refreshAndCacheToken: evicts stale entry so next call hits repository")
    void refreshAndCacheToken_evictsCacheEntry() {
        when(platformAccountRepository.findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE))
                .thenReturn(Optional.of(youtubeAccount));
        when(platformAccountRepository.save(any(PlatformAccount.class)))
                .thenReturn(youtubeAccount);

        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE"); // MISS — populates cache
        platformTokenCacheService.refreshAndCacheToken(ownerId, "YOUTUBE", "ya29.refreshed-token"); // evicts

        // Cache entry must be gone
        String expectedKey = ownerId + "::YOUTUBE";
        Cache cache = cacheManager.getCache("platformTokens");
        assertThat(cache).isNotNull();
        assertThat(cache.get(expectedKey)).isNull();

        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE"); // MISS again

        // findByOwnerIdAndPlatform called: initial load + inside refreshAndCacheToken + after eviction = 3
        verify(platformAccountRepository, times(3))
                .findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE);
    }

    // -------------------------------------------------------------------------
    // evictPlatformToken — @CacheEvict, no DB op
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("evictPlatformToken: evicts cache without touching repository")
    void evictPlatformToken_evictsCacheWithoutDbCall() {
        when(platformAccountRepository.findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE))
                .thenReturn(Optional.of(youtubeAccount));

        platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE"); // populate cache
        platformTokenCacheService.evictPlatformToken(ownerId, "YOUTUBE"); // evict only

        // No save should have been called
        verify(platformAccountRepository, never()).save(any());

        // Cache entry gone
        String expectedKey = ownerId + "::YOUTUBE";
        Cache cache = cacheManager.getCache("platformTokens");
        assertThat(cache).isNotNull();
        assertThat(cache.get(expectedKey)).isNull();
    }
}
