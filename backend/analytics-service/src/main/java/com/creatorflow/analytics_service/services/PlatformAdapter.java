package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.creatorflow.analytics_service.model.PlatformType;

import java.util.UUID;

/**
 * Contract for fetching metrics from a social platform.
 * Each platform has its own adapter implementation under {@code services/platform/}.
 */
public interface PlatformAdapter {

    /** Platform this adapter handles. */
    PlatformType platform();

    /**
     * Fetch current metrics for the given content item.
     * OAuth tokens are read from Redis (written by scheduler-service).
     *
     * @param contentId UUID of the content
     * @param ownerId   UUID of the content owner (used as Redis key prefix)
     * @return current metrics snapshot
     */
    PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId);
}
