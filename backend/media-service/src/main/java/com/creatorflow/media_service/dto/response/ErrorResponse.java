package com.creatorflow.media_service.dto.response;

import java.time.Instant;

public record ErrorResponse(
        String code,
        int status,
        String message,
        Instant timestamp
) {
    public static ErrorResponse of(String code, int status, String message) {
        return new ErrorResponse(code, status, message, Instant.now());
    }
}
