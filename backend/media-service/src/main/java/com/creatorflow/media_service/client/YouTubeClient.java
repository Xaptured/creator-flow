package com.creatorflow.media_service.client;

import com.creatorflow.media_service.configuration.GoogleOAuthProperties;
import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.creatorflow.media_service.exception.YouTubeApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@Component
public class YouTubeClient {

    private static final Logger log = LoggerFactory.getLogger(YouTubeClient.class);

    // --- Google OAuth endpoints ---
    private static final String GOOGLE_AUTH_URL        = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URL       = "https://oauth2.googleapis.com/token";

    // --- YouTube Data API v3 endpoints ---
    private static final String YOUTUBE_CHANNELS_URL   = "https://www.googleapis.com/youtube/v3/channels";
    private static final String YOUTUBE_UPLOAD_URL     = "https://www.googleapis.com/upload/youtube/v3/videos";

    // --- Query params ---
    private static final String CHANNELS_PART          = "snippet,statistics";
    private static final String UPLOAD_PART            = "snippet,status";
    private static final String UPLOAD_TYPE            = "multipart";
    private static final String DEFAULT_MIME_TYPE       = "video/mp4";

    // --- OAuth params ---
    private static final String RESPONSE_TYPE          = "code";
    private static final String ACCESS_TYPE            = "offline";
    private static final String PROMPT                 = "consent";
    private static final String GRANT_TYPE_AUTH_CODE   = "authorization_code";
    private static final String GRANT_TYPE_REFRESH     = "refresh_token";

    // --- Token response fallback ---
    private static final long DEFAULT_EXPIRES_IN_SECONDS = 3600L;

    private final GoogleOAuthProperties googleOAuthProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public YouTubeClient(GoogleOAuthProperties googleOAuthProperties) {
        this.googleOAuthProperties = googleOAuthProperties;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Build Google OAuth consent URL.
     * state param = ownerId — ties callback back to user without a server session.
     */
    public String buildAuthorizationUrl(String state) {
        List<String> scopes = googleOAuthProperties.getScopes();
        return UriComponentsBuilder.fromHttpUrl(GOOGLE_AUTH_URL)
                .queryParam("client_id", googleOAuthProperties.getClientId())
                .queryParam("redirect_uri", googleOAuthProperties.getRedirectUri())
                .queryParam("response_type", RESPONSE_TYPE)
                .queryParam("scope", String.join(" ", scopes))
                .queryParam("access_type", ACCESS_TYPE)
                .queryParam("prompt", PROMPT)
                .queryParam("state", state)
                .toUriString();
    }

    /**
     * Exchange auth code for access + refresh tokens.
     *
     * @throws OAuthTokenExchangeException on Google error or network failure
     */
    public TokenResponse exchangeCodeForTokens(String code) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", googleOAuthProperties.getClientId());
        params.add("client_secret", googleOAuthProperties.getClientSecret());
        params.add("redirect_uri", googleOAuthProperties.getRedirectUri());
        params.add("grant_type", GRANT_TYPE_AUTH_CODE);

        return postForTokens(params, "exchange auth code for tokens");
    }

    /**
     * Refresh access token using refresh token.
     * Google returns 400 with error=invalid_grant when refresh token is revoked.
     *
     * @throws OAuthTokenExchangeException on revoked/invalid token or network failure
     */
    public TokenResponse refreshAccessToken(String refreshToken) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("refresh_token", refreshToken);
        params.add("client_id", googleOAuthProperties.getClientId());
        params.add("client_secret", googleOAuthProperties.getClientSecret());
        params.add("grant_type", GRANT_TYPE_REFRESH);

