package com.creatorflow.analytics_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code app.youtube.*} config block.
 * Credentials come from env vars YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET.
 */
@ConfigurationProperties(prefix = "app.youtube")
public class YouTubeProperties {

    /** OAuth 2.0 Client ID from Google Cloud Console. */
    private String clientId;

    /** OAuth 2.0 Client Secret from Google Cloud Console. */
    private String clientSecret;

    /** Base URL for YouTube Analytics API. Overridable in tests. */
    private String analyticsApiBaseUrl;

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getAnalyticsApiBaseUrl() {
        return analyticsApiBaseUrl;
    }

    public void setAnalyticsApiBaseUrl(String analyticsApiBaseUrl) {
        this.analyticsApiBaseUrl = analyticsApiBaseUrl;
    }
}
