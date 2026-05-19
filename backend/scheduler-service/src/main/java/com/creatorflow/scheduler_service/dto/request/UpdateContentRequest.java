package com.creatorflow.scheduler_service.dto.request;

import com.creatorflow.scheduler_service.model.PlatformType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Inbound body for PUT /v1.0/api/scheduler/content/{id}.
 *
 * <p>Allows updating all mutable fields of a scheduled post that has not yet
 * started publishing. Rejected with 409 if the content is PUBLISHING or PUBLISHED.</p>
 *
 * <p>ownerId is always injected server-side by the BFF from the JWT session.
 * It must never be trusted from the browser.</p>
 */
@Getter
@Setter
@NoArgsConstructor
public class UpdateContentRequest {
    private UUID ownerId;
    private String title;
    private String description;
    private UUID mediaFileId;
    private List<PlatformType> platformTargets;
    private Instant scheduledAt;
}
