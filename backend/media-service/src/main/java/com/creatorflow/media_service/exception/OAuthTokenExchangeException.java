package com.creatorflow.media_service.exception;

/**
 * Thrown when an OAuth token exchange or refresh call fails.
 *
 * {@code invalidGrant = true} when Google returns {@code invalid_grant} —
 * the refresh token is permanently revoked and the user must reconnect.
 * Callers should treat this as a terminal failure (no retry).
 */
public class OAuthTokenExchangeException extends RuntimeException {

    private final boolean invalidGrant;

    public OAuthTokenExchangeException(String message) {
        super(message);
        this.invalidGrant = false;
    }

    public OAuthTokenExchangeException(String message, Throwable cause) {
        super(message, cause);
        this.invalidGrant = false;
    }

    public OAuthTokenExchangeException(String message, Throwable cause, boolean invalidGrant) {
        super(message, cause);
        this.invalidGrant = invalidGrant;
    }

    /** True when the refresh token has been permanently revoked (invalid_grant). */
    public boolean isInvalidGrant() {
        return invalidGrant;
    }
}
