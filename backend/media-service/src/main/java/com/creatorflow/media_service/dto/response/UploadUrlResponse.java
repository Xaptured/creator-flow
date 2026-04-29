package com.creatorflow.media_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class UploadUrlResponse {

    private UUID mediaId;
    private String presignedUrl;
    private Instant expiresAt;
}
