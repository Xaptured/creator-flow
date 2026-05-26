package com.creatorflow.analytics_service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ContentPublishedPayload {
    private UUID contentId;
    private UUID ownerId;
    private String platform;
    private String platformPostId;
    private String finalStatus;
}
