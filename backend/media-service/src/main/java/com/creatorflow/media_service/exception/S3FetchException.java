package com.creatorflow.media_service.exception;

public class S3FetchException extends RuntimeException {
    public S3FetchException(String message, Throwable cause) {
        super(message, cause);
    }
}
