package com.creatorflow.media_service.services;

import com.creatorflow.media_service.dto.response.PlatformStatusResponse;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
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

    /**
     * Removes the stored PlatformAccount for the given owner + platform.
     * No-op if the account does not exist (idempotent).
     */
    @Transactional
    public void disconnect(UUID ownerId, PlatformType platform) {
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
