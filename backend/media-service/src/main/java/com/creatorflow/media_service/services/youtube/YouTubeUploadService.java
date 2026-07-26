package com.creatorflow.media_service.services.youtube;

import com.creatorflow.media_service.client.YouTubeClient;
import com.creatorflow.media_service.exception.MediaNotFoundException;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.MediaStatus;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.YouTubePrivacyStatus;
import com.creatorflow.media_service.repository.MediaFileRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import com.creatorflow.media_service.services.S3Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class YouTubeUploadService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeUploadService.class);

    private static final YouTubePrivacyStatus DEFAULT_PRIVACY_STATUS = YouTubePrivacyStatus.PRIVATE;
    private static final String              DEFAULT_DESCRIPTION     = "";

    private final YouTubeOAuthService youTubeOAuthService;
    private final PlatformTokenCacheService platformTokenCacheService;
    private final MediaFileRepository mediaFileRepository;
    private final S3Service s3Service;
    private final YouTubeClient youTubeClient;

    public YouTubeUploadService(YouTubeOAuthService youTubeOAuthService,
                                PlatformTokenCacheService platformTokenCacheService,
                                MediaFileRepository mediaFileRepository,
                                S3Service s3Service,
                                YouTubeClient youTubeClient) {
        this.youTubeOAuthService = youTubeOAuthService;
        this.platformTokenCacheService = platformTokenCacheService;
        this.mediaFileRepository = mediaFileRepository;
        this.s3Service = s3Service;
        this.youTubeClient = youTubeClient;
    }

    /**
     * Upload content to YouTube.
     *
     * Extracts mediaFileId, title, and description from the Content object.
     * Privacy status defaults to PRIVATE — a richer platformTargets parser can override in future.
     *
     * Flow:
     * 1. Validate mediaFileId is present on Content.
     * 2. Verify ownership — 404 if file not found or wrong owner.
     * 3. Verify file is UPLOADED (not PENDING) — 422 if not ready.
     * 4. Refresh YouTube token if near expiry.
     * 5. Fetch token from Redis cache (or DB on miss).
     * 6. Fetch video bytes from S3 — S3FetchException on failure.
     * 7. POST multipart to YouTube videos.insert — YouTubeApiException on failure.
     * 8. Return YouTube video ID.
     *
     * Failure behaviour:
     * - mediaFileId null → IllegalArgumentException → 400
     * - File not found / wrong owner → MediaNotFoundException → 404
     * - File not yet uploaded → IllegalStateException → 422
     * - YouTube not connected → PlatformNotConnectedException → 404
     * - Token refresh failed / revoked → OAuthTokenExchangeException → 502
     * - S3 read failure → S3FetchException → 503
     * - YouTube API error (quota/token/network) → YouTubeApiException → 502
     */
    public String uploadVideo(UUID ownerId, Content content) {
        if (content.getMediaFileId() == null) {
            throw new IllegalArgumentException(
                    "YouTube publish requires a mediaFileId on Content — contentId=" + content.getId());
        }

        MediaFile mediaFile = mediaFileRepository.findByIdAndOwnerId(content.getMediaFileId(), ownerId)
                .orElseThrow(() -> new MediaNotFoundException(content.getMediaFileId()));

        if (mediaFile.getStatus() != MediaStatus.UPLOADED) {
            throw new IllegalStateException(
                    "Media file not yet confirmed as uploaded to S3: " + content.getMediaFileId());
        }

        youTubeOAuthService.refreshTokenIfExpired(ownerId);

        PlatformAccount account = platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE");

        byte[] videoBytes = s3Service.fetchObject(mediaFile.getS3Key());

        String title = content.getTitle();
        String description = content.getDescription() != null ? content.getDescription() : DEFAULT_DESCRIPTION;

        String youtubeVideoId = youTubeClient.uploadVideo(
                account.getAccessToken(),
                videoBytes,
                mediaFile.getMimeType(),
                title,
                description,
                DEFAULT_PRIVACY_STATUS.toApiValue()
        );

        log.info("YouTube upload complete: ownerId={} mediaFileId={} youtubeVideoId={}",
                ownerId, content.getMediaFileId(), youtubeVideoId);

        setThumbnailIfPresent(account.getAccessToken(), youtubeVideoId, content);

        return youtubeVideoId;
    }

    /**
     * CF-96: apply the creator-selected thumbnail after a successful upload.
     * Best-effort — the video is already live on YouTube, so a thumbnail failure
     * (unverified channel, S3 read error, quota) must never fail the publish.
     * YouTube falls back to its auto-generated thumbnail in that case.
     */
    private void setThumbnailIfPresent(String accessToken, String youtubeVideoId, Content content) {
        String thumbnailS3Key = content.getThumbnailS3Key();
        if (thumbnailS3Key == null || thumbnailS3Key.isBlank()) {
            return;
        }
        try {
            byte[] thumbnailBytes = s3Service.fetchObject(thumbnailS3Key);
            youTubeClient.setThumbnail(accessToken, youtubeVideoId, thumbnailBytes);
            log.info("YouTube thumbnail applied: contentId={} videoId={}", content.getId(), youtubeVideoId);
        } catch (Exception e) {
            log.warn("YouTube thumbnail set failed (video published, YouTube auto-thumbnail used) — "
                    + "contentId={} videoId={}: {}", content.getId(), youtubeVideoId, e.getMessage());
        }
    }
}
