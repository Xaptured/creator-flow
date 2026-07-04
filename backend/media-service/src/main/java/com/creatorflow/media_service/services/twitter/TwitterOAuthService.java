package com.creatorflow.media_service.services.twitter;

import com.creatorflow.media_service.client.TwitterClient;
import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Handles Twitter OAuth 2.0 PKCE token lifecycle.
 *
 * PKCE flow:
 *   connect()     → generate code_verifier, store in Redis (key: pkce:<state>), build consent URL
 *   handleCallback() → retrieve code_verifier from Redis, exchange code+verifier for tokens, persist
 *
 * Redis key: "pkce:<state>" where state = random UUID nonce (NOT ownerId — security best practice)
 * Redis TTL: 10 minutes (matches typical OAuth flow completion time)
 *
 * State format: "<ownerId>:<nonce>" — encodes ownerId + random nonce in single state param.
 * This avoids a second Redis lookup for ownerId at callback time.
 *
 * Failure behaviour:
 *   - PKCE verifier not found in Redis → IllegalArgumentException → 400 (session expired or CSRF)
 *   - Invalid state format → IllegalArgumentException → 400
 *   - Token exchange failure → OAuthTokenExchangeException → 502
 *   - Not connected → PlatformNotConnectedException → 404
 */
@Service
public class TwitterOAuthService {

    private static final Logger log = LoggerFactory.getLogger(TwitterOAuthService.class);

    private static final String PKCE_REDIS_KEY_PREFIX    = "pkce:";
    private static final Duration PKCE_TTL               = Duration.ofMinutes(10);
    private static final String STATE_SEPARATOR          = ":";
    private static final long TOKEN_REFRESH_THRESHOLD_MINUTES = 5L;

    private final TwitterClient twitterClient;
    private final PlatformAccountRepository platformAccountRepository;
    private final PlatformTokenCacheService platformTokenCacheService;
    private final RedisTemplate<String, Object> redisTemplate;

    public TwitterOAuthService(TwitterClient twitterClient,
                               PlatformAccountRepository platformAccountRepository,
                               PlatformTokenCacheService platformTokenCacheService,
                               RedisTemplate<String, Object> redisTemplate) {
        this.twitterClient = twitterClient;
        this.platformAccountRepository = platformAccountRepository;
        this.platformTokenCacheService = platformTokenCacheService;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Build Twitter OAuth 2.0 PKCE consent URL.
     *
     * Steps:
     * 1. Generate code_verifier (random 32 bytes, Base64URL)
     * 2. Derive code_challenge (SHA-256 of verifier, Base64URL)
     * 3. Generate state = "<ownerId>:<randomNonce>"
     * 4. Store code_verifier in Redis under key "pkce:<state>" with 10-min TTL
     * 5. Build and return consent URL
     */
    public String buildAuthorizationUrl(UUID ownerId) {
        String codeVerifier = twitterClient.generateCodeVerifier();
        String codeChallenge = twitterClient.generateCodeChallenge(codeVerifier);

        String nonce = UUID.randomUUID().toString();
        String state = ownerId + STATE_SEPARATOR + nonce;
        String redisKey = PKCE_REDIS_KEY_PREFIX + state;

        redisTemplate.opsForValue().set(redisKey, codeVerifier, PKCE_TTL);
        log.info("Twitter PKCE state stored: ownerId={} state={}", ownerId, state);

        String authUrl = twitterClient.buildAuthorizationUrl(state, codeChallenge);
        log.info("Twitter OAuth authorization URL — open in browser to connect: {}", authUrl);
        return authUrl;
    }

    /**
     * Exchange auth code + PKCE verifier for tokens, persist PlatformAccount.
     *
     * State format: "<ownerId>:<nonce>" — parse ownerId from state.
     * PKCE verifier: loaded from Redis using state as key.
     *
     * Steps:
     * 1. Parse ownerId from state (first segment before ":")
     * 2. Look up code_verifier in Redis ("pkce:<state>") — missing = expired/CSRF
     * 3. Delete PKCE key from Redis (single-use)
     * 4. Exchange code + verifier for tokens
     * 5. Fetch Twitter user info
     * 6. Upsert platform_accounts row
     * 7. Evict Redis token cache
     */
    @Transactional
    public PlatformAccount handleCallback(String code, String state) {
        UUID ownerId = parseOwnerIdFromState(state);

        String redisKey = PKCE_REDIS_KEY_PREFIX + state;
        Object stored = redisTemplate.opsForValue().get(redisKey);
        if (stored == null) {
            throw new IllegalArgumentException(
                    "Twitter PKCE verifier not found — OAuth session expired or possible CSRF: state=" + state);
        }
        String codeVerifier = stored.toString();
        redisTemplate.delete(redisKey);

        TwitterClient.TokenResponse tokens = twitterClient.exchangeCodeForTokens(code, codeVerifier);
        TwitterClient.UserInfo userInfo = twitterClient.fetchUserInfo(tokens.accessToken());

        PlatformAccount account = platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, PlatformType.TWITTER)
                .orElseGet(PlatformAccount::new);

        account.setOwnerId(ownerId);
        account.setPlatform(PlatformType.TWITTER);
        account.setAccessToken(tokens.accessToken());
        account.setRefreshToken(tokens.refreshToken());
        account.setExpiresAt(LocalDateTime.now().plusSeconds(tokens.expiresInSeconds()));
        account.setPlatformUserId(userInfo.twitterUserId());

        PlatformAccount saved = platformAccountRepository.save(account);

        try {
            platformTokenCacheService.putInCache(ownerId, "TWITTER", saved);
        } catch (Exception e) {
            log.warn("Failed to warm Twitter token cache after connect: ownerId={} — cache will populate on next access", ownerId, e);
        }

        log.info("Twitter connected: ownerId={} twitterUserId={} username={}",
                ownerId, userInfo.twitterUserId(), userInfo.username());
        return saved;
    }

