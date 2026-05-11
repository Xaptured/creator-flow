package com.creatorflow.media_service.dto.response;

import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.ZoneOffset;

/**
 * Platform connection status for a single platform.
 * Returned by GET /v1.0/api/media/platforms/status
 */
@Getter
@NoArgsConstructor
public class PlatformStatusResponse {

    private PlatformType platform;
    private boolean connected;
    /** ISO-8601 — present only when token expires_at is known */
    private Instant tokenExpiry;

    public static PlatformStatusResponse connected(PlatformAccount account) {
        PlatformStatusResponse r = new PlatformStatusResponse();
        r.platform = account.getPlatform();
        r.connected = true;
        r.tokenExpiry = account.getExpiresAt() != null
                ? account.getExpiresAt().toInstant(ZoneOffset.UTC)
                : null;
        return r;
    }

    public static PlatformStatusResponse disconnected(PlatformType platform) {
        PlatformStatusResponse r = new PlatformStatusResponse();
        r.platform = platform;
        r.connected = false;
        return r;
    }
}
