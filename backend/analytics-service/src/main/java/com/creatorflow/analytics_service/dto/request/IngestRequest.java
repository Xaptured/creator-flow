package com.creatorflow.analytics_service.dto.request;

import com.creatorflow.analytics_service.model.PlatformType;

import java.util.UUID;

/**
 * Fallback HTTP ingest request from scheduler-service.
 * Triggers the same fetch-and-record flow as the internal job.
 */
public record IngestRequest(
        UUID contentId,
        UUID ownerId,
        PlatformType platform,
        String platformPostId,
        int windowHours,
        String windowLabel
) {}
