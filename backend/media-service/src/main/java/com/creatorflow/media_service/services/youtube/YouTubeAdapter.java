package com.creatorflow.media_service.services.youtube;

import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.ContentRepository;
import com.creatorflow.media_service.services.PlatformAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * PlatformAdapter implementation for YouTube.
 *
 * Delegates entirely to YouTubeOAuthService + YouTubeUploadService.
 * No business logic lives here — thin adapter only.
 *
 * publish() uses content.mediaFileId + content.title + content.description.
 * Privacy status defaults to PRIVATE — a richer platformTargets parser can override this in future.
 */
@Component
public class YouTubeAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(YouTubeAdapter.class);

    private final YouTubeOAuthService youTubeOAuthService;
    private final YouTubeUploadService youTubeUploadService;
    private final ContentRepository contentRepository;

    public YouTubeAdapter(YouTubeOAuthService youTubeOAuthService,
                          YouTubeUploadService youTubeUploadService,
                          ContentRepository contentRepository) {
        this.youTubeOAuthService = youTubeOAuthService;
        this.youTubeUploadService = youTubeUploadService;
        this.contentRepository = contentRepository;
    }

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.YOUTUBE;
    }

    @Override
    public String buildAuthorizationUrl(UUID ownerId) {
        return youTubeOAuthService.buildAuthorizationUrl(ownerId);
    }

    @Override
    public PlatformAccount handleCallback(String code, String state) {
        return youTubeOAuthService.handleCallback(code, state);
    }

    /**
     * Upload content to YouTube.
     *
     * Delegates to YouTubeUploadService.uploadVideo(ownerId, content) which validates
     * mediaFileId, fetches from S3, and uploads to the YouTube channel.
     * Privacy defaults to PRIVATE — can be extended via platformTargets JSON in a future ticket.
     *
     * @return YouTube videoId for inclusion in the CONTENT_PUBLISHED event payload.
     */
    @Override
    @Transactional
    public String publish(UUID ownerId, Content content) {
        String videoId = youTubeUploadService.uploadVideo(ownerId, content);
        content.setPlatformPostId(videoId);
        contentRepository.save(content);
        log.info("YouTube video uploaded: videoId={} ownerId={} contentId={}", videoId, ownerId, content.getId());
        return videoId;
    }
}
