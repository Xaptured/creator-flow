package com.creatorflow.media_service.exception;

public class YouTubeApiException extends RuntimeException {
    public YouTubeApiException(String message) {
        super(message);
    }

    public YouTubeApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
