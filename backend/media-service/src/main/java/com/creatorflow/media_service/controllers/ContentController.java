package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.response.ContentResponse;
import com.creatorflow.media_service.model.ContentStatus;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.services.ContentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/content")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<ContentResponse>> listContent(
            @RequestParam("owner_id") UUID ownerId,
            @RequestParam(required = false) ContentStatus status,
            @RequestParam(required = false) PlatformType platform) {

        return ResponseEntity.ok(contentService.listContent(ownerId, status, platform));
    }
}
