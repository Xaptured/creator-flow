package com.creatorflow.analytics_service.services;

import com.creatorflow.analytics_service.client.YouTubeCommentsClient;
import com.creatorflow.analytics_service.dto.response.ChannelCommentResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Read side for channel comments. Clamps the requested limit and bounds each
 * comment's text length so downstream consumers (ai-service → Claude) receive
 * a predictable payload size.
 */
@Service
public class CommentQueryService {

    static final int DEFAULT_LIMIT = 50;
    static final int MAX_LIMIT = 100;
    static final int MAX_TEXT_LENGTH = 500;

    private final YouTubeCommentsClient youTubeCommentsClient;

    public CommentQueryService(YouTubeCommentsClient youTubeCommentsClient) {
        this.youTubeCommentsClient = youTubeCommentsClient;
    }

    /**
     * Recent top-level YouTube comments across the owner's channel, newest first.
     * Empty list when YouTube is not connected or the API call fails — never throws.
     *
     * @param limit requested comment count; null → {@value #DEFAULT_LIMIT}, clamped to [1, {@value #MAX_LIMIT}]
     */
    public List<ChannelCommentResponse> getRecentComments(UUID ownerId, Integer limit) {
        int effectiveLimit = clampLimit(limit);
        return youTubeCommentsClient.fetchRecentComments(ownerId, effectiveLimit).stream()
                .map(this::truncateText)
                .toList();
    }

    private int clampLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }

    private ChannelCommentResponse truncateText(ChannelCommentResponse comment) {
        String text = comment.text();
        if (text == null || text.length() <= MAX_TEXT_LENGTH) {
            return comment;
        }
        return new ChannelCommentResponse(
                comment.videoId(),
                comment.author(),
                text.substring(0, MAX_TEXT_LENGTH) + "…",
                comment.likeCount(),
                comment.publishedAt());
    }
}
