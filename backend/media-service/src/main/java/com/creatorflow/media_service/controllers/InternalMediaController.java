package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.request.InternalCopyRequest;
import com.creatorflow.media_service.dto.request.InternalPresignRequest;
import com.creatorflow.media_service.dto.response.ErrorResponse;
import com.creatorflow.media_service.dto.response.InternalPresignResponse;
import com.creatorflow.media_service.services.InternalMediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal S3 broker endpoints for ai-service's vision pipeline (CF-96).
 * <p>
 * Security model: shared secret header (X-Internal-Secret), same as
 * {@link InternalPlatformController} — ai-service holds no AWS credentials and
 * obtains short-lived presigned URLs here instead. Key prefixes are validated
 * in {@link InternalMediaService}.
 */
@RestController
@RequestMapping("/internal/media")
@Tag(name = "Internal", description = "Service-to-service endpoints — not for public consumption")
public class InternalMediaController {

    private static final Logger log = LoggerFactory.getLogger(InternalMediaController.class);
    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final InternalMediaService internalMediaService;

    @Value("${app.internal.secret}")
    private String internalSecret;

    public InternalMediaController(InternalMediaService internalMediaService) {
        this.internalMediaService = internalMediaService;
    }

    @Operation(summary = "Presign S3 GET (internal)",
            description = "15-min presigned GET for an object under uploads/ or thumbnails/. X-Internal-Secret protected.")
    @PostMapping("/presign-read")
    public ResponseEntity<?> presignRead(
            @RequestHeader(value = INTERNAL_SECRET_HEADER, required = false) String secret,
            @RequestBody InternalPresignRequest request) {
        ResponseEntity<?> rejection = rejectIfBadSecret(secret);
        if (rejection != null) return rejection;
        return ResponseEntity.ok(new InternalPresignResponse(internalMediaService.presignRead(request.getS3Key())));
    }

    @Operation(summary = "Presign S3 PUT (internal)",
            description = "15-min presigned PUT for an object under uploads/ or thumbnails/. X-Internal-Secret protected.")
    @PostMapping("/presign-write")
    public ResponseEntity<?> presignWrite(
            @RequestHeader(value = INTERNAL_SECRET_HEADER, required = false) String secret,
            @RequestBody InternalPresignRequest request) {
        ResponseEntity<?> rejection = rejectIfBadSecret(secret);
        if (rejection != null) return rejection;
        return ResponseEntity.ok(new InternalPresignResponse(
                internalMediaService.presignWrite(request.getS3Key(), request.getMimeType())));
    }

    @Operation(summary = "Copy S3 object (internal)",
            description = "Server-side copy within the bucket — promotes a selected thumbnail frame to its permanent key. X-Internal-Secret protected.")
    @PostMapping("/copy")
    public ResponseEntity<?> copy(
            @RequestHeader(value = INTERNAL_SECRET_HEADER, required = false) String secret,
            @RequestBody InternalCopyRequest request) {
        ResponseEntity<?> rejection = rejectIfBadSecret(secret);
        if (rejection != null) return rejection;
        internalMediaService.copy(request.getSourceKey(), request.getDestKey());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<?> rejectIfBadSecret(String secret) {
        if (!internalSecret.equals(secret)) {
            log.warn("InternalMediaController: rejected request with invalid or missing internal secret");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorResponse.of("UNAUTHORIZED", 401, "Invalid or missing internal secret"));
        }
        return null;
    }
}
