package com.creatorflow.analytics_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code app.youtube.*} config block.
 *
 */
@ConfigurationProperties(prefix = "app.youtube")
public class YouTubeProperties {

    /** Base URL for YouTube Analytics API. Overridable in tests. */
    private String analyticsApiBaseUrl;

    public String getAnalyticsApiBaseUrl() {
        return analyticsApiBaseUrl;
    }

    public void setAnalyticsApiBaseUrl(String analyticsApiBaseUrl) {
        this.analyticsApiBaseUrl = analyticsApiBaseUrl;
    }
}
