package com.creatorflow.auth_service.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String keycloakId) {
        super("User not found for keycloakId: " + keycloakId);
    }
}
