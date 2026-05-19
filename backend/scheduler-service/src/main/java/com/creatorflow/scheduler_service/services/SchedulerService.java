package com.creatorflow.scheduler_service.services;

import com.creatorflow.scheduler_service.dto.request.ScheduleContentRequest;
import com.creatorflow.scheduler_service.dto.request.UpdateContentRequest;
import com.creatorflow.scheduler_service.dto.response.ContentStatusResponse;
import com.creatorflow.scheduler_service.dto.response.ScheduleContentResponse;
import com.creatorflow.scheduler_service.dto.response.ScheduledContentDetail;
import com.creatorflow.scheduler_service.dto.response.ScheduledContentSummary;
import com.creatorflow.scheduler_service.exception.ContentNotFoundException;
import com.creatorflow.scheduler_service.model.Content;
import com.creatorflow.scheduler_service.model.ContentStatus;
import com.creatorflow.scheduler_service.model.PlatformType;
import com.creatorflow.scheduler_service.repository.ContentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.creatorflow.scheduler_service.dto.response.ScheduleContentResponse.failure;
import static com.creatorflow.scheduler_service.dto.response.ScheduleContentResponse.success;

@Slf4j
@Service
@RequiredArgsConstructor
public class SchedulerService {

    private final ContentRepository contentRepository;
    private final ContentRowSaver contentRowSaver;
    private final ObjectMapper objectMapper;

    public List<ScheduleContentResponse> schedule(ScheduleContentRequest request) {
        if (request.getOwnerId() == null) {
            throw new IllegalArgumentException("ownerId is required");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("title is required");
        }
        List<PlatformType> targets = request.getPlatformTargets();
        if (targets == null || targets.isEmpty()) {
            throw new IllegalArgumentException("at least one platformTarget is required");
        }

        Instant scheduledAt = request.getScheduledAt() != null
                ? request.getScheduledAt()
                : Instant.now();

        List<ScheduleContentResponse> responses = new ArrayList<>();

        for (PlatformType platform : targets) {
            Content content = new Content();
            content.setId(UUID.randomUUID());
            content.setOwnerId(request.getOwnerId());
            content.setTitle(request.getTitle());
            content.setDescription(request.getDescription());
            content.setMediaFileId(request.getMediaFileId());
            content.setPlatformTargets(serialise(List.of(platform)));
            content.setScheduledAt(scheduledAt);
            content.setStatus(ContentStatus.SCHEDULED);

            try {
                Content saved = contentRowSaver.save(content);
                log.info("Content scheduled — contentId: {}, ownerId: {}, platform: {}, scheduledAt: {}",
                        saved.getId(), saved.getOwnerId(), platform, scheduledAt);
                responses.add(success(saved.getId(), platform, saved.getStatus().name(), scheduledAt));
            } catch (Exception e) {
                log.error("Failed to schedule content for platform: {}, ownerId: {} — {}",
                        platform, request.getOwnerId(), e.getMessage(), e);
                responses.add(failure(platform, e.getMessage()));
            }
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public List<ScheduledContentSummary> listContent(UUID ownerId) {
        return contentRepository.findAllByOwnerIdOrderByScheduledAtAsc(ownerId)
                .stream()
                .map(c -> ScheduledContentSummary.from(c, objectMapper))
                .toList();
    }

    @Transactional(readOnly = true)
    public ScheduledContentDetail getContent(UUID contentId, UUID ownerId) {
        Content content = contentRepository.findByIdAndOwnerId(contentId, ownerId)
                .orElseThrow(() -> new ContentNotFoundException("Content not found: " + contentId));
        return ScheduledContentDetail.from(content, objectMapper);
    }

    /**
     * Update all mutable fields of a content row.
     * Rejected if status is PUBLISHING or PUBLISHED.
     * A FAILED row is reset to SCHEDULED on successful update.
     */
    @Transactional
    public ScheduledContentDetail updateContent(UUID contentId, UUID ownerId, UpdateContentRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("title is required");
        }
        if (request.getPlatformTargets() == null || request.getPlatformTargets().isEmpty()) {
            throw new IllegalArgumentException("at least one platformTarget is required");
        }

        Content content = contentRepository.findByIdAndOwnerId(contentId, ownerId)
                .orElseThrow(() -> new ContentNotFoundException("Content not found: " + contentId));

        ContentStatus status = content.getStatus();
        if (status == ContentStatus.PUBLISHING || status == ContentStatus.PUBLISHED) {
            throw new IllegalStateException("Cannot update content with status: " + status);
        }

        content.setTitle(request.getTitle());
        content.setDescription(request.getDescription());
        content.setMediaFileId(request.getMediaFileId());
        content.setPlatformTargets(serialise(request.getPlatformTargets()));
        if (request.getScheduledAt() != null) {
            content.setScheduledAt(request.getScheduledAt());
        }
        if (status == ContentStatus.FAILED) {
            content.setStatus(ContentStatus.SCHEDULED);
        }

        Content saved = contentRepository.save(content);
        log.info("Content updated — contentId: {}, ownerId: {}", contentId, ownerId);
        return ScheduledContentDetail.from(saved, objectMapper);
    }

    /**
     * Update scheduled_at for a SCHEDULED content row.
     * Rejects if status is PUBLISHING or PUBLISHED.
     */
    @Transactional
    public void reschedule(UUID contentId, UUID ownerId, Instant newScheduledAt) {
        Content content = contentRepository.findByIdAndOwnerId(contentId, ownerId)
                .orElseThrow(() -> new ContentNotFoundException("Content not found: " + contentId));

        ContentStatus status = content.getStatus();
        if (status == ContentStatus.PUBLISHING || status == ContentStatus.PUBLISHED) {
            throw new IllegalStateException("Cannot reschedule content with status: " + status);
        }

        content.setScheduledAt(newScheduledAt);
        if (status == ContentStatus.FAILED) {
            content.setStatus(ContentStatus.SCHEDULED);
        }
        contentRepository.save(content);
        log.info("Content rescheduled — contentId: {}, ownerId: {}, newScheduledAt: {}",
                contentId, ownerId, newScheduledAt);
    }

    @Transactional(readOnly = true)
    public ContentStatusResponse getStatus(UUID contentId, UUID ownerId) {
        Content content = contentRepository.findByIdAndOwnerId(contentId, ownerId)
                .orElseThrow(() -> new ContentNotFoundException("Content not found: " + contentId));

        return new ContentStatusResponse(
                content.getId(),
                content.getStatus().name(),
                content.getScheduledAt(),
                content.getUpdatedAt()
        );
    }

    private String serialise(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialise value", e);
        }
    }
}
