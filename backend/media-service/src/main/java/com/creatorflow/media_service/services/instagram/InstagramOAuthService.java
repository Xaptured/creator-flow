package com.creatorflow.media_service.services.instagram;

import com.creatorflow.media_service.client.MetaClient;
import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Handles Instagram OAuth token lifecycle.
 *
 * Instagram token flow (2-step):
 *   1. Exchange auth code → short-lived token (~1hr)
 *   2. Exchange short-lived → long-lived token (60 days)
 *
 * Refresh: long-lived tokens must be refreshed before expiry (rolling 60-day window).
 * Refresh threshold: 7 days before expiry (TOKEN_REFRESH_THRESHOLD_DAYS).
 *
 * Failure behaviour:
 *   - Invalid state (not a UUID) → IllegalArgumentException → 400
 *   - Token exchange failure → OAuthTokenExchangeException → 502
 *   - Instagram API error → InstagramApiException → 502
 *   - Not connected → PlatformNotConnectedException → 404
 */
@Service
public class InstagramOAuthService {

    private static final Logger log = LoggerFactory.getLogger(InstagramOAuthService.class);

    private static final long TOKEN_REFRESH_THRESHOLD_DAYS = 7L;

    private final MetaClient metaClient;
    private final PlatformAccountRepository platformAccountRepository;
    private final PlatformTokenCacheService platformTokenCacheService;

    public InstagramOAuthService(MetaClient metaClient,
                                 PlatformAccountRepository platformAccountRepository,
                                 PlatformTokenCacheService platformTokenCacheService) {
        this.metaClient = metaClient;
        this.platformAccountRepository = platformAccountRepository;
        this.platformTokenCacheService = platformTokenCacheService;
    }

    /**
     * Build Instagram OAuth consent URL.
     * state = ownerId — ties callback back to user without a server session.
     */
    public String buildAuthorizationUrl(UUID ownerId) {
        String authUrl = metaClient.buildAuthorizationUrl(ownerId.toString());
        log.info("Instagram OAuth authorization URL — open in browser to connect: {}", authUrl);
        return authUrl;
    }

    /**
     * Exchange auth code for tokens, fetch user info, upsert PlatformAccount.
     * state param = ownerId UUID set during buildAuthorizationUrl.
     *
     * Steps:
     * 1. Parse state → ownerId UUID (invalid state → 400)
     * 2. Exchange code → short-lived token
     * 3. Exchange short-lived → long-lived token (60 days)
     * 4. Fetch Instagram user info (userId + username)
     * 5. Upsert platform_accounts row
     * 6. Evict Redis cache
     */
    @Transactional
    public PlatformAccount handleCallback(String code, String state) {
        UUID ownerId;
        try {
            ownerId = UUID.fromString(state);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid OAuth state parameter — possible CSRF attempt: " + state);
        }

        MetaClient.ShortLivedTokenResponse shortLived = metaClient.exchangeCodeForShortLivedToken(code);
        MetaClient.LongLivedTokenResponse longLived = metaClient.exchangeForLongLivedToken(shortLived.accessToken());

        MetaClient.UserInfo userInfo = metaClient.fetchUserInfo(longLived.accessToken());

        PlatformAccount account = platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, PlatformType.INSTAGRAM)
                .orElseGet(PlatformAccount::new);

        account.setOwnerId(ownerId);
        account.setPlatform(PlatformType.INSTAGRAM);
        account.setAccessToken(longLived.accessToken());
        // Instagram long-lived tokens are NOT refreshed via a refresh_token — they are refreshed
        // by calling the refresh endpoint with the current access token (see refreshTokenIfExpired).
        // Do NOT add a null-guard here or store a refresh_token: Instagram simply doesn't issue one.
        account.setRefreshToken(null);
        account.setExpiresAt(LocalDateTime.now().plusSeconds(longLived.expiresInSeconds()));
        account.setPlatformUserId(userInfo.instagramUserId());

        PlatformAccount saved = platformAccountRepository.save(account);

        try {
            platformTokenCacheService.putInCache(ownerId, "INSTAGRAM", saved);
        } catch (Exception e) {
            log.warn("Failed to warm Instagram token cache after connect: ownerId={} — cache will populate on next access", ownerId, e);
        }

        log.info("Instagram connected: ownerId={} instagramUserId={} username={}",
                ownerId, userInfo.instagramUserId(), userInfo.username());
        return saved;
    }

    /**
     * Refresh long-lived token if within TOKEN_REFRESH_THRESHOLD_DAYS of expiry.
     * Updates DB + evicts Redis cache on success.
     *
     * Failure behaviour:
     *   - Not connected → PlatformNotConnectedException → 404
     *   - Token revoked → OAuthTokenExchangeException → 502
     */
    @Transactional
    public void refreshTokenIfExpired(UUID ownerId) {
        PlatformAccount account = platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, PlatformType.INSTAGRAM)
                .orElseThrow(() -> new PlatformNotConnectedException(
                        "Instagram not connected for user: " + ownerId));

        boolean needsRefresh = account.getExpiresAt() == null
                || LocalDateTime.now().isAfter(
                        account.getExpiresAt().minusDays(TOKEN_REFRESH_THRESHOLD_DAYS));

        if (!needsRefresh) {
            log.info("Token refresh not required for Instagram: ownerId={}", ownerId);
            return;
        }

        log.info("Refreshing Instagram token: ownerId={}", ownerId);

        MetaClient.LongLivedTokenResponse refreshed = metaClient.refreshLongLivedToken(account.getAccessToken());
        account.setAccessToken(refreshed.accessToken());
        account.setExpiresAt(LocalDateTime.now().plusSeconds(refreshed.expiresInSeconds()));
        platformAccountRepository.save(account);

        try {
            platformTokenCacheService.evictPlatformToken(ownerId, "INSTAGRAM");
            platformTokenCacheService.putInCache(ownerId, "INSTAGRAM", account);
        } catch (Exception e) {
            log.warn("Failed to update Instagram token cache after refresh: ownerId={} — stale cache possible until TTL expires", ownerId, e);
        }

        log.info("Instagram token refreshed: ownerId={}", ownerId);
    }
}
