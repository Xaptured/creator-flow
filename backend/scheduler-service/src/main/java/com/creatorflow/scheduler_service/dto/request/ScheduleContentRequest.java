package com.creatorflow.scheduler_service.dto.request;

import com.creatorflow.scheduler_service.model.PlatformType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Inbound request body for POST /schedule.
 *
 * <p>For instant publish, omit {@code scheduledAt} or set it to now — the service
 * defaults to {@link Instant#now()}, making it immediately eligible for the next
 * PublishJob poll cycle. For scheduled publish, provide a future instant.</p>
 *
 * <p>{@code ownerId} is always injected server-side by the BFF from the JWT session.
 * It must never be trusted from the browser.</p>
 */
@Getter
@Setter
@NoArgsConstructor
public class ScheduleContentRequest {
    private UUID ownerId;
    private String title;
    private String description;
    private UUID mediaFileId;
    private List<PlatformType> platformTargets;
    private Instant scheduledAt;
    private Instant liveAt;
}
