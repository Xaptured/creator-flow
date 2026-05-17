package com.creatorflow.scheduler_service.filter;

import com.creatorflow.scheduler_service.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;
import java.util.UUID;

/**
 * Security filter that enforces: body.ownerId == JWT sub.
 *
 * Prevents a caller from spoofing a different ownerId in the request body
 * even when they hold a valid Bearer token. Provides defence-in-depth on
 * top of downstream ownership checks.
 *
 * Passes through when: no Authorization header, JWT decode fails, body has no
 * ownerId field, or body is empty/non-JSON.
 */
@Component
public class OwnerIdValidationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(OwnerIdValidationFilter.class);

    private static final String OWNER_ID_FIELD = "ownerId";

    private final JwtDecoder jwtDecoder;
    private final ObjectMapper objectMapper;

    public OwnerIdValidationFilter(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        ContentCachingRequestWrapper wrappedRequest = (request instanceof ContentCachingRequestWrapper ccw)
                ? ccw
                : new ContentCachingRequestWrapper(request);

        String authHeader = wrappedRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        String token = authHeader.substring(7);
        Jwt jwt;
        try {
            jwt = jwtDecoder.decode(token);
        } catch (JwtException e) {
            log.debug("OwnerIdValidationFilter: JWT decode failed, passing through: {}", e.getMessage());
            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        String jwtSub = jwt.getSubject();
        if (jwtSub == null || jwtSub.isBlank()) {
            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        byte[] bodyBytes = wrappedRequest.getInputStream().readAllBytes();

        if (bodyBytes.length == 0) {
            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        JsonNode bodyNode;
        try {
            bodyNode = objectMapper.readTree(bodyBytes);
        } catch (IOException e) {
            log.debug("OwnerIdValidationFilter: body is not JSON, passing through");
            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        JsonNode ownerIdNode = bodyNode.get(OWNER_ID_FIELD);
        if (ownerIdNode == null || ownerIdNode.isNull()) {
            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        String ownerIdText = ownerIdNode.asText();
        UUID bodyOwnerId;
        try {
            bodyOwnerId = UUID.fromString(ownerIdText);
        } catch (IllegalArgumentException e) {
            log.warn("OwnerIdValidationFilter: invalid UUID in body ownerId='{}', rejecting", ownerIdText);
            writeError(response);
            return;
        }

        UUID jwtSubUuid;
        try {
            jwtSubUuid = UUID.fromString(jwtSub);
        } catch (IllegalArgumentException e) {
            log.warn("OwnerIdValidationFilter: JWT sub is not a UUID sub='{}', passing through", jwtSub);
            filterChain.doFilter(wrappedRequest, response);
            return;
        }

        if (!bodyOwnerId.equals(jwtSubUuid)) {
            log.warn("OwnerIdValidationFilter: ownerId mismatch — body={} jwt={}", bodyOwnerId, jwtSubUuid);
            writeError(response);
            return;
        }

        filterChain.doFilter(wrappedRequest, response);
    }

    private void writeError(HttpServletResponse response) throws IOException {
        ErrorResponse error = ErrorResponse.of(
                "OWNER_ID_MISMATCH",
                HttpStatus.FORBIDDEN,
                "ownerId in request does not match authenticated user"
        );
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }
}
