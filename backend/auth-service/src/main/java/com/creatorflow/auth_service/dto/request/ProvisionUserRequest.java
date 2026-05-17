package com.creatorflow.auth_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Request body for POST /v1.0/api/user/me.
 * Called by the BFF on first sign-in to upsert the user row.
 *
 * - ownerId: Keycloak UUID (JWT sub) — injected server-side by the BFF, never from browser
 * - email: taken from the Keycloak token; stored for display but never editable
 * - role: defaults to CREATOR if not provided
 */
public record ProvisionUserRequest(

        @NotNull(message = "ownerId must not be null")
        UUID ownerId,

        @NotBlank(message = "Email must not be blank")
        @Email(message = "Email must be valid")
        String email,

        String role
) {
    public ProvisionUserRequest {
        if (role == null || role.isBlank()) {
            role = "CREATOR";
        }
    }
}
