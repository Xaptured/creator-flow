package com.creatorflow.auth_service.services;

import com.creatorflow.auth_service.dto.request.ProvisionUserRequest;
import com.creatorflow.auth_service.dto.request.UserPreferencesRequest;
import com.creatorflow.auth_service.dto.response.NichesResponse;
import com.creatorflow.auth_service.dto.response.TimezonesResponse;
import com.creatorflow.auth_service.dto.response.UserMeResponse;
import com.creatorflow.auth_service.dto.response.UserPreferencesResponse;
import com.creatorflow.auth_service.exception.UserNotFoundException;
import com.creatorflow.auth_service.model.User;
import com.creatorflow.auth_service.repository.NicheRepository;
import com.creatorflow.auth_service.repository.TimezoneRepository;
import com.creatorflow.auth_service.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final NicheRepository nicheRepository;
    private final TimezoneRepository timezoneRepository;

    /**
     * In-memory niche list loaded once at startup.
     * Avoids Redis serialization entirely for this effectively-static data.
     * Restart the service to pick up DB changes to the niches table.
     */
    private NichesResponse cachedNiches;

    /**
     * In-memory timezone list loaded once at startup.
     * Same rationale as niches — static reference data, no Redis needed.
     * Restart the service to pick up DB changes to the timezones table.
     */
    private TimezonesResponse cachedTimezones;

    public UserService(UserRepository userRepository, NicheRepository nicheRepository,
                       TimezoneRepository timezoneRepository) {
        this.userRepository = userRepository;
        this.nicheRepository = nicheRepository;
        this.timezoneRepository = timezoneRepository;
    }

    @PostConstruct
    void loadNiches() {
        List<String> names = nicheRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(com.creatorflow.auth_service.model.Niche::getName)
                .toList();
        cachedNiches = new NichesResponse(names);
        List<String> tzNames = timezoneRepository.findByActiveTrueOrderByDisplayOrderAsc()
                .stream()
                .map(com.creatorflow.auth_service.model.Timezone::getName)
                .toList();
        cachedTimezones = new TimezonesResponse(tzNames);
    }

    /**
     * Fetches user by internal UUID.
     * Cache key: userProfiles::<id>
     * TTL: 15 minutes (configured in RedisConfig)
     */
    @Cacheable(value = "userProfiles", key = "#id")
    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    /**
     * Upserts a user on first sign-in.
     * Idempotent — existing rows are returned unchanged.
     * ownerId is the Keycloak UUID (JWT sub), injected by the BFF — never from browser input.
     */
    @Transactional
    @CacheEvict(value = "userProfiles", key = "#request.ownerId().toString()")
    public UserMeResponse provisionUser(ProvisionUserRequest request) {
        String keycloakId = request.ownerId().toString();
        User user = userRepository.findByKeycloakId(keycloakId).orElseGet(() -> {
            User newUser = new User();
            newUser.setKeycloakId(keycloakId);
            newUser.setEmail(request.email());
            newUser.setRole(request.role());
            return userRepository.save(newUser);
        });
        return toMeResponse(user);
    }

    /**
     * Updates user profile and evicts the stale cache entry.
     */
    @CacheEvict(value = "userProfiles", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }

    /**
     * Returns the full preferences for the given owner (Keycloak UUID).
     */
    @Transactional(readOnly = true)
    public UserPreferencesResponse getPreferences(UUID ownerId) {
        String keycloakId = ownerId.toString();
        User user = userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new UserNotFoundException(keycloakId));
        return new UserPreferencesResponse(
                user.getEmail(), user.getTimezone(), user.getDisplayName(), user.getNiche());
    }

    /**
     * Updates timezone, displayName, and niche for the given owner.
     * Email is intentionally excluded — it is managed by Keycloak.
     * ownerId is injected by the BFF — never from browser input.
     */
    @Transactional
    @CacheEvict(value = "userProfiles", key = "#request.ownerId().toString()")
    public UserPreferencesResponse updatePreferences(UserPreferencesRequest request) {
        String keycloakId = request.ownerId().toString();
        User user = userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new UserNotFoundException(keycloakId));
        user.setTimezone(request.timezone());
        user.setDisplayName(request.displayName());
        user.setNiche(request.niche());
        userRepository.save(user);
        return new UserPreferencesResponse(
                user.getEmail(), user.getTimezone(), user.getDisplayName(), user.getNiche());
    }

    /**
     * Returns the cached niche list loaded at startup from the DB.
     * No Redis involved — avoids serialization issues for this static data.
     */
    public NichesResponse getNiches() {
        return cachedNiches;
    }

    /**
     * Returns the cached timezone list loaded at startup from the DB.
     * No Redis involved — avoids serialization issues for this static data.
     */
    public TimezonesResponse getTimezones() {
        return cachedTimezones;
    }

    private UserMeResponse toMeResponse(User user) {
        return new UserMeResponse(
                user.getId(),
                user.getKeycloakId(),
                user.getEmail(),
                user.getRole(),
                user.getTimezone(),
                user.getDisplayName(),
                user.getNiche()
        );
    }
}
