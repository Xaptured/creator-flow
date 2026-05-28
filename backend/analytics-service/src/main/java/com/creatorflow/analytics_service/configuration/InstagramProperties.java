package com.creatorflow.analytics_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code app.instagram.*} config block.
 *
 * analytics-service only needs the Graph API base URL — OAuth credentials
 * and token lifecycle are handled entirely by media-service.
 * The access token is read from Redis (written by media-service TokenRefreshJob).
 */
@ConfigurationProperties(prefix = "app.instagram")
public class InstagramProperties {

    /** Base URL for Instagram Graph API. Overridable in tests. */
    private String graphApiBaseUrl;

    public String getGraphApiBaseUrl() {
        return graphApiBaseUrl;
    }

    public void setGraphApiBaseUrl(String graphApiBaseUrl) {
        this.graphApiBaseUrl = graphApiBaseUrl;
    }
}
