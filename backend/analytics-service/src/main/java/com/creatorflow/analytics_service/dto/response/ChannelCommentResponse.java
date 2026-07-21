package com.creatorflow.analytics_service.dto.response;

import java.time.Instant;

/**
 * A single top-level YouTube comment from the creator's channel.
 * Returned by {@code GET /v1.0/api/analytics/comments/{ownerId}}.
 */
public record ChannelCommentResponse(
        String videoId,
        String author,
        String text,
        long likeCount,
        Instant publishedAt
) {}
