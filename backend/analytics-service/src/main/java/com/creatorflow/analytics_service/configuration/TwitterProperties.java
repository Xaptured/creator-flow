package com.creatorflow.analytics_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code app.twitter.*} config block.
 *
 * analytics-service only needs the API base URL — OAuth credentials
 * and token lifecycle are handled entirely by scheduler-service's TokenRefreshJob.
 * The access token is read from Redis at key {@code oauth:{ownerId}:twitter:access_token}.
 */
@ConfigurationProperties(prefix = "app.twitter")
public class TwitterProperties {

    /** Base URL for Twitter API v2. Overridable in tests. */
    private String apiBaseUrl;

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public void setApiBaseUrl(String apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
    }
}
