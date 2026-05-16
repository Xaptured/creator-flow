package com.creatorflow.media_service.services.instagram;

import com.creatorflow.media_service.client.MetaClient;
import com.creatorflow.media_service.configuration.MetaOAuthProperties;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.IgContainerStatus;
import com.creatorflow.media_service.model.IgContainerTracking;
import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.repository.IgContainerTrackingRepository;
import com.creatorflow.media_service.repository.MediaFileRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import com.creatorflow.media_service.services.S3Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.UUID;

/**
 * Handles Step 1 of the Instagram async publishing flow.
 *
 * <h3>Publish flow</h3>
 * 
 * <pre>
 *   Step 1 (this service) — POST /{userId}/media → creates a media container.
 *                           A new {@link IgContainerTracking} row is saved with status=PENDING.
 *                           Returns immediately (non-blocking).
 *
 *   Step 2 (polling job)  — {@link com.creatorflow.media_service.jobs.IgContainerPollingJob}
 *                           polls GET /{containerId}?fields=status_code every ~30s until
 *                           Instagram reports FINISHED, then calls POST /{userId}/media_publish
 *                           and emits CONTENT_PUBLISHED / CONTENT_FAILED.
 * </pre>
 *
 * <h3>Why a separate tracking table?</h3>
 * Container state is Instagram-specific. Keeping it in
 * {@code ig_container_tracking} means
 * the shared {@code content} table stays platform-agnostic — YouTube and
 * Twitter rows are
 * completely unaffected.
 *
 * <h3>Sandbox mode</h3>
 * When {@code app.meta.oauth.sandbox=true}, Step 2 is skipped by the polling
 * job.
 *
 * <h3>Media delivery</h3>
 * Instagram has no binary upload endpoint — Meta fetches media asynchronously
 * from a
 * publicly accessible HTTPS URL after Step 1. A presigned S3 GET URL with a
 * 24-hour
 * expiry is used to ensure it remains valid during Meta's async fetch window.
 */
@Service
public class InstagramPublishService {

        private static final Logger log = LoggerFactory.getLogger(InstagramPublishService.class);

        /**
         * Presigned URL validity — must outlive Meta's async fetch window (typically
         * minutes).
         */
        private static final Duration INSTAGRAM_URL_EXPIRY = Duration.ofHours(24);

        private final MetaClient metaClient;
        private final InstagramOAuthService instagramOAuthService;
        private final PlatformTokenCacheService platformTokenCacheService;
        private final MetaOAuthProperties metaOAuthProperties;
        private final S3Service s3Service;
        private final MediaFileRepository mediaFileRepository;
        private final IgContainerTrackingRepository igContainerTrackingRepository;

        public InstagramPublishService(MetaClient metaClient,
                        InstagramOAuthService instagramOAuthService,
                        PlatformTokenCacheService platformTokenCacheService,
                        MetaOAuthProperties metaOAuthProperties,
                        S3Service s3Service,
                        MediaFileRepository mediaFileRepository,
                        IgContainerTrackingRepository igContainerTrackingRepository) {
                this.metaClient = metaClient;
                this.instagramOAuthService = instagramOAuthService;
                this.platformTokenCacheService = platformTokenCacheService;
                this.metaOAuthProperties = metaOAuthProperties;
                this.s3Service = s3Service;
                this.mediaFileRepository = mediaFileRepository;
                this.igContainerTrackingRepository = igContainerTrackingRepository;
        }

        /**
         * Step 1 of the Instagram publish flow: creates the media container and records
         * it in {@code ig_container_tracking}.
         *
         * <p>
         * After this method returns, a new {@link IgContainerTracking} row exists with
         * {@code status = PENDING}.
         * {@link com.creatorflow.media_service.jobs.IgContainerPollingJob}
         * picks it up on the next poll cycle and handles Step 2.
         *
         * <p>
         * <b>Important:</b> because publishing is not complete when this returns, the
         * caller
         * ({@link com.creatorflow.media_service.services.dispatcher.PublishDispatcherProcessor})
         * must NOT emit {@code CONTENT_PUBLISHED} — it detects the async path by
         * checking
         * whether an {@link IgContainerTracking} row was created for this content.
         *
         * @param ownerId Keycloak UUID of the creator
         * @param content Content entity — mediaFileId must be set, title used as
         *                caption
         */
        @Transactional
        public void publish(UUID ownerId, Content content) {
                instagramOAuthService.refreshTokenIfExpired(ownerId);

                PlatformAccount account = platformTokenCacheService.getPlatformAccount(ownerId, "INSTAGRAM");

                String instagramUserId = account.getPlatformUserId();
                if (instagramUserId == null || instagramUserId.isBlank()) {
                        throw new IllegalStateException(
                                        "Instagram user ID not stored for ownerId=" + ownerId
                                                        + " — re-connect required");
                }

                if (content.getMediaFileId() == null) {
                        throw new IllegalArgumentException(
                                        "Instagram publish requires a mediaFileId on Content — contentId="
                                                        + content.getId());
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

                IgContainerTracking tracking = new IgContainerTracking();
                tracking.setContentId(content.getId());
                tracking.setOwnerId(ownerId);
                tracking.setContainerId(containerId);
                tracking.setStatus(IgContainerStatus.PENDING);
                igContainerTrackingRepository.save(tracking);

                log.info("Instagram container recorded — contentId={} containerId={} — polling job will complete publish",
                                content.getId(), containerId);
        }

        private boolean isVideoMimeType(String mimeType) {
                return mimeType != null && mimeType.startsWith("video/");
        }
}
