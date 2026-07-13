package com.creatorflow.auth_service.dto.response;

/**
 * Response shape for GET and PATCH /v1.0/api/user/preferences.
 *
 * - email: read-only, sourced from Keycloak — displayed in UI but cannot be changed here
 * - timezone: IANA timezone string (e.g. "Asia/Kolkata")
 * - displayName: user's chosen display name (nullable until first profile save)
 * - niche: content category (nullable until first profile save)
 * - region: trending region code (ISO 3166-1 alpha-2, defaults to "US")
 */
public record UserPreferencesResponse(
        String email,
        String timezone,
        String displayName,
        String niche,
        String region
) {}
