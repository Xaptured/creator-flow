package com.creatorflow.media_service.services;

import com.creatorflow.media_service.dto.response.DisconnectCheckResponse;
import com.creatorflow.media_service.dto.response.PlatformStatusResponse;
import com.creatorflow.media_service.model.ContentStatus;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.repository.ContentRepository;
import com.creatorflow.media_service.repository.PlatformAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlatformStatusService {

    private final PlatformAccountRepository platformAccountRepository;
    private final ContentRepository contentRepository;

    /**
     * Returns the number of SCHEDULED content rows for the owner that target the
     * given platform. A non-zero count should trigger a confirmation dialog on the
     * frontend before the actual disconnect is performed.
     */
    @Transactional(readOnly = true)
    public DisconnectCheckResponse checkDisconnect(UUID ownerId, PlatformType platform) {
        // platform_targets is stored as a JSON array of strings, e.g. ["YOUTUBE","INSTAGRAM"]
        // The native query uses the @> containment operator to check membership.
        String platformTarget = "[\"" + platform.name() + "\"]";
        long count = contentRepository.countByOwnerIdAndStatusAndPlatformTarget(
                ownerId, ContentStatus.SCHEDULED, platformTarget);
        return new DisconnectCheckResponse(count);
    }

    /**
     * Disconnects a platform for the given owner.
     * Within a single transaction:
     *   1. Deletes all SCHEDULED content rows that target this platform.
     *   2. Removes the stored PlatformAccount (OAuth tokens).
     * No-op if the account does not exist (idempotent).
     */
    @Transactional
    public void disconnect(UUID ownerId, PlatformType platform) {
        String platformTarget = "[\"" + platform.name() + "\"]";
        contentRepository.deleteByOwnerIdAndStatusAndPlatformTarget(
                ownerId, ContentStatus.SCHEDULED, platformTarget);
        platformAccountRepository.findByOwnerIdAndPlatform(ownerId, platform)
                .ifPresent(platformAccountRepository::delete);
    }

    /**
     * Returns one status entry per known platform for the given owner.
     * Platforms without a stored PlatformAccount row are returned as disconnected.
     */
    @Transactional(readOnly = true)
    public List<PlatformStatusResponse> getStatusForOwner(UUID ownerId) {
        Map<PlatformType, PlatformAccount> accountsByPlatform =
                platformAccountRepository.findAllByOwnerId(ownerId)
                        .stream()
                        .collect(Collectors.toMap(PlatformAccount::getPlatform, a -> a));

        return Arrays.stream(PlatformType.values())
                .map(platform -> accountsByPlatform.containsKey(platform)
                        ? PlatformStatusResponse.connected(accountsByPlatform.get(platform))
                        : PlatformStatusResponse.disconnected(platform))
                .toList();
    }
}