    /**
     * Refresh access token if within TOKEN_REFRESH_THRESHOLD_MINUTES of expiry.
     * Updates DB + evicts Redis cache on success.
     *
     * Uses REQUIRES_NEW so a token-refresh failure never poisons the caller's publish
     * transaction. OAuthTokenExchangeException is a business error (revoked/invalid token),
     * not a DB consistency problem — noRollbackFor prevents marking this tx rollback-only on throw.
     *
     * On invalid_request with an invalid token (Twitter's equivalent of invalid_grant):
     *   - refresh token is nulled out
     *   - expiresAt is set to the past to mark the account as expired
     *   - Redis cache is evicted
     *   - exception is re-thrown so the caller can log and continue
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            noRollbackFor = { OAuthTokenExchangeException.class, PlatformNotConnectedException.class }
    )
    public void refreshTokenIfExpired(UUID ownerId) {
        PlatformAccount account = platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, PlatformType.TWITTER)
                .orElseThrow(() -> new PlatformNotConnectedException(
                        "Twitter not connected for user: " + ownerId));

        boolean needsRefresh = account.getExpiresAt() == null
                || LocalDateTime.now().isAfter(
                        account.getExpiresAt().minusMinutes(TOKEN_REFRESH_THRESHOLD_MINUTES));

        if (!needsRefresh) {
            log.info("Token refresh not required for Twitter: ownerId={}", ownerId);
            return;
        }

        log.info("Refreshing Twitter token: ownerId={}", ownerId);

        if (account.getRefreshToken() == null) {
            throw new OAuthTokenExchangeException(
                    "No refresh token stored for Twitter user: " + ownerId + " — re-connect required");
        }

        TwitterClient.TokenResponse tokens;
        try {
            tokens = twitterClient.refreshAccessToken(account.getRefreshToken());
        } catch (OAuthTokenExchangeException e) {
            if (e.isInvalidGrant()) {
                account.setRefreshToken(null);
                account.setExpiresAt(LocalDateTime.now().minusSeconds(1));
                platformAccountRepository.save(account);
                try {
                    platformTokenCacheService.evictPlatformToken(ownerId, "TWITTER");
                } catch (Exception cacheEx) {
                    log.warn("Failed to evict Twitter token cache after invalid token: ownerId={}", ownerId, cacheEx);
                }
                log.warn("Twitter refresh token invalid — marked account as expired: ownerId={}", ownerId);
            }
            throw e;
        }

        account.setAccessToken(tokens.accessToken());
        if (tokens.refreshToken() != null) {
            account.setRefreshToken(tokens.refreshToken());
        }
        account.setExpiresAt(LocalDateTime.now().plusSeconds(tokens.expiresInSeconds()));
        platformAccountRepository.save(account);

        try {
            platformTokenCacheService.evictPlatformToken(ownerId, "TWITTER");
            platformTokenCacheService.putInCache(ownerId, "TWITTER", account);
        } catch (Exception e) {
            log.warn("Failed to update Twitter token cache after refresh: ownerId={} — stale cache possible until TTL expires", ownerId, e);
        }
        log.info("Twitter token refreshed: ownerId={}", ownerId);
    }

    /**
     * Parse ownerId from state param format: "<ownerId>:<nonce>".
     * Throws IllegalArgumentException on invalid format — maps to 400.
     */
    private UUID parseOwnerIdFromState(String state) {
        if (state == null || !state.contains(STATE_SEPARATOR)) {
            throw new IllegalArgumentException(
                    "Invalid Twitter OAuth state format — possible CSRF attempt: " + state);
        }
        String ownerIdStr = state.split(STATE_SEPARATOR, 2)[0];
        try {
            return UUID.fromString(ownerIdStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid ownerId in Twitter OAuth state — possible CSRF attempt: " + state);
        }
    }
}
