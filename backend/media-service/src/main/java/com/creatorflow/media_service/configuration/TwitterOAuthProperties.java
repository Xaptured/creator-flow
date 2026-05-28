package com.creatorflow.media_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Binds app.twitter.oauth.* from application.yml.
 *
 * Required env vars:
 *   TWITTER_CLIENT_ID
 *   TWITTER_CLIENT_SECRET
 *   TWITTER_REDIRECT_URI
 *   TWITTER_SCOPES
 */
@Component
@ConfigurationProperties(prefix = "app.twitter.oauth")
public class TwitterOAuthProperties {

    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private List<String> scopes;

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }

    public List<String> getScopes() { return scopes; }
    public void setScopes(List<String> scopes) { this.scopes = scopes; }
}
