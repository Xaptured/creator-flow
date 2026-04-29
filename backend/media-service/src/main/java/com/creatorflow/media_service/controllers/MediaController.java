package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.request.ConfirmUploadRequest;
import com.creatorflow.media_service.dto.request.UploadUrlRequest;
import com.creatorflow.media_service.dto.response.MediaFileResponse;
import com.creatorflow.media_service.dto.response.UploadUrlResponse;
import com.creatorflow.media_service.services.MediaFileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/media")
public class MediaController {

    private final MediaFileService mediaFileService;

    public MediaController(MediaFileService mediaFileService) {
        this.mediaFileService = mediaFileService;
    }

    @PostMapping("/upload-url")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<UploadUrlResponse> getUploadUrl(@RequestBody UploadUrlRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mediaFileService.createUploadUrl(request));
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<MediaFileResponse> confirmUpload(@RequestBody ConfirmUploadRequest request) {
        return ResponseEntity.ok(mediaFileService.confirmUpload(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<MediaFileResponse> getMediaFile(
            @PathVariable UUID id,
            @RequestParam UUID ownerId) {
        return ResponseEntity.ok(mediaFileService.getMediaFile(id, ownerId));
    }
}
