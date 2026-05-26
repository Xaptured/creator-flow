package com.creatorflow.analytics_service.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Raw metrics returned from a platform API for a given content item.
 */
public record PlatformMetrics(
        Long views,
        Long likes,
        Long comments,
        Long impressions,
        BigDecimal engagementRate
) {
    /** Convenience factory — engagement_rate computed from raw counts. */
    public static PlatformMetrics of(Long views, Long likes, Long comments, Long impressions) {
        BigDecimal rate = null;
        if (impressions != null && impressions > 0 && likes != null && comments != null) {
            rate = BigDecimal.valueOf((likes + comments) / (double) impressions)
                    .setScale(4, RoundingMode.HALF_UP);
        }
        return new PlatformMetrics(views, likes, comments, impressions, rate);
    }
}
