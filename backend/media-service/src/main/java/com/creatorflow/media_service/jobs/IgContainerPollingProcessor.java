package com.creatorflow.media_service.jobs;

import com.creatorflow.media_service.client.MetaClient;
import com.creatorflow.media_service.configuration.MetaOAuthProperties;
import com.creatorflow.media_service.dto.ContentPublishedPayload;
import com.creatorflow.media_service.dto.CreatorflowEventMessage;
import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.ContentStatus;
import com.creatorflow.media_service.model.IgContainerStatus;
import com.creatorflow.media_service.model.IgContainerTracking;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.repository.ContentRepository;
import com.creatorflow.media_service.repository.IgContainerTrackingRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import com.creatorflow.media_service.services.SnsPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles transactional processing of a single {@link IgContainerTracking} row.
 *
 * <p>Separated from {@link IgContainerPollingJob} so {@code @Transactional} is applied
 * via a Spring proxy — self-calls from a {@code @Component} Quartz job bypass it,
 * which causes {@code TransactionRequiredException} on the {@code @Modifying} CAS query.</p>
 */
@Service
public class IgContainerPollingProcessor {

    private static final Logger log = LoggerFactory.getLogger(IgContainerPollingProcessor.class);

    private static final String EVENT_PUBLISHED = "CONTENT_PUBLISHED";
    private static final String EVENT_FAILED    = "CONTENT_FAILED";

    private final IgContainerTrackingRepository igContainerTrackingRepository;
    private final ContentRepository contentRepository;
    private final PlatformTokenCacheService platformTokenCacheService;
    private final MetaClient metaClient;
    private final SnsPublisher snsPublisher;
    private final MetaOAuthProperties metaOAuthProperties;
    private final ObjectMapper objectMapper;
    private final int containerTimeoutMinutes;

    public IgContainerPollingProcessor(
            IgContainerTrackingRepository igContainerTrackingRepository,
            ContentRepository contentRepository,
            PlatformTokenCacheService platformTokenCacheService,
            MetaClient metaClient,
            SnsPublisher snsPublisher,
            MetaOAuthProperties metaOAuthProperties,
            @Value("${app.ig-container.timeout-minutes}") int containerTimeoutMinutes) {
        this.igContainerTrackingRepository = igContainerTrackingRepository;
        this.contentRepository = contentRepository;
        this.platformTokenCacheService = platformTokenCacheService;
        this.metaClient = metaClient;
        this.snsPublisher = snsPublisher;
        this.metaOAuthProperties = metaOAuthProperties;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        this.containerTimeoutMinutes = containerTimeoutMinutes;
    }

