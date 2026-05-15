package com.creatorflow.auth_service.controllers;

import com.creatorflow.auth_service.dto.request.UpdateUserPreferencesRequest;
import com.creatorflow.auth_service.dto.response.UserPreferencesResponse;
import com.creatorflow.auth_service.services.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1.0/api/user/preferences")
public class UserPreferencesController {

    private final UserService userService;

    public UserPreferencesController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<UserPreferencesResponse> getPreferences(
            @AuthenticationPrincipal Jwt jwt
    ) {
        String keycloakId = jwt.getSubject();
        return ResponseEntity.ok(userService.getPreferences(keycloakId));
    }

    @PatchMapping
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<UserPreferencesResponse> updatePreferences(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateUserPreferencesRequest request
    ) {
        String keycloakId = jwt.getSubject();
        return ResponseEntity.ok(userService.updateTimezone(keycloakId, request.timezone()));
    }
}
