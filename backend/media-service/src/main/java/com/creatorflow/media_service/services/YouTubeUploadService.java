package com.creatorflow.media_service.services;

import com.creatorflow.media_service.client.YouTubeClient;
import com.creatorflow.media_service.exception.MediaNotFoundException;
import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.MediaStatus;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.YouTubePrivacyStatus;
import com.creatorflow.media_service.repository.MediaFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class YouTubeUploadService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeUploadService.class);

    private static final YouTubePrivacyStatus DEFAULT_PRIVACY_STATUS = YouTubePrivacyStatus.PRIVATE;
    private static final String DEFAULT_DESCRIPTION                  = "";

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
     * Upload an S3 media file to YouTube.
     *
     * Flow:
     * 1. Verify ownership — 404 if file not found or wrong owner.
     * 2. Verify file is UPLOADED (not PENDING) — 422 if not ready.
     * 3. Refresh YouTube token if near expiry.
     * 4. Fetch token from Redis cache (or DB on miss).
     * 5. Fetch video bytes from S3 — S3FetchException on failure.
     * 6. POST multipart to YouTube videos.insert — YouTubeApiException on failure.
     * 7. Return YouTube video ID.
     *
     * Failure behaviour:
     * - File not found / wrong owner → MediaNotFoundException → 404
     * - File not yet uploaded → IllegalStateException → 422
     * - YouTube not connected → PlatformNotConnectedException → 404
     * - Token refresh failed / revoked → OAuthTokenExchangeException → 502
     * - S3 read failure → S3FetchException → 503
     * - YouTube API error (quota/token/network) → YouTubeApiException → 502
     */
    public String uploadVideo(UUID ownerId, UUID mediaFileId, String title,
                              String description, YouTubePrivacyStatus privacyStatus) {
        // Ownership enforced — never fetch by ID alone
        MediaFile mediaFile = mediaFileRepository.findByIdAndOwnerId(mediaFileId, ownerId)
                .orElseThrow(() -> new MediaNotFoundException(mediaFileId));

        if (mediaFile.getStatus() != MediaStatus.UPLOADED) {
            throw new IllegalStateException(
                    "Media file not yet confirmed as uploaded to S3: " + mediaFileId);
        }

        youTubeOAuthService.refreshTokenIfExpired(ownerId);

        PlatformAccount account = platformTokenCacheService.getPlatformAccount(ownerId, "YOUTUBE");

        byte[] videoBytes = s3Service.fetchObject(mediaFile.getS3Key());

        YouTubePrivacyStatus resolvedPrivacy = privacyStatus != null ? privacyStatus : DEFAULT_PRIVACY_STATUS;

        String youtubeVideoId = youTubeClient.uploadVideo(
                account.getAccessToken(),
                videoBytes,
                mediaFile.getMimeType(),
                title,
                description != null ? description : DEFAULT_DESCRIPTION,
                resolvedPrivacy.toApiValue()
        );

        log.info("YouTube upload complete: ownerId={} mediaFileId={} youtubeVideoId={}",
                ownerId, mediaFileId, youtubeVideoId);
        return youtubeVideoId;
    }
}
