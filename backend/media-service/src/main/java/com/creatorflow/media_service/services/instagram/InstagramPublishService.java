package com.creatorflow.media_service.services.instagram;

import com.creatorflow.media_service.client.MetaClient;
import com.creatorflow.media_service.configuration.MetaOAuthProperties;
import com.creatorflow.media_service.exception.InstagramApiException;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.repository.MediaFileRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import com.creatorflow.media_service.services.S3Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Handles Instagram content publishing via the 2-step Graph API flow.
 *
 * Publish flow:
 *   Step 1 — POST /{userId}/media         → creates a media container, returns containerId
 *   [poll] — GET /{containerId}?fields=status_code → wait for FINISHED
 *   Step 2 — POST /{userId}/media_publish → publishes the container, returns mediaId
 *
 * Sandbox mode (app.meta.oauth.sandbox=true):
 *   Step 1 runs normally (validates token + media URL).
 *   Polling runs normally (validates Meta can actually reach the URL).
 *   Step 2 is SKIPPED — container ID returned as result.
 *   Use this in dev to avoid App Review requirement for instagram_content_publish.
 *
 * Media delivery:
 *   Instagram's Graph API has no binary upload endpoint — Meta fetches media asynchronously
 *   from a publicly accessible HTTPS URL after Step 1.
 *   A presigned S3 GET URL is used, generated with a 24-hour expiry so it remains valid
 *   during Meta's async fetch window (default S3 GET expiry is only 1 hour, which is
 *   insufficient since Meta may fetch minutes after the container is created).
 *
 * Container polling:
 *   After Step 1, Meta processes the media asynchronously (downloading, transcoding).
 *   The container's status_code must be FINISHED before Step 2 is safe to call.
 *   If status is ERROR, or FINISHED is not reached within the timeout, the publish fails.
 */
@Service
public class InstagramPublishService {

    private static final Logger log = LoggerFactory.getLogger(InstagramPublishService.class);

    /** Presigned URL validity for Instagram publish — must outlive Meta's async fetch window. */
    private static final Duration INSTAGRAM_URL_EXPIRY = Duration.ofHours(24);

    /** How long to wait between status polls. */
    private static final long POLL_INTERVAL_MS = 2_000L;

    /** Maximum total time to wait for Meta to process the container before giving up. */
    private static final long POLL_TIMEOUT_MS = 30_000L;

    private final MetaClient metaClient;
    private final InstagramOAuthService instagramOAuthService;
    private final PlatformTokenCacheService platformTokenCacheService;
    private final MetaOAuthProperties metaOAuthProperties;
    private final S3Service s3Service;
    private final MediaFileRepository mediaFileRepository;

    public InstagramPublishService(MetaClient metaClient,
                                   InstagramOAuthService instagramOAuthService,
                                   PlatformTokenCacheService platformTokenCacheService,
                                   MetaOAuthProperties metaOAuthProperties,
                                   S3Service s3Service,
                                   MediaFileRepository mediaFileRepository) {
        this.metaClient = metaClient;
        this.instagramOAuthService = instagramOAuthService;
        this.platformTokenCacheService = platformTokenCacheService;
        this.metaOAuthProperties = metaOAuthProperties;
        this.s3Service = s3Service;
        this.mediaFileRepository = mediaFileRepository;
    }

    /**
     * Publish content to Instagram.
     *
     * @param ownerId  Keycloak UUID of the creator
     * @param content  Content entity — mediaFileId must be set, title used as caption
     * @return         Published mediaId (or containerId in sandbox mode)
     */
    public String publish(UUID ownerId, Content content) {
        instagramOAuthService.refreshTokenIfExpired(ownerId);

        PlatformAccount account = platformTokenCacheService.getPlatformAccount(ownerId, "INSTAGRAM");

        String instagramUserId = account.getPlatformUserId();
        if (instagramUserId == null || instagramUserId.isBlank()) {
            throw new IllegalStateException(
                    "Instagram user ID not stored for ownerId=" + ownerId + " — re-connect required");
        }

        if (content.getMediaFileId() == null) {
            throw new IllegalArgumentException(
                    "Instagram publish requires a mediaFileId on Content — contentId=" + content.getId());
        }

        MediaFile mediaFile = mediaFileRepository.findByIdAndOwnerId(content.getMediaFileId(), ownerId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "MediaFile not found or does not belong to owner: mediaFileId="
                                + content.getMediaFileId() + " ownerId=" + ownerId));

