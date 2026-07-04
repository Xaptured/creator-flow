package com.creatorflow.analytics_service.services.platform;

import com.creatorflow.analytics_service.configuration.YouTubeProperties;
import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.services.PlatformAdapter;
import com.creatorflow.analytics_service.client.MediaPlatformClient;
import com.creatorflow.analytics_service.services.PlatformTokenReader;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Fetches YouTube Analytics metrics via YouTube Analytics Data API v2.
 *
 * <p>Endpoint: {@code GET /v2/reports} with Bearer token read from Redis
 * ({@code oauth:{ownerId}:youtube:access_token}), written by scheduler-service's
 * TokenRefreshJob.</p>
 *
 * <p>Resilience contract: any API failure (token absent, 401, 403, network error)
 * returns zero-valued {@link PlatformMetrics} — no exception is propagated so the
 * analytics pipeline is never blocked by a single failed platform call.</p>
 */
@Component
public class YouTubeAnalyticsAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(YouTubeAnalyticsAdapter.class);

    private static final String REPORTS_PATH = "/v2/reports";

    // Column 0 is the video dimension (videoId string) — not read, metrics start at index 1
    private static final int COL_VIEWS = 1;
    private static final int COL_LIKES = 2;
    private static final int COL_COMMENTS = 3;
    private static final int COL_ESTIMATED_MINUTES_WATCHED = 4;

    private static final PlatformMetrics ZERO_METRICS = PlatformMetrics.of(0L, 0L, 0L, null);

    private final PlatformTokenReader tokenReader;
    private final HttpClient httpClient;
    private final YouTubeProperties youTubeProperties;
    private final ObjectMapper objectMapper;
    private final MediaPlatformClient mediaPlatformClient;

    public YouTubeAnalyticsAdapter(
            PlatformTokenReader tokenReader,
            @Qualifier("youtubeHttpClient") HttpClient httpClient,
            YouTubeProperties youTubeProperties,
            ObjectMapper objectMapper,
            MediaPlatformClient mediaPlatformClient) {
        this.tokenReader = tokenReader;
        this.httpClient = httpClient;
        this.youTubeProperties = youTubeProperties;
        this.objectMapper = objectMapper;
        this.mediaPlatformClient = mediaPlatformClient;
    }

    @Override
    public PlatformType platform() {
        return PlatformType.YOUTUBE;
    }

    /**
     * Fetches views, likes, comments, and estimatedMinutesWatched for {@code platformPostId}
     * (the YouTube video ID). Returns {@link #ZERO_METRICS} on any error.
     */
    @Override
    public PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId, String platformPostId) {
        String accessToken = resolveAccessToken(ownerId);

        if (accessToken == null || accessToken.isBlank()) {
            log.warn("YouTube OAuth token missing for owner {} (even after refresh+warm) — returning zero metrics", ownerId);
            return ZERO_METRICS;
        }

        if (platformPostId == null || platformPostId.isBlank()) {
            log.warn("YouTube platformPostId (videoId) missing for contentId {} — returning zero metrics", contentId);
            return ZERO_METRICS;
        }

        try {
            return callYouTubeAnalyticsApi(accessToken, platformPostId, contentId, ownerId, false);
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.error("YouTube Analytics API network error for contentId {}, ownerId {}: {}",
                    contentId, ownerId, e.getMessage());
            return ZERO_METRICS;
        }
    }

    /**
     * Read the YouTube token from the Redis cache. On a cache miss, ask
     * media-service to refresh+warm it, then re-read. Returns null if still
     * unavailable.
     */
    private String resolveAccessToken(UUID ownerId) {
        String token = tokenReader.getAccessToken(ownerId, "YOUTUBE");
        if (token != null && !token.isBlank()) {
            return token;
        }
        log.info("YouTube token not in cache for owner {} — requesting media-service refresh+warm", ownerId);
        mediaPlatformClient.refreshAndWarm(ownerId, "YOUTUBE");
        return tokenReader.getAccessToken(ownerId, "YOUTUBE");
    }

    private PlatformMetrics callYouTubeAnalyticsApi(
            String accessToken, String videoId, UUID contentId, UUID ownerId, boolean isRetry)
            throws IOException, InterruptedException {

        URI uri = buildReportsUri(videoId);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();

        if (status == 401) {
            if (!isRetry) {
                log.warn("YouTube Analytics API 401 (auth) for owner {} (contentId: {}) — {} — "
                        + "requesting media-service refresh+warm and retrying once.",
                        ownerId, contentId, describeError(response.body()));
                mediaPlatformClient.refreshAndWarm(ownerId, "YOUTUBE");
                String refreshed = tokenReader.getAccessToken(ownerId, "YOUTUBE");
                if (refreshed != null && !refreshed.isBlank() && !refreshed.equals(accessToken)) {
                    return callYouTubeAnalyticsApi(refreshed, videoId, contentId, ownerId, true);
                }
            }
            log.warn("YouTube Analytics API 401 (auth) for owner {} (contentId: {}) — {} — returning zero metrics "
                    + "after refresh attempt.", ownerId, contentId, describeError(response.body()));
            return ZERO_METRICS;
        }

        if (status == 403) {
            // 403 is NOT necessarily quota. YouTube also returns 403 when the token
            // lacks the yt-analytics.readonly scope, or the YouTube Analytics API is
            // not enabled on the project. Log the real reason so the cause is clear.
            log.error("YouTube Analytics API 403 (forbidden) for owner {} (contentId: {}) — {} — returning zero metrics. "
                    + "Check the reason above: quotaExceeded (real quota) vs insufficientPermissions "
                    + "(missing yt-analytics.readonly scope) vs accessNotConfigured (Analytics API not enabled).",
                    ownerId, contentId, describeError(response.body()));
            return ZERO_METRICS;
        }

        if (status != 200) {
            log.error("YouTube Analytics API returned status {} for contentId {}, ownerId {} — {} — returning zero metrics",
                    status, contentId, ownerId, describeError(response.body()));
            return ZERO_METRICS;
        }

        return parseMetrics(response.body(), contentId, ownerId);
    }

    /**
     * Extracts the Google API error reason/status/message from a JSON error body so
     * a failure can be diagnosed unambiguously — e.g. "quotaExceeded" vs
     * "insufficientPermissions" vs "accessNotConfigured". Falls back to a truncated
     * raw body if the payload cannot be parsed.
     */
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
            String truncated = body.length() > 300 ? body.substring(0, 300) + "\u2026" : body;
            return "unparseable error body: " + truncated;
        }
    }

    /**
     * Builds the YouTube Analytics Reports URI.
     *
     * <p>Example:
     * {@code GET /v2/reports?ids=channel==MINE&startDate=2020-01-01&endDate=2099-12-31
     * &metrics=views,likes,comments,estimatedMinutesWatched&dimensions=video&filters=video==<videoId>}</p>
     */
    private URI buildReportsUri(String videoId) {
        String query = "ids=" + encode("channel==MINE")
                + "&startDate=2020-01-01"
                + "&endDate=2099-12-31"
                + "&metrics=" + encode("views,likes,comments,estimatedMinutesWatched")
                + "&dimensions=video"
                + "&filters=" + encode("video==" + videoId);

        return URI.create(youTubeProperties.getAnalyticsApiBaseUrl() + REPORTS_PATH + "?" + query);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /**
     * Parses the YouTube Analytics v2 reports response.
     *
     * <p>Response shape:
     * <pre>
     * {
     *   "rows": [
     *     [ views, likes, comments, estimatedMinutesWatched ]
     *   ]
     * }
     * </pre>
     * If no rows exist (video has zero activity), returns zero metrics.</p>
     */
    private PlatformMetrics parseMetrics(String responseBody, UUID contentId, UUID ownerId) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode rows = root.path("rows");

            if (rows.isMissingNode() || !rows.isArray() || rows.isEmpty()) {
                log.info("YouTube Analytics: no rows for contentId {}, ownerId {} — video may have zero activity",
                        contentId, ownerId);
                return ZERO_METRICS;
            }

            JsonNode row = rows.get(0);
            long views = row.get(COL_VIEWS).asLong(0L);
            long likes = row.get(COL_LIKES).asLong(0L);
            long comments = row.get(COL_COMMENTS).asLong(0L);
            // estimatedMinutesWatched stored as impressions field for watch-time tracking
            long estimatedMinutesWatched = row.get(COL_ESTIMATED_MINUTES_WATCHED).asLong(0L);

            log.info("YouTube metrics fetched for contentId {}: views={}, likes={}, comments={}, estimatedMinutesWatched={}",
                    contentId, views, likes, comments, estimatedMinutesWatched);

            return PlatformMetrics.of(views, likes, comments, estimatedMinutesWatched);

        } catch (Exception e) {
            log.error("Failed to parse YouTube Analytics response for contentId {}, ownerId {}: {}",
                    contentId, ownerId, e.getMessage());
            return ZERO_METRICS;
        }
    }
}
