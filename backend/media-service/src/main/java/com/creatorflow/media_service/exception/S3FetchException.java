package com.creatorflow.media_service.exception;

/**
 * Thrown when fetching an object from S3 fails (network error, access denied, etc.).
 * Distinct from S3FileNotFoundException (key absent) — this is a service-level failure.
 * Maps to 503 SERVICE_UNAVAILABLE.
 *
 * Carries optional s3Key context for debugging without exposing it in the error response.
 */
public class S3FetchException extends RuntimeException {

    private final String s3Key;

    public S3FetchException(String message, Throwable cause) {
        super(message, cause);
        this.s3Key = null;
    }

    public S3FetchException(String s3Key, String message, Throwable cause) {
        super(message, cause);
        this.s3Key = s3Key;
    }

    /** S3 key that failed — for server-side logging only, never expose in API response. */
    public String getS3Key() {
        return s3Key;
    }
}
