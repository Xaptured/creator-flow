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
     * @param contentId      UUID of the content
     * @param ownerId        UUID of the content owner (used as Redis key prefix)
     * @param platformPostId platform-native post ID (e.g. YouTube videoId, tweet ID, IG media ID);
     *                       required for real API calls, may be null when a stub is used
     * @return current metrics snapshot
     */
    PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId, String platformPostId);
}
