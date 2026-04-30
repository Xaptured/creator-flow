package com.creatorflow.media_service.dto.request;

import com.creatorflow.media_service.model.YouTubePrivacyStatus;

import java.util.UUID;

public record YouTubeUploadRequest(
        UUID ownerId,
        UUID mediaFileId,
        String title,
        String description,
        YouTubePrivacyStatus privacyStatus
) {}