        return postForTokens(params, "refresh access token");
    }

    /**
     * Fetch YouTube channel info for the authenticated user.
     *
     * @throws YouTubeApiException if no channel found, token expired (401), or network failure
     */
    public ChannelInfo fetchChannelInfo(String accessToken) {
        String url = UriComponentsBuilder.fromHttpUrl(YOUTUBE_CHANNELS_URL)
                .queryParam("part", CHANNELS_PART)
                .queryParam("mine", true)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

            JsonNode body = response.getBody();
            if (body == null || !body.has("items") || body.get("items").isEmpty()) {
                throw new YouTubeApiException("No YouTube channel found for this Google account");
            }

            JsonNode item    = body.get("items").get(0);
            JsonNode snippet = item.get("snippet");

            return new ChannelInfo(
                    item.get("id").asText(),
                    snippet.get("title").asText(),
                    snippet.path("thumbnails").path("default").path("url").asText(null),
                    item.path("statistics").path("subscriberCount").asLong(0L)
            );

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new YouTubeApiException("YouTube token expired or revoked — re-connect required", e);
            }
            throw new YouTubeApiException("YouTube channels API error: " + e.getStatusCode(), e);
        } catch (RestClientException e) {
            throw new YouTubeApiException("Network error calling YouTube channels API", e);
        }
    }

    /**
     * Upload video bytes to YouTube via multipart upload.
     * Returns the YouTube video ID on success.
     *
     * @throws YouTubeApiException on quota exceeded (403), token expired (401), or network failure
     */
    public String uploadVideo(String accessToken, byte[] videoBytes, String mimeType,
                              String title, String description, String privacyStatus) {
        String url = UriComponentsBuilder.fromHttpUrl(YOUTUBE_UPLOAD_URL)
                .queryParam("uploadType", UPLOAD_TYPE)
                .queryParam("part", UPLOAD_PART)
                .toUriString();

        String resolvedMime = (mimeType != null && !mimeType.isBlank()) ? mimeType : DEFAULT_MIME_TYPE;

        String metadata = buildVideoMetadataJson(title, description, privacyStatus);

        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        bodyBuilder.part("metadata", metadata, MediaType.APPLICATION_JSON);
        bodyBuilder.part("media", videoBytes, MediaType.parseMediaType(resolvedMime));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url, HttpMethod.POST,
                    new HttpEntity<>(bodyBuilder.build(), headers),
                    JsonNode.class);

            JsonNode body = response.getBody();
            if (body == null || !body.has("id")) {
                throw new YouTubeApiException("YouTube upload succeeded but returned no video ID");
            }
            return body.get("id").asText();

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new YouTubeApiException("YouTube token expired during upload — re-connect required", e);
            }
            if (e.getStatusCode() == HttpStatus.FORBIDDEN) {
                throw new YouTubeApiException("YouTube API quota exceeded or upload forbidden", e);
            }
            throw new YouTubeApiException("YouTube upload API error: " + e.getStatusCode(), e);
        } catch (RestClientException e) {
            throw new YouTubeApiException("Network error during YouTube upload", e);
        }
    }

    private TokenResponse postForTokens(MultiValueMap<String, String> params, String operation) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        try {
            ResponseEntity<JsonNode> response = restTemplate.postForEntity(
                    GOOGLE_TOKEN_URL, new HttpEntity<>(params, headers), JsonNode.class);
            return parseTokenResponse(response.getBody(), operation);

        } catch (HttpClientErrorException e) {
            // 400 invalid_grant = refresh token revoked by user from Google account settings
            if (e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                throw new OAuthTokenExchangeException(
                        "Google token request failed (invalid_grant — token may be revoked): " + operation, e);
            }
            throw new OAuthTokenExchangeException("Google token request failed: " + operation, e);
        } catch (RestClientException e) {
            throw new OAuthTokenExchangeException("Network error during: " + operation, e);
        }
    }

    private TokenResponse parseTokenResponse(JsonNode body, String operation) {
        if (body == null || !body.has("access_token")) {
            throw new OAuthTokenExchangeException("Invalid token response from Google during: " + operation);
        }
        return new TokenResponse(
                body.get("access_token").asText(),
                body.has("refresh_token") ? body.get("refresh_token").asText() : null,
                body.has("expires_in") ? body.get("expires_in").asLong() : DEFAULT_EXPIRES_IN_SECONDS
        );
    }

    private String buildVideoMetadataJson(String title, String description, String privacyStatus) {
        try {
            ObjectNode snippet = objectMapper.createObjectNode()
                    .put("title", title != null ? title : "")
                    .put("description", description != null ? description : "");

            ObjectNode status = objectMapper.createObjectNode()
                    .put("privacyStatus", privacyStatus);

            ObjectNode root = objectMapper.createObjectNode();
            root.set("snippet", snippet);
            root.set("status", status);

            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            throw new YouTubeApiException("Failed to build video metadata JSON", e);
        }
    }

    public record TokenResponse(String accessToken, String refreshToken, long expiresIn) {}

    public record ChannelInfo(String channelId, String channelName, String thumbnail, long subscriberCount) {}
}
