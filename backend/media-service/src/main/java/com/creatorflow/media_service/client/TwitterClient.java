package com.creatorflow.media_service.client;

import com.creatorflow.media_service.configuration.TwitterOAuthProperties;
import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.creatorflow.media_service.exception.TwitterApiException;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * HTTP client for Twitter API v2.
 *
 * Handles:
 * - PKCE code verifier + challenge generation
 * - Building Twitter OAuth 2.0 consent URL
 * - Token exchange (code + verifier → access + refresh tokens)
 * - Token refresh
 * - Fetching Twitter user info
 * - Posting tweets (POST /2/tweets)
 *
 * Twitter OAuth 2.0 PKCE flow:
 *   Consent URL  : https://twitter.com/i/oauth2/authorize
 *   Token URL    : https://api.twitter.com/2/oauth2/token
 *   Tweets URL   : https://api.twitter.com/2/tweets
 *   User info    : https://api.twitter.com/2/users/me
 *
 * PKCE:
 *   code_verifier  = 32 random bytes → Base64URL encoded (no padding)
 *   code_challenge = SHA-256(code_verifier) → Base64URL encoded (no padding)
 *   code_challenge_method = S256
 *
 * The code_verifier is stored in Redis (keyed by state nonce) between
 * connect and callback by TwitterOAuthService.
 */
@Component
public class TwitterClient {

    private static final Logger log = LoggerFactory.getLogger(TwitterClient.class);

    // --- OAuth endpoints ---
    private static final String TWITTER_AUTH_URL    = "https://twitter.com/i/oauth2/authorize";
    private static final String TWITTER_TOKEN_URL   = "https://api.twitter.com/2/oauth2/token";

    // --- API endpoints ---
    private static final String TWITTER_TWEETS_URL  = "https://api.twitter.com/2/tweets";
    private static final String TWITTER_ME_URL      = "https://api.twitter.com/2/users/me";
    private static final String TWITTER_MEDIA_URL   = "https://upload.twitter.com/1.1/media/upload.json";

    // --- OAuth params ---
    private static final String RESPONSE_TYPE       = "code";
    private static final String CODE_CHALLENGE_METHOD = "S256";
    private static final String GRANT_TYPE_AUTH_CODE  = "authorization_code";
    private static final String GRANT_TYPE_REFRESH    = "refresh_token";
    private static final String SCOPES              = "tweet.read tweet.write users.read offline.access";

    // --- PKCE ---
    private static final int CODE_VERIFIER_BYTE_LENGTH = 32;

    private final TwitterOAuthProperties twitterOAuthProperties;
    private final RestTemplate restTemplate;

