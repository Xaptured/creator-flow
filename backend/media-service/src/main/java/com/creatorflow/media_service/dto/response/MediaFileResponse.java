package com.creatorflow.media_service.dto.response;

import com.creatorflow.media_service.model.MediaStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class MediaFileResponse {

    private UUID id;
    private String originalName;
    private String mimeType;
    private Long sizeBytes;
    private MediaStatus status;
    private LocalDateTime createdAt;
    private String readUrl;
}
