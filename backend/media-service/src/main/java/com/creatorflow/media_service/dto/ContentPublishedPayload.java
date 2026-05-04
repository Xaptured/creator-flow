package com.creatorflow.media_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Inner payload for {@code CONTENT_PUBLISHED} and {@code CONTENT_FAILED} events
 * emitted by media-service's PublishDispatcherProcessor after attempting platform publish.
 *
 * <p>Consumed by scheduler-service's ContentStatusUpdater to transition the content
 * row from PUBLISHING to its final status (PUBLISHED or FAILED).</p>
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ContentPublishedPayload {
    private UUID contentId;
    private UUID ownerId;
    /** Final status string: {@code "PUBLISHED"} or {@code "FAILED"}. */
    private String finalStatus;
}
