package com.creatorflow.media_service.client;

import com.creatorflow.media_service.configuration.MetaOAuthProperties;
import com.creatorflow.media_service.exception.InstagramApiException;
import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * HTTP client for Meta / Instagram Graph API.
 *
 * Handles:
 * - Building Instagram OAuth consent URL
 * - Short-lived token exchange (code → short-lived)
 * - Long-lived token exchange (short-lived → long-lived, valid 60 days)
 * - Long-lived token refresh
 * - Fetching Instagram user info (user_id, username)
 * - Creating media container (step 1 of 2-step publish)
 * - Publishing media container (step 2 of 2-step publish) — skipped in sandbox mode
 *
 * Instagram OAuth flow uses "API setup with Instagram login" (Instagram Business Login):
 *   client_id   : Instagram App ID (INSTAGRAM_CLIENT_ID env var) — NOT the Meta App ID
 *   Consent URL : https://www.instagram.com/oauth/authorize
 *   Short token : POST https://api.instagram.com/oauth/access_token
 *   Long token  : GET  https://graph.instagram.com/access_token
 *   Refresh     : GET  https://graph.instagram.com/refresh_access_token
 *   User info   : GET  https://graph.instagram.com/me
 *   Container   : POST https://graph.instagram.com/v21.0/{userId}/media
 *   Publish     : POST https://graph.instagram.com/v21.0/{userId}/media_publish
 */
@Component
public class MetaClient {

    private static final Logger log = LoggerFactory.getLogger(MetaClient.class);

    // --- OAuth endpoints ---
    // "API setup with Instagram login" uses instagram.com OAuth (not www.facebook.com/dialog/oauth
    // which is the Facebook Login / Business Login for Facebook flow).
    // client_id must be the Instagram App ID (843265858182511), not the Meta App ID.
    private static final String INSTAGRAM_AUTH_URL      = "https://www.instagram.com/oauth/authorize";
    private static final String INSTAGRAM_TOKEN_URL     = "https://api.instagram.com/oauth/access_token";
    private static final String GRAPH_LONG_TOKEN_URL    = "https://graph.instagram.com/access_token";
    private static final String GRAPH_REFRESH_TOKEN_URL = "https://graph.instagram.com/refresh_access_token";

    // --- Graph API endpoints ---
    private static final String GRAPH_ME_URL            = "https://graph.instagram.com/me";
    private static final String GRAPH_MEDIA_URL         = "https://graph.instagram.com/v21.0/%s/media";
    private static final String GRAPH_PUBLISH_URL       = "https://graph.instagram.com/v21.0/%s/media_publish";
    private static final String GRAPH_CONTAINER_URL     = "https://graph.instagram.com/v21.0/%s";

    // --- Container status values returned by Meta ---
    public static final String CONTAINER_STATUS_FINISHED = "FINISHED";
    public static final String CONTAINER_STATUS_ERROR    = "ERROR";
    public static final String CONTAINER_STATUS_IN_PROGRESS = "IN_PROGRESS";

    // --- OAuth params ---
    private static final String RESPONSE_TYPE           = "code";
    private static final String GRANT_TYPE_AUTH_CODE    = "authorization_code";
    private static final String GRANT_TYPE_LONG_LIVED   = "ig_exchange_token";
    private static final String GRANT_TYPE_REFRESH      = "ig_refresh_token";

    // --- Long-lived token expiry (60 days in seconds, with 1 day buffer) ---
    static final long LONG_LIVED_TOKEN_EXPIRY_SECONDS = 60L * 24 * 60 * 60 - 86400L;

    private final MetaOAuthProperties metaOAuthProperties;
    private final RestTemplate restTemplate;

