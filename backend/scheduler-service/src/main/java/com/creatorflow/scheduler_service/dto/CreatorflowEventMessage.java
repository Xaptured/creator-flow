package com.creatorflow.scheduler_service.dto;

import java.time.Instant;

public record CreatorflowEventMessage(
        String eventType,
        String payload,
        Instant occurredAt
) {
    public static CreatorflowEventMessage of(String eventType, String payload) {
        return new CreatorflowEventMessage(eventType, payload, Instant.now());
    }
}
