package com.creatorflow.media_service.services;

import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import com.creatorflow.media_service.services.instagram.InstagramOAuthService;
import com.creatorflow.media_service.services.twitter.TwitterOAuthService;
import com.creatorflow.media_service.services.youtube.YouTubeOAuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates proactive OAuth token refresh for all connected platform accounts
 * that are approaching expiry.
 *
 * Called by the scheduler-service TokenRefreshJob via the internal refresh endpoint.
 * Delegates to the per-platform OAuth service for each account, isolating the
 * refresh logic from the scheduling concern.
 *
 * Failure behaviour per account:
 *   - OAuthTokenExchangeException (revoked/invalid token) — platform OAuth service
 *     already marks the account as expired; log WARN and continue to next account.
 *   - PlatformNotConnectedException — account was deleted between query and refresh;
 *     log WARN and continue.
 *   - Any unexpected exception — log ERROR and continue; job must not fail wholesale.
 *
 * This service does NOT mark accounts expired itself — each platform OAuth service
 * is responsible for that on invalid_grant or equivalent errors.
 */
@Service
public class PlatformRefreshService {

    private static final Logger log = LoggerFactory.getLogger(PlatformRefreshService.class);

    private final PlatformAccountRepository platformAccountRepository;
    private final InstagramOAuthService instagramOAuthService;
    private final YouTubeOAuthService youTubeOAuthService;
    private final TwitterOAuthService twitterOAuthService;
    private final PlatformTokenCacheService platformTokenCacheService;

    @Value("${app.token-refresh.refresh-ahead-hours:12}")
    private int refreshAheadHours;

    public PlatformRefreshService(PlatformAccountRepository platformAccountRepository,
                                  InstagramOAuthService instagramOAuthService,
                                  YouTubeOAuthService youTubeOAuthService,
                                  TwitterOAuthService twitterOAuthService,
                                  PlatformTokenCacheService platformTokenCacheService) {
        this.platformAccountRepository = platformAccountRepository;
        this.instagramOAuthService = instagramOAuthService;
        this.youTubeOAuthService = youTubeOAuthService;
        this.twitterOAuthService = twitterOAuthService;
        this.platformTokenCacheService = platformTokenCacheService;
    }

    /**
     * Refresh a single account's token if needed, then (re)populate the Redis
     * token cache so downstream readers (analytics-service) get a valid token.
     *
     * Handles both cases: an expired token (dispatchRefresh refreshes it) and a
     * valid-but-uncached token (warmCache populates the cache from the DB).
     * Called on-demand by analytics-service via the internal endpoint.
     */
    public void refreshAndWarm(UUID ownerId, PlatformType platform) {
        dispatchRefresh(ownerId, platform);
        platformTokenCacheService.warmCache(ownerId, platform.name());
    }

    /**
     * Find all platform accounts expiring within the configured refresh-ahead window
     * and attempt to refresh each one.
     *
     * The window is: (now - 1 day) to (now + refreshAheadHours).
     *   - Lower bound (now - 1 day): picks up already-expired accounts (failed previous refresh)
     *     without going back indefinitely. Accounts expired longer than a day ago are
     *     considered permanently invalid and excluded — the user must reconnect.
     *   - Upper bound (now + refreshAheadHours): only tokens approaching expiry are refreshed;
     *     tokens with plenty of lifetime remaining are excluded, preventing re-processing
     *     accounts that were just successfully refreshed this run.
     *
     * @return summary of how many accounts were processed and how many failed
     */
    public RefreshSummary refreshExpiringTokens() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime from = now.minusDays(1);
        LocalDateTime to = now.plusHours(refreshAheadHours);
        List<PlatformAccount> candidates = platformAccountRepository.findAllByExpiresAtBetween(from, to);

        if (candidates.isEmpty()) {
            log.debug("PlatformRefreshService: no accounts expiring within {} hours", refreshAheadHours);
            return new RefreshSummary(0, 0);
        }

        log.info("PlatformRefreshService: found {} account(s) expiring within {} hours — attempting refresh",
                candidates.size(), refreshAheadHours);

        int attempted = 0;
        int failed = 0;
        for (PlatformAccount account : candidates) {
            attempted++;
            boolean success = refreshSingleAccount(account);
            if (!success) {
                failed++;
            }
        }

        log.info("PlatformRefreshService: refresh run complete — attempted={} failed={}", attempted, failed);
        return new RefreshSummary(attempted, failed);
    }

    /**
     * Refresh a single platform account. Returns true on success, false on any failure.
     * Each failure is logged but never rethrown — the job must continue processing.
     */
    private boolean refreshSingleAccount(PlatformAccount account) {
        UUID ownerId = account.getOwnerId();
        PlatformType platform = account.getPlatform();

        try {
            log.info("PlatformRefreshService: refreshing token — platform={} ownerId={} expiresAt={}",
                    platform, ownerId, account.getExpiresAt());
            dispatchRefresh(ownerId, platform);
            log.info("PlatformRefreshService: token refreshed successfully — platform={} ownerId={}",
                    platform, ownerId);
            return true;
        } catch (PlatformNotConnectedException e) {
            log.warn("PlatformRefreshService: account no longer connected — platform={} ownerId={} — skipping",
                    platform, ownerId);
            return false;
        } catch (OAuthTokenExchangeException e) {
            log.warn("PlatformRefreshService: token refresh failed (revoked or invalid) — platform={} ownerId={} — account marked expired",
                    platform, ownerId);
            return false;
        } catch (Exception e) {
            log.error("PlatformRefreshService: unexpected error during token refresh — platform={} ownerId={}",
                    platform, ownerId, e);
            return false;
        }
    }

    private void dispatchRefresh(UUID ownerId, PlatformType platform) {
        switch (platform) {
            case INSTAGRAM -> instagramOAuthService.refreshTokenIfExpired(ownerId);
            case YOUTUBE   -> youTubeOAuthService.refreshTokenIfExpired(ownerId);
            case TWITTER   -> twitterOAuthService.refreshTokenIfExpired(ownerId);
            default -> throw new IllegalArgumentException(
                    "No refresh handler registered for platform: " + platform);
        }
    }

    /**
     * Summary of a single refresh run, returned to the caller (scheduler-service).
     */
    public record RefreshSummary(int attempted, int failed) {
        public int succeeded() {
            return attempted - failed;
        }
    }
}
