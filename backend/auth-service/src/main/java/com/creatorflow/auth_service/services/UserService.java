package com.creatorflow.auth_service.services;

import com.creatorflow.auth_service.model.User;
import com.creatorflow.auth_service.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Fetches user by internal UUID.
     * Cache key: userProfiles::<id>
     * TTL: 15 minutes (configured in RedisConfig)
     * Cache HIT: returns from Redis, no DB call.
     * Cache MISS: hits DB, stores result in Redis.
     */
    @Cacheable(value = "userProfiles", key = "#id")
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    /**
     * Fetches user by Keycloak subject claim (the 'sub' from JWT).
     * Cache key: userProfiles::<keycloakId>
     * Creates the user if not found (first login flow).
     * unless guard prevents caching null (should not happen, but safe).
     */
    @Cacheable(value = "userProfiles", key = "#keycloakId", unless = "#result == null")
    public User findOrCreateByKeycloakId(String keycloakId, String email, String role) {
        return userRepository.findByKeycloakId(keycloakId)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setKeycloakId(keycloakId);
                    newUser.setEmail(email);
                    newUser.setRole(role);
                    return userRepository.save(newUser);
                });
    }

    /**
     * Updates user profile and evicts the stale cache entry.
     * Cache key evicted: userProfiles::<user.id>
     * Next call to getUserById will repopulate from DB.
     */
    @CacheEvict(value = "userProfiles", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
