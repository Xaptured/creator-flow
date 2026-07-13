package com.creatorflow.auth_service.exception;

public class InvalidRegionException extends RuntimeException {

    public InvalidRegionException(String region) {
        super("Unknown or inactive region: " + region);
    }
}