    public TwitterClient(TwitterOAuthProperties twitterOAuthProperties) {
        this.twitterOAuthProperties = twitterOAuthProperties;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Generate a cryptographically random code verifier (Base64URL, no padding).
     * Store this in Redis — needed at callback time to complete PKCE exchange.
     */
    public String generateCodeVerifier() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[CODE_VERIFIER_BYTE_LENGTH];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Derive code challenge from verifier: SHA-256 → Base64URL (no padding).
     */
    public String generateCodeChallenge(String codeVerifier) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available — JVM issue", e);
        }
    }

    /**
     * Build Twitter OAuth 2.0 PKCE consent URL.
     *
     * @param state         random nonce (used to look up code_verifier in Redis at callback)
     * @param codeChallenge SHA-256 of code_verifier, Base64URL encoded
     */
    public String buildAuthorizationUrl(String state, String codeChallenge) {
        return UriComponentsBuilder.fromHttpUrl(TWITTER_AUTH_URL)
                .queryParam("response_type", RESPONSE_TYPE)
                .queryParam("client_id", twitterOAuthProperties.getClientId())
                .queryParam("redirect_uri", twitterOAuthProperties.getRedirectUri())
                .queryParam("scope", SCOPES)
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", CODE_CHALLENGE_METHOD)
                .toUriString();
    }

    /**
     * Exchange auth code + PKCE verifier for access + refresh tokens.
     *
     * Uses HTTP Basic auth: Base64(clientId:clientSecret).
     *
     * @throws OAuthTokenExchangeException on Twitter error or network failure
     */
    public TokenResponse exchangeCodeForTokens(String code, String codeVerifier) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", GRANT_TYPE_AUTH_CODE);
        params.add("code", code);
        params.add("redirect_uri", twitterOAuthProperties.getRedirectUri());
        params.add("code_verifier", codeVerifier);

        return postForTokens(params, "exchange auth code for tokens");
    }

    /**
     * Refresh access token using refresh token.
     *
     * @throws OAuthTokenExchangeException on Twitter error or network failure
     */
    public TokenResponse refreshAccessToken(String refreshToken) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", GRANT_TYPE_REFRESH);
        params.add("refresh_token", refreshToken);

        return postForTokens(params, "refresh access token");
    }

    private TokenResponse postForTokens(MultiValueMap<String, String> params, String operation) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(twitterOAuthProperties.getClientId(), twitterOAuthProperties.getClientSecret());
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    TWITTER_TOKEN_URL, request, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("access_token")) {
                throw new OAuthTokenExchangeException("Twitter " + operation + " returned empty body");
            }
            long expiresIn = body.has("expires_in") ? body.get("expires_in").asLong() : 7200L;
            String refreshToken = body.has("refresh_token") ? body.get("refresh_token").asText() : null;
            return new TokenResponse(body.get("access_token").asText(), refreshToken, expiresIn);
        } catch (HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            log.error("Twitter {} failed: status={} body={}", operation, e.getStatusCode(), responseBody);
            boolean isInvalidGrant = responseBody.contains("\"invalid_request\"")
                    && responseBody.contains("token was invalid");
            throw new OAuthTokenExchangeException(
                    "Twitter " + operation + " failed: " + e.getMessage(), e, isInvalidGrant);
        } catch (RestClientException e) {
            log.error("Twitter {} network error", operation, e);
            throw new OAuthTokenExchangeException("Twitter " + operation + " network error: " + e.getMessage());
        }
    }

    /**
     * Fetch Twitter user info (id + username).
     *
     * @throws TwitterApiException on API error
     */
    public UserInfo fetchUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    TWITTER_ME_URL, org.springframework.http.HttpMethod.GET, request, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("data")) {
                throw new TwitterApiException("Twitter user info returned empty body");
            }
            JsonNode data = body.get("data");
            return new UserInfo(data.get("id").asText(), data.get("username").asText());
        } catch (HttpClientErrorException e) {
            log.error("Twitter user info failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new TwitterApiException("Failed to fetch Twitter user info: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Twitter user info network error", e);
            throw new TwitterApiException("Twitter user info network error: " + e.getMessage());
        }
    }

    /**
     * Upload media bytes to Twitter's v1.1 media upload endpoint.
     *
     * Simple upload — suitable for images and small videos (< 5 MB).
     * For large videos (> 5 MB), chunked upload (INIT/APPEND/FINALIZE) would be required.
     *
     * @param accessToken Bearer token for the user
     * @param mediaBytes  Raw bytes of the media file
     * @param mimeType    MIME type (e.g. "image/jpeg", "video/mp4")
     * @return            media_id_string to attach to a tweet
     * @throws TwitterApiException on API error
     */
    public String uploadMedia(String accessToken, byte[] mediaBytes, String mimeType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(accessToken);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("media_data", Base64.getEncoder().encodeToString(mediaBytes));
        body.add("media_type", mimeType);

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    TWITTER_MEDIA_URL, request, JsonNode.class);
            JsonNode responseBody = response.getBody();
            if (responseBody == null || !responseBody.has("media_id_string")) {
                throw new TwitterApiException("Twitter media upload returned empty body");
            }
            String mediaId = responseBody.get("media_id_string").asText();
            log.info("Twitter media uploaded: mediaId={} mimeType={}", mediaId, mimeType);
            return mediaId;
        } catch (HttpClientErrorException e) {
            log.error("Twitter media upload failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new TwitterApiException("Failed to upload media to Twitter: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Twitter media upload network error", e);
            throw new TwitterApiException("Twitter media upload network error: " + e.getMessage());
        }
    }

    /**
     * Post a tweet on behalf of the authenticated user.
     *
     * @param accessToken   Bearer token for the user
     * @param text          Tweet text (max 280 chars)
     * @param mediaIdString Optional Twitter media_id_string to attach (null for text-only)
     * @return              Tweet ID of the created tweet
     * @throws TwitterApiException on API error
     */
    public String postTweet(String accessToken, String text, String mediaIdString) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        String body;
        if (mediaIdString != null && !mediaIdString.isBlank()) {
            body = "{\"text\": " + escapeJson(text)
                    + ", \"media\": {\"media_ids\": [" + escapeJson(mediaIdString) + "]}}";
        } else {
            body = "{\"text\": " + escapeJson(text) + "}";
        }

        HttpEntity<String> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    TWITTER_TWEETS_URL, request, JsonNode.class);
            JsonNode responseBody = response.getBody();
            if (responseBody == null || !responseBody.has("data")) {
                throw new TwitterApiException("Twitter post tweet returned empty body");
            }
            String tweetId = responseBody.get("data").get("id").asText();
            log.info("Tweet posted: tweetId={}", tweetId);
            return tweetId;
        } catch (HttpClientErrorException e) {
            log.error("Twitter post tweet failed: status={} body={}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new TwitterApiException("Failed to post tweet: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Twitter post tweet network error", e);
            throw new TwitterApiException("Twitter post tweet network error: " + e.getMessage());
        }
    }

    private String escapeJson(String value) {
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                + "\"";
    }

    public record TokenResponse(String accessToken, String refreshToken, long expiresInSeconds) {}
    public record UserInfo(String twitterUserId, String username) {}
}
