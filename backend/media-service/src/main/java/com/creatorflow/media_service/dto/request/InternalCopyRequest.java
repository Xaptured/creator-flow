package com.creatorflow.media_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Request body for the internal S3 copy endpoint (CF-96 winner-frame promotion). */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class InternalCopyRequest {
    private String sourceKey;
    private String destKey;
}
