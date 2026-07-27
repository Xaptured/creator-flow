package com.creatorflow.analytics_service.client;

import com.creatorflow.analytics_service.configuration.YouTubeProperties;
import com.creatorflow.analytics_service.dto.response.ChannelCommentResponse;
import com.creatorflow.analytics_service.services.PlatformTokenReader;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Fetches recent top-level comments across the creator's whole YouTube channel
 * via YouTube Data API v3.
 *
 * <p>Two calls:
 * <ol>
 *   <li>{@code GET /channels?part=id&mine=true} — resolves the creator's channelId
 *       (cached in Redis, key {@code youtubeChannelId::<ownerId>}, 7-day TTL);</li>
 *   <li>{@code GET /commentThreads?allThreadsRelatedToChannelId=<channelId>&order=time}
 *       — one call covers every video on the channel, no per-video fan-out.</li>
 * </ol></p>
 *
 * <p>OAuth token is read from Redis via {@link PlatformTokenReader}; on cache miss or
 * 401 the token is refreshed once through media-service ({@link MediaPlatformClient})
 * — same contract as {@code YouTubeAnalyticsAdapter}.</p>
 *
 * <p>Resilience contract: any failure (token absent, 401/403, network error,
 * malformed JSON) returns an empty list — never throws. The digest pipeline
 * degrades gracefully instead of failing the request.</p>
 */
@Component
public class YouTubeCommentsClient {

    private static final Logger log = LoggerFactory.getLogger(YouTubeCommentsClient.class);

    private static final String PLATFORM = "YOUTUBE";
    private static final String CHANNELS_PATH = "/channels";
    private static final String COMMENT_THREADS_PATH = "/commentThreads";
    private static final String CHANNEL_ID_KEY_PATTERN = "youtubeChannelId::%s";
    private static final Duration CHANNEL_ID_TTL = Duration.ofDays(7);
    private static final List<ChannelCommentResponse> EMPTY = List.of();

