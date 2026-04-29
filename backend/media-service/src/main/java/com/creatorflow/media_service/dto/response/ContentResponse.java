package com.creatorflow.media_service.dto.response;

import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.ContentStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record ContentResponse(
        UUID id,
        UUID ownerId,
        String title,
        String description,
        ContentStatus status,
        String platformTargets,
        LocalDateTime scheduledAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ContentResponse from(Content content) {
        return new ContentResponse(
                content.getId(),
                content.getOwnerId(),
                content.getTitle(),
                content.getDescription(),
                content.getStatus(),
                content.getPlatformTargets(),
                content.getScheduledAt(),
                content.getCreatedAt(),
                content.getUpdatedAt()
        );
    }
}
