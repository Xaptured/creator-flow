package com.creatorflow.media_service.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class ConfirmUploadRequest {

    private UUID ownerId;
    private UUID mediaId;
}
