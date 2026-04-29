package com.creatorflow.media_service.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class UploadUrlRequest {

    private UUID ownerId;
    private String fileName;
    private String mimeType;
    private Long sizeBytes;
}
