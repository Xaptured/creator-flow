package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.request.ConfirmUploadRequest;
import com.creatorflow.media_service.dto.request.UploadUrlRequest;
import com.creatorflow.media_service.dto.response.ErrorResponse;
import com.creatorflow.media_service.dto.response.MediaFileResponse;
import com.creatorflow.media_service.dto.response.UploadUrlResponse;
import com.creatorflow.media_service.services.MediaFileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/media")
@Tag(name = "Media Files", description = "S3 presigned upload flow — request URL, upload directly to S3, then confirm")
public class MediaController {

    private final MediaFileService mediaFileService;

    public MediaController(MediaFileService mediaFileService) {
        this.mediaFileService = mediaFileService;
    }

    @Operation(
            summary = "Request a presigned S3 upload URL",
            description = "Validates file type and size, then returns a short-lived presigned PUT URL " +
                          "for direct browser-to-S3 upload. ownerId must be injected server-side by the BFF."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Presigned URL created",
                    content = @Content(schema = @Schema(implementation = UploadUrlResponse.class))),
            @ApiResponse(responseCode = "400", description = "Unsupported MIME type, invalid size, or duplicate file",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "File already uploaded",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/upload-url")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<UploadUrlResponse> getUploadUrl(@RequestBody UploadUrlRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaFileService.createUploadUrl(request));
    }

    @Operation(
            summary = "Confirm S3 upload complete",
            description = "Verifies the file exists in S3 via HeadObject, then marks the media record as UPLOADED. " +
                          "Must be called after the browser has successfully PUT to the presigned URL."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Upload confirmed",
                    content = @Content(schema = @Schema(implementation = MediaFileResponse.class))),
            @ApiResponse(responseCode = "404", description = "Media record not found or wrong owner",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Already confirmed (status != PENDING)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "422", description = "File not found in S3 — upload may have failed",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/confirm")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<MediaFileResponse> confirmUpload(@RequestBody ConfirmUploadRequest request) {
        return ResponseEntity.ok(mediaFileService.confirmUpload(request));
    }

    @Operation(
            summary = "Get media file metadata + presigned read URL",
            description = "Returns media file metadata and a short-lived presigned GET URL for serving the file. " +
                          "Ownership enforced — returns 404 if file belongs to a different user."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Media file found",
                    content = @Content(schema = @Schema(implementation = MediaFileResponse.class))),
            @ApiResponse(responseCode = "404", description = "Media file not found or wrong owner",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<MediaFileResponse> getMediaFile(
            @Parameter(description = "Media file UUID") @PathVariable UUID id,
            @Parameter(description = "Owner UUID — injected from session by BFF") @RequestParam UUID ownerId) {
        return ResponseEntity.ok(mediaFileService.getMediaFile(id, ownerId));
    }
}
