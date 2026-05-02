package com.creatorflow.media_service.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds app.meta.oauth.* from application.yml.
 *
 * Required env vars:
 *   INSTAGRAM_CLIENT_ID
 *   INSTAGRAM_CLIENT_SECRET
 *   INSTAGRAM_REDIRECT_URI
 */
@Component
@ConfigurationProperties(prefix = "app.meta.oauth")
public class MetaOAuthProperties {

    private String clientId;
    private String clientSecret;
    private String redirectUri;
    private boolean sandbox;

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public String getClientSecret() { return clientSecret; }
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }

    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }

    public boolean isSandbox() { return sandbox; }
    public void setSandbox(boolean sandbox) { this.sandbox = sandbox; }
}
