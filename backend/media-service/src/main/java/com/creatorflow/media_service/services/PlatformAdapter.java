package com.creatorflow.media_service.services;

import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

/**
 * Unified interface for all social platform integrations.
 *
 * Each platform (YouTube, Instagram, Twitter) implements this interface.
 * PlatformAdapterRegistry holds all implementations and dispatches by PlatformType.
 *
 * connect()      — builds OAuth consent URL, redirects user
 * handleCallback() — exchanges auth code for tokens, persists PlatformAccount
 * publish()      — publishes content to the platform
 * fetchMetrics() — stub for analytics (returns empty map until analytics ticket)
 */
public interface PlatformAdapter {

    PlatformType getPlatformType();

    String buildAuthorizationUrl(UUID ownerId);

    PlatformAccount handleCallback(String code, String state);

    void publish(UUID ownerId, Content content);

    default Map<String, Object> fetchMetrics(UUID ownerId) {
        return Collections.emptyMap();
    }
}
