package com.creatorflow.auth_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for PATCH /v1.0/api/user/preferences.
 *
 * - ownerId: Keycloak UUID (JWT sub) — injected server-side by the BFF, never from browser
 * - timezone: required IANA timezone string (e.g. "Asia/Kolkata")
 * - displayName: optional profile display name (not email — email is Keycloak-managed)
 * - niche: optional content category (e.g. "Gaming", "Travel")
 */
public record UserPreferencesRequest(

        @NotNull(message = "ownerId must not be null")
        UUID ownerId,

        @NotBlank(message = "Timezone must not be blank")
        @Size(max = 64, message = "Timezone must be at most 64 characters")
        String timezone,

        @Size(max = 255, message = "Display name must be at most 255 characters")
        String displayName,

        @Size(max = 100, message = "Niche must be at most 100 characters")
        String niche
) {}
