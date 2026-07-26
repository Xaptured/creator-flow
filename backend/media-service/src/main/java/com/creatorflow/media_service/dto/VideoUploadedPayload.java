package com.creatorflow.media_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Inner payload for {@code MEDIA_VIDEO_UPLOADED} events emitted by media-service
 * after a video upload is confirmed (status → UPLOADED, S3 object verified).
 *
 * <p>Consumed by ai-service's vision pipeline (CF-96) to extract candidate
 * thumbnail frames and score them with Claude Vision. Emitted for
 * {@code video/mp4} uploads only — thumbnail scoring applies to YouTube
 * content; images/audio never trigger it.</p>
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class VideoUploadedPayload {
    private UUID mediaId;
    private UUID ownerId;
    private String s3Key;
    private String fileName;
    private String mimeType;
    private Instant confirmedAt;
}
