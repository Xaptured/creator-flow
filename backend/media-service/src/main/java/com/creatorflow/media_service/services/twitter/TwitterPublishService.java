package com.creatorflow.media_service.services.twitter;

import com.creatorflow.media_service.client.TwitterClient;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.MediaFile;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.repository.MediaFileRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import com.creatorflow.media_service.services.S3Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Handles posting tweets via Twitter API v2.
 *
 * Publish flow:
 *   1. Refresh token if near expiry
 *   2. Fetch token from Redis cache (or DB on miss)
 *   3. If Content has a mediaFileId — fetch bytes from S3, upload to Twitter media endpoint
 *   4. POST /2/tweets with Bearer token (+ media_id if media was uploaded)
 *
 * Tweet text: content.title (max 280 chars — truncated with ellipsis if over limit).
 *
 * Media upload:
 *   Uses Twitter's v1.1 simple upload (POST https://upload.twitter.com/1.1/media/upload.json).
 *   Suitable for images and small videos (< 5 MB).
 *   Large video chunked upload (INIT/APPEND/FINALIZE) is a TODO for a future ticket.
 *
 * Failure behaviour:
 *   - Twitter not connected → PlatformNotConnectedException → 404
 *   - Token refresh failed → OAuthTokenExchangeException → 502
 *   - S3 fetch failed → S3FetchException → 502
 *   - Twitter media upload failed → TwitterApiException → 502
 *   - Twitter post failed → TwitterApiException → 502
 */
@Service
public class TwitterPublishService {

    private static final Logger log = LoggerFactory.getLogger(TwitterPublishService.class);

    private static final int    MAX_TWEET_LENGTH        = 280;
    private static final String ELLIPSIS                = "...";

    /**
     * Twitter simple upload (v1.1) limit — 5 MB for images, effectively also the practical
     * limit for small videos before chunked INIT/APPEND/FINALIZE is required.
     * Large videos must use chunked upload (TODO: future ticket).
     */
    private static final long   SIMPLE_UPLOAD_MAX_BYTES = 5L * 1024 * 1024; // 5 MB

    private final TwitterClient twitterClient;
    private final TwitterOAuthService twitterOAuthService;
    private final PlatformTokenCacheService platformTokenCacheService;
    private final S3Service s3Service;
    private final MediaFileRepository mediaFileRepository;

    public TwitterPublishService(TwitterClient twitterClient,
                                 TwitterOAuthService twitterOAuthService,
                                 PlatformTokenCacheService platformTokenCacheService,
                                 S3Service s3Service,
                                 MediaFileRepository mediaFileRepository) {
        this.twitterClient = twitterClient;
        this.twitterOAuthService = twitterOAuthService;
        this.platformTokenCacheService = platformTokenCacheService;
        this.s3Service = s3Service;
        this.mediaFileRepository = mediaFileRepository;
    }

    /**
     * Post a tweet on behalf of the creator.
     * Attaches media if content.mediaFileId is set.
     *
     * @param ownerId Keycloak UUID of the creator
     * @param content Content entity — title used as tweet text, mediaFileId optional
     * @return        Tweet ID of the created tweet
     */
    public String publish(UUID ownerId, Content content) {
        twitterOAuthService.refreshTokenIfExpired(ownerId);

        PlatformAccount account = platformTokenCacheService.getPlatformAccount(ownerId, "TWITTER");
        String tweetText = truncateToTweetLimit(content.getTitle());

        String twitterMediaId = null;
        if (content.getMediaFileId() != null) {
            twitterMediaId = uploadMediaFromS3(account.getAccessToken(), content.getMediaFileId(), ownerId);
        }

        String tweetId = twitterClient.postTweet(account.getAccessToken(), tweetText, twitterMediaId);
        log.info("Twitter published: tweetId={} ownerId={} contentId={} hasMedia={}",
                tweetId, ownerId, content.getId(), twitterMediaId != null);
        return tweetId;
    }

    private String uploadMediaFromS3(String accessToken, UUID mediaFileId, UUID ownerId) {
        MediaFile mediaFile = mediaFileRepository.findByIdAndOwnerId(mediaFileId, ownerId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "MediaFile not found or does not belong to owner: mediaFileId="
                                + mediaFileId + " ownerId=" + ownerId));

        if (mediaFile.getSizeBytes() != null && mediaFile.getSizeBytes() > SIMPLE_UPLOAD_MAX_BYTES) {
            throw new IllegalArgumentException(
                    "Media file exceeds 5 MB simple upload limit for Twitter. " +
                    "File size: " + (mediaFile.getSizeBytes() / (1024 * 1024)) + " MB. " +
                    "Large video upload (chunked INIT/APPEND/FINALIZE) is not yet supported.");
        }

        byte[] mediaBytes = s3Service.fetchObject(mediaFile.getS3Key());
        log.info("Fetched media from S3 for Twitter upload: s3Key={} bytes={}", mediaFile.getS3Key(), mediaBytes.length);

        return twitterClient.uploadMedia(accessToken, mediaBytes, mediaFile.getMimeType());
    }

    private String truncateToTweetLimit(String text) {
        if (text == null) {
            return "";
        }
        if (text.length() <= MAX_TWEET_LENGTH) {
            return text;
        }
        return text.substring(0, MAX_TWEET_LENGTH - ELLIPSIS.length()) + ELLIPSIS;
    }
}
