package com.creatorflow.scheduler_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Inner payload serialised into {@link CreatorflowEventMessage#payload()}
 * for the {@code CONTENT_READY_TO_PUBLISH} event type.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ContentReadyToPublishPayload {
    private UUID contentId;
    private UUID ownerId;
    private String platformTargets;
}
