package com.creatorflow.media_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Inner payload for {@code CONTENT_PUBLISHED} and {@code CONTENT_FAILED} events
 * emitted by media-service's PublishDispatcherProcessor after attempting platform publish.
 *
 * <p>Consumed by scheduler-service's ContentStatusUpdater to transition the content
 * row from PUBLISHING to its final status (PUBLISHED or FAILED), and by
 * analytics-service to schedule metric fetch jobs.</p>
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ContentPublishedPayload {
    private UUID contentId;
    private UUID ownerId;
    private String platform;
    private String platformPostId;
    private String finalStatus;
    private String title;
    private Instant scheduledLiveAt;
}
