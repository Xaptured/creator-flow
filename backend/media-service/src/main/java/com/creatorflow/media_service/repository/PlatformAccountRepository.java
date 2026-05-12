package com.creatorflow.media_service.repository;

import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.model.PlatformType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlatformAccountRepository extends JpaRepository<PlatformAccount, UUID> {

    Optional<PlatformAccount> findByOwnerIdAndPlatform(UUID ownerId, PlatformType platform);

    List<PlatformAccount> findAllByOwnerId(UUID ownerId);

    List<PlatformAccount> findAllByExpiresAtBefore(LocalDateTime threshold);
}
