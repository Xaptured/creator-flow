package com.creatorflow.scheduler_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Inner payload for the {@code CONTENT_PUBLISHED} and {@code CONTENT_FAILED}
 * event types emitted by media-service's PublishDispatcherProcessor.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ContentPublishedPayload {
    private UUID contentId;
    private UUID ownerId;
    private String finalStatus;
}
