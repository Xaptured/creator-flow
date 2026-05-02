package com.creatorflow.media_service.exception;

import java.util.UUID;

/**
 * Thrown when a HeadObject check confirms a file is absent from S3.
 * Maps to 422 UNPROCESSABLE_ENTITY — the media record exists but the S3 object does not.
 * Distinct from S3FetchException (service unavailable) and MediaNotFoundException (DB record missing).
 */
public class S3FileNotFoundException extends RuntimeException {

    private final UUID mediaId;

    public S3FileNotFoundException(UUID mediaId) {
        super("File not found in S3 for mediaId=" + mediaId + " — upload may have failed. Please retry the upload.");
        this.mediaId = mediaId;
    }

    public UUID getMediaId() {
        return mediaId;
    }
}
