package com.creatorflow.scheduler_service.filter;

import com.creatorflow.scheduler_service.configuration.RateLimitConfig.RateLimitProperties;
import com.creatorflow.scheduler_service.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
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
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Rate-limits all scheduler endpoints, keyed by the Keycloak UUID from the JWT
 * {@code sub} claim, falling back to client IP when a valid token is not present
 * (Spring Security will reject those requests anyway, so the fallback is purely
 * defensive).
 *
 * <p>The bucket map is a Caffeine cache with an idle TTL and a maximum size cap,
 * preventing unbounded heap growth under sustained load or IP-spoofing attacks.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    /** Paths exempt from rate limiting — Swagger UI assets and actuator health. */
    private static final Set<String> EXEMPT_PREFIXES = Set.of(
            "/swagger-ui",
            "/v3/api-docs",
            "/actuator"
    );

    static final long MAX_BUCKET_ENTRIES = 100_000L;
    static final long BUCKET_TTL_HOURS   = 1L;

    private final RateLimitProperties properties;
    private final JwtDecoder jwtDecoder;
    private final Cache<String, Bucket> buckets;
    private final ObjectMapper objectMapper;

    public RateLimitFilter(RateLimitProperties properties, JwtDecoder jwtDecoder) {
        this.properties = properties;
        this.jwtDecoder = jwtDecoder;
        this.buckets = Caffeine.newBuilder()
                .expireAfterAccess(BUCKET_TTL_HOURS, TimeUnit.HOURS)
                .maximumSize(MAX_BUCKET_ENTRIES)
                .build();
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String uri = request.getRequestURI();
        return EXEMPT_PREFIXES.stream().anyMatch(uri::startsWith);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String userId = resolveUserId(request);
        Bucket bucket = buckets.get(userId, this::newBucket);

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
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Schedule rate limit exceeded. Retry after " + waitSeconds + " seconds."
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

    private String resolveUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                Jwt jwt = jwtDecoder.decode(authHeader.substring(7));
                String sub = jwt.getSubject();
                if (sub != null && !sub.isBlank()) {
                    return sub;
                }
            } catch (JwtException e) {
                log.debug("JWT decode failed for rate limiting, falling back to IP: {}", e.getMessage());
            }
        }
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
