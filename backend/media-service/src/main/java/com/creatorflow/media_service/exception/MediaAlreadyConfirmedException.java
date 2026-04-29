package com.creatorflow.media_service.exception;

import java.util.UUID;

public class MediaAlreadyConfirmedException extends RuntimeException {

    public MediaAlreadyConfirmedException(UUID mediaId) {
        super("Media file already confirmed: " + mediaId);
    }
}
