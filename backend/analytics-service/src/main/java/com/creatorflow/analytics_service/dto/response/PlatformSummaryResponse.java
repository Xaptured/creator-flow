package com.creatorflow.analytics_service.dto.response;

import com.creatorflow.analytics_service.model.PlatformType;

public record PlatformSummaryResponse(
        PlatformType platform,
        long views,
        long likes,
        long comments,
        long impressions
) {}
