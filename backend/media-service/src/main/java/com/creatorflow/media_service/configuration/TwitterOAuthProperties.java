package com.creatorflow.media_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds app.twitter.oauth.* from application.yml.
 *
 * Required env vars:
 *   TWITTER_CLIENT_ID
 *   TWITTER_CLIENT_SECRET
 *   TWITTER_REDIRECT_URI
 */
@Component
@ConfigurationProperties(prefix = "app.twitter.oauth")
public class TwitterOAuthProperties {

    private String clientId;
    private String clientSecret;
    private String redirectUri;

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }
}
