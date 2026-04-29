package com.creatorflow.media_service.filter;

import com.creatorflow.media_service.configuration.RateLimitConfig.RateLimitProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.creatorflow.media_service.dto.response.ErrorResponse;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    // Only rate-limit the upload-url endpoint — it's the expensive one (DB write + S3 presign)
    private static final String RATE_LIMITED_PATH = "/upload-url";

    private final RateLimitProperties properties;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public RateLimitFilter(RateLimitProperties properties) {
        this.properties = properties;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        // Skip filter entirely for any path that doesn't end with /upload-url
        return !request.getRequestURI().endsWith(RATE_LIMITED_PATH);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        // Key by ownerId from request body is not viable in a filter (stream already read).
        // Use JWT subject extracted from Authorization header instead — same value as ownerId.
        String userId = resolveUserId(request);
        Bucket bucket = buckets.computeIfAbsent(userId, this::newBucket);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        response.setHeader("X-RateLimit-Limit", String.valueOf(properties.capacity()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));

        if (probe.isConsumed()) {
            filterChain.doFilter(request, response);
        } else {
            long waitSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000;
            response.setHeader("X-RateLimit-Retry-After-Seconds", String.valueOf(waitSeconds));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            ErrorResponse error = ErrorResponse.of(
                    "RATE_LIMIT_EXCEEDED",
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    "Upload rate limit exceeded. Retry after " + waitSeconds + " seconds."
            );
            response.getWriter().write(objectMapper.writeValueAsString(error));
            log.warn("Rate limit exceeded for userId={} — retry in {}s", userId, waitSeconds);
        }
    }

    private Bucket newBucket(String userId) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(properties.capacity())
                        .refillGreedy(properties.refillTokens(), properties.refillPeriod())
                        .build())
                .build();
    }

    /**
     * Extracts the JWT subject (Keycloak UUID) from the Bearer token for per-user rate limiting.
     * Falls back to remote IP if token is absent or unparseable — guards unauthenticated requests
     * before Spring Security processes them.
     */
    private String resolveUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                // JWT is base64url: header.payload.signature — decode payload to get sub
                String[] parts = token.split("\\.");
                if (parts.length == 3) {
                    String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                    // Extract "sub" field from JSON payload
                    com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(payload);
                    com.fasterxml.jackson.databind.JsonNode sub = node.get("sub");
                    if (sub != null && !sub.isNull()) {
                        return sub.asText();
                    }
                }
            } catch (Exception e) {
                log.debug("Could not parse JWT subject for rate limiting, falling back to IP");
            }
        }
        // Fallback: unauthenticated request — key by IP (Spring Security will reject it anyway)
        return resolveClientIp(request);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
