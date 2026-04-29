package com.creatorflow.media_service.exception;

import java.util.UUID;

public class MediaOwnershipException extends RuntimeException {

    public MediaOwnershipException(UUID mediaId, UUID ownerId) {
        super("Access denied to media file " + mediaId + " for owner " + ownerId);
    }
}
