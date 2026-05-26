package com.creatorflow.analytics_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsUpdatedPayload {
    private UUID ownerId;
    private UUID contentId;
    private String platform;
    private MetricsSnapshot metrics;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsSnapshot {
        private Long views;
        private Long likes;
        private Long comments;
        private Long impressions;
        private BigDecimal engagementRate;
        private int windowHours;
    }
}