    @Transactional(noRollbackFor = Exception.class)
    public void process(IgContainerTracking tracking, LocalDateTime now) {
        UUID contentId   = tracking.getContentId();
        UUID ownerId     = tracking.getOwnerId();
        String containerId = tracking.getContainerId();

        // 1. Timeout check — fail fast before making any API call
        if (isTimedOut(tracking, now)) {
            log.warn("IgContainerPollingJob: container timed out — contentId: {}, containerId: {}, createdAt: {}",
                    contentId, containerId, tracking.getCreatedAt());
            markFailed(tracking, "Container timed out after " + containerTimeoutMinutes + " minutes", now);
            return;
        }

        // 2. CAS claim: PENDING → PROCESSING. Returns 0 if another run already claimed it.
        if (tracking.getStatus() == IgContainerStatus.PENDING) {
            int claimed = igContainerTrackingRepository.casStatus(
                    tracking.getId(), IgContainerStatus.PENDING, IgContainerStatus.PROCESSING, now);
            if (claimed == 0) {
                log.debug("IgContainerPollingJob: contentId: {} already claimed — skipping", contentId);
                return;
            }
            tracking.setStatus(IgContainerStatus.PROCESSING);
        }

        // 3. Fetch the access token via the existing cache service
        PlatformAccount account;
        try {
            account = platformTokenCacheService.getPlatformAccount(ownerId, "INSTAGRAM");
        } catch (PlatformNotConnectedException e) {
            log.error("IgContainerPollingJob: no Instagram account for ownerId: {} — marking FAILED", ownerId);
            markFailed(tracking, "No connected Instagram account found for owner", now);
            return;
        }

        String accessToken = account.getAccessToken();
        String igUserId    = account.getPlatformUserId();

        // 4. Poll Instagram container status
        String statusCode;
        try {
            statusCode = metaClient.getContainerStatus(accessToken, containerId);
        } catch (Exception e) {
            // Network / transient error — leave as PROCESSING, retry next cycle
            log.warn("IgContainerPollingJob: failed to get status for containerId: {} — will retry: {}",
                    containerId, e.getMessage());
            return;
        }

        log.info("IgContainerPollingJob: containerId: {} → status_code: {}", containerId, statusCode);

        switch (statusCode) {
            case MetaClient.CONTAINER_STATUS_FINISHED ->
                    handleFinished(tracking, igUserId, containerId, accessToken, now);

            case "IN_PROGRESS" ->
                    log.debug("IgContainerPollingJob: containerId: {} still IN_PROGRESS", containerId);

            case MetaClient.CONTAINER_STATUS_ERROR, "EXPIRED" -> {
                log.error("IgContainerPollingJob: containerId: {} — terminal status: {}", containerId, statusCode);
                markFailed(tracking, "Instagram reported " + statusCode + " for containerId=" + containerId, now);
            }

            default ->
                    log.warn("IgContainerPollingJob: unknown status_code '{}' for containerId: {} — ignoring",
                            statusCode, containerId);
        }
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private void handleFinished(IgContainerTracking tracking, String igUserId,
                                String containerId, String accessToken, LocalDateTime now) {
        if (metaOAuthProperties.isSandbox()) {
            log.info("SANDBOX MODE: IgContainerPollingJob step 2 skipped — containerId={} contentId={}",
                    containerId, tracking.getContentId());
            markPublished(tracking, containerId, now);
            return;
        }

        if (igUserId == null || igUserId.isBlank()) {
            log.error("IgContainerPollingJob: platformUserId missing for ownerId: {} — marking FAILED",
                    tracking.getOwnerId());
            markFailed(tracking, "Instagram user ID not found on platform account", now);
            return;
        }

        String mediaId;
        try {
            mediaId = metaClient.publishContainer(accessToken, igUserId, containerId);
        } catch (Exception e) {
            // Publish call failed — leave PROCESSING, retry on next cycle
            log.warn("IgContainerPollingJob: publish call failed for containerId: {} — will retry: {}",
                    containerId, e.getMessage());
            return;
        }

        log.info("IgContainerPollingJob: published contentId: {} → Instagram mediaId: {}",
                tracking.getContentId(), mediaId);
        markPublished(tracking, mediaId, now);
    }

    private void markPublished(IgContainerTracking tracking, String igMediaId, LocalDateTime now) {
        tracking.setStatus(IgContainerStatus.FINISHED);
        tracking.setUpdatedAt(now);
        igContainerTrackingRepository.save(tracking);

        updateContentStatus(tracking.getContentId(), ContentStatus.PUBLISHED, igMediaId, now);
        emitStatusEvent(EVENT_PUBLISHED, tracking.getContentId(), tracking.getOwnerId(), igMediaId);
    }

    private void markFailed(IgContainerTracking tracking, String errorMessage, LocalDateTime now) {
        tracking.setStatus(IgContainerStatus.ERROR);
        tracking.setError(errorMessage);
        tracking.setUpdatedAt(now);
        igContainerTrackingRepository.save(tracking);

        updateContentStatus(tracking.getContentId(), ContentStatus.FAILED, null, now);
        emitStatusEvent(EVENT_FAILED, tracking.getContentId(), tracking.getOwnerId(), null);
    }

    private void updateContentStatus(UUID contentId, ContentStatus newStatus, String platformPostId, LocalDateTime now) {
        Optional<Content> contentOpt = contentRepository.findById(contentId);
        if (contentOpt.isEmpty()) {
            log.warn("IgContainerPollingJob: content row not found for contentId: {} — status not updated", contentId);
            return;
        }
        Content content = contentOpt.get();
        content.setStatus(newStatus);
        if (platformPostId != null) {
            content.setPlatformPostId(platformPostId);
        }
        contentRepository.save(content);
        log.debug("IgContainerPollingJob: content {} status → {}, platformPostId={}", contentId, newStatus, platformPostId);
    }

    private void emitStatusEvent(String eventType, UUID contentId, UUID ownerId, String platformPostId) {
        try {
            Optional<Content> contentOpt = contentRepository.findById(contentId);
            String title = contentOpt.map(Content::getTitle).orElse(null);
            Instant liveAt = contentOpt.map(Content::getLiveAt).orElse(null);
            LocalDateTime scheduledAt = contentOpt.map(Content::getScheduledAt).orElse(null);
            Instant scheduledLiveAt = liveAt != null
                    ? liveAt
                    : (scheduledAt == null ? null : scheduledAt.atZone(ZoneId.systemDefault()).toInstant());
            ContentPublishedPayload payload = new ContentPublishedPayload(
                    contentId,
                    ownerId,
                    "INSTAGRAM",
                    platformPostId,
                    EVENT_PUBLISHED.equals(eventType) ? "PUBLISHED" : "FAILED",
                    title,
                    scheduledLiveAt);
            String payloadJson = objectMapper.writeValueAsString(payload);
            CreatorflowEventMessage event = CreatorflowEventMessage.of(eventType, payloadJson);
            snsPublisher.publishToTopic("content-published", event);
            log.info("IgContainerPollingJob: emitted {} for contentId: {}", eventType, contentId);
        } catch (JsonProcessingException e) {
            log.error("IgContainerPollingJob: failed to serialise event payload for contentId: {}", contentId, e);
        } catch (Exception e) {
            log.error("IgContainerPollingJob: failed to emit {} for contentId: {}", eventType, contentId, e);
        }
    }

    private boolean isTimedOut(IgContainerTracking tracking, LocalDateTime now) {
        LocalDateTime createdAt = tracking.getCreatedAt();
        return createdAt != null && createdAt.plusMinutes(containerTimeoutMinutes).isBefore(now);
    }
}
