package com.creatorflow.auth_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserPreferencesRequest(

        @NotBlank(message = "Timezone must not be blank")
        @Size(max = 64, message = "Timezone must be at most 64 characters")
        String timezone
) {}
