package com.creatorflow.auth_service.dto.response;

import java.util.UUID;

/**
 * Response shape for POST /v1.0/api/user/me.
 * Returns the upserted user's internal ID and basic profile.
 */
public record UserMeResponse(
        UUID id,
        String keycloakId,
        String email,
        String role,
        String timezone,
        String displayName,
        String niche
) {}
