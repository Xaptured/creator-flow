package com.creatorflow.media_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Inner payload deserialised from a {@code CONTENT_READY_TO_PUBLISH} SNS event.
 *
 * <p>Published by scheduler-service's PublishJob when a content row transitions
 * to PUBLISHING. Media-service's PublishDispatcherProcessor reads this to know
 * which content to publish and to which platform.</p>
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ContentReadyToPublishPayload {
    private UUID contentId;
    private UUID ownerId;
    /** JSON array string, e.g. {@code ["YOUTUBE"]}. Always single-element per row. */
    private String platformTargets;
}
