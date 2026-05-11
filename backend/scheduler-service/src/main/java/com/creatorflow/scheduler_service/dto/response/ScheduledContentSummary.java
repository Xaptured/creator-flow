package com.creatorflow.scheduler_service.dto.response;

import com.creatorflow.scheduler_service.model.Content;
import com.creatorflow.scheduler_service.model.ContentStatus;
import com.creatorflow.scheduler_service.model.PlatformType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Lightweight summary returned by GET /v1.0/api/scheduler/content.
 * One entry per content row (one row = one platform target).
 */
@Getter
@NoArgsConstructor
public class ScheduledContentSummary {

    private UUID id;
    private String title;
    private PlatformType platform;
    private ContentStatus status;
    private Instant scheduledAt;

    public static ScheduledContentSummary from(Content content, ObjectMapper objectMapper) {
        ScheduledContentSummary s = new ScheduledContentSummary();
        s.id = content.getId();
        s.title = content.getTitle();
        s.status = content.getStatus();
        s.scheduledAt = content.getScheduledAt() != null
                ? content.getScheduledAt().toInstant(ZoneOffset.UTC)
                : null;

        try {
            List<PlatformType> targets = objectMapper.readValue(
                    content.getPlatformTargets(),
                    new TypeReference<List<PlatformType>>() {}
            );
            s.platform = targets.isEmpty() ? null : targets.get(0);
        } catch (Exception e) {
            s.platform = null;
        }

        return s;
    }
}
