package com.creatorflow.auth_service.filter;

import com.creatorflow.auth_service.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
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

import java.io.ByteArrayInputStream;
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

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        Jwt jwt;
        try {
            jwt = jwtDecoder.decode(token);
        } catch (JwtException e) {
            log.debug("OwnerIdValidationFilter: JWT decode failed, passing through: {}", e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        String jwtSub = jwt.getSubject();
        if (jwtSub == null || jwtSub.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Read the body ONCE from the raw stream, then wrap the request so
        // Spring MVC (and any downstream filter) can read it again.
        byte[] bodyBytes = request.getInputStream().readAllBytes();
        CachedBodyHttpServletRequest cachedRequest = new CachedBodyHttpServletRequest(request, bodyBytes);

        if (bodyBytes.length == 0) {
            filterChain.doFilter(cachedRequest, response);
            return;
        }

        JsonNode bodyNode;
        try {
            bodyNode = objectMapper.readTree(bodyBytes);
        } catch (IOException e) {
            log.debug("OwnerIdValidationFilter: body is not JSON, passing through");
            filterChain.doFilter(cachedRequest, response);
            return;
        }

        JsonNode ownerIdNode = bodyNode.get(OWNER_ID_FIELD);
        if (ownerIdNode == null || ownerIdNode.isNull()) {
            filterChain.doFilter(cachedRequest, response);
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
            filterChain.doFilter(cachedRequest, response);
            return;
        }

        if (!bodyOwnerId.equals(jwtSubUuid)) {
            log.warn("OwnerIdValidationFilter: ownerId mismatch — body={} jwt={}", bodyOwnerId, jwtSubUuid);
            writeError(response);
            return;
        }

        filterChain.doFilter(cachedRequest, response);
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

    /**
     * Wraps an HttpServletRequest and replays a cached body byte array on every
     * call to getInputStream() or getReader(). This ensures that after this filter
     * reads the body, Spring MVC's message converters can still read it downstream.
     */
    private static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

        private final byte[] cachedBody;

        CachedBodyHttpServletRequest(HttpServletRequest request, byte[] cachedBody) {
            super(request);
            this.cachedBody = cachedBody;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(cachedBody);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return byteArrayInputStream.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    // no-op for synchronous filters
                }

                @Override
                public int read() {
                    return byteArrayInputStream.read();
                }
            };
        }

        @Override
        public java.io.BufferedReader getReader() {
            return new java.io.BufferedReader(
                    new java.io.InputStreamReader(getInputStream(), getCharacterEncoding() != null
                            ? java.nio.charset.Charset.forName(getCharacterEncoding())
                            : java.nio.charset.StandardCharsets.UTF_8));
        }
    }
}
