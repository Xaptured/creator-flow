package com.creatorflow.scheduler_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ContentStatusResponse {
    private UUID contentId;
    private String status;
    private Instant scheduledAt;
    private Instant updatedAt;
}
