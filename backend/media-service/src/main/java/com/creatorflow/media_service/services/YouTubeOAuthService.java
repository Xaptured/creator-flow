package com.creatorflow.media_service.services;

import com.creatorflow.media_service.client.YouTubeClient;
import com.creatorflow.media_service.exception.OAuthTokenExchangeException;
import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.model.YouTubeChannel;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import com.creatorflow.media_service.repository.YouTubeChannelRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class YouTubeOAuthService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeOAuthService.class);

    private static final long TOKEN_EXPIRY_BUFFER_SECONDS = 60L;

    private static final long TOKEN_REFRESH_THRESHOLD_MINUTES = 5L;

    private final YouTubeClient youTubeClient;
    private final PlatformAccountRepository platformAccountRepository;
    private final YouTubeChannelRepository youTubeChannelRepository;
    private final PlatformTokenCacheService platformTokenCacheService;

    public YouTubeOAuthService(YouTubeClient youTubeClient,
                               PlatformAccountRepository platformAccountRepository,
                               YouTubeChannelRepository youTubeChannelRepository,
                               PlatformTokenCacheService platformTokenCacheService) {
        this.youTubeClient = youTubeClient;
        this.platformAccountRepository = platformAccountRepository;
        this.youTubeChannelRepository = youTubeChannelRepository;
        this.platformTokenCacheService = platformTokenCacheService;
    }

    /**
     * Build Google OAuth consent URL.
     * state = ownerId — ties callback back to user without a server session.
     */
    public String buildAuthorizationUrl(UUID ownerId) {
        return youTubeClient.buildAuthorizationUrl(ownerId.toString());
    }

    /**
     * Exchange auth code for tokens, fetch channel info, upsert DB rows.
     * state param = ownerId UUID set during buildAuthorizationUrl.
     *
     * Failure behaviour:
     * - Invalid state (not a UUID) → IllegalArgumentException → 400
     * - Token exchange failure → OAuthTokenExchangeException → 502
     * - YouTube API error → YouTubeApiException → 502
     * - Cache eviction only happens after successful DB save (not on exception)
     */
    @Transactional
    public PlatformAccount handleCallback(String code, String state) {
        UUID ownerId;
        try {
            ownerId = UUID.fromString(state);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid OAuth state parameter — possible CSRF attempt: " + state);
        }

        YouTubeClient.TokenResponse tokens = youTubeClient.exchangeCodeForTokens(code);
        YouTubeClient.ChannelInfo channelInfo = youTubeClient.fetchChannelInfo(tokens.accessToken());

        PlatformAccount account = platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE)
                .orElseGet(PlatformAccount::new);

        account.setOwnerId(ownerId);
        account.setPlatform(PlatformType.YOUTUBE);
        account.setAccessToken(tokens.accessToken());
        account.setRefreshToken(tokens.refreshToken());
        account.setExpiresAt(LocalDateTime.now().plusSeconds(tokens.expiresIn() - TOKEN_EXPIRY_BUFFER_SECONDS));

        PlatformAccount saved = platformAccountRepository.save(account);

        YouTubeChannel channel = youTubeChannelRepository
                .findByPlatformAccountId(saved.getId())
                .orElseGet(YouTubeChannel::new);

        channel.setPlatformAccountId(saved.getId());
        channel.setOwnerId(ownerId);
        channel.setChannelId(channelInfo.channelId());
        channel.setChannelName(channelInfo.channelName());
        channel.setChannelThumbnail(channelInfo.thumbnail());
        channel.setSubscriberCount(channelInfo.subscriberCount());

        youTubeChannelRepository.save(channel);

        platformTokenCacheService.evictPlatformToken(ownerId, "YOUTUBE");

        log.info("YouTube connected: ownerId={} channel={}", ownerId, channelInfo.channelName());
        return saved;
    }

    /**
     * Refresh access token if within TOKEN_REFRESH_THRESHOLD_MINUTES of expiry.
     * Updates DB + evicts Redis cache on success.
     *
     * Failure behaviour:
     * - Not connected → PlatformNotConnectedException → 404
     * - No refresh token → OAuthTokenExchangeException → 502
     * - Token revoked (invalid_grant from Google) → OAuthTokenExchangeException → 502
     */
    @Transactional
    public void refreshTokenIfExpired(UUID ownerId) {
        PlatformAccount account = platformAccountRepository
                .findByOwnerIdAndPlatform(ownerId, PlatformType.YOUTUBE)
                .orElseThrow(() -> new PlatformNotConnectedException(
                        "YouTube not connected for user: " + ownerId));

        boolean needsRefresh = account.getExpiresAt() == null
                || LocalDateTime.now().isAfter(
                        account.getExpiresAt().minusMinutes(TOKEN_REFRESH_THRESHOLD_MINUTES));

        if (!needsRefresh) {
            return;
        }

        log.info("Refreshing YouTube token: ownerId={}", ownerId);

        if (account.getRefreshToken() == null) {
            throw new OAuthTokenExchangeException(
                    "No refresh token stored for user: " + ownerId + " — re-connect required");
        }

        YouTubeClient.TokenResponse tokens = youTubeClient.refreshAccessToken(account.getRefreshToken());
        account.setAccessToken(tokens.accessToken());
        account.setExpiresAt(LocalDateTime.now().plusSeconds(tokens.expiresIn() - TOKEN_EXPIRY_BUFFER_SECONDS));
        platformAccountRepository.save(account);

        platformTokenCacheService.evictPlatformToken(ownerId, "YOUTUBE");
    }
}
