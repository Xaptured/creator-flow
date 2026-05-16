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
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Quartz job that completes Step 2 of the Instagram async publish flow.
 *
 * <h3>Background</h3>
 * After {@link com.creatorflow.media_service.services.instagram.InstagramPublishService}
 * creates an Instagram media container (Step 1), Instagram processes the media
 * asynchronously. This job polls each pending container's {@code status_code} via the
 * Graph API and, once {@code FINISHED}, calls the publish endpoint (Step 2).
 *
 * <h3>Data model</h3>
 * Container state is stored in {@code ig_container_tracking} — a separate table that
 * keeps the shared {@code content} table platform-agnostic. Each row has a 1-to-1
 * relation with a {@code content} row via {@code content_id}.
 *
 * <h3>Status machine (ig_container_tracking.status)</h3>
 * <pre>
 *   PENDING
 *     │   (first poll — CAS claims the row)
 *     ▼
 *   PROCESSING  ←── IN_PROGRESS from Instagram
 *     │
 *     ├── FINISHED → publishContainer() → emit CONTENT_PUBLISHED → content.status = PUBLISHED
 *     └── ERROR    → emit CONTENT_FAILED → content.status = FAILED, store error message
 *
 *   PENDING / PROCESSING → ERROR if createdAt > timeout threshold
 * </pre>
 *
 * <h3>Idempotency / concurrency safety</h3>
 * Before polling each container the job performs a CAS-style
 * {@code UPDATE … WHERE status = PENDING} to transition it to PROCESSING.
 * If another job run already claimed the row the update returns 0 rows and this
 * execution skips that container — no double-poll, no double-publish.
 *
 * <h3>Sandbox mode</h3>
 * When {@code app.meta.oauth.sandbox=true} the actual Step 2 publish call is skipped
 * and the container ID is treated as the result.
 */
@Component
public class IgContainerPollingJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(IgContainerPollingJob.class);

    private static final String EVENT_PUBLISHED = "CONTENT_PUBLISHED";
    private static final String EVENT_FAILED    = "CONTENT_FAILED";

    private static final Set<IgContainerStatus> ACTIVE_STATUSES =
            Set.of(IgContainerStatus.PENDING, IgContainerStatus.PROCESSING);

    private final IgContainerTrackingRepository igContainerTrackingRepository;
    private final ContentRepository contentRepository;
    private final PlatformTokenCacheService platformTokenCacheService;
    private final MetaClient metaClient;
    private final SnsPublisher snsPublisher;
    private final MetaOAuthProperties metaOAuthProperties;
    private final ObjectMapper objectMapper;
    private final int containerTimeoutMinutes;

    public IgContainerPollingJob(
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

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        List<IgContainerTracking> active = igContainerTrackingRepository.findByStatusIn(ACTIVE_STATUSES);

        if (active.isEmpty()) {
            log.debug("IgContainerPollingJob: no active containers to poll");
            return;
        }

        log.info("IgContainerPollingJob: polling {} container(s)", active.size());

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (IgContainerTracking tracking : active) {
            try {
                pollContainer(tracking, now);
            } catch (Exception e) {
                // Guard: one bad container must never abort the rest of the batch
                log.error("IgContainerPollingJob: unexpected error for contentId: {} — skipping",
                        tracking.getContentId(), e);
            }
        }
    }

    @Transactional(noRollbackFor = Exception.class)
    public void pollContainer(IgContainerTracking tracking, LocalDateTime now) {
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

            case MetaClient.CONTAINER_STATUS_IN_PROGRESS ->
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

    private void markPublished(IgContainerTracking tracking, String resultId, LocalDateTime now) {
        tracking.setStatus(IgContainerStatus.FINISHED);
        tracking.setUpdatedAt(now);
        igContainerTrackingRepository.save(tracking);

        updateContentStatus(tracking.getContentId(), ContentStatus.PUBLISHED, now);
        emitStatusEvent(EVENT_PUBLISHED, tracking.getContentId(), tracking.getOwnerId());
    }

    private void markFailed(IgContainerTracking tracking, String errorMessage, LocalDateTime now) {
        tracking.setStatus(IgContainerStatus.ERROR);
        tracking.setError(errorMessage);
        tracking.setUpdatedAt(now);
        igContainerTrackingRepository.save(tracking);

        updateContentStatus(tracking.getContentId(), ContentStatus.FAILED, now);
        emitStatusEvent(EVENT_FAILED, tracking.getContentId(), tracking.getOwnerId());
    }

    /**
     * Updates the parent {@code content} row's status to reflect the final publishing outcome.
     * Logged but non-fatal if the row is missing — the SNS event is the primary
     * mechanism for status propagation.
     */
    private void updateContentStatus(UUID contentId, ContentStatus newStatus, LocalDateTime now) {
        Optional<Content> contentOpt = contentRepository.findById(contentId);
        if (contentOpt.isEmpty()) {
            log.warn("IgContainerPollingJob: content row not found for contentId: {} — status not updated", contentId);
            return;
        }
        Content content = contentOpt.get();
        content.setStatus(newStatus);
        contentRepository.save(content);
        log.debug("IgContainerPollingJob: content {} status → {}", contentId, newStatus);
    }

    private void emitStatusEvent(String eventType, UUID contentId, UUID ownerId) {
        try {
            ContentPublishedPayload payload = new ContentPublishedPayload(
                    contentId,
                    ownerId,
                    EVENT_PUBLISHED.equals(eventType) ? "PUBLISHED" : "FAILED");
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
