package com.creatorflow.analytics_service.repository;

import com.creatorflow.analytics_service.model.PlatformType;

/**
 * JPQL projection for the summary endpoint — SUM metrics grouped by platform.
 */
public interface PlatformSummaryProjection {
    PlatformType getPlatform();
    Long getTotalViews();
    Long getTotalLikes();
    Long getTotalComments();
}
