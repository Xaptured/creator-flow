package com.creatorflow.auth_service.services;

import com.creatorflow.auth_service.model.User;
import com.creatorflow.auth_service.repository.UserRepository;
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
 * Validates that @Cacheable / @CacheEvict on UserService work correctly.
 *
 * Uses spring.cache.type=simple (see test/resources/application.yml) so no
 * Redis instance is required. The repository is mocked with Mockito so no
 * database is required either.
 *
 * What we verify:
 *  - First call hits the repository (cache MISS)
 *  - Second call does NOT hit the repository (cache HIT)
 *  - updateUser() evicts the cache entry (next call is a cache MISS again)
 *  - findOrCreateByKeycloakId caches on keycloakId key
 */
@SpringBootTest
class UserServiceCacheTest {

    @Autowired
    private UserService userService;

    @Autowired
    private CacheManager cacheManager;

    @MockitoBean
    private UserRepository userRepository;

    private UUID userId;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Clear cache between tests so they don't bleed into each other
        Cache cache = cacheManager.getCache("userProfiles");
        if (cache != null) {
            cache.clear();
        }

        userId = UUID.randomUUID();
        testUser = new User();
        testUser.setId(userId);
        testUser.setKeycloakId("kc-sub-123");
        testUser.setEmail("test@creatorflow.com");
        testUser.setRole("CREATOR");
    }

    // -------------------------------------------------------------------------
    // getUserById
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getUserById: first call hits repository (cache MISS)")
    void getUserById_firstCall_hitsRepository() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        userService.getUserById(userId);

        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    @DisplayName("getUserById: second call skips repository (cache HIT)")
    void getUserById_secondCall_doesNotHitRepository() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        userService.getUserById(userId); // MISS — populates cache
        userService.getUserById(userId); // HIT  — served from cache

        // Repository must have been called exactly once despite two service calls
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    @DisplayName("getUserById: result is present in cache after first call")
    void getUserById_firstCall_populatesCache() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        userService.getUserById(userId);

        Cache cache = cacheManager.getCache("userProfiles");
        assertThat(cache).isNotNull();
        assertThat(cache.get(userId)).isNotNull();
    }

    // -------------------------------------------------------------------------
    // updateUser — @CacheEvict
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("updateUser: evicts cache so next getUserById hits repository again")
    void updateUser_evictsCacheEntry() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(userRepository.save(testUser)).thenReturn(testUser);

        userService.getUserById(userId); // MISS — populates cache
        userService.updateUser(testUser); // should evict userProfiles::<userId>

        // Cache entry must be gone after eviction
        Cache cache = cacheManager.getCache("userProfiles");
        assertThat(cache).isNotNull();
        assertThat(cache.get(userId)).isNull();

        userService.getUserById(userId); // MISS again — must hit repository

        // Repository called on first load + after eviction = 2 times
        verify(userRepository, times(2)).findById(userId);
    }

    // -------------------------------------------------------------------------
    // findOrCreateByKeycloakId — @Cacheable on keycloakId key
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("findOrCreateByKeycloakId: second call skips repository (cache HIT)")
    void findOrCreateByKeycloakId_secondCall_doesNotHitRepository() {
        String keycloakId = "kc-sub-123";
        when(userRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.of(testUser));

        userService.findOrCreateByKeycloakId(keycloakId, "test@creatorflow.com", "CREATOR");
        userService.findOrCreateByKeycloakId(keycloakId, "test@creatorflow.com", "CREATOR");

        verify(userRepository, times(1)).findByKeycloakId(keycloakId);
    }

    @Test
    @DisplayName("findOrCreateByKeycloakId: creates and caches new user when not found")
    void findOrCreateByKeycloakId_newUser_createsAndCaches() {
        String keycloakId = "kc-new-user";
        when(userRepository.findByKeycloakId(keycloakId)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        User result = userService.findOrCreateByKeycloakId(keycloakId, "new@creatorflow.com", "CREATOR");

        assertThat(result).isNotNull();
        verify(userRepository, times(1)).save(any(User.class));

        // Second call should hit cache, not create again
        userService.findOrCreateByKeycloakId(keycloakId, "new@creatorflow.com", "CREATOR");
        verify(userRepository, times(1)).findByKeycloakId(keycloakId); // still 1
    }
}
