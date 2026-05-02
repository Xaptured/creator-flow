package com.creatorflow.media_service.services.twitter;

import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.services.PlatformAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * PlatformAdapter implementation for Twitter.
 *
 * Thin adapter — delegates to TwitterOAuthService + TwitterPublishService.
 * Registered automatically in PlatformAdapterRegistry via Spring bean collection.
 */
@Component
public class TwitterAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(TwitterAdapter.class);

    private final TwitterOAuthService twitterOAuthService;
    private final TwitterPublishService twitterPublishService;

    public TwitterAdapter(TwitterOAuthService twitterOAuthService,
                          TwitterPublishService twitterPublishService) {
        this.twitterOAuthService = twitterOAuthService;
        this.twitterPublishService = twitterPublishService;
    }

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.TWITTER;
    }

    @Override
    public String buildAuthorizationUrl(UUID ownerId) {
        return twitterOAuthService.buildAuthorizationUrl(ownerId);
    }

    @Override
    public PlatformAccount handleCallback(String code, String state) {
        return twitterOAuthService.handleCallback(code, state);
    }

    @Override
    public void publish(UUID ownerId, Content content) {
        String tweetId = twitterPublishService.publish(ownerId, content);
        log.info("TwitterAdapter.publish done: ownerId={} contentId={} tweetId={}", ownerId, content.getId(), tweetId);
    }
}
