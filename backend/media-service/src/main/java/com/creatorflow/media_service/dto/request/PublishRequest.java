package com.creatorflow.media_service.dto.request;

import java.util.UUID;

/**
 * Request body for POST /api/publish/{platform}.
 *
 * Used for both instant publish (triggered by the frontend) and
 * scheduled publish (triggered by the SQS consumer in media-service).
 *
 * ownerId must be injected server-side from the JWT session by the BFF —
 * it must never be trusted from the browser. The SQS consumer injects it
 * from the message payload, which was populated server-side when the content
 * was originally created.
 *
 * mediaFileId must reference a MediaFile in UPLOADED status owned by ownerId.
 * title and description are passed through to the platform-specific publish logic.
 */
public record PublishRequest(
        UUID ownerId,
        UUID mediaFileId,
        String title,
        String description
) {}
