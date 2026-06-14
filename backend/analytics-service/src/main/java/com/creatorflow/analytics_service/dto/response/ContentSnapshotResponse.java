package com.creatorflow.analytics_service.dto.response;

import com.creatorflow.analytics_service.model.PlatformType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ContentSnapshotResponse(
        UUID id,
        UUID contentId,
        String title,
        PlatformType platform,
        Long views,
        Long likes,
        Long comments,
        Long impressions,
        BigDecimal engagementRate,
        int windowHours,
        String windowLabel,
        Instant fetchedAt
) {}
