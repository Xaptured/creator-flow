package com.creatorflow.media_service.exception;

public class OAuthTokenExchangeException extends RuntimeException {
    public OAuthTokenExchangeException(String message) {
        super(message);
    }

    public OAuthTokenExchangeException(String message, Throwable cause) {
        super(message, cause);
    }
}
