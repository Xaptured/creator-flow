package com.creatorflow.media_service.exception;

import java.util.UUID;

public class MediaNotFoundException extends RuntimeException {

    public MediaNotFoundException(UUID mediaId) {
        super("Media file not found: " + mediaId);
    }
}
