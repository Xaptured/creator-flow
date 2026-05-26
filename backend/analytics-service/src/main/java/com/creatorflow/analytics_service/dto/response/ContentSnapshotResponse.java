package com.creatorflow.analytics_service.dto.response;

import com.creatorflow.analytics_service.model.PlatformType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ContentSnapshotResponse(
        UUID id,
        UUID contentId,
        PlatformType platform,
        Long views,
        Long likes,
        Long comments,
        Long impressions,
        BigDecimal engagementRate,
        int windowHours,
        Instant fetchedAt
) {}
