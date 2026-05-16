package com.creatorflow.auth_service.controllers;

import com.creatorflow.auth_service.dto.request.ProvisionUserRequest;
import com.creatorflow.auth_service.dto.request.UserPreferencesRequest;
import com.creatorflow.auth_service.dto.response.NichesResponse;
import com.creatorflow.auth_service.dto.response.UserPreferencesResponse;
import com.creatorflow.auth_service.dto.response.UserMeResponse;
import com.creatorflow.auth_service.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/user")
@Tag(name = "User", description = "User provisioning, profile preferences, and content niche lookup")
public class UserPreferencesController {

    private final UserService userService;

    public UserPreferencesController(UserService userService) {
        this.userService = userService;
    }

    @Operation(
            summary = "Provision user on first sign-in",
            description = "Idempotent upsert — creates the user row on first call, returns the existing row on subsequent calls. " +
                          "Called by the BFF immediately after Keycloak issues tokens. " +
                          "ownerId (Keycloak UUID) and email are injected server-side by the BFF — never trusted from the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User provisioned (created or already existed)",
                    content = @Content(schema = @Schema(implementation = UserMeResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/me")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<UserMeResponse> provisionUser(
            @Valid @RequestBody ProvisionUserRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.provisionUser(request));
    }

    @Operation(
            summary = "Get user preferences",
            description = "Returns the authenticated user's current timezone, display name, and content niche. " +
                          "ownerId is the Keycloak UUID (JWT sub), injected server-side by the BFF."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Preferences returned",
                    content = @Content(schema = @Schema(implementation = UserPreferencesResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "User record not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/preferences")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<UserPreferencesResponse> getPreferences(
            @Parameter(description = "Keycloak UUID of the authenticated user (injected by BFF)", required = true)
            @RequestParam UUID ownerId
    ) {
        return ResponseEntity.ok(userService.getPreferences(ownerId));
    }

    @Operation(
            summary = "Update user preferences",
            description = "Saves timezone, display name, and content niche for the authenticated user. " +
                          "Email is intentionally excluded — it is managed by Keycloak and cannot be changed here. " +
                          "ownerId is injected server-side by the BFF."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Preferences updated",
                    content = @Content(schema = @Schema(implementation = UserPreferencesResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error (e.g. blank timezone, value too long)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "User record not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PatchMapping("/preferences")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<UserPreferencesResponse> updatePreferences(
            @Valid @RequestBody UserPreferencesRequest request
    ) {
        return ResponseEntity.ok(userService.updatePreferences(request));
    }

    @Operation(
            summary = "List available content niches",
            description = "Returns the ordered list of valid content niche values. " +
                          "Use this to populate the niche dropdown in the Settings UI."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Niche list returned",
                    content = @Content(schema = @Schema(implementation = NichesResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/niches")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<NichesResponse> getNiches(
            @Parameter(description = "Keycloak UUID of the authenticated user (injected by BFF)", required = true)
            @RequestParam UUID ownerId
    ) {
        return ResponseEntity.ok(userService.getNiches());
    }
}
