package com.creatorflow.media_service.dto.response;

import java.time.Instant;

/**
 * Response body returned by the internal token refresh endpoint.
 * Consumed by the scheduler-service TokenRefreshJob.
 */
public record TokenRefreshResponse(
        int attempted,
        int succeeded,
        int failed,
        Instant refreshedAt
) {
    public static TokenRefreshResponse of(int attempted, int succeeded, int failed) {
        return new TokenRefreshResponse(attempted, succeeded, failed, Instant.now());
    }
}
