package com.creatorflow.media_service.model;

public enum YouTubePrivacyStatus {
    PUBLIC,
    PRIVATE,
    UNLISTED;

    public String toApiValue() {
        return name().toLowerCase();
    }
}