    public MetaClient(MetaOAuthProperties metaOAuthProperties) {
        this.metaOAuthProperties = metaOAuthProperties;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Build Instagram OAuth consent URL.
     * state = ownerId — ties callback back to user without a server session.
     */
    public String buildAuthorizationUrl(String state) {
        // Instagram Business Login (api setup with Instagram login) param shape — must match
        // the "Embed URL" Meta generates in App Dashboard → Instagram → Set up Instagram business login.
        // enable_fb_login=0 and force_authentication=1 are required; response_type=code is also required.
        return UriComponentsBuilder.fromHttpUrl(INSTAGRAM_AUTH_URL)
                .queryParam("enable_fb_login", "0")
                .queryParam("force_authentication", "1")
                .queryParam("client_id", metaOAuthProperties.getClientId())
                .queryParam("redirect_uri", metaOAuthProperties.getRedirectUri())
                .queryParam("response_type", RESPONSE_TYPE)
                .queryParam("scope", String.join(",", metaOAuthProperties.getScopes()))
                .queryParam("state", state)
                .toUriString();
    }

    /**
     * Exchange auth code for a short-lived Instagram user access token (valid ~1 hour).
     *
     * "API setup with Instagram login" issues an Instagram token at api.instagram.com.
     * This is then exchanged for a long-lived token (60 days) in the next step.
     *
     * @throws OAuthTokenExchangeException on Meta error or network failure
     */
    public ShortLivedTokenResponse exchangeCodeForShortLivedToken(String code) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("client_id", metaOAuthProperties.getClientId());
        params.add("client_secret", metaOAuthProperties.getClientSecret());
        params.add("grant_type", GRANT_TYPE_AUTH_CODE);
        params.add("redirect_uri", metaOAuthProperties.getRedirectUri());
        params.add("code", code);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    INSTAGRAM_TOKEN_URL, request, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("access_token")) {
                throw new OAuthTokenExchangeException("Instagram short-lived token exchange returned empty body");
            }
            return new ShortLivedTokenResponse(
                    body.get("access_token").asText(),
                    body.has("user_id") ? body.get("user_id").asText() : null
            );
        } catch (HttpClientErrorException e) {
            log.error("Instagram short-lived token exchange failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new OAuthTokenExchangeException("Instagram short-lived token exchange failed: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Instagram short-lived token exchange network error", e);
            throw new OAuthTokenExchangeException("Instagram short-lived token exchange network error: " + e.getMessage());
        }
    }

    /**
     * Exchange short-lived token for a long-lived token (valid 60 days).
     *
     * @throws OAuthTokenExchangeException on Meta error or network failure
     */
    public LongLivedTokenResponse exchangeForLongLivedToken(String shortLivedToken) {
        String url = UriComponentsBuilder.fromHttpUrl(GRAPH_LONG_TOKEN_URL)
                .queryParam("grant_type", GRANT_TYPE_LONG_LIVED)
                .queryParam("client_secret", metaOAuthProperties.getClientSecret())
                .queryParam("access_token", shortLivedToken)
                .toUriString();

        try {
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("access_token")) {
                throw new OAuthTokenExchangeException("Instagram long-lived token exchange returned empty body");
            }
            long expiresIn = body.has("expires_in") ? body.get("expires_in").asLong() : LONG_LIVED_TOKEN_EXPIRY_SECONDS;
            return new LongLivedTokenResponse(body.get("access_token").asText(), expiresIn);
        } catch (HttpClientErrorException e) {
            log.error("Instagram long-lived token exchange failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new OAuthTokenExchangeException("Instagram long-lived token exchange failed: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Instagram long-lived token exchange network error", e);
            throw new OAuthTokenExchangeException("Instagram long-lived token exchange network error: " + e.getMessage());
        }
    }

    /**
     * Refresh a long-lived token (must be called before it expires in 60 days).
     *
     * @throws OAuthTokenExchangeException on Meta error or network failure
     */
    public LongLivedTokenResponse refreshLongLivedToken(String longLivedToken) {
        String url = UriComponentsBuilder.fromHttpUrl(GRAPH_REFRESH_TOKEN_URL)
                .queryParam("grant_type", GRANT_TYPE_REFRESH)
                .queryParam("access_token", longLivedToken)
                .toUriString();

        try {
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("access_token")) {
                throw new OAuthTokenExchangeException("Instagram token refresh returned empty body");
            }
            long expiresIn = body.has("expires_in") ? body.get("expires_in").asLong() : LONG_LIVED_TOKEN_EXPIRY_SECONDS;
            return new LongLivedTokenResponse(body.get("access_token").asText(), expiresIn);
        } catch (HttpClientErrorException e) {
            log.error("Instagram token refresh failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new OAuthTokenExchangeException("Instagram token refresh failed: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Instagram token refresh network error", e);
            throw new OAuthTokenExchangeException("Instagram token refresh network error: " + e.getMessage());
        }
    }

    /**
     * Fetch Instagram user info (id + username) using a valid access token.
     *
     * @throws InstagramApiException on Graph API error
     */
    public UserInfo fetchUserInfo(String accessToken) {
        String url = UriComponentsBuilder.fromHttpUrl(GRAPH_ME_URL)
                .queryParam("fields", "id,username")
                .queryParam("access_token", accessToken)
                .toUriString();

        try {
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("id")) {
                throw new InstagramApiException("Instagram user info returned empty body");
            }
            return new UserInfo(
                    body.get("id").asText(),
                    body.has("username") ? body.get("username").asText() : null
            );
        } catch (HttpClientErrorException e) {
            log.error("Instagram user info failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InstagramApiException("Failed to fetch Instagram user info: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Instagram user info network error", e);
            throw new InstagramApiException("Instagram user info network error: " + e.getMessage());
        }
    }

    /**
     * Step 1 — Create a media container.
     * For images: provide imageUrl + caption.
     * For videos: provide videoUrl + caption (video must be publicly accessible).
     *
     * @return containerId — used in publishContainer()
     * @throws InstagramApiException on Graph API error
     */
    public String createMediaContainer(String accessToken, String instagramUserId,
                                       String mediaUrl, String caption, boolean isVideo) {
        String url = String.format(GRAPH_MEDIA_URL, instagramUserId);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("access_token", accessToken);
        params.add("caption", caption != null ? caption : "");
        if (isVideo) {
            params.add("media_type", "REELS");
            params.add("video_url", mediaUrl);
        } else {
            params.add("image_url", mediaUrl);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("id")) {
                throw new InstagramApiException("Instagram create container returned empty body");
            }
            String containerId = body.get("id").asText();
            log.info("Instagram container created: containerId={} userId={}", containerId, instagramUserId);
            return containerId;
        } catch (HttpClientErrorException e) {
            log.error("Instagram create container failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InstagramApiException("Failed to create Instagram media container: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Instagram create container network error", e);
            throw new InstagramApiException("Instagram create container network error: " + e.getMessage());
        }
    }

    /**
     * Fetch the processing status of a media container.
     *
     * Meta processes media containers asynchronously after Step 1. You must poll this
     * endpoint until status_code == "FINISHED" before calling publishContainer().
     *
     * Possible status_code values:
     *   FINISHED  — ready to publish
     *   IN_PROGRESS — still processing
     *   ERROR     — processing failed (do not publish)
     *
     * @param accessToken Bearer token for the user
     * @param containerId Container ID returned from createMediaContainer()
     * @return            status_code string from Meta
     * @throws InstagramApiException on Graph API error
     */
    public String getContainerStatus(String accessToken, String containerId) {
        String url = UriComponentsBuilder
                .fromHttpUrl(String.format(GRAPH_CONTAINER_URL, containerId))
                .queryParam("fields", "status_code")
                .queryParam("access_token", accessToken)
                .toUriString();

        try {
            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("status_code")) {
                throw new InstagramApiException(
                        "Instagram container status returned empty body for containerId=" + containerId);
            }
            String status = body.get("status_code").asText();
            log.debug("Instagram container status: containerId={} status={}", containerId, status);
            return status;
        } catch (HttpClientErrorException e) {
            log.error("Instagram container status failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InstagramApiException("Failed to get Instagram container status: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Instagram container status network error", e);
            throw new InstagramApiException("Instagram container status network error: " + e.getMessage());
        }
    }

    /**
     * Step 2 — Publish a media container.
     * Skipped in sandbox mode — caller (InstagramPublishService) handles that gate.
     *
     * @return mediaId — the published post ID on Instagram
     * @throws InstagramApiException on Graph API error
     */
    public String publishContainer(String accessToken, String instagramUserId, String containerId) {
        String url = String.format(GRAPH_PUBLISH_URL, instagramUserId);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("access_token", accessToken);
        params.add("creation_id", containerId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(url, request, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("id")) {
                throw new InstagramApiException("Instagram publish container returned empty body");
            }
            String mediaId = body.get("id").asText();
            log.info("Instagram post published: mediaId={} userId={}", mediaId, instagramUserId);
            return mediaId;
        } catch (HttpClientErrorException e) {
            log.error("Instagram publish container failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new InstagramApiException("Failed to publish Instagram container: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Instagram publish container network error", e);
            throw new InstagramApiException("Instagram publish container network error: " + e.getMessage());
        }
    }

    public record ShortLivedTokenResponse(String accessToken, String instagramUserId) {}
    public record LongLivedTokenResponse(String accessToken, long expiresInSeconds) {}
    public record UserInfo(String instagramUserId, String username) {}
}
