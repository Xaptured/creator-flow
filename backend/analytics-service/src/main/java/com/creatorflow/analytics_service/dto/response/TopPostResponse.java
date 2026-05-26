package com.creatorflow.analytics_service.dto.response;

import com.creatorflow.analytics_service.model.PlatformType;

import java.math.BigDecimal;
import java.util.UUID;

public record TopPostResponse(
        UUID contentId,
        PlatformType platform,
        Long views,
        Long likes,
        Long comments,
        BigDecimal engagementRate
) {}
