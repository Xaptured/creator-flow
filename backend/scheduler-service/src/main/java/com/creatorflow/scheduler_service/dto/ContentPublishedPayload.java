package com.creatorflow.scheduler_service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Inner payload for the {@code CONTENT_PUBLISHED} and {@code CONTENT_FAILED}
 * event types emitted by media-service's PublishDispatcherProcessor.
 *
 * <p>Only {@code contentId}, {@code ownerId}, and {@code finalStatus} are used here.
 * {@code @JsonIgnoreProperties} tolerates the additional {@code platform} and
 * {@code platformPostId} fields added in CF-102 without breaking deserialisation.</p>
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContentPublishedPayload {
    private UUID contentId;
    private UUID ownerId;
    private String finalStatus;
}