        String mediaUrl = s3Service.generateGetUrl(mediaFile.getS3Key(), INSTAGRAM_URL_EXPIRY)
                .url().toString();
        String caption = content.getTitle();
        boolean isVideo = isVideoMimeType(mediaFile.getMimeType());

        log.info("Instagram publish step 1: ownerId={} contentId={} mediaFileId={} isVideo={}",
                ownerId, content.getId(), mediaFile.getId(), isVideo);

        String containerId = metaClient.createMediaContainer(
                account.getAccessToken(), instagramUserId, mediaUrl, caption, isVideo);

        waitForContainerReady(account.getAccessToken(), containerId, ownerId, content.getId());

        if (metaOAuthProperties.isSandbox()) {
            log.info("SANDBOX MODE: Instagram publish step 2 skipped. containerId={} ownerId={} contentId={}",
                    containerId, ownerId, content.getId());
            return containerId;
        }

        String mediaId = metaClient.publishContainer(account.getAccessToken(), instagramUserId, containerId);
        log.info("Instagram published: mediaId={} ownerId={} contentId={}", mediaId, ownerId, content.getId());
        return mediaId;
    }

    /**
     * Poll the container's status_code until it is FINISHED, ERROR, or timeout is reached.
     *
     * @throws InstagramApiException if status is ERROR or FINISHED not reached within timeout
     *
     * TODO: Replace this synchronous polling with an async job pattern.
     *
     * Current problem: this method blocks the HTTP request thread for up to POLL_TIMEOUT_MS (30s),
     * risking gateway timeouts and thread starvation under load.
     *
     * Proposed async flow:
     *   1. POST /api/publish/instagram returns 202 Accepted immediately after Step 1 (container created).
     *      Response includes containerId so the caller can track progress.
     *   2. An async job (Spring @Scheduled or SQS-triggered) polls getContainerStatus() for all
     *      IN_PROGRESS containers — e.g. every 5 seconds.
     *   3. When a container reaches FINISHED, the job calls publishContainer() (Step 2) and marks
     *      the Content record as PUBLISHED.
     *   4. When a container reaches ERROR, the job marks the Content record as FAILED and
     *      notifies the creator.
     *
     * This aligns with the broader SQS-driven content dispatch flow where the scheduler-service
     * enqueues publish jobs and media-service processes them asynchronously.
     */
    private void waitForContainerReady(String accessToken, String containerId, UUID ownerId, UUID contentId) {
        long deadline = System.currentTimeMillis() + POLL_TIMEOUT_MS;
        int attempt = 0;

        while (System.currentTimeMillis() < deadline) {
            attempt++;
            String status = metaClient.getContainerStatus(accessToken, containerId);

            if (MetaClient.CONTAINER_STATUS_FINISHED.equals(status)) {
                log.info("Instagram container ready: containerId={} attempts={} ownerId={} contentId={}",
                        containerId, attempt, ownerId, contentId);
                return;
            }

            if (MetaClient.CONTAINER_STATUS_ERROR.equals(status)) {
                throw new InstagramApiException(
                        "Instagram container processing failed (status=ERROR): containerId=" + containerId
                                + " ownerId=" + ownerId);
            }

            log.debug("Instagram container not ready yet: containerId={} status={} attempt={}", containerId, status, attempt);

            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new InstagramApiException(
                        "Interrupted while waiting for Instagram container: containerId=" + containerId);
            }
        }

        throw new InstagramApiException(
                "Timed out waiting for Instagram container to be ready after " + POLL_TIMEOUT_MS + "ms"
                        + ": containerId=" + containerId + " ownerId=" + ownerId);
    }

    private boolean isVideoMimeType(String mimeType) {
        return mimeType != null && mimeType.startsWith("video/");
    }
}
