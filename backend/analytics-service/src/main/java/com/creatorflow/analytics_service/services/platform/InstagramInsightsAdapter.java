package com.creatorflow.analytics_service.services.platform;

import com.creatorflow.analytics_service.configuration.InstagramProperties;
import com.creatorflow.analytics_service.dto.PlatformMetrics;
import com.creatorflow.analytics_service.model.PlatformType;
import com.creatorflow.analytics_service.services.PlatformAdapter;
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
 * Fetches Instagram Insights metrics via the Instagram Graph API Media Insights endpoint.
 *
 * <p>Endpoint: {@code GET /v19.0/{igMediaId}/insights} with Bearer token read from Redis
 * ({@code oauth:{ownerId}:instagram:access_token}), written by scheduler-service's
 * TokenRefreshJob.</p>
 *
 * <p>Metrics fetched: {@code impressions,reach,likes,comments,saved}.</p>
 *
 * <p>Resilience contract: any API failure (token absent, 401, 403, network error)
 * returns zero-valued {@link PlatformMetrics} — no exception is propagated so the
 * analytics pipeline is never blocked by a single failed platform call.</p>
 */
@Component
public class InstagramInsightsAdapter implements PlatformAdapter {

    private static final Logger log = LoggerFactory.getLogger(InstagramInsightsAdapter.class);

    private static final String API_VERSION = "v19.0";
    private static final String METRICS_PARAM = "impressions,reach,likes,comments,saved";

    private static final PlatformMetrics ZERO_METRICS = PlatformMetrics.of(0L, 0L, 0L, 0L);

    private final PlatformTokenReader tokenReader;
    private final HttpClient httpClient;
    private final InstagramProperties instagramProperties;
    private final ObjectMapper objectMapper;

    public InstagramInsightsAdapter(
            PlatformTokenReader tokenReader,
            @Qualifier("instagramHttpClient") HttpClient httpClient,
            InstagramProperties instagramProperties,
            ObjectMapper objectMapper) {
        this.tokenReader = tokenReader;
        this.httpClient = httpClient;
        this.instagramProperties = instagramProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public PlatformType platform() {
        return PlatformType.INSTAGRAM;
    }

    /**
     * Fetches impressions, reach, likes, comments, and saved for {@code platformPostId}
     * (the Instagram media ID). Returns {@link #ZERO_METRICS} on any error.
     */
    @Override
    public PlatformMetrics fetchMetrics(UUID contentId, UUID ownerId, String platformPostId) {
        String accessToken = tokenReader.getAccessToken(ownerId, "INSTAGRAM");

        if (accessToken == null || accessToken.isBlank()) {
            log.warn("Instagram OAuth token missing for owner {} — returning zero metrics", ownerId);
            return ZERO_METRICS;
        }

        if (platformPostId == null || platformPostId.isBlank()) {
            log.warn("Instagram platformPostId (igMediaId) missing for contentId {} — returning zero metrics", contentId);
            return ZERO_METRICS;
        }

        try {
            return callInstagramInsightsApi(accessToken, platformPostId, contentId, ownerId);
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.error("Instagram Graph API network error for contentId {}, ownerId {}: {}",
                    contentId, ownerId, e.getMessage());
            return ZERO_METRICS;
        }
    }

    private PlatformMetrics callInstagramInsightsApi(
            String accessToken, String igMediaId, UUID contentId, UUID ownerId)
            throws IOException, InterruptedException {

        URI uri = buildInsightsUri(igMediaId, accessToken);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(uri)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();

        if (status == 401) {
            log.warn("Instagram token expired for owner {} (contentId: {}) — returning zero metrics. "
                    + "scheduler-service TokenRefreshJob will refresh the token.", ownerId, contentId);
            return ZERO_METRICS;
        }

        if (status == 403) {
            log.error("Instagram API permission error for owner {} (contentId: {}) — returning zero metrics.",
                    ownerId, contentId);
            return ZERO_METRICS;
        }

        if (status != 200) {
            log.error("Instagram Graph API returned unexpected status {} for contentId {}, ownerId {} — returning zero metrics",
                    status, contentId, ownerId);
            return ZERO_METRICS;
        }

        return parseMetrics(response.body(), contentId, ownerId);
    }

    /**
     * Builds the Instagram Graph API insights URI.
     *
     * <p>Example:
     * {@code GET /v19.0/{igMediaId}/insights?metric=impressions,reach,likes,comments,saved&access_token=...}</p>
     */
    private URI buildInsightsUri(String igMediaId, String accessToken) {
        String query = "metric=" + encode(METRICS_PARAM)
                + "&access_token=" + encode(accessToken);

        return URI.create(instagramProperties.getGraphApiBaseUrl()
                + "/" + API_VERSION
                + "/" + igMediaId
                + "/insights"
                + "?" + query);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /**
     * Parses the Instagram Graph API insights response.
     *
     * <p>Response shape:
     * <pre>
     * {
     *   "data": [
     *     { "name": "impressions", "values": [{ "value": 1000 }] },
     *     { "name": "reach",       "values": [{ "value": 800  }] },
     *     { "name": "likes",       "values": [{ "value": 50   }] },
     *     { "name": "comments",    "values": [{ "value": 10   }] },
     *     { "name": "saved",       "values": [{ "value": 5    }] }
     *   ]
     * }
     * </pre>
     * Mapping: views=reach, likes=likes, comments=comments, impressions=impressions.
     * engagementRate computed by {@link PlatformMetrics#of}.</p>
     */
    private PlatformMetrics parseMetrics(String responseBody, UUID contentId, UUID ownerId) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode data = root.path("data");

            if (data.isMissingNode() || !data.isArray() || data.isEmpty()) {
                log.info("Instagram Insights: no data for contentId {}, ownerId {} — media may have zero activity",
                        contentId, ownerId);
                return ZERO_METRICS;
            }

            long impressions = 0L;
            long reach = 0L;
            long likes = 0L;
            long comments = 0L;

            for (JsonNode metric : data) {
                String name = metric.path("name").asText("");
                long value = extractFirstValue(metric);
                switch (name) {
                    case "impressions" -> impressions = value;
                    case "reach"       -> reach = value;
                    case "likes"       -> likes = value;
                    case "comments"    -> comments = value;
                    // "saved" not mapped to PlatformMetrics fields — ignored
                    default -> { /* unknown metric — ignore */ }
                }
            }

            log.info("Instagram metrics fetched for contentId {}: reach={}, likes={}, comments={}, impressions={}",
                    contentId, reach, likes, comments, impressions);

            // views = reach (unique accounts reached), impressions = total impressions
            return PlatformMetrics.of(reach, likes, comments, impressions);

        } catch (Exception e) {
            log.error("Failed to parse Instagram Insights response for contentId {}, ownerId {}: {}",
                    contentId, ownerId, e.getMessage());
            return ZERO_METRICS;
        }
    }

    /**
     * Extracts the {@code value} from the first element of the {@code values} array.
     * Returns 0 if the array is absent or empty.
     */
    private long extractFirstValue(JsonNode metric) {
        JsonNode values = metric.path("values");
        if (values.isArray() && !values.isEmpty()) {
            return values.get(0).path("value").asLong(0L);
        }
        return 0L;
    }
}
