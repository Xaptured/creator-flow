package com.creatorflow.analytics_service.dto;

import java.time.Instant;

public record AnalyticsEventMessage(
        String eventType,
        String payload,
        Instant occurredAt
) {
    public static AnalyticsEventMessage of(String eventType, String payload) {
        return new AnalyticsEventMessage(eventType, payload, Instant.now());
    }
}