    private final PlatformTokenReader tokenReader;
    private final MediaPlatformClient mediaPlatformClient;
    private final HttpClient httpClient;
    private final YouTubeProperties youTubeProperties;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public YouTubeCommentsClient(
            PlatformTokenReader tokenReader,
            MediaPlatformClient mediaPlatformClient,
            @Qualifier("youtubeHttpClient") HttpClient httpClient,
            YouTubeProperties youTubeProperties,
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper) {
        this.tokenReader = tokenReader;
        this.mediaPlatformClient = mediaPlatformClient;
        this.httpClient = httpClient;
        this.youTubeProperties = youTubeProperties;
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Returns up to {@code limit} recent top-level comments across the owner's channel,
     * newest first. Empty list on any failure (see class contract).
     */
    public List<ChannelCommentResponse> fetchRecentComments(UUID ownerId, int limit) {
        String accessToken = resolveAccessToken(ownerId);
        if (accessToken == null || accessToken.isBlank()) {
            log.warn("YouTube OAuth token missing for owner {} (even after refresh+warm) — returning no comments", ownerId);
            return EMPTY;
        }

        String channelId = resolveChannelId(ownerId, accessToken);
        if (channelId == null || channelId.isBlank()) {
            log.warn("YouTube channelId unresolved for owner {} — returning no comments", ownerId);
            return EMPTY;
        }

        try {
            return callCommentThreadsApi(accessToken, channelId, ownerId, limit, false);
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.error("YouTube commentThreads network error for ownerId {}: {}", ownerId, e.getMessage());
            return EMPTY;
        }
    }

    /**
     * Read the YouTube token from the Redis cache. On a cache miss, ask
     * media-service to refresh+warm it, then re-read. Null if still unavailable.
     */
    private String resolveAccessToken(UUID ownerId) {
        String token = tokenReader.getAccessToken(ownerId, PLATFORM);
        if (token != null && !token.isBlank()) {
            return token;
        }
        log.info("YouTube token not in cache for owner {} — requesting media-service refresh+warm", ownerId);
        mediaPlatformClient.refreshAndWarm(ownerId, PLATFORM);
        return tokenReader.getAccessToken(ownerId, PLATFORM);
    }

    /**
     * Resolves the creator's channelId, preferring the Redis cache. On a miss,
     * calls {@code channels?mine=true} and caches the result for 7 days.
     */
    private String resolveChannelId(UUID ownerId, String accessToken) {
        String cacheKey = String.format(CHANNEL_ID_KEY_PATTERN, ownerId);
        try {
            String cached = stringRedisTemplate.opsForValue().get(cacheKey);
            if (cached != null && !cached.isBlank()) {
                return cached;
            }
        } catch (Exception e) {
            log.warn("Redis read failed for {} — falling through to channels API: {}", cacheKey, e.getMessage());
        }

        String channelId = fetchChannelId(accessToken, ownerId);
        if (channelId != null && !channelId.isBlank()) {
            try {
                stringRedisTemplate.opsForValue().set(cacheKey, channelId, CHANNEL_ID_TTL);
            } catch (Exception e) {
                log.warn("Redis write failed for {} — channelId not cached: {}", cacheKey, e.getMessage());
            }
        }
        return channelId;
    }

    /** {@code GET /channels?part=id&mine=true} — first item's id, or null on any failure. */
    private String fetchChannelId(String accessToken, UUID ownerId) {
        URI uri = URI.create(youTubeProperties.getDataApiBaseUrl() + CHANNELS_PATH + "?part=id&mine=true");
        try {
            HttpResponse<String> response = send(uri, accessToken);
            if (response.statusCode() != 200) {
                log.error("YouTube channels API returned status {} for ownerId {} — {}",
                        response.statusCode(), ownerId, describeError(response.body()));
                return null;
            }
            JsonNode items = objectMapper.readTree(response.body()).path("items");
            if (!items.isArray() || items.isEmpty()) {
                log.warn("YouTube channels API: no channel for ownerId {}", ownerId);
                return null;
            }
            return items.get(0).path("id").asText(null);
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.error("YouTube channels API network error for ownerId {}: {}", ownerId, e.getMessage());
            return null;
        }
    }

    private List<ChannelCommentResponse> callCommentThreadsApi(
            String accessToken, String channelId, UUID ownerId, int limit, boolean isRetry)
            throws IOException, InterruptedException {

        URI uri = buildCommentThreadsUri(channelId, limit);
        HttpResponse<String> response = send(uri, accessToken);
        int status = response.statusCode();

        if (status == 401 && !isRetry) {
            log.warn("YouTube commentThreads 401 for owner {} — {} — refreshing token and retrying once",
                    ownerId, describeError(response.body()));
            mediaPlatformClient.refreshAndWarm(ownerId, PLATFORM);
            String refreshed = tokenReader.getAccessToken(ownerId, PLATFORM);
            if (refreshed != null && !refreshed.isBlank() && !refreshed.equals(accessToken)) {
                return callCommentThreadsApi(refreshed, channelId, ownerId, limit, true);
            }
        }

        if (status == 403) {
            // 403 also fires when comments are disabled channel-wide or the token
            // lacks scope — log the reason, degrade to empty.
            log.error("YouTube commentThreads 403 for owner {} — {} — returning no comments",
                    ownerId, describeError(response.body()));
            return EMPTY;
        }

        if (status != 200) {
            log.error("YouTube commentThreads returned status {} for owner {} — {} — returning no comments",
                    status, ownerId, describeError(response.body()));
            return EMPTY;
        }

        return parseComments(response.body(), ownerId);
    }

    /**
     * Builds the commentThreads URI.
     *
     * <p>Example: {@code GET /commentThreads?part=snippet&allThreadsRelatedToChannelId=<id>
     * &order=time&maxResults=50&textFormat=plainText}</p>
     */
    private URI buildCommentThreadsUri(String channelId, int limit) {
        String query = "part=snippet"
                + "&allThreadsRelatedToChannelId=" + encode(channelId)
                + "&order=time"
                + "&maxResults=" + limit
                + "&textFormat=plainText";
        return URI.create(youTubeProperties.getDataApiBaseUrl() + COMMENT_THREADS_PATH + "?" + query);
    }

    /**
     * Parses the commentThreads response. Shape:
     * <pre>
     * { "items": [ { "snippet": { "videoId": "...", "topLevelComment": { "snippet": {
     *     "authorDisplayName": "...", "textDisplay": "...", "likeCount": 3,
     *     "publishedAt": "2026-07-01T10:00:00Z" } } } } ] }
     * </pre>
     * Malformed items are skipped; a fully unparseable body yields an empty list.
     */
    private List<ChannelCommentResponse> parseComments(String responseBody, UUID ownerId) {
        try {
            JsonNode items = objectMapper.readTree(responseBody).path("items");
            if (!items.isArray() || items.isEmpty()) {
                log.info("YouTube commentThreads: no comments for ownerId {}", ownerId);
                return EMPTY;
            }

            List<ChannelCommentResponse> comments = new ArrayList<>(items.size());
            for (JsonNode item : items) {
                ChannelCommentResponse comment = parseComment(item);
                if (comment != null) {
                    comments.add(comment);
                }
            }
            log.info("YouTube commentThreads: fetched {} comments for ownerId {}", comments.size(), ownerId);
            return List.copyOf(comments);
        } catch (Exception e) {
            log.error("Failed to parse YouTube commentThreads response for ownerId {}: {}", ownerId, e.getMessage());
            return EMPTY;
        }
    }

    /** Single thread item → response record; null when required fields are absent. */
    private ChannelCommentResponse parseComment(JsonNode item) {
        JsonNode threadSnippet = item.path("snippet");
        JsonNode commentSnippet = threadSnippet.path("topLevelComment").path("snippet");

        String text = commentSnippet.path("textDisplay").asText(null);
        if (text == null || text.isBlank()) {
            return null;
        }

        Instant publishedAt = parseInstant(commentSnippet.path("publishedAt").asText(null));
        return new ChannelCommentResponse(
                threadSnippet.path("videoId").asText(""),
                commentSnippet.path("authorDisplayName").asText(""),
                text,
                commentSnippet.path("likeCount").asLong(0L),
                publishedAt);
    }

    private Instant parseInstant(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private HttpResponse<String> send(URI uri, String accessToken) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    /** Extracts Google API error reason/status/message for unambiguous diagnostics. */
    private String describeError(String body) {
        if (body == null || body.isBlank()) {
            return "no response body";
        }
        try {
            JsonNode error = objectMapper.readTree(body).path("error");
            String apiStatus = error.path("status").asText("");
            String message = error.path("message").asText("");
            String reason = "";
            JsonNode errors = error.path("errors");
            if (errors.isArray() && errors.size() > 0) {
                reason = errors.get(0).path("reason").asText("");
            }
            return String.format("reason=%s status=%s message=%s",
                    reason.isEmpty() ? "?" : reason,
                    apiStatus.isEmpty() ? "?" : apiStatus,
                    message.isEmpty() ? "?" : message);
        } catch (Exception e) {
            String truncated = body.length() > 300 ? body.substring(0, 300) + "…" : body;
            return "unparseable error body: " + truncated;
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
