package com.creatorflow.scheduler_service.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Inbound body for PATCH /v1.0/api/scheduler/content/{id}/reschedule.
 *
 * <p>ownerId is always injected server-side by the BFF from the JWT session.
 * It must never be trusted from the browser.</p>
 */
@Getter
@Setter
@NoArgsConstructor
public class RescheduleContentRequest {
    private UUID ownerId;
    private Instant scheduledAt;
}
