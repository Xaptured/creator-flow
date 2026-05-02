package com.creatorflow.media_service.services.instagram;

import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.services.PlatformAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * PlatformAdapter implementation for Instagram.
 *
 * Thin adapter — delegates to InstagramOAuthService + InstagramPublishService.
 * Registered automatically in PlatformAdapterRegistry via Spring bean collection.
 */
@Component
public class InstagramAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(InstagramAdapter.class);

    private final InstagramOAuthService instagramOAuthService;
    private final InstagramPublishService instagramPublishService;

    public InstagramAdapter(InstagramOAuthService instagramOAuthService,
                            InstagramPublishService instagramPublishService) {
        this.instagramOAuthService = instagramOAuthService;
        this.instagramPublishService = instagramPublishService;
    }

    @Override
    public PlatformType getPlatformType() {
        return PlatformType.INSTAGRAM;
    }

    @Override
    public String buildAuthorizationUrl(UUID ownerId) {
        return instagramOAuthService.buildAuthorizationUrl(ownerId);
    }

    @Override
    public PlatformAccount handleCallback(String code, String state) {
        return instagramOAuthService.handleCallback(code, state);
    }

    @Override
    public void publish(UUID ownerId, Content content) {
        String result = instagramPublishService.publish(ownerId, content);
        log.info("InstagramAdapter.publish done: ownerId={} contentId={} result={}", ownerId, content.getId(), result);
    }
}
