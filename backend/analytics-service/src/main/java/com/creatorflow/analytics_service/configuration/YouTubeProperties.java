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

    /** Base URL for YouTube Data API v3 (channels, commentThreads). Overridable in tests. */
    private String dataApiBaseUrl;

    public String getAnalyticsApiBaseUrl() {
        return analyticsApiBaseUrl;
    }

    public void setAnalyticsApiBaseUrl(String analyticsApiBaseUrl) {
        this.analyticsApiBaseUrl = analyticsApiBaseUrl;
    }

    public String getDataApiBaseUrl() {
        return dataApiBaseUrl;
    }

    public void setDataApiBaseUrl(String dataApiBaseUrl) {
        this.dataApiBaseUrl = dataApiBaseUrl;
    }
}
