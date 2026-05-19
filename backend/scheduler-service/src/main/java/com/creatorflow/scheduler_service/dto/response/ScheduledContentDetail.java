package com.creatorflow.scheduler_service.dto.response;

import com.creatorflow.scheduler_service.model.Content;
import com.creatorflow.scheduler_service.model.ContentStatus;
import com.creatorflow.scheduler_service.model.PlatformType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Full post details returned by GET /v1.0/api/scheduler/content/{id}.
 * Used to pre-fill the composer when opening a scheduled post for editing.
 */
@Getter
@NoArgsConstructor
public class ScheduledContentDetail {

    private UUID id;
    private String title;
    private String description;
    private UUID mediaFileId;
    private List<PlatformType> platformTargets;
    private ContentStatus status;
    private Instant scheduledAt;
    private Instant createdAt;
    private Instant updatedAt;

    public static ScheduledContentDetail from(Content content, ObjectMapper objectMapper) {
        ScheduledContentDetail d = new ScheduledContentDetail();
        d.id = content.getId();
        d.title = content.getTitle();
        d.description = content.getDescription();
        d.mediaFileId = content.getMediaFileId();
        d.status = content.getStatus();
        d.scheduledAt = content.getScheduledAt();
        d.createdAt = content.getCreatedAt();
        d.updatedAt = content.getUpdatedAt();

        try {
            d.platformTargets = objectMapper.readValue(
                    content.getPlatformTargets(),
                    new TypeReference<List<PlatformType>>() {}
            );
        } catch (Exception e) {
            d.platformTargets = List.of();
        }

        return d;
    }
}
