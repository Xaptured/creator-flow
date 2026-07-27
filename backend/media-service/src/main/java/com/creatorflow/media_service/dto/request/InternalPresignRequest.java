package com.creatorflow.media_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Request body for internal presign endpoints (CF-96 S3 broker).
 * {@code mimeType} is required for presign-write only.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class InternalPresignRequest {
    private String s3Key;
    private String mimeType;
}
