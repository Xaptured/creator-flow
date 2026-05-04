package com.creatorflow.scheduler_service.services;

import com.creatorflow.scheduler_service.dto.request.ScheduleContentRequest;
import com.creatorflow.scheduler_service.dto.response.ContentStatusResponse;
import com.creatorflow.scheduler_service.dto.response.ScheduleContentResponse;
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
import java.time.LocalDateTime;
import java.time.ZoneOffset;
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

    /**
     * Persist one content row per platform target, each in its own independent transaction.
     *
     * <p>Each platform is saved via {@link ContentRowSaver#save} which runs in a
     * {@code REQUIRES_NEW} transaction, so a DB failure for one platform does not roll
     * back rows already committed for other platforms. The response always contains one
     * entry per requested platform — successes carry {@code contentId} and
     * {@code status = SCHEDULED}; failures carry {@code status = FAILED_TO_SCHEDULE}
     * and an {@code error} message.</p>
     *
     * <p>If {@code scheduledAt} is null, defaults to now — making each row immediately
     * eligible for the next PublishJob poll cycle (instant publish).
     * If it's a future time, Quartz picks them up when the time arrives.</p>
     */
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

        LocalDateTime scheduledAtLocal = LocalDateTime.ofInstant(scheduledAt, ZoneOffset.UTC);

        List<ScheduleContentResponse> responses = new ArrayList<>();

        for (PlatformType platform : targets) {
            Content content = new Content();
            content.setId(UUID.randomUUID());
            content.setOwnerId(request.getOwnerId());
            content.setTitle(request.getTitle());
            content.setDescription(request.getDescription());
            content.setMediaFileId(request.getMediaFileId());
            content.setPlatformTargets(serialise(List.of(platform)));
            content.setScheduledAt(scheduledAtLocal);
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
    public ContentStatusResponse getStatus(UUID contentId, UUID ownerId) {
        Content content = contentRepository.findByIdAndOwnerId(contentId, ownerId)
                .orElseThrow(() -> new ContentNotFoundException("Content not found: " + contentId));

        Instant scheduledAt = content.getScheduledAt() != null
                ? content.getScheduledAt().toInstant(ZoneOffset.UTC) : null;
        Instant updatedAt = content.getUpdatedAt() != null
                ? content.getUpdatedAt().toInstant(ZoneOffset.UTC) : null;

        return new ContentStatusResponse(content.getId(), content.getStatus().name(), scheduledAt, updatedAt);
    }

    private String serialise(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to serialise value", e);
        }
    }
}
