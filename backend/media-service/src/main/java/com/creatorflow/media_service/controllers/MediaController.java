package com.creatorflow.media_service.controllers;

import com.creatorflow.media_service.dto.Media;
import com.creatorflow.media_service.dto.MediaRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1.0/api/media")
public class MediaController {

    @PostMapping
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Media> createMedia(@RequestBody MediaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(null);
    }
}
